import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "npm:jose@5.2.2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { state, redirectUri } = await req.json();

        if (!state || !redirectUri) {
            throw new Error('State or redirectUri missing in request');
        }

        const clientId = Deno.env.get('IDURA_CLIENT_ID');
        const domain = Deno.env.get('IDURA_DOMAIN');
        const clientSigPrivateKeyPem = Deno.env.get('IDURA_PRIVATE_SIG_KEY');
        const sigKid = Deno.env.get('IDURA_SIG_KID');

        if (!clientId || !domain || !clientSigPrivateKeyPem || !sigKid) {
            throw new Error('Server misconfiguration: Idura FTN credentials/keys missing');
        }

        // Prepare the Authorization Request parameters as a JWT payload (JAR)
        const payload = {
            iss: clientId,
            aud: `https://${domain}`,
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: 'openid profile ssno',
            state: state,
            acr_values: 'urn:grn:authn:fi:bank-id',
            login_hint: 'app-initiated'
        };

        // Sign the request
        const clientSigKey = await jose.importPKCS8(clientSigPrivateKeyPem.replace(/\\n/g, '\n'), 'RS256');
        const signedRequest = await new jose.SignJWT(payload)
            .setProtectedHeader({ alg: 'RS256', kid: sigKid })
            .setIssuedAt()
            .setExpirationTime('10m')
            .sign(clientSigKey);

        // --- NEW: PUSH THE REQUEST TO CRIIPTO PAR ENDPOINT ---
        const tokenEndpointAuthMethod = 'client_secret_post'; // We still need to identify the client, we'll use client_assertion

        // Generate Client Assertion to authenticate to the PAR endpoint
        const clientAssertion = await new jose.SignJWT({
            iss: clientId,
            sub: clientId,
            aud: `https://${domain}`,
            jti: crypto.randomUUID()
        })
            .setProtectedHeader({ alg: 'RS256', kid: sigKid })
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(clientSigKey);

        const parBody = new URLSearchParams({
            client_id: clientId,
            client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            client_assertion: clientAssertion,
            request: signedRequest
        });

        const parResponse = await fetch(`https://${domain}/oauth2/par`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: parBody
        });

        if (!parResponse.ok) {
            const errText = await parResponse.text();
            console.error("PAR Error Response:", errText);
            throw new Error(`PAR Request Failed (${parResponse.status}): ${errText}`);
        }

        const parData = await parResponse.json();

        if (!parData.request_uri) {
            throw new Error('PAR endpoint did not return a request_uri');
        }

        // Build the final redirect URL using ONLY the client_id and request_uri
        const authUrl = `https://${domain}/oauth2/authorize?client_id=${clientId}&request_uri=${encodeURIComponent(parData.request_uri)}`;

        return new Response(
            JSON.stringify({
                success: true,
                authUrl: authUrl
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        console.error('Init-auth error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Tuntematon virhe." }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
