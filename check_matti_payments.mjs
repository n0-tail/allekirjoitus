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

    if (error) {
        console.error("Error fetching docs:", error);
        return;
    }

    console.log("Total Matti docs:", data?.length);

    const paidDocs = data.filter(d => d.sender_paid === true);
    console.log("Paid docs:", paidDocs.length);

    if (paidDocs.length > 0) {
        fs.writeFileSync('matti_paid.json', JSON.stringify(paidDocs, null, 2));
        console.log("Saved paid docs to matti_paid.json");
    } else {
        // Check if any audit_trail has stripe/payment
        const auditDocs = data.filter(d => JSON.stringify(d.audit_trail).includes('payment') || JSON.stringify(d.audit_trail).includes('stripe') || JSON.stringify(d.audit_trail).includes('pay'));
        console.log("Docs with payment in audit trail:", auditDocs.length);
        fs.writeFileSync('matti_audit.json', JSON.stringify(auditDocs, null, 2));
        console.log("Saved audit docs to matti_audit.json");
    }

    // also get the most recent one
    if (data.length > 0) {
        fs.writeFileSync('matti_latest.json', JSON.stringify(data[0], null, 2));
    }
}

run();
