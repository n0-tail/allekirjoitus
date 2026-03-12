import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Creating payment intent...");
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { documentId: '047b4822-75db-4b41-babb-65a0d070ff1e', role: 'sender', email: 'test@example.com', payForAll: true }
    });
    console.log("Result:", data);
    if (error) console.error("Error:", error.message);
}
test();
