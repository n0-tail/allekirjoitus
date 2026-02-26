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
        const { documentId, fileName, verifiedName, sender, recipient } = await req.json();

        if (!documentId || !fileName || !verifiedName || !sender || !recipient) {
            throw new Error('Missing required fields for finalization.');
        }

        // Initialize Supabase client with Service Role Key to bypass RLS for PDF manipulation
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        const filePath = `${documentId}/${fileName}`;

        // 1. Download PDF
        const { data: fileBlob, error: downloadError } = await supabase.storage
            .from('pdfs')
            .download(filePath);

        if (downloadError) {
            throw new Error(`Failed to download document: ${downloadError.message}`);
        }

        // 2. Stamp PDF
        const arrayBuffer = await fileBlob.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];

        // Assuming local time in Finland for the stamp, or just UTC ISO
        const timestamp = new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' });

        lastPage.drawText(`Allekirjoitettu sähköisesti`, { x: 50, y: 70, size: 12, color: rgb(0, 0.4, 0) });
        lastPage.drawText(`Allekirjoittaja: ${verifiedName}`, { x: 50, y: 55, size: 10, color: rgb(0, 0, 0) });
        lastPage.drawText(`Aikaleima: ${timestamp}`, { x: 50, y: 40, size: 10, color: rgb(0, 0, 0) });

        const pdfBytes = await pdfDoc.save();

        // 3. Upload Stamped PDF
        const { error: uploadError } = await supabase.storage
            .from('pdfs')
            .upload(filePath, pdfBytes.buffer, { upsert: true, contentType: 'application/pdf' });

        if (uploadError) {
            throw new Error(`Failed to save stamped document: ${uploadError.message}`);
        }

        // 4. Update Database
        await supabase.from('documents').update({ status: 'signed' }).eq('id', documentId);

        // 5. Generate Signed URL for 24 hours
        const { data: urlData, error: urlError } = await supabase.storage
            .from('pdfs')
            .createSignedUrl(filePath, 60 * 60 * 24);

        const signedUrl = urlData?.signedUrl || '';

        // 6. Send Emails using Resend API directly inside this function
        if (RESEND_API_KEY && signedUrl) {
            const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
          <h2 style="color: #065f46; margin-top: 0;">Asiakirja on allekirjoitettu!</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Käyttäjä <strong>${verifiedName}</strong> on juuri sähköisesti allekirjoittanut asiakirjan <em>${fileName}</em>.
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
                        subject: `Allekirjoitettu: ${fileName}`,
                        html: emailHtml,
                    }),
                }),
                fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'Allekirjoitus <onboarding@resend.dev>',
                        to: [recipient],
                        subject: `Allekirjoitettu kappaleesi: ${fileName}`,
                        html: emailHtml,
                    }),
                })
            ]);
        }

        return new Response(JSON.stringify({ success: true, signedUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('Finalize error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
