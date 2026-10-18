import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

// Retention policy (matches what the site promises):
//  - signed documents: deleted 24 h after completion
//  - unfinished documents: deleted 7 days after creation
//  - orphan storage folders (upload without DB row): deleted when files are older than 24 h
const SIGNED_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;

type Doc = { id: string; status: string; created_at: string; updated_at: string; audit_trail: any[] | null };

function completedAtMs(doc: Doc): number {
  let latest = Date.parse(doc.updated_at) || 0;
  for (const ev of doc.audit_trail || []) {
    const t = Date.parse(ev?.timestamp);
    if (!Number.isNaN(t) && t > latest) latest = t;
  }
  return latest;
}

Deno.serve(async (req) => {
  try {
    // Only the pg_cron job knows this secret (stored in Vault + function secrets)
    const secret = Deno.env.get('CLEANUP_SECRET');
    if (!secret || req.headers.get('x-cleanup-secret') !== secret) {
      return new Response('Unauthorized', { status: 401 });
    }

    let dryRun = false;
    try { dryRun = (await req.json())?.dryRun === true; } catch { /* empty body */ }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const bucket = supabase.storage.from('pdfs');
    const now = Date.now();

    // 1. Load all documents (small table; paginate defensively)
    const docs: Doc[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('documents')
        .select('id, status, created_at, updated_at, audit_trail')
        .range(from, from + 999);
      if (error) throw error;
      docs.push(...(data as Doc[]));
      if (!data || data.length < 1000) break;
    }

    const toDelete = docs
      .map((d) => {
        if (d.status === 'signed') {
          const age = now - completedAtMs(d);
          return age > SIGNED_TTL_MS ? { id: d.id, status: d.status, age_hours: Math.round(age / 3.6e6) } : null;
        }
        const age = now - Date.parse(d.created_at);
        return age > PENDING_TTL_MS ? { id: d.id, status: d.status, age_hours: Math.round(age / 3.6e6) } : null;
      })
      .filter(Boolean) as { id: string; status: string; age_hours: number }[];

    // Collect every file under a document folder (incl. one level of subfolders, e.g. _original/)
    const listFiles = async (prefix: string): Promise<{ paths: string[]; newestMs: number }> => {
      const paths: string[] = [];
      let newestMs = 0;
      const { data, error } = await bucket.list(prefix, { limit: 1000 });
      if (error) throw error;
      for (const entry of data || []) {
        if (entry.id) {
          paths.push(`${prefix}/${entry.name}`);
          const t = Date.parse((entry as any).created_at);
          if (!Number.isNaN(t) && t > newestMs) newestMs = t;
        } else {
          const sub = await listFiles(`${prefix}/${entry.name}`);
          paths.push(...sub.paths);
          newestMs = Math.max(newestMs, sub.newestMs);
        }
      }
      return { paths, newestMs };
    };

    // 2. Orphan folders in storage (no DB row)
    const docIds = new Set(docs.map((d) => d.id));
    const orphans: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list('', { limit: 1000, offset });
      if (error) throw error;
      for (const entry of data || []) {
        if (!entry.id && !docIds.has(entry.name)) orphans.push(entry.name);
      }
      if (!data || data.length < 1000) break;
    }

    if (dryRun) {
      return new Response(JSON.stringify({ dryRun: true, documents: toDelete.length, candidates: toDelete, orphan_folders: orphans.length }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let deletedCount = 0;
    let orphanCount = 0;
    const failedDocs: { id: string; reason: string }[] = [];

    // 3. Delete storage first, then the DB row (cascades to identity tables; hash stays in document_hashes)
    for (const doc of toDelete) {
      try {
        const { paths } = await listFiles(doc.id);
        if (paths.length > 0) {
          const { error: storageError } = await bucket.remove(paths);
          if (storageError) {
            failedDocs.push({ id: doc.id, reason: 'storage_error' });
            continue;
          }
        }
        const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id);
        if (dbError) {
          failedDocs.push({ id: doc.id, reason: 'db_error' });
          continue;
        }
        deletedCount++;
      } catch (e) {
        console.error(`Cleanup failed for ${doc.id}:`, e);
        failedDocs.push({ id: doc.id, reason: 'exception' });
      }
    }

    for (const folder of orphans) {
      try {
        const { paths, newestMs } = await listFiles(folder);
        // Never touch a folder whose upload might still be in progress
        if (paths.length === 0 || now - newestMs < ORPHAN_TTL_MS) continue;
        const { error } = await bucket.remove(paths);
        if (!error) orphanCount++;
      } catch (e) {
        console.error(`Orphan cleanup failed for ${folder}:`, e);
      }
    }

    console.log(`Cleanup: deleted ${deletedCount} documents, ${orphanCount} orphan folders, ${failedDocs.length} failures`);
    return new Response(JSON.stringify({
      message: "Cleanup finished",
      deleted_count: deletedCount,
      orphan_folders_deleted: orphanCount,
      failed_count: failedDocs.length,
      failed_docs: failedDocs,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error('CRON Error:', error);
    return new Response(JSON.stringify({ error: 'Cleanup failed' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
