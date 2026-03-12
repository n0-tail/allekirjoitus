import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmail() {
    const { data: docs } = await supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(2);
    if (!docs || docs.length === 0) {
        console.log('No documents found');
        return;
    }

    // Test the first doc
    const docId = docs[0].id;
    console.log('Testing email for document:', docId);

    // See payment status
    console.log('Doc statuses:', docs.map(d => ({
        id: d.id,
        sender_paid: d.sender_paid,
        signers: d.signers,
        created_at: d.created_at
    })));

    const { data, error } = await supabase.functions.invoke('send-email', {
        body: { documentId: docId, emailType: 'invitation' }
    });
    console.log('send-email Result:', data);
    console.log('send-email Error:', error);
}

testEmail();
