-- ============================================================
-- SQL: set_sender_observer_with_email - UPDATE (FIXED OVERLOAD & RECIPIENT COUNT)
-- ============================================================

SET search_path TO public;

-- 1. Poistetaan vanhat versiot
DROP FUNCTION IF EXISTS set_sender_observer_with_email(uuid, text, text);
DROP FUNCTION IF EXISTS set_sender_observer_with_email(uuid, text, text, boolean);

-- 2. Luodaan uusi oikea versio ILMAN "Allekirjoittaja 1" pakkaamista ylimääräiseksi maksulliseksi allekirjoittajaksi
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
  -- Emme enää injektoi alkuperäistä lähettäjää `signers` -taulukkoon sähköpostilinkkisaajaksi, 
  -- koska käyttäjä on eksplisiittisesti valinnut "et aseta omaa allekirjoitustasi".
  -- Tämä korjaa virheen, jossa havaitsija joutui vahingossa itsekin maksumieheksi/vastaanottajaksi!

  UPDATE documents
  SET sender_email = actual_sender_email,
      sender_signs = false,
      sender_paid = NOT will_pay, -- TÄRKEÄÄ: Jos will_pay on tosi, sender_paid jää false-arvoon.
      sender_name = '[Ei allekirjoita]'
  WHERE id = doc_id AND sender_signs = true;
END;
$$;
