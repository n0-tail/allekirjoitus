-- ============================================================
-- SQL: set_sender_observer_with_email - UPDATE (DELETE SENDER)
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
BEGIN
  -- Antti haluaa tässä nimenomaan poistaa alkuperäisen "Allekirjoittaja 1" osapuolen, koska jos lähettäjä laittaa
  -- itsensä tähän ja painaa "En allekirjoita itse", hänen tulee poistua rosterista täysin eikä maksaa itsestään vahingossa.
  
  UPDATE documents
  SET sender_email = actual_sender_email,
      sender_signs = false,
      sender_paid = NOT will_pay,
      sender_name = '[Ei allekirjoita]'
  WHERE id = doc_id AND sender_signs = true;
END;
$$;
