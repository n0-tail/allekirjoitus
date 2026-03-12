import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFlow() {
    console.log("1. Checking Database Connection...");
    const { data: testData, error: dbError } = await supabase.from('documents').select('id').limit(1);
    if (dbError) {
        console.error("DB Error:", dbError);
        return;
    }
    console.log("DB Connection OK. Found document IDs.");

    console.log("\n2. Checking Stripe Edge Function endpoint...");
    // Try to create a dummy payment intent to verify price has updated to 1.49 (149 cents)
    try {
        const payRes = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ documentId: 'dummy-id', payForAll: false })
        });

        // We expect this to fail or return a test intent, we just want to see if it processes correctly
        const payData = await payRes.json();
        console.log("Payment Intent Result:", payData);
        if (payData.clientSecret) {
            console.log("✅ Payment Intent created successfully.");
        }
    } catch (e) {
        console.error("Error creating payment intent:", e);
    }

    console.log("\nTest flow completed.");
}

checkFlow();
