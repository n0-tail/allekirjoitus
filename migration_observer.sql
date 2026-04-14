-- ============================================================
-- SQL: set_sender_observer_with_email
-- Tukee uutta valinnaista lähettäjän sähköpostia
-- ============================================================

SET search_path TO public;

CREATE OR REPLACE FUNCTION set_sender_observer_with_email(doc_id uuid, new_signer_id text, actual_sender_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_sender text;
  v_new_signer jsonb;
BEGIN
  -- 1. Hae alkuperäinen asiointijärjestyksen lähettäjän sähköposti ("Allekirjoittaja 1")
  SELECT sender_email INTO v_old_sender
  FROM documents WHERE id = doc_id;

  IF v_old_sender IS NULL THEN RETURN; END IF;

  -- 2. Pakkaa "Allekirjoittaja 1" aidoksi vastaanottajaksi muiden joukkoon
  v_new_signer := jsonb_build_object(
      'id', new_signer_id,
      'email', v_old_sender,
      'name', '',
      'signed', false,
      'paid', false
  );

  -- 3. Injektoi taulukkoon, pyyhitään Allekirjoittaja 1 sähköposti ja korvataan todellisella 3rd-party-sähköpostilla
  UPDATE documents
  SET signers = COALESCE(signers, '[]'::jsonb) || v_new_signer,
      sender_email = actual_sender_email,
      sender_signs = false,
      sender_paid = true,
      sender_name = '[Ei allekirjoita]'
  WHERE id = doc_id AND sender_signs = true;
END;
$$;
