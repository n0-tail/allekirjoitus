import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns a short-lived signed download URL for a document's PDF.
// Replaces direct anonymous storage access (which also allowed listing every customer's files).
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    try {
        const { documentId } = await req.json();
        if (typeof documentId !== 'string' || !UUID_RE.test(documentId)) {
            return json({ error: 'Virheellinen asiakirjan tunniste.' }, 400);
        }

        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        const { data: doc, error } = await supabase
            .from('documents')
            .select('file_name')
            .eq('id', documentId)
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!doc) return json({ error: 'Asiakirjaa ei löytynyt.' }, 404);

        const safeFileName = doc.file_name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const { data: urlData, error: urlError } = await supabase.storage
            .from('pdfs')
            .createSignedUrl(`${documentId}/${safeFileName}`, 60);

        if (urlError || !urlData?.signedUrl) {
            return json({ error: 'Tiedostoa ei löytynyt.' }, 404);
        }

        return json({ signedUrl: urlData.signedUrl });
    } catch (err: unknown) {
        console.error('get-download-url error:', err);
        return json({ error: 'Latauslinkin luonti epäonnistui.' }, 500);
    }
});
