import * as jose from 'jose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPar() {
    console.log("Starting PAR Test...");
    const clientId = 'urn:my:application:identifier:875894';
    const domain = 'dfgdfgdfg-test.criipto.id';

    const clientSigPem = fs.readFileSync(path.resolve(__dirname, 'client_sig_private.key'), 'utf8');
    const clientSigKey = await jose.importPKCS8(clientSigPem, 'RS256');

    const payload = {
        iss: clientId,
        aud: `https://${domain}`,
        client_id: clientId,
        response_type: 'code',
        redirect_uri: 'http://localhost:5173',
        scope: 'openid profile ssno',
        state: crypto.randomUUID(),
        acr_values: 'urn:grn:authn:fi:bank-id',
        login_hint: 'app-initiated'
    };

    console.log("Payload:", payload);

    const signedRequest = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256', kid: 'e77cb690527b30d06786fc2a924bc412' })
        .setIssuedAt()
        .setExpirationTime('10m')
        .sign(clientSigKey);

    const clientAssertion = await new jose.SignJWT({
        iss: clientId,
        sub: clientId,
        aud: `https://${domain}`,
        jti: crypto.randomUUID()
    })
        .setProtectedHeader({ alg: 'RS256', kid: 'e77cb690527b30d06786fc2a924bc412' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(clientSigKey);

    const parBody = new URLSearchParams({
        client_id: clientId,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion,
        request: signedRequest
    });

    console.log("Sending to PAR endpoint...");
    const parResponse = await fetch(`https://${domain}/oauth2/par`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: parBody.toString()
    });

    const status = parResponse.status;
    const text = await parResponse.text();
    console.log(`Response: ${text}`);

    if (parResponse.ok) {
        try {
            const parData = JSON.parse(text);
            const authUrl = `https://${domain}/oauth2/authorize?client_id=${clientId}&request_uri=${encodeURIComponent(parData.request_uri)}`;
            console.log(`\nFinal Redirect URL:\n${authUrl}`);
        } catch (e) {
            console.log("Could not parse response as JSON.");
        }
    } else {
        try {
            const errData = JSON.parse(text);
            console.log(`\nCRITICAL PAR ERROR DESCRIPTION:\n${errData.error_description}`);
        } catch (e) {
            console.log("Could not parse error response as JSON.");
        }
    }
}

testPar().catch(console.error);
