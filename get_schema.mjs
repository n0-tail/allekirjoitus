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
        .limit(5);

    if (error) {
        console.error("Error fetching docs:", error);
        return;
    }

    console.log("Found documents:", data?.length);
    if (data && data.length > 0) {
        console.log("Keys of a document:", Object.keys(data[0]));
        fs.writeFileSync('matti_docs.json', JSON.stringify(data, null, 2));
        console.log("Saved docs to matti_docs.json");
    } else {
        // maybe try searching by recipients array if that exists
    }
}

run();
