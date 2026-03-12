import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDocs() {
    const { data: docs } = await supabase.from('documents')
        .select('id, sender_name, sender_email, sender_paid, signers, status, created_at, audit_trail')
        .eq('id', '9141a010-be77-47f0-a919-01e0fbd22a7f')
        .order('created_at', { ascending: false })
        .limit(1);

    console.log(JSON.stringify(docs, null, 2));
}

checkDocs();
