import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Reading DB recent item:");
    const { data: docs } = await supabase.from('documents').select('id, sender_paid, signers, created_at').order('created_at', { ascending: false }).limit(2);
    console.log(JSON.stringify(docs, null, 2));
}
test();
