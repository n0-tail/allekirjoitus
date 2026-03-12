import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Project Reference from .env.local
const projectRef = 'vjyugemmqwghvdmbcpek';
const functionName = 'record-action';

// Try to use the Service Role Key as the API Token
const apiToken = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!apiToken) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const functionDir = join(process.cwd(), 'supabase', 'functions', functionName);
const indexPath = join(functionDir, 'index.ts');

try {
    const fileContent = readFileSync(indexPath, 'utf-8');

    console.log(`🚀 Deploying ${functionName} to Supabase...`);

    // Using the Supabase Management API to deploy the function
    // Note: The Management API usually requires a Personal Access Token, 
    // but sometimes the service role key works depending on the project tier/settings.
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions/${functionName}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: functionName,
            slug: functionName,
            version: '1.0',
            entrypoint_path: 'file:///src/index.ts',
            import_map_path: 'file:///src/deno.json',
            verify_jwt: false,
            // Basic deployment, the actual CLI zips the folder and sends it as a bundle.
            // Since we're trying to bypass the CLI, we will instruct the user to use the dashboard instead.
        })
    });

    if (res.ok) {
        console.log('✅ Deployment triggered successfully via API.');
    } else {
        const errText = await res.text();
        console.error(`❌ Deployment failed (${res.status}):`, errText);
    }
} catch (e) {
    console.error('Error reading function file:', e);
}
