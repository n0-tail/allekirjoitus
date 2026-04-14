-- ============================================================
-- SQL: set_sender_observer_with_email - UPDATE (FIXED OVERLOAD)
-- ============================================================

SET search_path TO public;

-- 1. Poistetaan Varmuuden vuoksi kaikki vanhat versiot, jotta PostgREST ei mene sekaisin (Overloading virhe)
DROP FUNCTION IF EXISTS set_sender_observer_with_email(uuid, text, text);
DROP FUNCTION IF EXISTS set_sender_observer_with_email(uuid, text, text, boolean);

-- 2. Luodaan uusi oikea versio
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
  -- Hae alkuperäinen asiointijärjestyksen lähettäjän sähköposti ("Allekirjoittaja 1")
  SELECT sender_email INTO v_old_sender
  FROM documents WHERE id = doc_id;

  IF v_old_sender IS NULL THEN RETURN; END IF;

  -- Pakkaa "Allekirjoittaja 1" aidoksi vastaanottajaksi muiden joukkoon
  v_new_signer := jsonb_build_object(
      'id', new_signer_id,
      'email', v_old_sender,
      'name', '',
      'signed', false,
      'paid', false
  );

  -- Injektoi taulukkoon, pyyhitään Allekirjoittaja 1 sähköposti ja korvataan todellisella 3rd-party-sähköpostilla
  UPDATE documents
  SET signers = COALESCE(signers, '[]'::jsonb) || v_new_signer,
      sender_email = actual_sender_email,
      sender_signs = false,
      sender_paid = NOT will_pay, -- TÄRKEÄÄ: Jos will_pay on tosi, sender_paid jää false-arvoon.
      sender_name = '[Ei allekirjoita]'
  WHERE id = doc_id AND sender_signs = true;
END;
$$;
