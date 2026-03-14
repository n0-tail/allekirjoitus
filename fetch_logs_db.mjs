import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function checkDatabaseForErrors() {
    console.log("Checking for any failed documents or error logs in the database...");
    
    // Check documents stuck in 'pending' status for more than a day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: stuckDocs, error: docError } = await supabase
        .from('documents')
        .select('id, file_name, status, created_at, sender_email, sender_paid, signers')
        .eq('status', 'pending')
        .lt('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(10);
        
    if (docError) {
        console.error("Error fetching stuck docs:", docError);
    } else {
        console.log(`Found ${stuckDocs.length} documents stuck in pending status older than 24 hours.`);
        console.log(JSON.stringify(stuckDocs, null, 2));
    }

    // Since we don't have a dedicated error table, let's also fetch the 10 most recent docs to see their status
    const { data: recentDocs, error: recentError } = await supabase
        .from('documents')
        .select('id, file_name, status, created_at, sender_email, sender_paid, signers')
        .order('created_at', { ascending: false })
        .limit(10);

    if (recentError) {
        console.error("Error fetching recent docs:", recentError);
    } else {
        console.log(`\nHere are the 10 most recent documents and their statuses:`);
        console.log(JSON.stringify(recentDocs, null, 2));
    }
}

checkDatabaseForErrors();
