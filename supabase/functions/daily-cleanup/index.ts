import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create Supabase client with Service Role Key to bypass RLS
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Security: Ensure this function is called either securely via pg_cron (auth context)
        // or ensure it just does predictable cleanup without exposing data.
        // If called externally, rely on authorization header (optional depending on use case).

        console.log("Starting daily cleanup of documents older than 30 days...");

        // Calculate the cutoff date (30 days ago)
        const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Delete rows from public.documents older than 30 days
        // (This auto-cascades to nothing since document_hashes isn't a foreign key constraint)
        const { data, error, count } = await supabase
            .from('documents')
            .delete({ count: 'exact' })
            .lt('updated_at', date30DaysAgo);

        if (error) {
            throw error;
        }

        console.log(`Successfully purged ${count || 0} old documents.`);

        return new Response(JSON.stringify({ 
            success: true, 
            message: `Purged ${count || 0} old documents.`,
            cutoffDate: date30DaysAgo
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (err: any) {
        console.error("Cleanup error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
