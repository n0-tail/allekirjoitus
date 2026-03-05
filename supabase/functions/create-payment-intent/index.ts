import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'npm:stripe@^13.0.0'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentId, role, email, signerId, payForAll } = await req.json().catch(() => ({ documentId: 'unknown', role: 'unknown', email: '', signerId: undefined, payForAll: false }))

    let finalAmount = 50; // default 50 cents testing minimum

    if (payForAll && role === 'sender' && documentId !== 'unknown') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: doc, error } = await supabase.from('documents').select('signers').eq('id', documentId).single();
      if (!error && doc && doc.signers) {
        // Sender + all signers
        finalAmount = (1 + doc.signers.length) * 50;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'eur',
      receipt_email: email || undefined,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        documentId: documentId || 'unknown',
        role: role || 'unknown',
        ...(signerId ? { signerId } : {}),
        ...(payForAll ? { payForAll: 'true' } : {})
      }
    })

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
