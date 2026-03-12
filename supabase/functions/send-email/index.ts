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
        const { documentId, emailType } = await req.json()

        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY environment variable is missing')
        }

        if (!documentId || !emailType) {
            throw new Error('documentId and emailType are required')
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch document from database – only trusted data is used for email content
        const { data: doc, error: dbError } = await supabase
            .from('documents')
            .select('id, sender_email, signers, file_name')
            .eq('id', documentId)
            .single()

        if (dbError || !doc) {
            throw new Error('Asiakirjaa ei löytynyt tietokannasta.')
        }

        const baseUrl = 'https://helppoallekirjoitus.fi'
        const emailPromises: Promise<any>[] = []

        if (emailType === 'invitation') {
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

            // Send confirmation to sender
            const senderLink = `${baseUrl}/lahettaja/${doc.id}`
            const senderHtml = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #111827; margin-top: 0;">Allekirjoituspyyntösi on luotu!</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  Olet luonut sähköisen allekirjoituspyynnön asiakirjalle <em>(${doc.file_name})</em>.
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  Sinun tulee maksaa käsittelymaksu ja tunnistautua asettaaksesi oman allekirjoituksesi asiakirjaan. Voit palata maksamaan ja tunnistautumaan myöhemmin tästä linkistä:
                </p>
                <div style="margin: 30px 0;">
                  <a href="${senderLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                    Jatka maksulinkkiin
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
                        to: [doc.sender_email],
                        subject: `Allekirjoituspyyntösi: ${doc.file_name}`,
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
