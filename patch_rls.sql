-- SECURITY PATCH 1: Close the public SELECT vulnerability
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Salli katselu ID:llä (SELECT)" ON public.documents;

-- Recreate policy to STRICTLY require an exact ID match.
-- 'auth.uid()' is null for anon, so we cannot use it. Instead, we use a secure RPC function.
-- But wait! If we just drop the policy, standard SELECTs from anon will fail.
-- That is EXACTLY what we want. We only want them to access it via our RPC function.

-- Create a secure RPC (Remote Procedure Call) to fetch a single document if the ID is known.
-- SECURITY DEFINER makes it run with creator's privileges, bypassing RLS to fetch the specific row,
-- ensuring the user MUST provide the exact UUID to get any data.
CREATE OR REPLACE FUNCTION get_document_by_id(doc_id uuid)
RETURNS SETOF public.documents
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.documents WHERE id = doc_id;
$$;
