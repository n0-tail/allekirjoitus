const { createClient } = require('@supabase/supabase-js');

// To run this, I will use the VITE_ variables from the .env or secrets
require('dotenv').config({ path: '.env.local' }); // Or standard .env if no .env.local

const url = process.env.VITE_SUPABASE_URL || 'https://vjyugemmqwghvdmbcpek.supabase.co';
// Need the service key to bypass RLS, or anon key if RLS allows reading 'documents'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!key) {
    console.error("No Supabase key found in env vars.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase
        .from('documents')
        .select('id, sender_paid, signers, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("RECENT DOCS (last 3):");
        console.dir(data, { depth: null });
    }
}

check();
