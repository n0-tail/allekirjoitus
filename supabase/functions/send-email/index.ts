import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        const { documentId, emailType, errorDetails, errorContext } = payload

        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY environment variable is missing')
        }

        if (!emailType) {
            throw new Error('emailType is required')
        }

        const emailPromises: Promise<any>[] = []

        if (emailType === 'admin_error') {
            const html = `<div style="font-family: sans-serif; max-width: 800px; padding: 20px;">
                <h2 style="color: #dc2626; margin-top: 0;">Järjestelmävirhe (Helppo Allekirjoitus)</h2>
                <p><strong>Aikaleima:</strong> ${new Date().toLocaleString('fi-FI')}</p>
                <p><strong>Konteksti:</strong> ${errorContext || 'Tuntematon'}</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 20px;">
                    <pre style="white-space: pre-wrap; font-size: 14px; color: #1e293b; margin: 0; font-family: monospace;">${typeof errorDetails === 'object' ? JSON.stringify(errorDetails, null, 2) : (errorDetails || 'Ei tarkempia tietoja')}</pre>
                </div>
            </div>`;
            
            emailPromises.push(
                fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'Helppo Allekirjoitus Error <noreply@helppoallekirjoitus.fi>',
                        to: ['antti.nikkanen@polarcomp.fi'],
                        subject: `🚨 [VIRHE] Helppo Allekirjoitus: ${errorContext || 'Tuntematon virhe'}`,
                        html,
                    }),
                })
            )
        } else if (emailType === 'invitation') {
            if (!documentId) throw new Error('documentId is required')

            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            const supabase = createClient(supabaseUrl, supabaseServiceKey)

            // Fetch document from database – only trusted data is used for email content
            const { data: doc, error: dbError } = await supabase
                .from('documents')
                .select('id, sender_email, signers, file_name, sender_signs')
                .eq('id', documentId)
                .single()

            if (dbError || !doc) {
                throw new Error('Asiakirjaa ei löytynyt tietokannasta.')
            }

            const baseUrl = 'https://helppoallekirjoitus.fi'

            // Send invitation to each signer
            for (const signer of (doc.signers || [])) {
                const link = `${baseUrl}/asiakirja/${doc.id}?signer=${signer.id}`
                const html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <h2 style="color: #111827; margin-top: 0;">Hei!</h2>
                  <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                    <strong>${doc.sender_email}</strong> on lähettänyt sinulle asiakirjan <em>(${doc.file_name})</em> sähköisesti allekirjoitettavaksi.
                  </p>
                  <div style="margin: 30px 0;">
                    <a href="${link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                      Avaa ja allekirjoita asiakirja
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                    Ystävällisin terveisin,<br>Allekirjoitus
                  </p>
                </div>`

                emailPromises.push(
                    fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                        body: JSON.stringify({
                            from: 'Helppo Allekirjoitus <noreply@helppoallekirjoitus.fi>',
                            to: [signer.email],
                            subject: `Allekirjoituspyyntö: ${doc.file_name}`,
                            html,
                        }),
                    })
                )
            }

            const senderLink = `${baseUrl}/lahettaja/${doc.id}`
            const hasRecipients = (doc.signers || []).length > 0;
            const senderSubject = hasRecipients 
              ? `Allekirjoituspyyntösi: ${doc.file_name}`
              : `Asiakirjasi on ladattu: ${doc.file_name}`;
            
            const senderMessage = hasRecipients
              ? `Olet luonut sähköisen allekirjoituspyynnön asiakirjalle <em>(${doc.file_name})</em>.`
              : `Olet ladattu asiakirjan <em>(${doc.file_name})</em> sähköistä allekirjoitusta varten.`;

            const observerTextPart = doc.sender_signs === false 
              ? `<p style="color: #374151; font-size: 16px; line-height: 1.5;">Vastaanottajille on lähetetty allekirjoituspyynnöt. Voit seurata asiakirjan valmistumista ja ladata lopullisen kappaleen alla olevasta linkistä:</p>
                 <div style="margin: 30px 0;">
                   <a href="${senderLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                     Seuraa asiakirjan tilaa
                   </a>
                 </div>`
              : `<p style="color: #374151; font-size: 16px; line-height: 1.5;">Sinun tulee maksaa käsittelymaksu ja tunnistautua asettaaksesi oman allekirjoituksesi asiakirjaan. Voit palata maksamaan ja tunnistautumaan myöhemmin tästä linkistä:</p>
                 <div style="margin: 30px 0;">
                   <a href="${senderLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                     Jatka maksulinkkiin
                   </a>
                 </div>`;

            const senderHtml = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #111827; margin-top: 0;">${hasRecipients ? 'Allekirjoituspyyntösi on luotu!' : 'Asiakirjasi on ladattu!'}</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  ${senderMessage}
                </p>
                ${observerTextPart}
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                  Ystävällisin terveisin,<br>Allekirjoitus
                </p>
              </div>`

            emailPromises.push(
                fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'Helppo Allekirjoitus <noreply@helppoallekirjoitus.fi>',
                        to: [doc.sender_email],
                        subject: senderSubject,
                        html: senderHtml,
                    }),
                })
            )
        } else {
            throw new Error(`Unknown emailType: ${emailType}`)
        }

        const results = await Promise.allSettled(emailPromises)
        const failed = results.filter(r => r.status === 'rejected').length

        return new Response(JSON.stringify({ sent: results.length - failed, failed }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
