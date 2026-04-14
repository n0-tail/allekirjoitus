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

    let finalAmount = 149; // 1.49 euro processing fee

    if (documentId !== 'unknown') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: doc, error } = await supabase.from('documents').select('sender_paid, signers, sender_signs').eq('id', documentId).single();

      if (!error && doc) {
        // Double-check if already paid to prevent race conditions or double billing
        if (role === 'sender' && doc.sender_paid) {
          return new Response(JSON.stringify({ alreadyPaid: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
        if (role === 'recipient' && signerId) {
          const sTarget = doc.signers?.find((s: any) => s.id === signerId);
          if (sTarget?.paid) {
            return new Response(JSON.stringify({ alreadyPaid: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }
        }

        if (payForAll && role === 'sender' && doc.signers) {
          if (doc.sender_signs === false) {
             finalAmount = doc.signers.length * 149;
          } else {
             // Sender + all signers
             finalAmount = (1 + doc.signers.length) * 149;
          }
        }
      }
    }

    const numParties = payForAll && role === 'sender' ? Math.round(finalAmount / 149) : 1;
    const netAmount = (finalAmount / 1.255).toFixed(2).replace('.', ',');
    const vatAmount = (finalAmount - finalAmount / 1.255).toFixed(0);
    const description = numParties > 1
      ? `Sähköinen allekirjoitus – käsittelymaksu ${numParties} osapuolelle (sis. ALV 25,5 %)`
      : `Sähköinen allekirjoitus – käsittelymaksu (sis. ALV 25,5 %)`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'eur',
      description,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        documentId: documentId || 'unknown',
        role: role || 'unknown',
        ...(signerId ? { signerId } : {}),
        payForAll: payForAll ? 'true' : 'false',
        vat_rate: '25.5',
        vat_included: 'true',
        payerEmail: email || '',
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
