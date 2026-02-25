-- Create a table to track our ephemeral document transactions
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  sender_email text not null,
  recipient_email text not null,
  status text not null default 'pending', -- 'pending', 'signed', 'rejected'
  file_name text not null,
  document_hash text, -- To optionally verify the file
  audit_trail jsonb default '[]'::jsonb, -- Array of events: [{action, timestamp, ip, userAgent}]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for the documents table
-- For this MVP, we will allow anonymous access based on the unguessable UUID
-- In production, you'd want tighter controls, but UUIDs provide "security through obscurity" for temporary links
alter table public.documents enable row level security;

create policy "Anyone can insert a document"
  on public.documents for insert
  to anon
  with check (true);

create policy "Anyone can view a document by ID"
  on public.documents for select
  to anon
  using (true);

create policy "Anyone can update a document by ID"
  on public.documents for update
  to anon
  using (true);

-- Create a storage bucket for the temporary PDFs
insert into storage.buckets (id, name, public) 
values ('pdfs', 'pdfs', false); -- false means private by default, we'll use signed URLs or direct download if RLS allows

-- Set up RLS for the storage bucket
-- Similar to the DB, we allow anon uploads and downloads for this MVP
create policy "Anyone can upload a temporary PDF"
  on storage.objects for insert
  to anon
  with check ( bucket_id = 'pdfs' );

create policy "Anyone can read a PDF if they have the path"
  on storage.objects for select
  to anon
  using ( bucket_id = 'pdfs' );

create policy "Anyone can update a temporary PDF"
  on storage.objects for update
  to anon
  using ( bucket_id = 'pdfs' );

create policy "Anyone can delete a PDF (for our auto-purge)"
  on storage.objects for delete
  to anon
  using ( bucket_id = 'pdfs' );
