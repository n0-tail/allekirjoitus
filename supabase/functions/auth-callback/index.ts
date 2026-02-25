import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, redirectUri } = await req.json();

    if (!code || !redirectUri) {
      throw new Error('Code or redirectUri missing in request');
    }

    const clientId = Deno.env.get('IDURA_CLIENT_ID');
    const clientSecret = Deno.env.get('IDURA_CLIENT_SECRET');
    const domain = Deno.env.get('IDURA_DOMAIN');

    if (!clientId || !clientSecret || !domain) {
      throw new Error('Server misconfiguration: Idura credentials missing');
    }

    // 1. Exchange 'code' for 'id_token' and 'access_token'
    const tokenResponse = await fetch(`https://${domain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
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

    // 2. Decode the JWT id_token (We don't need to verify signature here because we got it directly from the trusted token endpoint via TLS over a backchannel, per OIDC spec)
    const payloadBase64 = tokenData.id_token.split('.')[1];
    // Clean up base64 padding/url encoding
    const cleanedBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(cleanedBase64);
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(payloadJson, c => c.charCodeAt(0))));

    // In Criipto/Idura, the user's name is usually in the 'name' claim.
    const fullName = payload.name || "Tuntematon Allekirjoittaja";

    return new Response(
      JSON.stringify({
        success: true,
        name: fullName,
        // Optional: return the raw payload for debugging in sandbox if needed
        _debug_claims: payload
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
