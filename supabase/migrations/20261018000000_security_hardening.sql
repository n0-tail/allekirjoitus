-- Security hardening 2026-10-18 (applied to production via Management API).
-- Phase A: close write holes, Phase B: identity binding + stamping lock, Phase C: close anonymous reads, Phase D: retention cron.

-- PHASE A: close write holes that the live frontend does not use.
begin;

-- 1) Payment / signature RPCs: only service_role (edge functions) may call
revoke execute on function public.update_signer_paid(uuid, text) from public, anon, authenticated;
revoke execute on function public.update_all_signers_paid(uuid) from public, anon, authenticated;
revoke execute on function public.update_signer_signed(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.set_sender_observer(uuid) from public, anon, authenticated;
revoke execute on function public.set_sender_observer_and_migrate(uuid, text) from public, anon, authenticated;
grant execute on function public.update_signer_paid(uuid, text) to service_role;
grant execute on function public.update_all_signers_paid(uuid) to service_role;
grant execute on function public.update_signer_signed(uuid, text, text) to service_role;
grant execute on function public.set_sender_observer(uuid) to service_role;
grant execute on function public.set_sender_observer_and_migrate(uuid, text) to service_role;

-- 2) documents: no anonymous UPDATE/DELETE (frontend never updates directly)
drop policy if exists "Anyone can update a document by ID" on public.documents;
revoke update, delete, truncate, references, trigger on public.documents from anon, authenticated;
revoke update, delete, truncate, references, trigger on public.document_hashes from anon, authenticated;

-- 3) documents INSERT: only a fresh, unpaid, unsigned document (exactly what UploadView inserts)
drop policy if exists "Salli tiedostojen lisäys (INSERT)" on public.documents;
drop policy if exists "Anyone can insert a document" on public.documents;
create policy "anon_insert_fresh_document" on public.documents
  for insert to anon
  with check (
    status = 'pending'
    and sender_paid = false
    and sender_name is null
    and document_hash is null
    and coalesce(sender_signs, true) = true
    and (audit_trail is null or audit_trail = '[]'::jsonb)
    and jsonb_typeof(signers) = 'array'
    and not jsonb_path_exists(signers, '$[*] ? (@.paid == true || @.signed == true)')
  );

-- 4) storage: no anonymous overwrite/delete of PDFs (frontend only does plain upload)
drop policy if exists "Salli PDF lataus palvelimelle 21n7l_1" on storage.objects;
drop policy if exists "Anyone can update a temporary PDF" on storage.objects;
drop policy if exists "Anyone can delete a PDF (for our auto-purge)" on storage.objects;

-- 5) observer conversion only before anyone paid/signed
create or replace function public.set_sender_observer_with_email(doc_id uuid, new_signer_id text, actual_sender_email text, will_pay boolean default false)
 returns void
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
    v_old_sender text;
    v_new_signer jsonb;
begin
  select sender_email into v_old_sender from documents where id = doc_id;

  v_new_signer := jsonb_build_object(
      'id', new_signer_id,
      'email', v_old_sender,
      'name', '',
      'signed', false,
      'paid', false
  );

  update documents
  set signers = coalesce(signers, '[]'::jsonb) || v_new_signer,
      sender_email = actual_sender_email,
      sender_signs = false,
      sender_paid = not will_pay,
      sender_name = '[Ei allekirjoita]'
  where id = doc_id
    and sender_signs = true
    and sender_paid = false
    and sender_name is null
    and status = 'pending';
end;
$function$;

-- 6) old broken daily cleanup cron (called a function without auth -> always 401)
select cron.unschedule('run-daily-cleanup');

commit;

-- PHASE B (additive): identity binding tables, stamping lock column, atomic signature RPC.
begin;

alter table public.documents add column if not exists stamping_started_at timestamptz;

-- Written by auth-callback after a verified bank login (service role only)
create table if not exists public.verified_identities (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  role text not null check (role in ('sender','recipient')),
  signer_id text,
  verified_name text not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index if not exists verified_identities_lookup on public.verified_identities (document_id, role, signer_id, created_at desc);
alter table public.verified_identities enable row level security;
revoke all on public.verified_identities from anon, authenticated;

-- Shadow-mode comparison log (client-sent name vs bank-verified name)
create table if not exists public.identity_checks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  document_id uuid not null references public.documents(id) on delete cascade,
  role text not null,
  signer_id text,
  client_name text,
  verified_name text,
  result text not null,
  enforced boolean not null default false
);
alter table public.identity_checks enable row level security;
revoke all on public.identity_checks from anon, authenticated;

-- Atomic: write signature + append audit event in one statement. Returns false if already signed.
create or replace function public.record_signature(p_doc_id uuid, p_role text, p_signer_id text, p_name text, p_event jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean := false;
begin
  if p_role = 'sender' then
    update documents
       set sender_name = p_name,
           audit_trail = coalesce(audit_trail, '[]'::jsonb) || jsonb_build_array(p_event),
           updated_at = now()
     where id = p_doc_id
       and sender_name is null
       and sender_signs is distinct from false;
    v_found := found;
  elsif p_role = 'recipient' then
    update documents
       set signers = (
             select jsonb_agg(
                      case when e.elem->>'id' = p_signer_id
                           then e.elem || jsonb_build_object('name', p_name, 'signed', true)
                           else e.elem end
                      order by e.ord)
               from jsonb_array_elements(signers) with ordinality as e(elem, ord)
           ),
           audit_trail = coalesce(audit_trail, '[]'::jsonb) || jsonb_build_array(p_event),
           updated_at = now()
     where id = p_doc_id
       and exists (
             select 1 from jsonb_array_elements(signers) s
              where s->>'id' = p_signer_id
                and coalesce((s->>'signed')::boolean, false) = false
           );
    v_found := found;
  end if;
  return v_found;
end;
$$;
revoke execute on function public.record_signature(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_signature(uuid, text, text, text, jsonb) to service_role;

commit;

-- PHASE C: close anonymous READ access (after the new frontend that no longer needs it is live)
begin;

-- documents: frontend reads only through get_document_by_id (SECURITY DEFINER)
drop policy if exists "Anyone can view a document by ID" on public.documents;
drop policy if exists "Salli katselu ID:llä (SELECT)" on public.documents;

-- storage: downloads go through the get-download-url edge function; anon keeps INSERT (upload) only
drop policy if exists "Salli PDF luku 21n7l_0" on storage.objects;
drop policy if exists "Salli PDF lataus palvelimelle 21n7l_2" on storage.objects;
drop policy if exists "Anyone can read a PDF if they have the path" on storage.objects;
drop policy if exists "Salli PDF lataus selaimeen (SELECT)" on storage.objects;

commit;

-- PHASE D: hourly retention cleanup (secret is stored in Vault as 'cleanup_secret' and as function secret CLEANUP_SECRET)
select cron.alter_job(
  (select jobid from cron.job where jobname = 'cleanup-documents-job'),
  command := $cmd$
  select net.http_post(
    url := 'https://vjyugemmqwghvdmbcpek.supabase.co/functions/v1/cleanup-documents',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) as request_id;
  $cmd$
);
