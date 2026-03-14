import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Stripe from 'stripe';

async function fetchStripeEvents() {
    // Stripe secret key could be in multiple formats in .env.local
    const secretKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
    
    if (!secretKey) {
        console.error("No Stripe secret key found in .env.local");
        return;
    }

    const stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
    });

    console.log("Fetching recent Stripe events...");
    try {
        const events = await stripe.events.list({ limit: 10 });
        console.log(JSON.stringify(events.data.map(e => ({ 
            type: e.type, 
            created: new Date(e.created * 1000).toISOString(), 
            id: e.id, 
            resourceId: e.data.object.id,
            status: e.data.object.status,
            metadata: e.data.object.metadata
        })), null, 2));
    } catch (e) {
        console.error("Error fetching events:", e);
    }
}

fetchStripeEvents();
