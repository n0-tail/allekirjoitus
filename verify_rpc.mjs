import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
    console.log("Testing RPC get_document...");

    // Create a dummy UUID
    const id = "123e4567-e89b-12d3-a456-426614174000";

    // Call RPC
    const { data, error } = await supabase.rpc('get_document', { doc_id: id }).single();

    console.log("Data:", data);
    console.log("Error:", error);
}

test();
