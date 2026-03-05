import { createClient } from "npm:@supabase/supabase-js@2.39.8";

// The supabase admin key should be retrieved from process.env if available
const supabaseUrl = process.env.SUPABASE_URL || 'https://vjyugemmqwghvdmbcpek.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING';

// We just want to safely query the 'documents' table to look at 'signers'
async function run() {
    if (supabaseServiceKey === 'MISSING') {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Cannot test DB directly.");
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.from('documents').select('*').limit(3).order('created_at', { ascending: false });
    console.dir(data, { depth: null });
}

run();
