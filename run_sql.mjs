// Temporary script to update get_document RPC via Supabase Management API
const projectRef = 'vjyugemmqwghvdmbcpek';

const sql = `
CREATE OR REPLACE FUNCTION get_document(doc_id uuid)
RETURNS TABLE (
    id uuid,
    file_name text,
    sender_email text,
    recipient_email text,
    sender_name text,
    recipient_name text,
    status text
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.file_name, d.sender_email, d.recipient_email,
         d.sender_name, d.recipient_name, d.status
  FROM public.documents d
  WHERE d.id = doc_id;
END;
$$ LANGUAGE plpgsql;
`;

// Read access token from supabase CLI config
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

let accessToken;
try {
    // Supabase CLI stores creds here
    const credsPath = join(homedir(), '.supabase', 'access-token');
    accessToken = readFileSync(credsPath, 'utf8').trim();
} catch {
    console.error('Could not read Supabase access token. Run: supabase login');
    process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
});

if (res.ok) {
    console.log('SQL executed successfully!');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
} else {
    console.error('Failed:', res.status, await res.text());
}
