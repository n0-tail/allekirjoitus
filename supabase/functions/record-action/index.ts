import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { PDFDocument, rgb } from "npm:pdf-lib";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { documentId, fileName, role, verifiedName, sender, recipient } = await req.json();

        if (!documentId || !role || !verifiedName || !sender || !recipient) {
            throw new Error('Missing required fields for action recording.');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        // 1. Update the correct name column based on role
        const updateField = role === 'sender' ? { sender_name: verifiedName } : { recipient_name: verifiedName };

        const { error: updateError } = await supabase
            .from('documents')
            .update(updateField)
            .eq('id', documentId);

        if (updateError) {
            console.error('Failed to update name column:', updateError.message);
            // It might fail if the user didn't create the columns yet. 
            throw new Error(`Tietokantaongelma. Varmista että sender_name ja recipient_name tilit on lisätty tietokantaan! Virhe: ${updateError.message}`);
        }

        // 2. Fetch the document to see if BOTH names are now present
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('sender_name, recipient_name')
            .eq('id', documentId)
            .single();

        if (fetchError || !doc) {
            throw new Error(`Failed to fetch document state: ${fetchError?.message}`);
        }

        const hasBothNames = doc.sender_name && doc.recipient_name;

        // If one is missing, early return with "waiting" status
        if (!hasBothNames) {
            return new Response(JSON.stringify({ status: 'waiting' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 3. BOTH are present => STAMP THE PDF!
        const filePath = `${documentId}/${fileName || 'asiakirja.pdf'}`;
        const { data: fileBlob, error: downloadError } = await supabase.storage.from('pdfs').download(filePath);
        if (downloadError) throw new Error(`PDF latausvirhe: ${downloadError.message}`);

        const arrayBuffer = await fileBlob.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const auditPage = pdfDoc.addPage();
        const { width, height } = auditPage.getSize();

        const timestamp = new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' });

        // Draw Audit Trail Header
        auditPage.drawText('SÄHKÖINEN ALLEKIRJOITUSTODISTUS', { x: 50, y: height - 50, size: 18, color: rgb(0, 0.4, 0) });

        // Draw Document Info
        auditPage.drawText(`Asiakirjan tunnus (ID): ${documentId}`, { x: 50, y: height - 90, size: 12, color: rgb(0, 0, 0) });
        auditPage.drawText(`Alkuperäinen tiedosto: ${fileName || 'asiakirja.pdf'}`, { x: 50, y: height - 110, size: 12, color: rgb(0, 0, 0) });
        auditPage.drawText(`Allekirjoituksen aikaleima: ${timestamp}`, { x: 50, y: height - 130, size: 12, color: rgb(0, 0, 0) });

        // Draw Sender Info
        auditPage.drawText('OSAPUOLI 1 (LÄHETTÄJÄ)', { x: 50, y: height - 170, size: 14, color: rgb(0.2, 0.2, 0.2) });
        auditPage.drawText(`Nimi / Tunnistettu identiteetti: ${doc.sender_name}`, { x: 50, y: height - 190, size: 12, color: rgb(0, 0, 0) });
        auditPage.drawText(`Sähköpostiosoite: ${sender}`, { x: 50, y: height - 210, size: 12, color: rgb(0, 0, 0) });

        // Draw Recipient Info
        auditPage.drawText('OSAPUOLI 2 (VASTAANOTTAJA)', { x: 50, y: height - 250, size: 14, color: rgb(0.2, 0.2, 0.2) });
        auditPage.drawText(`Nimi / Tunnistettu identiteetti: ${doc.recipient_name}`, { x: 50, y: height - 270, size: 12, color: rgb(0, 0, 0) });
        auditPage.drawText(`Sähköpostiosoite: ${recipient}`, { x: 50, y: height - 290, size: 12, color: rgb(0, 0, 0) });

        // Footer disclaimer
        // Note: drawText does not auto-wrap. This is short enough.
        auditPage.drawText('Tämä sivu on automaattinen palveluntarjoajan varmenne vahvasta', { x: 50, y: 70, size: 10, color: rgb(0.4, 0.4, 0.4) });
        auditPage.drawText('sähköisestä tunnistautumisesta (FTN) ja maksujen suorittamisesta.', { x: 50, y: 55, size: 10, color: rgb(0.4, 0.4, 0.4) });

        const pdfBytes = await pdfDoc.save();

        const { error: uploadError } = await supabase.storage
            .from('pdfs')
            .upload(filePath, pdfBytes.buffer, { upsert: true, contentType: 'application/pdf' });
        if (uploadError) throw new Error(`Tallennusvirhe: ${uploadError.message}`);

        // Update DB status to fully signed
        await supabase.from('documents').update({ status: 'signed' }).eq('id', documentId);

        // Generate Signed URL
        const { data: urlData } = await supabase.storage.from('pdfs').createSignedUrl(filePath, 60 * 60 * 24);
        const signedUrl = urlData?.signedUrl || '';

        // 4. Send Confirmation Emails
        if (RESEND_API_KEY && signedUrl) {
            const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
              <h2 style="color: #065f46; margin-top: 0;">Asiakirja on nyt valmis (Molempien suostumus)</h2>
              <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                Molemmat osapuolet (<strong>${doc.sender_name}</strong> ja <strong>${doc.recipient_name}</strong>) ovat nyt sähköisesti allekirjoittaneet asiakirjan.
              </p>
              <div style="margin: 30px 0;">
                <a href="${signedUrl}" download style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  Lataa allekirjoitettu asiakirja (PDF)
                </a>
                <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">Linkki on voimassa 24 tuntia.</p>
              </div>
            </div>`;

            await Promise.all([
                fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'Allekirjoitus <onboarding@resend.dev>',
                        to: [sender],
                        subject: `Asiakirja valmis: Molemmat osapuolet ovat allekirjoittaneet`,
                        html: emailHtml,
                    }),
                }),
                fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'Allekirjoitus <onboarding@resend.dev>',
                        to: [recipient],
                        subject: `Asiakirja valmis: Molemmat osapuolet ovat allekirjoittaneet`,
                        html: emailHtml,
                    }),
                })
            ]);
        }

        return new Response(JSON.stringify({ status: 'done', signedUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('Record action error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
