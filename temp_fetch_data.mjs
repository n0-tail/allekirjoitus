import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const projectRef = 'vjyugemmqwghvdmbcpek';

let accessToken;
try {
    const credsPath = join(homedir(), '.supabase', 'access-token');
    accessToken = readFileSync(credsPath, 'utf8').trim();
} catch {
    console.error('No token');
    process.exit(1);
}

async function runSql(sql) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

async function main() {
    try {
        const tablesRes = await runSql(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
        const tables = tablesRes.map(t => t.table_name);
        const data = {};
        for (const table of tables) {
            const rows = await runSql(`SELECT * FROM public."${table}" LIMIT 5;`);
            data[table] = rows;
        }
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}
main();
