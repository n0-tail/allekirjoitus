import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Searching in documents for sender_email or recipient_email containing matti...");

    const { data: docsSender, error: errSender } = await supabase
        .from('documents')
        .select('*')
        .ilike('sender_email', '%matti%');

    if (errSender) console.error("Error sender:", errSender);

    const { data: docsRec, error: errRec } = await supabase
        .from('documents')
        .select('*')
        .ilike('recipient_email', '%matti%');

    if (errRec) console.error("Error recipient:", errRec);

    console.log("Found as sender:", docsSender?.length);
    console.log("Found as recipient:", docsRec?.length);

    fs.writeFileSync('query_results.json', JSON.stringify({
        asSender: docsSender,
        asRecipient: docsRec
    }, null, 2));
    console.log("Results written to query_results.json");
}

run();
