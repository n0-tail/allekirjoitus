import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { generateHash } from "../_shared/hash-utils.ts";
import { stampPdf } from "../_shared/pdf-stamper.ts";
import { sendCompletionEmails } from "../_shared/completion-email.ts";

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

        // Capture IP for Audit Trail
        const rawIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
        const clientIp = rawIp.split(',')[0].trim() || "Tuntematon IP";

        const authMethod = "Vahva sähköinen tunnistautuminen (FTN)";
        const timestampIso = new Date().toISOString();

        // 1. Fetch current document state
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (fetchError || !doc) {
            throw new Error(`Failed to fetch document state: ${fetchError?.message}`);
        }

        // Check payment status
        const isSender = role === 'sender';
        const isPaid = isSender ? doc.sender_paid : doc.signers?.find((s: any) => s.id === signerId)?.paid;

        if (!isPaid) {
            throw new Error('Sinun täytyy maksaa käsittelymaksu ennen tunnistautumista.');
        }

        // 2. Update the correct name/signed status AND Audit Trail based on role
        let updatedAuditTrail = doc.audit_trail || [];

        // Append the new audit event
        const updatedSigners = doc.signers || [];
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
            // Use atomic RPC to avoid race condition on signers array
            const { error: rpcError } = await supabase.rpc('update_signer_signed', {
                doc_id: documentId,
                target_signer_id: signerId,
                signer_name: verifiedName
            });
            if (rpcError) throw new Error(`Virhe vastaanottajan päivityksessä (RPC): ${rpcError.message}`);

            // Update audit trail separately (additive, not conflicting)
            const { error: auditError } = await supabase
                .from('documents')
                .update({ audit_trail: updatedAuditTrail })
                .eq('id', documentId);
            if (auditError) throw new Error(`Virhe audit trailin päivityksessä: ${auditError.message}`);
        }

        // 3. RE-FETCH document state after our write
        const { data: freshDoc, error: refetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (refetchError || !freshDoc) {
            throw new Error(`Failed to re-fetch document state: ${refetchError?.message}`);
        }

        const freshSigners = freshDoc.signers || [];
        const finalAuditTrail = freshDoc.audit_trail || [];
        const senderRequired = freshDoc.sender_signs !== false;
        const hasSenderName = senderRequired ? !!freshDoc.sender_name : true;
        const allRecipientsSigned = freshSigners.length === 0 || freshSigners.every((s: any) => s.signed === true);

        // If anyone is missing, early return with "waiting" status
        if (!hasSenderName || !allRecipientsSigned) {
            // Send tracking email to sender if they just signed
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

        // 4. ALL SIGNED → STAMP THE PDF
        const actualFileName = freshDoc.file_name || fileName || 'asiakirja.pdf';
        const safeFileName = actualFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${documentId}/${safeFileName}`;
        const { data: fileBlob, error: downloadError } = await supabase.storage.from('pdfs').download(filePath);
        if (downloadError) throw new Error(`PDF latausvirhe: ${downloadError.message}`);

        const arrayBuffer = await fileBlob.arrayBuffer();

        // Stamp the PDF using shared module
        const pdfBytes = await stampPdf({
            pdfArrayBuffer: arrayBuffer,
            documentId,
            fileName: actualFileName,
            senderName: freshDoc.sender_name,
            senderEmail: freshDoc.sender_email || sender,
            signers: freshSigners,
            auditTrail: finalAuditTrail,
        });

        // Generate hash from final PDF
        const finalPdfHash = await generateHash(pdfBytes.buffer);

        // Base64-encode the stamped PDF for email attachment (chunked to avoid stack overflow)
        let binaryStr = '';
        const chunkSize = 8192;
        for (let i = 0; i < pdfBytes.length; i += chunkSize) {
            binaryStr += String.fromCharCode(...pdfBytes.subarray(i, i + chunkSize));
        }
        const pdfBase64 = btoa(binaryStr);

        // Upload stamped PDF
        const { error: uploadError } = await supabase.storage
            .from('pdfs')
            .upload(filePath, pdfBytes.buffer, { upsert: true, contentType: 'application/pdf' });
        if (uploadError) throw new Error(`Tallennusvirhe: ${uploadError.message}`);

        // Update DB status
        await supabase.from('documents').update({
            status: 'signed',
            document_hash: finalPdfHash
        }).eq('id', documentId);

        // Generate Signed URL
        let signedUrl = '';
        const { data: urlData, error: urlError } = await supabase.storage.from('pdfs').createSignedUrl(filePath, 60 * 60 * 24);
        if (urlError) {
            console.error('createSignedUrl epäonnistui:', urlError.message);
        } else {
            signedUrl = urlData?.signedUrl || '';
        }

        // Send completion emails using shared module
        if (RESEND_API_KEY) {
            await sendCompletionEmails({
                resendApiKey: RESEND_API_KEY,
                fileName: actualFileName,
                senderEmail: freshDoc.sender_email || sender,
                senderName: freshDoc.sender_name,
                signers: freshSigners,
                signedUrl,
                pdfBase64,
            });
        } else {
            console.error('RESEND_API_KEY puuttuu, sähköposteja ei lähetetty!');
        }

        return new Response(JSON.stringify({ status: 'done', signedUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('[CRITICAL] Record action error:', error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
