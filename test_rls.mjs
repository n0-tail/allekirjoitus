import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey); // Use ANON key to simulate a hacker/public user

async function testRLS() {
    console.log("Testing RLS Policy Vulnerability...");

    // Try to fetch ALL documents without filtering by ID
    const { data, error } = await supabase.from('documents').select('id, sender_email, file_name');

    if (error) {
        console.log("✅ Secure: RLS blocked the query or threw an error:", error.message);
    } else {
        if (data && data.length > 1) {
            console.log(`❌ VULNERABLE: Fetched ${data.length} documents without knowing their IDs!`);
            console.log(data.slice(0, 3)); // Show first 3 leaked docs
        } else {
            console.log("Needs more data or query failed silently.");
        }
    }
}

testRLS();
