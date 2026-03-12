import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .ilike('sender_email', '%matti%')
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    let out = "Matti docs summary:\n";
    data.forEach(d => {
        out += `${d.created_at} | ${d.file_name} | status:${d.status} | paid:${d.sender_paid} | signers:${d.signers?.length}\n`;
    });
    fs.writeFileSync('matti_summary.txt', out);
}
run();
