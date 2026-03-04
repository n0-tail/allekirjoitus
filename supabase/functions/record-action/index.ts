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
        const { documentId, fileName, role, verifiedName, sender, recipient, signerId } = await req.json();

        if (!documentId || !role || !verifiedName || !sender) {
            throw new Error('Missing required fields for action recording.');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        // 1. Fetch current document state to append data
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (fetchError || !doc) {
            throw new Error(`Failed to fetch document state: ${fetchError?.message}`);
        }

        // 2. Update the correct name/signed status based on role
        let updatedSigners = doc.signers || [];

        if (role === 'sender') {
            const { error: updateError } = await supabase
                .from('documents')
                .update({ sender_name: verifiedName })
                .eq('id', documentId);
            if (updateError) throw new Error(`Virhe lähettäjän päivityksessä: ${updateError.message}`);
            doc.sender_name = verifiedName; // Update local ref

        } else if (role === 'recipient' && signerId) {
            updatedSigners = updatedSigners.map((s: any) =>
                s.id === signerId ? { ...s, name: verifiedName, signed: true } : s
            );

            const { error: updateError } = await supabase
                .from('documents')
                .update({ signers: updatedSigners })
                .eq('id', documentId);
            if (updateError) throw new Error(`Virhe vastaanottajan päivityksessä: ${updateError.message}`);
            doc.signers = updatedSigners; // Update local ref
        }

        // 3. Check if EVERYONE is now signed
        const hasSenderName = !!doc.sender_name;
        const allRecipientsSigned = updatedSigners.length > 0 && updatedSigners.every((s: any) => s.signed === true);

        // If anyone is missing, early return with "waiting" status
        if (!hasSenderName || !allRecipientsSigned) {
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
        auditPage.drawText('OSAPUOLI 1: LÄHETTÄJÄ', { x: 50, y: height - 170, size: 14, color: rgb(0.2, 0.2, 0.2) });
        auditPage.drawText(`Nimi / Tunnistettu identiteetti: ${doc.sender_name}`, { x: 50, y: height - 190, size: 12, color: rgb(0, 0, 0) });
        auditPage.drawText(`Sähköpostiosoite: ${doc.sender_email || sender}`, { x: 50, y: height - 210, size: 12, color: rgb(0, 0, 0) });

        // Draw Recipient Info (Dynamic Loop)
        let currentY = height - 250;
        updatedSigners.forEach((s: any, index: number) => {
            auditPage.drawText(`OSAPUOLI ${index + 2}: VASTAANOTTAJA`, { x: 50, y: currentY, size: 14, color: rgb(0.2, 0.2, 0.2) });
            auditPage.drawText(`Nimi / Tunnistettu identiteetti: ${s.name}`, { x: 50, y: currentY - 20, size: 12, color: rgb(0, 0, 0) });
            auditPage.drawText(`Sähköpostiosoite: ${s.email}`, { x: 50, y: currentY - 40, size: 12, color: rgb(0, 0, 0) });
            currentY -= 80; // Move down for the next signer
        });

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
            const allNames = [doc.sender_name, ...updatedSigners.map((s: any) => s.name)].join(', ');

            const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
              <h2 style="color: #065f46; margin-top: 0;">Asiakirja on nyt valmis (Kaikkien suostumus)</h2>
              <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                Kaikki osapuolet (<strong>${allNames}</strong>) ovat nyt sähköisesti allekirjoittaneet asiakirjan.
              </p>
              <div style="margin: 30px 0;">
                <a href="${signedUrl}" download style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  Lataa allekirjoitettu asiakirja (PDF)
                </a>
                <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">Linkki on voimassa 24 tuntia.</p>
              </div>
            </div>`;

            const allEmails = [doc.sender_email, ...updatedSigners.map((s: any) => s.email)];

            const emailPromises = allEmails.map(emailTarget => {
                return fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'Allekirjoitus <onboarding@resend.dev>',
                        to: [emailTarget],
                        subject: `Asiakirja valmis: Kaikki osapuolet ovat allekirjoittaneet`,
                        html: emailHtml,
                    }),
                });
            });

            await Promise.all(emailPromises);
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
