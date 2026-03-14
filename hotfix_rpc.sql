-- HOTFIX: Fix get_document_by_id - remove non-existent recipient_email column

DROP FUNCTION IF EXISTS get_document_by_id(uuid);

CREATE OR REPLACE FUNCTION get_document_by_id(doc_id uuid)
RETURNS TABLE (
  id uuid,
  sender_email text,
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
        'signed'::text AS status,
        NULL::text AS file_name, 
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
