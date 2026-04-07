-- ============================================================
-- COMBINED MIGRATION: atomic signers + observer mode + ALV
-- Aja tämä kokonaisuudessaan Supabase SQL Editorissa
-- ============================================================

-- Varmistetaan oikea schema
SET search_path TO public;

-- ============================================================
-- PART 1: Atomiset signer-päivitykset (race condition fix)
-- ============================================================

CREATE OR REPLACE FUNCTION update_signer_signed(
    doc_id uuid,
    target_signer_id text,
    signer_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE documents
    SET signers = (
        SELECT jsonb_agg(
            CASE
                WHEN elem->>'id' = target_signer_id
                THEN elem || jsonb_build_object('name', signer_name, 'signed', true)
                ELSE elem
            END
        )
        FROM jsonb_array_elements(signers) AS elem
    ),
    updated_at = now()
    WHERE id = doc_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_signer_paid(
    doc_id uuid,
    target_signer_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE documents
    SET signers = (
        SELECT jsonb_agg(
            CASE
                WHEN elem->>'id' = target_signer_id
                THEN elem || jsonb_build_object('paid', true)
                ELSE elem
            END
        )
        FROM jsonb_array_elements(signers) AS elem
    ),
    updated_at = now()
    WHERE id = doc_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_all_signers_paid(
    doc_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE documents
    SET
        sender_paid = true,
        signers = (
            SELECT jsonb_agg(elem || jsonb_build_object('paid', true))
            FROM jsonb_array_elements(signers) AS elem
        ),
        updated_at = now()
    WHERE id = doc_id;
END;
$$;

-- ============================================================
-- PART 2: Observer-moodi (sender ei allekirjoita)
-- ============================================================

-- Uusi sarake: sender_signs (DEFAULT true = taaksepäin yhteensopiva)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS sender_signs boolean DEFAULT true;

-- RPC: Merkitse lähettäjä observeriksi (kutsutaan frontendistä)
CREATE OR REPLACE FUNCTION set_sender_observer(doc_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE documents 
    SET sender_signs = false, sender_paid = true, sender_name = '[Ei allekirjoita]'
    WHERE id = doc_id AND sender_signs = true;
END;
$$;

-- ============================================================
-- PART 3: Päivitetty get_document_by_id (lisätty sender_signs)
-- ============================================================

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
  is_purged boolean,
  sender_signs boolean
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
      false AS is_purged,
      doc_record.sender_signs;
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
        true AS is_purged,
        true AS sender_signs;
    END IF;
  END IF;
END;
$$;
