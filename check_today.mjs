import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    // List all document IDs we can find via direct table (RLS may block, but let's try)
    const { data: allDocs, error: listErr } = await supabase
        .from('documents')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(50);

    if (listErr) {
        console.log("Suora tauluhaku estetty RLS:llä (odotettu):", listErr.message);
        console.log("Kokeillaan tunnettuja ID:itä RPC:llä...\n");
    }

    const ids = (allDocs || []).map(d => d.id);
    
    // If no IDs from direct query, try the known test ID
    if (ids.length === 0) {
        console.log("RLS estää suoran haun. Haetaan kaikki tunnetut ID:t...");
        // Try listing from document_hashes table too
        const { data: hashes } = await supabase.from('document_hashes').select('id').limit(50);
        if (hashes) ids.push(...hashes.map(h => h.id));
    }

    console.log(`Löydetty ${ids.length} asiakirja-ID:tä.\n`);

    const printDoc = (doc) => {
        const signers = doc.signers || [];
        const signedCount = signers.filter(s => s.signed).length;
        console.log(`ID: ${doc.id}`);
        console.log(`  Tiedosto: ${doc.file_name}`);
        console.log(`  Lähettäjä: ${doc.sender_email}`);
        console.log(`  Lähettäjän nimi: ${doc.sender_name || '(ei tunnistautunut)'}`);
        console.log(`  Lähettäjä maksanut: ${doc.sender_paid ? 'Kyllä' : 'Ei'}`);
        console.log(`  Status: ${doc.status}`);
        console.log(`  Purged: ${doc.is_purged}`);
        console.log(`  Vastaanottajat: ${signers.length} kpl (allekirjoittanut: ${signedCount})`);
        for (const s of signers) {
            console.log(`    - ${s.email} | paid: ${s.paid || false} | signed: ${s.signed || false} | name: ${s.name || '(ei tunnistautunut)'}`);
        }
        console.log(`  Hash: ${doc.document_hash || '(ei vielä)'}`);
        console.log(`  Luotu: ${doc.created_at}`);
        console.log(`  Päivitetty: ${doc.updated_at}`);
        console.log('');
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayDocs = [];
    const olderDocs = [];

    for (const id of ids) {
        const { data: rpcResult } = await supabase.rpc('get_document_by_id', { doc_id: id });
        const doc = rpcResult?.[0];
        if (!doc) continue;

        if (new Date(doc.created_at) >= todayStart || new Date(doc.updated_at) >= todayStart) {
            todayDocs.push(doc);
        } else {
            olderDocs.push(doc);
        }
    }

    console.log(`\n=== Tänään aktiiviset asiakirjat (${todayDocs.length} kpl) ===\n`);
    todayDocs.forEach(printDoc);

    if (olderDocs.length > 0) {
        console.log(`\n=== Vanhemmat asiakirjat (${olderDocs.length} kpl) ===\n`);
        olderDocs.forEach(printDoc);
    }
}

check();
