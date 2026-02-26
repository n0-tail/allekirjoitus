import crypto from 'crypto';
import fs from 'fs';

function generateKeypair(use, alg) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const pubKeyObj = crypto.createPublicKey(publicKey);
    const jwk = pubKeyObj.export({ format: 'jwk' });

    jwk.use = use;
    jwk.alg = alg;
    jwk.kid = crypto.randomBytes(16).toString('hex');

    return { jwk, privateKey, publicKey };
}

// 1. Server Signing Key (For signing the id_token)
const serverSig = generateKeypair('sig', 'RS256');

// 2. Client Signing Key (For client_assertion)
const clientSig = generateKeypair('sig', 'RS256');

// 3. Client Encryption Key (For JWE encryption of id_token)
const clientEnc = generateKeypair('enc', 'RSA-OAEP-256');

// Save Server JWKS (What the mock server publishes)
const serverJwks = { keys: [serverSig.jwk] };
fs.writeFileSync('idura_server_jwks.json', JSON.stringify(serverJwks, null, 2), 'utf8');
fs.writeFileSync('idura_server_private.key', serverSig.privateKey, 'utf8');

// Save Client JWKS (What the mock server expects from the client)
const clientJwks = { keys: [clientSig.jwk, clientEnc.jwk] };
fs.writeFileSync('client_jwks.json', JSON.stringify(clientJwks, null, 2), 'utf8');
fs.writeFileSync('client_sig_private.key', clientSig.privateKey, 'utf8');
fs.writeFileSync('client_enc_private.key', clientEnc.privateKey, 'utf8');

console.log('Keys generated successfully for FTN mock setup.');
