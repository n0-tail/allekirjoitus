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
            const { documentId, role } = paymentIntent.metadata;

            if (documentId && role) {
                // Initialize Supabase admin client
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);

                const statusField = role === 'sender' ? 'sender_paid' : 'recipient_paid';

                // Assuming you might add these columns to your table. 
                // For now, we just update the generic 'status' if it's the sender, 
                // or just log it to ensure the webhook works without breaking existing schema too much.
                const { error } = await supabase
                    .from('documents')
                    .update({ status: statusField })
                    .eq('id', documentId);

                if (error) {
                    console.error(`Failed to update DB for ${documentId}:`, error.message);
                } else {
                    console.log(`Payment confirmed for ${documentId} (Role: ${role})`);
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});
