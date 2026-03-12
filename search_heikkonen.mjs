import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .or('sender_email.ilike.%heikkonen%,sender_name.ilike.%heikkonen%')
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    console.log(`Found ${data.length} documents for heikkonen`);
    data.forEach(d => {
        console.log(`${d.created_at} | ${d.file_name} | status:${d.status} | paid:${d.sender_paid} | signers:${d.signers?.length}`);
    });

    if (data.length > 0) {
        const fs = await import('fs');
        fs.writeFileSync('heikkonen_docs.json', JSON.stringify(data, null, 2));
    }
}
run();
