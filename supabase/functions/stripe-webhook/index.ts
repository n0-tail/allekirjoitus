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
                        // Fetch doc to get the current signers array
                        const { data: doc, error: fetchError } = await supabase
                            .from('documents')
                            .select('signers')
                            .eq('id', documentId)
                            .single();

                        let updatedSigners = doc?.signers || [];
                        if (!fetchError && doc && doc.signers) {
                            updatedSigners = doc.signers.map((s: any) => ({ ...s, paid: true }));
                        }

                        const { error } = await supabase
                            .from('documents')
                            .update({ sender_paid: true, signers: updatedSigners })
                            .eq('id', documentId);

                        if (error) {
                            console.error(`Failed to update DB for ${documentId} with payForAll:`, error.message);
                        } else {
                            console.log(`Payment confirmed for ${documentId} (Role: sender, payForAll: true)`);
                        }
                    } else {
                        // Standard single payment
                        const { error } = await supabase
                            .from('documents')
                            .update({ sender_paid: true })
                            .eq('id', documentId);

                        if (error) {
                            console.error(`Failed to update DB for ${documentId}:`, error.message);
                        } else {
                            console.log(`Payment confirmed for ${documentId} (Role: sender)`);
                        }
                    }
                } else if (role === 'recipient' && signerId) {
                    // Fetch existing signers
                    const { data: doc, error: fetchError } = await supabase
                        .from('documents')
                        .select('signers')
                        .eq('id', documentId)
                        .single();

                    if (fetchError || !doc) {
                        console.error(`Failed to fetch doc for signer update ${documentId}:`, fetchError?.message);
                        return new Response('Error fetching document', { status: 500 });
                    }

                    // Mutate array
                    const updatedSigners = doc.signers.map((s: any) =>
                        s.id === signerId ? { ...s, paid: true } : s
                    );

                    const { error } = await supabase
                        .from('documents')
                        .update({ signers: updatedSigners })
                        .eq('id', documentId);

                    if (error) {
                        console.error(`Failed to update DB for signer ${signerId}:`, error.message);
                    } else {
                        console.log(`Payment confirmed for signer ${signerId}`);
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
