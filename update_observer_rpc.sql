-- ============================================================
-- SQL: set_sender_observer_with_email - UPDATE (TRUE LOGIC)
-- ============================================================

SET search_path TO public;

DROP FUNCTION IF EXISTS set_sender_observer_with_email(uuid, text, text);
DROP FUNCTION IF EXISTS set_sender_observer_with_email(uuid, text, text, boolean);

CREATE OR REPLACE FUNCTION set_sender_observer_with_email(
    doc_id uuid, 
    new_signer_id text, 
    actual_sender_email text, 
    will_pay boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_sender text;
    v_new_signer jsonb;
BEGIN
  -- 1. Etsitään etusivulla syötetty "Allekirjoittaja 1" (joka pitää edelleen saada allekirjoittaa!)
  SELECT sender_email INTO v_old_sender FROM documents WHERE id = doc_id;

  -- 2. Koska hallinnoija ottaa nyt "sender" -roolin, pakkaamme Allekirjoittaja 1:n muiden vastaanottajien joukkoon!
  v_new_signer := jsonb_build_object(
      'id', new_signer_id,
      'email', v_old_sender,
      'name', '',
      'signed', false,
      'paid', false
  );
  
  -- 3. Päivitetään kanta
  UPDATE documents
  SET signers = COALESCE(signers, '[]'::jsonb) || v_new_signer,
      sender_email = actual_sender_email,
      sender_signs = false,
      sender_paid = NOT will_pay,
      sender_name = '[Ei allekirjoita]'
  WHERE id = doc_id AND sender_signs = true;
END;
$$;
