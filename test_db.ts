import { createClient } from "npm:@supabase/supabase-js@2.39.8";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log("URL:", supabaseUrl ? "Exists" : "Missing");
console.log("KEY:", supabaseServiceKey ? "Exists" : "Missing");

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const documentId = '5a68d0bb-cde7-4560-af60-5f2ca0bd1e43'; // Just an example, we will see if we can query anything

async function run() {
    const { data: docs, error } = await supabase.from('documents').select('id, sender_paid, signers').limit(5);
    console.log("Recent docs:", docs);
    console.log("Error:", error);
}

run();
