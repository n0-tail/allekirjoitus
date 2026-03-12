import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

async function check() {
    const events = await stripe.events.list({ type: 'payment_intent.succeeded', limit: 3 });
    events.data.forEach(e => {
        console.log("Event ID:", e.id, "Created:", new Date(e.created * 1000).toISOString());
        console.log("Metadata:", e.data.object.metadata);
    });
}
check();
