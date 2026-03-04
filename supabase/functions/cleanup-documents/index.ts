import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

Deno.serve(async (req) => {
  try {
    // Enforce that this is only callable by the cron job (service role)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find documents that are purely 'signed' and older than 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 2. Find pending/abandoned documents older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Running cleanup. Thresholds: Signed (< ${twentyFourHoursAgo}), Pending (< ${sevenDaysAgo})`);

    // Fetch documents to delete
    // Note: Using a single query with OR logic for efficiency
    const { data: docsToDelete, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_name, status')
      .or(`and(status.eq.signed,updated_at.lt.${twentyFourHoursAgo}),and(status.neq.signed,created_at.lt.${sevenDaysAgo})`);

    if (fetchError) throw fetchError;

    if (!docsToDelete || docsToDelete.length === 0) {
      return new Response(JSON.stringify({ message: "No documents to clean up", deleted_count: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${docsToDelete.length} documents to delete.`);

    let deletedCount = 0;
    const failedDocs = [];

    // 3. Process each document: Delete from Storage FIRST, then from Database
    for (const doc of docsToDelete) {
      const filePath = `${doc.id}/${doc.file_name}`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('pdfs')
        .remove([filePath]);

      if (storageError) {
        console.error(`Failed to delete storage file for ${doc.id}: ${storageError.message}`);
        failedDocs.push({ id: doc.id, reason: 'storage_error' });
        continue; // Skip DB delete if storage delete failed to prevent orphaned files
      }

      // Finally, delete from Database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) {
        console.error(`Failed to delete db row for ${doc.id}: ${dbError.message}`);
        failedDocs.push({ id: doc.id, reason: 'db_error' });
        continue;
      }

      deletedCount++;
    }

    return new Response(JSON.stringify({
      message: "Cleanup finished",
      deleted_count: deletedCount,
      failed_count: failedDocs.length,
      failed_docs: failedDocs
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error('CRON Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
