-- 1. Ota pg_net ja pg_cron laajennukset käyttöön
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Poistetaan mahdollinen vanha ajastus, jotta ei tule tuplia
SELECT cron.unschedule('cleanup-documents-job');

-- 3. Ajastetaan uusi tausta-ajo (suoritetaan kerran tunnissa "minuutilla 0")
-- HUOM: Korvaa 'YOUR_SUPABASE_PROJECT_REF' omalla projektisi tunnuksella (esim. vjyugemmqwghvdmbcpek)
-- ja 'YOUR_SUPABASE_SERVICE_ROLE_KEY' omalla service_role avaimellasi API-asetuksista.
SELECT cron.schedule(
  'cleanup-documents-job', -- Työn nimi
  '0 * * * *',             -- Cron-aikataulu (Kerran tunnissa)
  $$
  SELECT net.http_post(
      url:='https://vjyugemmqwghvdmbcpek.supabase.co/functions/v1/cleanup-documents',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer LISÄÄ_TÄHÄN_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);

-- (Vaihtoehto: Voit myös tarkistaa lokit ajon jälkeen: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;)
