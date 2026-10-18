import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { generateHash } from "../_shared/hash-utils.ts";
import { stampPdf } from "../_shared/pdf-stamper.ts";
import { sendCompletionEmails } from "../_shared/completion-email.ts";
import { escapeHtml } from "../_shared/escape.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A crashed stamping attempt releases its lock after this long
const STAMP_LOCK_MS = 2 * 60 * 1000;
// A bank login is usable for signing for this long
const IDENTITY_MAX_AGE_MS = 60 * 60 * 1000;

const normalizeName = (s: unknown) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let supabase: any = null;
    let lockedDocumentId: string | null = null;

    try {
        const { documentId, fileName, role, verifiedName, sender, recipient, signerId } = await req.json();

        if (!documentId || !role || !verifiedName || !sender) {
            throw new Error('Missing required fields for action recording.');
        }
        if (role !== 'sender' && role !== 'recipient') {
            throw new Error('Virheellinen rooli.');
        }

        // Shadow mode (default): bank-verified name is compared and logged, browser-sent name is still used.
        // Enforce mode (ENFORCE_VERIFIED_IDENTITY=true): only the bank-verified name stored by auth-callback is accepted.
        // The x-enforce-identity header can only make the check stricter (used for testing enforcement).
        const enforceIdentity = Deno.env.get('ENFORCE_VERIFIED_IDENTITY') === 'true'
            || req.headers.get('x-enforce-identity') === 'true';

        supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
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

        const isSender = role === 'sender';
        const signer = isSender ? null : (doc.signers || []).find((s: any) => s.id === signerId);
        const isPaid = isSender ? doc.sender_paid : signer?.paid;

        if (!isPaid) {
            throw new Error('Sinun täytyy maksaa käsittelymaksu ennen tunnistautumista.');
        }

        // 2. Record the signature – only if this party has not signed yet.
        //    Repeated calls (retries, auto-recovery from other parties' browsers) skip straight to finalization.
        const alreadySigned = isSender
            ? (doc.sender_signs === false || !!doc.sender_name)
            : signer?.signed === true;

        let justSigned = false;
        let signedName = verifiedName;

        if (!alreadySigned) {
            const identityCutoff = new Date(Date.now() - IDENTITY_MAX_AGE_MS).toISOString();
            let idQuery = supabase
                .from('verified_identities')
                .select('id, verified_name')
                .eq('document_id', documentId)
                .eq('role', role)
                .is('consumed_at', null)
                .gte('created_at', identityCutoff)
                .order('created_at', { ascending: false })
                .limit(1);
            idQuery = isSender ? idQuery.is('signer_id', null) : idQuery.eq('signer_id', signerId);
            const { data: idRows, error: idErr } = await idQuery;
            if (idErr) console.error('verified_identities lookup failed:', idErr.message);
            const identity = idRows?.[0] || null;

            const checkResult = !identity
                ? 'missing'
                : (normalizeName(identity.verified_name) === normalizeName(verifiedName) ? 'match' : 'mismatch');

            try {
                await supabase.from('identity_checks').insert({
                    document_id: documentId,
                    role,
                    signer_id: isSender ? null : signerId,
                    client_name: String(verifiedName).slice(0, 200),
                    verified_name: identity?.verified_name ?? null,
                    result: checkResult,
                    enforced: enforceIdentity,
                });
            } catch (logErr) {
                console.error('identity_checks insert failed:', logErr);
            }

            if (enforceIdentity) {
                if (!identity) {
                    throw new Error('Vahvaa tunnistautumista ei löytynyt tai se on vanhentunut. Tunnistaudu uudelleen.');
                }
                signedName = identity.verified_name;
            }

            const auditEvent = {
                action: 'signed',
                role: role,
                name: signedName,
                email: isSender ? (doc.sender_email || sender) : (signer?.email || recipient),
                signerId: isSender ? undefined : signerId,
                ip: clientIp,
                auth_method: authMethod,
                timestamp: timestampIso
            };

            // Atomic: signature + audit event in one statement (no lost updates between parallel signers)
            const { data: wrote, error: recError } = await supabase.rpc('record_signature', {
                p_doc_id: documentId,
                p_role: role,
                p_signer_id: isSender ? null : signerId,
                p_name: signedName,
                p_event: auditEvent,
            });
            if (recError) throw new Error(`Virhe allekirjoituksen tallennuksessa: ${recError.message}`);

            justSigned = wrote === true;
            if (justSigned && identity) {
                await supabase.from('verified_identities').update({ consumed_at: new Date().toISOString() }).eq('id', identity.id);
            }
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

        const actualFileName = freshDoc.file_name || fileName || 'asiakirja.pdf';
        const safeFileName = actualFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${documentId}/${safeFileName}`;
        const originalPath = `${documentId}/_original/${safeFileName}`;

        // If anyone is missing, early return with "waiting" status
        if (!hasSenderName || !allRecipientsSigned) {
            // Send tracking email to sender only when they actually signed now
            if (isSender && justSigned && RESEND_API_KEY) {
                try {
                    const trackingLink = `https://helppoallekirjoitus.fi/lahettaja/${documentId}`;
                    const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
                      <h2 style="color: #065f46; margin-top: 0;">Oma osiosi on nyt valmis!</h2>
                      <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                        Kiitos <strong>${escapeHtml(signedName)}</strong>! Tunnistautumisesi ja maksusi on nyt kirjattu järjestelmäämme turvallisesti.
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

            return json({ status: 'waiting' });
        }

        // 4. Already finalized earlier → never stamp or e-mail twice
        if (freshDoc.status === 'signed') {
            const { data: urlData } = await supabase.storage.from('pdfs').createSignedUrl(filePath, 60 * 60 * 24);
            return json({ status: 'done', signedUrl: urlData?.signedUrl || '' });
        }

        // 5. Acquire stamping lock (only one concurrent call may stamp + send e-mails)
        const lockCutoff = new Date(Date.now() - STAMP_LOCK_MS).toISOString();
        const { data: lockRows, error: lockError } = await supabase
            .from('documents')
            .update({ stamping_started_at: new Date().toISOString() })
            .eq('id', documentId)
            .neq('status', 'signed')
            .or(`stamping_started_at.is.null,stamping_started_at.lt.${lockCutoff}`)
            .select('id');
        if (lockError) throw new Error(`Lukitusvirhe: ${lockError.message}`);
        if (!lockRows || lockRows.length === 0) {
            // Another request is finalizing right now; the client polls until status = signed
            return json({ status: 'waiting' });
        }
        lockedDocumentId = documentId;

        // 6. ALL SIGNED → STAMP THE PDF (always from the untouched original)
        let arrayBuffer: ArrayBuffer;
        const { data: originalBlob, error: originalError } = await supabase.storage.from('pdfs').download(originalPath);
        if (!originalError && originalBlob) {
            arrayBuffer = await originalBlob.arrayBuffer();
        } else {
            const { data: fileBlob, error: downloadError } = await supabase.storage.from('pdfs').download(filePath);
            if (downloadError) throw new Error(`PDF latausvirhe: ${downloadError.message}`);
            arrayBuffer = await fileBlob.arrayBuffer();
            const { error: copyError } = await supabase.storage
                .from('pdfs')
                .upload(originalPath, arrayBuffer, { upsert: false, contentType: 'application/pdf' });
            if (copyError) console.warn('Alkuperäisen PDF:n varmuuskopio epäonnistui:', copyError.message);
        }

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
        const { error: statusError } = await supabase.from('documents').update({
            status: 'signed',
            document_hash: finalPdfHash,
            updated_at: new Date().toISOString(),
        }).eq('id', documentId);
        if (statusError) throw new Error(`Tilan päivitys epäonnistui: ${statusError.message}`);
        lockedDocumentId = null;

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

        return json({ status: 'done', signedUrl });
    } catch (error: any) {
        console.error('[CRITICAL] Record action error:', error);
        // Release the stamping lock so a retry can proceed immediately
        if (supabase && lockedDocumentId) {
            try {
                await supabase.from('documents').update({ stamping_started_at: null }).eq('id', lockedDocumentId);
            } catch { /* ignore */ }
        }
        return json({ error: error?.message || 'Tuntematon virhe.' }, 400);
    }
});
