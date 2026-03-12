import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing STRIPE_SECRET_KEY");
    process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

async function check() {
    console.log("Fetching recent payment intents...");
    try {
        const intents = await stripe.paymentIntents.list({ limit: 5 });
        for (const pi of intents.data) {
            console.log(`[${pi.created}] ID: ${pi.id}, amount: ${pi.amount}, metadata:`, pi.metadata);
        }
    } catch (e) {
        console.error(e);
    }
}
check();
