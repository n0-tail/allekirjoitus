import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL || 'https://vjyugemmqwghvdmbcpek.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!key) {
    console.error("No key found");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log("Fetching last 3 docs...");
    const { data, error } = await supabase
        .from('documents')
        .select('id, sender_email, sender_paid, signers, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error("DB Error:", error);
    } else {
        console.dir(data, { depth: null });
    }
}
check();
