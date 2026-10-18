import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "npm:jose@5.2.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, redirectUri, state } = await req.json();

    if (!code || !redirectUri) {
      throw new Error('Code or redirectUri missing in request');
    }

    const clientId = Deno.env.get('IDURA_CLIENT_ID');
    const domain = Deno.env.get('IDURA_DOMAIN');
    const tokenEndpointOverride = Deno.env.get('IDURA_TOKEN_ENDPOINT');

    // FTN Requires private keys for signing client assertion and decrypting the JWE id_token
    const clientSigPrivateKeyPem = Deno.env.get('IDURA_PRIVATE_SIG_KEY');
    const clientEncPrivateKeyPem = Deno.env.get('IDURA_PRIVATE_ENC_KEY');
    const sigKid = Deno.env.get('IDURA_SIG_KID');

    if (!clientId || (!domain && !tokenEndpointOverride) || !clientSigPrivateKeyPem || !clientEncPrivateKeyPem || !sigKid) {
      throw new Error('Server misconfiguration: Idura FTN credentials/keys missing');
    }

    const tokenUrl = tokenEndpointOverride || `https://${domain}/oauth2/token`;

    // 1. Generate client_assertion (JWT)
    const clientSigKey = await jose.importPKCS8(clientSigPrivateKeyPem.replace(/\\n/g, '\n'), 'RS256');
    const clientAssertion = await new jose.SignJWT({
      iss: clientId,
      sub: clientId,
      aud: `https://${domain}`, // Criipto expects the base domain as audience, not the specific endpoint path
      jti: crypto.randomUUID()
    })
      .setProtectedHeader({ alg: 'RS256', kid: sigKid })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(clientSigKey);

    // 2. Exchange 'code' for 'id_token' and 'access_token'
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.id_token) {
      throw new Error('No id_token returned from identity provider');
    }

    // 3. Decrypt the JWE id_token
    const clientEncKey = await jose.importPKCS8(clientEncPrivateKeyPem.replace(/\\n/g, '\n'), 'RSA-OAEP-256');
    const { plaintext } = await jose.compactDecrypt(tokenData.id_token, clientEncKey);
    const jwsIdToken = new TextDecoder().decode(plaintext);

    // 4. Verify the JWS signature using the IdP's public JWKS
    const JWKS = jose.createRemoteJWKSet(
        new URL(`https://${domain}/.well-known/jwks.json`)
    );
    const { payload: verifiedClaims } = await jose.jwtVerify(jwsIdToken, JWKS, {
        issuer: `https://${domain}`,
        audience: clientId,
    });

    // In Criipto/Idura, the user's name is in the 'name' claim.
    const fullName = (verifiedClaims.name as string) || "Tuntematon Allekirjoittaja";

    // Persist the bank-verified name server-side, bound to the document/signer in `state`
    // (format: `${documentId}_${role}` or `${documentId}_${role}_${signerId}`).
    // record-action reads it from here instead of trusting a name sent by the browser.
    // Never allowed to break the login itself.
    if (typeof state === 'string' && state.length > 0) {
      try {
        const parts = state.split('_');
        const documentId = parts[0] || '';
        const role = parts[1] === 'sender' ? 'sender' : 'recipient';
        const signerId = role === 'recipient' ? (parts[2] || null) : null;
        if (UUID_RE.test(documentId)) {
          const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
          const { error: idError } = await supabase.from('verified_identities').insert({
            document_id: documentId,
            role,
            signer_id: signerId,
            verified_name: fullName,
          });
          if (idError) console.error('verified_identities insert failed:', idError.message);
        }
      } catch (idErr) {
        console.error('verified_identities insert exception:', idErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        name: fullName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Auth-callback error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Tuntematon virhe." }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
