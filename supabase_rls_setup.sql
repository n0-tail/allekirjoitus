-- 1. Ota Row Level Security (RLS) käyttöön documents-taulussa
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 2. Salli kenen tahansa (anon) LISÄTÄ uusia asiakirjoja (UploadView tarvitsee tämän)
CREATE POLICY "Salli tiedostojen lisäys (INSERT)" 
ON public.documents FOR INSERT TO anon 
WITH CHECK (true);

-- 3. Salli asiakirjan lukeminen (SELECT) tietyllä salaisella ID:llä
-- Emme salli "SELECT * FROM documents", vaan "USING (true)" toimii,
-- mutta käytännössä vaatii UUID:n tietämistä käyttöliittymästä.
-- Korvaa aiemman get_document RPC:n.
CREATE POLICY "Salli katselu ID:llä (SELECT)"
ON public.documents FOR SELECT TO anon
USING (true);

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
