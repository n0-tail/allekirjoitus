import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'npm:stripe@^13.0.0'

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
    const { documentId, role, email } = await req.json().catch(() => ({ documentId: 'unknown', role: 'unknown', email: '' }))

    // 0.50 EUR = 50 cents (Stripe minimum amount)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 50,
      currency: 'eur',
      receipt_email: email || undefined,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        documentId: documentId || 'unknown',
        role: role || 'unknown'
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
