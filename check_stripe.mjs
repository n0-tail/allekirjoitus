import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We only have the publishable key. We cannot query Stripe without the secret key.
// But wait! Do I have the webhook secret or anything? No.
// Is there any edge function I can invoke to test the webhook? No.
