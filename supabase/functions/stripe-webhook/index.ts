import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'npm:stripe@^13.0.0';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {

    const signature = req.headers.get('stripe-signature');
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');



    if (!signature || !endpointSecret) {
        console.error('[WEBHOOK] Missing signature or secret. Signature:', !!signature, 'Secret:', !!endpointSecret);
        return new Response('Missing Stripe signature or Webhook secret', { status: 400 });
    }

    try {
        const bodyText = await req.text();

        const event = await stripe.webhooks.constructEventAsync(bodyText, signature, endpointSecret);


        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const { documentId, role, signerId } = paymentIntent.metadata;


            if (documentId && role) {
                // Initialize Supabase admin client
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);

                if (role === 'sender') {
                    if (paymentIntent.metadata.payForAll === 'true') {
                        // Atomic: mark sender + all signers as paid in one SQL operation
                        const { error } = await supabase.rpc('update_all_signers_paid', {
                            doc_id: documentId
                        });
                        if (error) {
                            console.error(`[WEBHOOK] CRITICAL: RPC update_all_signers_paid failed for ${documentId}:`, error.message);
                            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
                        }
                    } else {
                        // Standard single sender payment
                        const { error } = await supabase
                            .from('documents')
                            .update({ sender_paid: true })
                            .eq('id', documentId);

                        if (error) {
                            console.error(`Failed to update DB for ${documentId}:`, error.message);
                            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
                        }
                    }
                } else if (role === 'recipient' && signerId) {
                    // Atomic: mark single signer as paid without read-modify-write
                    const { error } = await supabase.rpc('update_signer_paid', {
                        doc_id: documentId,
                        target_signer_id: signerId
                    });
                    if (error) {
                        console.error(`Failed RPC update_signer_paid for signer ${signerId}:`, error.message);
                        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
                    }
                }

                // --- OMAN KUITIN LÄHETYS (Korvaa Stripen vakion) --- //
                const payerEmail = paymentIntent.metadata.payerEmail;
                const resendApiKey = Deno.env.get('RESEND_API_KEY');
                
                if (payerEmail && resendApiKey) {
                    const totalEur = paymentIntent.amount / 100;
                    const vatRate = 0.255;
                    const vatAmount = (totalEur - (totalEur / (1 + vatRate))).toFixed(2);
                    const netAmount = (totalEur - parseFloat(vatAmount)).toFixed(2);
                    
                    const receiptHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <h2 style="color: #111827; margin-top: 0;">Maksukuitti - Helppo Allekirjoitus</h2>
                        <p style="color: #374151; font-size: 16px; margin-bottom: 25px;">Kiitos maksustasi! Tunnistautumisesi ja maksusi on nyt vahvistettu onnistuneesti.</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 20px 0;">
                            <h3 style="margin-top: 0; font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Maksun ALV-erittely</h3>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 15px;">
                                <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">Veroton hinta</td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">${netAmount} €</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">ALV (25,5 %)</td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">${vatAmount} €</td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 0 4px 0; font-weight: bold; color: #0f172a; font-size: 16px;">Yhteensä maksettu</td>
                                    <td style="padding: 16px 0 4px 0; font-weight: bold; text-align: right; color: #0f172a; font-size: 16px;">${totalEur.toFixed(2).replace('.', ',')} €</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="font-size: 13px; line-height: 1.6; color: #64748b; margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            <strong>Myyjä (Asiakirjan ylläpito):</strong><br/>
                            Polarcomp Oy<br/>
                            Y-tunnus: 3381665-9<br/><br/>
                            <em>Tämä on automaattisesti generoitu alv-kuitti sähköisen allekirjoituksen käsittelymaksusta. Säilytä tämä tosite mahdollista yrityksesi kirjanpitoa varten.</em>
                        </div>
                    </div>`;

                    try {
                        const emailRes = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
                            body: JSON.stringify({
                                from: 'Helppo Allekirjoitus <noreply@helppoallekirjoitus.fi>',
                                to: [payerEmail],
                                subject: 'Kuitti: Sähköisen allekirjoituksen käsittelymaksu',
                                html: receiptHtml,
                            }),
                        });
                        if (!emailRes.ok) {
                            console.error('[WEBHOOK] Failed to send custom receipt:', await emailRes.text());
                        } else {
                            console.log('[WEBHOOK] Custom receipt sent to:', payerEmail);
                        }
                    } catch (err) {
                        console.error('[WEBHOOK] Exception sending receipt:', err);
                    }
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});
