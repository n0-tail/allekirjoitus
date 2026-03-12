import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.rpc('get_document_by_id', { doc_id: '1ba4c66d-8a09-4377-8bf2-470969c57865' });
    console.log("RPC result:", JSON.stringify(data, null, 2));
    console.log("Error:", error);
}
check();
