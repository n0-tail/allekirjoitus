-- 1. Create the document_hashes table
CREATE TABLE IF NOT EXISTS public.document_hashes (
    id uuid PRIMARY KEY,
    document_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on document_hashes (but don't grant any public access since we use SECURITY DEFINER RPC)
ALTER TABLE public.document_hashes ENABLE ROW LEVEL SECURITY;

-- 3. Create a trigger function to sync hashes
CREATE OR REPLACE FUNCTION sync_document_hash()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.document_hash IS NOT NULL THEN
        INSERT INTO public.document_hashes (id, document_hash)
        VALUES (NEW.id, NEW.document_hash)
        ON CONFLICT (id) DO UPDATE SET document_hash = EXCLUDED.document_hash;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach the trigger to public.documents
DROP TRIGGER IF EXISTS trg_sync_document_hash ON public.documents;
CREATE TRIGGER trg_sync_document_hash
AFTER INSERT OR UPDATE OF document_hash ON public.documents
FOR EACH ROW
EXECUTE FUNCTION sync_document_hash();

-- 5. Backfill existing document hashes
INSERT INTO public.document_hashes (id, document_hash, created_at)
SELECT id, document_hash, created_at
FROM public.documents
WHERE document_hash IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 6. Update the validity checker RPC to check both tables and return a unified shape
-- First, drop the old one because the return type is changing
DROP FUNCTION IF EXISTS get_document_by_id(uuid);

CREATE OR REPLACE FUNCTION get_document_by_id(doc_id uuid)
RETURNS TABLE (
  id uuid,
  sender_email text,
  recipient_email text,
  status text,
  file_name text,
  audit_trail jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  document_hash text,
  sender_name text,
  sender_paid boolean,
  signers jsonb,
  is_purged boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_record RECORD;
  hash_record RECORD;
BEGIN
  -- Etsi aktiivinen asiakirja
  SELECT * INTO doc_record FROM public.documents WHERE public.documents.id = doc_id;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      doc_record.id, 
      doc_record.sender_email, 
      doc_record.recipient_email, 
      doc_record.status,
      doc_record.file_name, 
      doc_record.audit_trail, 
      doc_record.created_at, 
      doc_record.updated_at,
      doc_record.document_hash, 
      doc_record.sender_name, 
      doc_record.sender_paid, 
      doc_record.signers,
      false AS is_purged;
  ELSE
    -- Etsi tiivistetaulusta (purged documents)
    SELECT * INTO hash_record FROM public.document_hashes WHERE public.document_hashes.id = doc_id;
    IF FOUND THEN
      RETURN QUERY SELECT 
        hash_record.id, 
        '[POISTETTU]'::text AS sender_email, 
        '[POISTETTU]'::text AS recipient_email, 
        'signed'::text AS status,
        'Nimi poistettu (Yli 30 vrk vanha asiakirja)'::text AS file_name, 
        '[]'::jsonb AS audit_trail, 
        hash_record.created_at AS created_at, 
        hash_record.created_at AS updated_at,
        hash_record.document_hash AS document_hash, 
        '[POISTETTU]'::text AS sender_name, 
        true AS sender_paid, 
        '[]'::jsonb AS signers,
        true AS is_purged;
    END IF;
  END IF;
END;
$$;
