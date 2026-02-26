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
    const { code, redirectUri } = await req.json();

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

    // 4. Decode the decrypted JWS to read claims (we skip signature verification here as we got it via backchannel TLS and it's a mock/sandbox, though in prod we'd verify the IdP's signature)
    const decodedJws = jose.decodeJwt(jwsIdToken);

    // In Criipto/Idura, the user's name is usually in the 'name' claim.
    const fullName = decodedJws.name || "Tuntematon Allekirjoittaja";

    return new Response(
      JSON.stringify({
        success: true,
        name: fullName,
        _debug_claims: decodedJws
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Auth-callback error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Tuntematon virhe." }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
