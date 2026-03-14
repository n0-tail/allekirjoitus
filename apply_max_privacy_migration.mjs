import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const projectRef = 'vjyugemmqwghvdmbcpek';
const sql = readFileSync('max_privacy_migration.sql', 'utf8');

let accessToken;
try {
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
