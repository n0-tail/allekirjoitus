import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// In order to test webhook effect, we will just use Anon key or Service key locally to
// create a document with signers, then execute the exact JS map logic that the webhook does.
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function simulateWebhookLogic() {
    const documentId = '5588496e-b2ae-464a-b291-7efcd3068ec6'; // The ID that had the bug
    console.log("Fetching the doc:", documentId);

    const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('signers')
        .eq('id', documentId)
        .single();

    if (fetchError || !doc) {
        console.error("Fetch returned error:", fetchError);
        return;
    }

    console.log("Fetched signers before mapping:");
    console.log(JSON.stringify(doc.signers, null, 2));

    const updatedSigners = (doc.signers || []).map((s) => ({ ...s, paid: true }));

    console.log("Mapped signers (this is what the webhook attempts to save):");
    console.log(JSON.stringify(updatedSigners, null, 2));
}

simulateWebhookLogic();
