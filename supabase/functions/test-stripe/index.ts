import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'npm:stripe@^13.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (_req) => {
  try {
    const events = await stripe.events.list({
      type: 'payment_intent.succeeded',
      limit: 5
    });

    const parsedEvents = events.data.map(e => ({
      id: e.id,
      created: new Date(e.created * 1000).toISOString(),
      metadata: e.data.object.metadata,
      amount: e.data.object.amount
    }));

    return new Response(JSON.stringify(parsedEvents, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
