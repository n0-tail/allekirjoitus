import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function setupAndTest() {
    const docId = "9141a010-be77-47f0-a919-01e0fbd22a7f";

    // 1. Force the document to have a sender_name so it tries to finalize when recipient signs
    await supabase.from('documents').update({ sender_name: "Antti Nikkanen" }).eq('id', docId);

    // 2. Now run the recipient payload
    const payload = {
        documentId: docId,
        fileName: "Tuloslaskelma 12.2025 (1).pdf",
        role: "recipient",
        verifiedName: "Teppo Testaaja",
        sender: "antti.nikkanen@polarcomp.fi",
        recipient: "antti.nikkanen@polarcomp.fi",
        signerId: "6df06bb5-5413-4826-b104-f3fbc761e8c0"
    };

    console.log("Calling record-action...");
    const res = await fetch("https://vjyugemmqwghvdmbcpek.supabase.co/functions/v1/record-action", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`);
    try {
        console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
        console.log(text);
    }
}

setupAndTest().catch(console.error);
