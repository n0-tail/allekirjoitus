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
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});
