-- 1. Ota Row Level Security (RLS) käyttöön documents-taulussa
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 2. Salli kenen tahansa (anon) LISÄTÄ uusia asiakirjoja (UploadView tarvitsee tämän)
CREATE POLICY "Salli tiedostojen lisäys (INSERT)" 
ON public.documents FOR INSERT TO anon 
WITH CHECK (true);

-- Huom: Emme luo SELECT-sääntöä public.documents-taululle lainkaan, jotta taulua ei voi "scraapata".

-- 3. Luodaan turvallinen RPC-funktio, jolla frontend voi noutaa TÄSMÄLLEEN yhden asiakirjan kerrallaan salaisella ID:llä
CREATE OR REPLACE FUNCTION get_document(doc_id uuid)
RETURNS TABLE (
    id uuid,
    file_name text,
    sender_email text,
    recipient_email text
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.file_name, d.sender_email, d.recipient_email
  FROM public.documents d
  WHERE d.id = doc_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Ota RLS käyttöön Supabasen tiedostovarastossa (Storage)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Salli kenen tahansa (anon) ladata (Upload) tiedostoja 'pdfs' -koriin
CREATE POLICY "Salli PDF lataus palvelimelle (INSERT)"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'pdfs');

-- 6. Salli nouto (SELECT) 'pdfs' -korista
-- (Tieto on turvassa, koska polku vaatii UUID-tunnisteen tietämistä, esim. '123e4567-e89b.../asiakirja.pdf')
CREATE POLICY "Salli PDF lataus selaimeen (SELECT)"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'pdfs');
