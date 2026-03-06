import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { PDFDocument, rgb } from "npm:pdf-lib";
import QRCode from "npm:qrcode";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper for generating SHA-256 hash
async function generateHash(buffer: ArrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

        // Capture IP for Audit Trail
        const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "Tuntematon IP";
        const authMethod = "Vahva sähköinen tunnistautuminen (FTN)";
        const timestampIso = new Date().toISOString();

        // 1. Fetch current document state to append data
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (fetchError || !doc) {
            throw new Error(`Failed to fetch document state: ${fetchError?.message}`);
        }

        // 2. Update the correct name/signed status AND Audit Trail based on role
        let updatedSigners = doc.signers || [];
        let updatedAuditTrail = doc.audit_trail || [];

        // Append the new audit event for this signer
        updatedAuditTrail.push({
            action: 'signed',
            role: role,
            name: verifiedName,
            email: role === 'sender' ? (doc.sender_email || sender) : (updatedSigners.find((s: any) => s.id === signerId)?.email || recipient),
            signerId: role === 'recipient' ? signerId : undefined,
            ip: clientIp,
            auth_method: authMethod,
            timestamp: timestampIso
        });

        if (role === 'sender') {
            const { error: updateError } = await supabase
                .from('documents')
                .update({
                    sender_name: verifiedName,
                    audit_trail: updatedAuditTrail
                })
                .eq('id', documentId);
            if (updateError) throw new Error(`Virhe lähettäjän päivityksessä: ${updateError.message}`);

        } else if (role === 'recipient' && signerId) {
            updatedSigners = updatedSigners.map((s: any) =>
                s.id === signerId ? { ...s, name: verifiedName, signed: true } : s
            );

            const { error: updateError } = await supabase
                .from('documents')
                .update({
                    signers: updatedSigners,
                    audit_trail: updatedAuditTrail
                })
                .eq('id', documentId);
            if (updateError) throw new Error(`Virhe vastaanottajan päivityksessä: ${updateError.message}`);
        }

        // 3. RE-FETCH document state after our write to avoid race condition
        const { data: freshDoc, error: refetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (refetchError || !freshDoc) {
            throw new Error(`Failed to re-fetch document state: ${refetchError?.message}`);
        }

        updatedSigners = freshDoc.signers || [];
        const finalAuditTrail = freshDoc.audit_trail || [];
        const hasSenderName = !!freshDoc.sender_name;
        const allRecipientsSigned = updatedSigners.length > 0 && updatedSigners.every((s: any) => s.signed === true);

        // If anyone is missing, early return with "waiting" status
        if (!hasSenderName || !allRecipientsSigned) {
            if (role === 'sender' && RESEND_API_KEY) {
                try {
                    const trackingLink = `https://helppoallekirjoitus.fi/lahettaja/${documentId}`;
                    const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
                      <h2 style="color: #065f46; margin-top: 0;">Oma osiosi on nyt valmis!</h2>
                      <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                        Kiitos <strong>${verifiedName}</strong>! Tunnistautumisesi ja maksusi on nyt kirjattu järjestelmäämme turvallisesti.
                      </p>
                      <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                        Odotamme vielä muiden osapuolten tunnistautumista. Voit sulkea selaimen turvallisesti. Lähetämme uuden viestin heti, kun asiakirja on kaikkien osalta valmis.
                      </p>
                      <div style="margin: 30px 0;">
                        <a href="${trackingLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                          Seuraa asiakirjan tilaa tästä
                        </a>
                      </div>
                    </div>`;

                    const emailRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                        body: JSON.stringify({
                            from: 'Helppo Allekirjoitus <noreply@helppoallekirjoitus.fi>',
                            to: [freshDoc.sender_email || sender],
                            subject: `Oma osiosi on valmis: ${freshDoc.file_name || fileName || 'Asiakirja'}`,
                            html: emailHtml,
                        }),
                    });
                    if (!emailRes.ok) {
                        const errBody = await emailRes.text();
                        console.error(`Tracking-sähköpostin lähetys epäonnistui (${emailRes.status}):`, errBody);
                    }
                } catch (emailErr) {
                    console.error("Vahvistussähköpostin lähetys lähettäjälle epäonnistui:", emailErr);
                }
            }

            return new Response(JSON.stringify({ status: 'waiting' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 4. BOTH are present => STAMP THE PDF!
        const filePath = `${documentId}/${freshDoc.file_name || fileName || 'asiakirja.pdf'}`;
        const { data: fileBlob, error: downloadError } = await supabase.storage.from('pdfs').download(filePath);
        if (downloadError) throw new Error(`PDF latausvirhe: ${downloadError.message}`);

        const arrayBuffer = await fileBlob.arrayBuffer();

        // Calculate SHA-256 Hash of original document
        const documentHash = await generateHash(arrayBuffer);

        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const originalPages = pdfDoc.getPages();
        const numPages = originalPages.length;

        // Stamp Document ID on EVERY original page (bottom left margin)
        // using standard Helvetica (implicit in pdf-lib when not embedded)
        for (let i = 0; i < numPages; i++) {
            const page = originalPages[i];
            page.drawText(`Helppo Allekirjoitus | Doc ID: ${documentId} | Sivu ${i + 1}/${numPages}`, {
                x: 20,
                y: 15,
                size: 8,
                color: rgb(0.5, 0.5, 0.5)
            });
        }

        // Add the Final Audit Trail Page
        let auditPage = pdfDoc.addPage();
        const { width, height } = auditPage.getSize();
        const timestamp = new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' });

        // Visual "Approved" Checkmark (Green Circle with Check)
        // We draw two overlapping circles (one hollow, one filled) or just standard SVG path if supported.
        // PDF-lib supports drawing SVG paths directly:
        const checkmarkPath = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z";
        auditPage.drawSvgPath(checkmarkPath, {
            x: 50,
            y: height - 50,
            scale: 2,
            color: rgb(0.133, 0.773, 0.369) // Green (#22c55e)
        });

        // Draw Audit Trail Header
        auditPage.drawText('SÄHKÖINEN ALLEKIRJOITUSTODISTUS', { x: 110, y: height - 70, size: 20, color: rgb(0, 0, 0) });
        auditPage.drawText(`Vahvistettu ${timestamp}`, { x: 110, y: height - 90, size: 12, color: rgb(0.4, 0.4, 0.4) });

        // Draw Document Info Block (Gray background box)
        auditPage.drawRectangle({ x: 50, y: height - 210, width: width - 100, height: 90, color: rgb(0.96, 0.97, 0.98) });
        auditPage.drawText('Asiakirjan tiedot', { x: 70, y: height - 145, size: 14, color: rgb(0.1, 0.1, 0.1) });
        auditPage.drawText(`Tunnus (ID): ${documentId}`, { x: 70, y: height - 165, size: 10, color: rgb(0.3, 0.3, 0.3) });
        auditPage.drawText(`Tiedosto: ${freshDoc.file_name || fileName || 'asiakirja.pdf'}`, { x: 70, y: height - 180, size: 10, color: rgb(0.3, 0.3, 0.3) });
        auditPage.drawText(`SHA-256 Tiiviste: ${documentHash}`, { x: 70, y: height - 195, size: 8, color: rgb(0.5, 0.5, 0.5) });

        // Draw Signers Table
        let currentY = height - 250;

        // Helper to find audit event for a specific role
        const getAuditData = (r: string, identifier: string) => {
            if (r === 'recipient') {
                // Haetaan signerId:llä (uudet eventit) tai emaililla (fallback vanhoille eventeille)
                return finalAuditTrail.slice().reverse().find((a: any) => a.role === r && (a.signerId === identifier || a.email === identifier)) || { ip: 'Ei tallennettu', auth_method: 'FTN' };
            }
            // Sender: haetaan emaililla
            return finalAuditTrail.slice().reverse().find((a: any) => a.role === r && a.email === identifier) || { ip: 'Ei tallennettu', auth_method: 'FTN' };
        }

        const checkPagination = () => {
            if (currentY < 130) {
                auditPage = pdfDoc.addPage();
                currentY = height - 70;
                auditPage.drawText('SÄHKÖINEN ALLEKIRJOITUSTODISTUS (Jatkoa)', { x: 50, y: height - 40, size: 14, color: rgb(0, 0, 0) });
            }
        };

        // Sender
        checkPagination();
        const senderAudit = getAuditData('sender', freshDoc.sender_email);
        auditPage.drawLine({ start: { x: 50, y: currentY }, end: { x: width - 50, y: currentY }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
        currentY -= 30;
        auditPage.drawText('OSAPUOLI 1: LÄHETTÄJÄ', { x: 50, y: currentY, size: 12, color: rgb(0.4, 0.4, 0.4) });
        currentY -= 20;
        auditPage.drawText(`${freshDoc.sender_name}`, { x: 50, y: currentY, size: 14, color: rgb(0, 0, 0) });
        currentY -= 15;
        auditPage.drawText(`${freshDoc.sender_email || sender}`, { x: 50, y: currentY, size: 10, color: rgb(0.3, 0.3, 0.3) });
        currentY -= 15;
        auditPage.drawText(`Tunnistus: ${senderAudit.auth_method}`, { x: 50, y: currentY, size: 10, color: rgb(0.3, 0.3, 0.3) });
        currentY -= 15;
        auditPage.drawText(`IP-osoite: ${senderAudit.ip}`, { x: 50, y: currentY, size: 10, color: rgb(0.3, 0.3, 0.3) });
        currentY -= 20;

        // Recipients
        updatedSigners.forEach((s: any, index: number) => {
            checkPagination();
            const recAudit = getAuditData('recipient', s.id);  // Hakee signerId:llä tai emaililla
            auditPage.drawLine({ start: { x: 50, y: currentY }, end: { x: width - 50, y: currentY }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
            currentY -= 30;
            auditPage.drawText(`OSAPUOLI ${index + 2}: VASTAANOTTAJA`, { x: 50, y: currentY, size: 12, color: rgb(0.4, 0.4, 0.4) });
            currentY -= 20;
            auditPage.drawText(`${s.name}`, { x: 50, y: currentY, size: 14, color: rgb(0, 0, 0) });
            currentY -= 15;
            auditPage.drawText(`${s.email}`, { x: 50, y: currentY, size: 10, color: rgb(0.3, 0.3, 0.3) });
            currentY -= 15;
            auditPage.drawText(`Tunnistus: ${recAudit.auth_method}`, { x: 50, y: currentY, size: 10, color: rgb(0.3, 0.3, 0.3) });
            currentY -= 15;
            auditPage.drawText(`IP-osoite: ${recAudit.ip}`, { x: 50, y: currentY, size: 10, color: rgb(0.3, 0.3, 0.3) });
            currentY -= 20;
        });

        // Add QR Code for verification at the bottom
        if (currentY < 160) {
            auditPage = pdfDoc.addPage();
            auditPage.drawText('SÄHKÖINEN ALLEKIRJOITUSTODISTUS (Jatkoa)', { x: 50, y: height - 40, size: 14, color: rgb(0, 0, 0) });
        }

        const verifyUrl = `https://helppoallekirjoitus.fi/verify/${documentId}`;
        try {
            const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, color: { dark: '#000000', light: '#ffffff' } });
            // qrDataUrl looks like "data:image/png;base64,iVBORw0KGgo..."
            const base64Data = qrDataUrl.split(',')[1];
            if (base64Data) {
                const qrImageArrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                const qrImage = await pdfDoc.embedPng(qrImageArrayBuffer);
                auditPage.drawImage(qrImage, {
                    x: 50,
                    y: 70,
                    width: 70,
                    height: 70,
                });
                auditPage.drawText('Skannaa QR-koodi', { x: 130, y: 120, size: 10, color: rgb(0.2, 0.2, 0.2) });
                auditPage.drawText('tarkistaaksesi asiakirjan', { x: 130, y: 105, size: 10, color: rgb(0.2, 0.2, 0.2) });
                auditPage.drawText('aitouden palvelusta.', { x: 130, y: 90, size: 10, color: rgb(0.2, 0.2, 0.2) });
            }
        } catch (qrErr) {
            console.error("QR Code generation failed:", qrErr);
            // Fallback text if QR fails
            auditPage.drawText(`Validointilinkki: ${verifyUrl}`, { x: 50, y: 100, size: 10, color: rgb(0.2, 0.2, 0.2) });
        }


        // Footer disclaimer
        // Note: drawText does not auto-wrap. This is short enough.
        auditPage.drawText('Tämä sivu on automaattinen palveluntarjoajan varmenne vahvasta sähköisestä', { x: 50, y: 40, size: 8, color: rgb(0.5, 0.5, 0.5) });
        auditPage.drawText('tunnistautumisesta (FTN) ja maksujen suorittamisesta suojatussa ympäristössä.', { x: 50, y: 30, size: 8, color: rgb(0.5, 0.5, 0.5) });

        const pdfBytes = await pdfDoc.save();

        const { error: uploadError } = await supabase.storage
            .from('pdfs')
            .upload(filePath, pdfBytes.buffer, { upsert: true, contentType: 'application/pdf' });
        if (uploadError) throw new Error(`Tallennusvirhe: ${uploadError.message}`);

        // Update DB status to fully signed and store the DOCUMENT HASH for future verification
        await supabase.from('documents').update({
            status: 'signed',
            document_hash: documentHash
        }).eq('id', documentId);

        // Generate Signed URL (with error handling)
        let signedUrl = '';
        const { data: urlData, error: urlError } = await supabase.storage.from('pdfs').createSignedUrl(filePath, 60 * 60 * 24);
        if (urlError) {
            console.error('createSignedUrl epäonnistui:', urlError.message);
        } else {
            signedUrl = urlData?.signedUrl || '';
        }

        // 4. Send Confirmation Emails (ALWAYS attempt, even if signedUrl failed)
        if (RESEND_API_KEY) {
            const allNames = [freshDoc.sender_name, ...updatedSigners.map((s: any) => s.name)].filter(Boolean).join(', ');

            const downloadBlock = signedUrl
                ? `<div style="margin: 30px 0;">
                    <a href="${signedUrl}" download style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                      Lataa allekirjoitettu asiakirja (PDF)
                    </a>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">Linkki on voimassa 24 tuntia.</p>
                  </div>`
                : `<p style="color: #6b7280; font-size: 14px;">Latauslinkki ei ole juuri nyt saatavilla. Voit ladata asiakirjan palvelussa.</p>`;

            const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
              <h2 style="color: #065f46; margin-top: 0;">Asiakirja on nyt valmis (Kaikkien suostumus)</h2>
              <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                Kaikki osapuolet (<strong>${allNames}</strong>) ovat nyt sähköisesti allekirjoittaneet asiakirjan.
              </p>
              ${downloadBlock}
            </div>`;

            // Filter out null/undefined/empty emails and deduplicate
            const allEmails = [...new Set([freshDoc.sender_email, ...updatedSigners.map((s: any) => s.email)].filter(Boolean))];

            const emailPromises = allEmails.map(async (emailTarget: string) => {
                try {
                    const res = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                        body: JSON.stringify({
                            from: 'Helppo Allekirjoitus <noreply@helppoallekirjoitus.fi>',
                            to: [emailTarget],
                            subject: `Asiakirja valmis: Kaikki osapuolet ovat allekirjoittaneet`,
                            html: emailHtml,
                        }),
                    });
                    if (!res.ok) {
                        const errBody = await res.text();
                        console.error(`Sähköpostin lähetys epäonnistui osoitteeseen ${emailTarget} (${res.status}):`, errBody);
                    } else {
                        console.log(`Valmis-sähköposti lähetetty: ${emailTarget}`);
                    }
                } catch (emailErr) {
                    console.error(`Sähköpostin lähetys epäonnistui osoitteeseen ${emailTarget}:`, emailErr);
                }
            });

            await Promise.all(emailPromises);
        } else {
            console.error('RESEND_API_KEY puuttuu, sähköposteja ei lähetetty!');
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
