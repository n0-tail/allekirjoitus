import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const correctName = 'Milja Marjatta Heinonen';
const docIds = ['a59b9354-c28f-469c-b4b7-443ebe42040b', '1c4b7e62-fa20-4cad-8f5a-92c7ec7a97e2'];

async function run() {
  for (const docId of docIds) {
    // 1. Fetch current document state
    const { data: doc } = await supabase.from('documents').select('audit_trail, file_name, sender_email').eq('id', docId).single();
    if (!doc) continue;

    // 2. Filter out the dirty "MILJA HELIN" entries from sender
    const cleanAuditTrail = doc.audit_trail.filter(entry => entry.name !== 'MILJA HELIN');

    // 3. Update the database directly so the base state is clean
    const { error: updErr } = await supabase.from('documents').update({
      sender_name: correctName,
      audit_trail: cleanAuditTrail,
      status: 'pending' // temporarily set to pending to ensure edge function stamps it properly if needed, actually edge function doesn't care
    }).eq('id', docId);

    if (updErr) console.error("Error updating DB:", updErr);

    console.log(`Document ${docId} DB cleaned up.`);

    // 4. Force a re-stamp and re-email by essentially simulating sender auth again
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('record-action', {
      body: {
        documentId: docId,
        role: 'sender',
        verifiedName: correctName,
        sender: doc.sender_email,
        recipient: '',
        signerId: '',
        fileName: doc.file_name
      }
    });

    console.log(`Edge function result for ${docId}:`, edgeErr || edgeData);
  }
}

run();
