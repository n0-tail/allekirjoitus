import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { OidcCallbackView } from './OidcCallbackView';

export function AuthCallbackRoute() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code') || '';
    const stateParam = searchParams.get('state') || '';

    const parseFallbackState = () => {
        if (!stateParam) return null;
        const parts = stateParam.split('_');
        const documentId = parts[0] || '';
        const role: 'sender' | 'recipient' = parts[1] === 'sender' ? 'sender' : 'recipient';
        const signerId = parts[2] || undefined;
        return documentId ? { documentId, role, signerId } : null;
    };

    return (
        <OidcCallbackView
            code={code}
            onSuccess={(name) => {
                let currentRole: 'sender' | 'recipient' = 'recipient';
                let docId = '';
                let signerParam = '';
                try {
                    const stashed = sessionStorage.getItem('signatureData');
                    if (stashed) {
                        const stashedData = JSON.parse(stashed);
                        if (stashedData.role) currentRole = stashedData.role;
                        if (stashedData.documentId) docId = stashedData.documentId;
                        if (stashedData.signerId) signerParam = `?signer=${stashedData.signerId}`;

                        // Päivitetään heti data ja view processing-tilaan tulevaa Flow'ta varten
                        sessionStorage.setItem('appState_view', 'processing');
                        sessionStorage.setItem('appState_data', JSON.stringify({ ...stashedData, verifiedName: name }));
                    } else {
                        const fallback = parseFallbackState();
                        if (fallback) {
                            docId = fallback.documentId;
                            currentRole = fallback.role;
                            if (fallback.signerId) signerParam = `?signer=${fallback.signerId}`;
                            sessionStorage.setItem('appState_view', 'processing');
                            sessionStorage.setItem('appState_data', JSON.stringify({
                                documentId: docId,
                                role: currentRole,
                                signerId: fallback.signerId,
                                verifiedName: name
                            }));
                        }
                    }
                } catch (_) { }

                if (!docId) {
                    navigate('/', { replace: true });
                    return;
                }

                // Ohjataan takaisin oikeaan roolinäkymään, joka poimii sessionStoragesta processing-tilan
                if (currentRole === 'sender') {
                    navigate(`/lahettaja/${docId}`, { replace: true });
                } else {
                    navigate(`/asiakirja/${docId}${signerParam}`, { replace: true });
                }
            }}
            onFail={(err) => {
                toast.error(`Tunnistautuminen epäonnistui: ${err}`);
                // Yritetään kaivaa docId jotta voidaan palata
                try {
                    const stashed = sessionStorage.getItem('signatureData');
                    if (stashed) {
                        const data = JSON.parse(stashed);
                        // Palautetaan aloitusnäkymä, jotta käyttäjä voi yrittää uudelleen
                        sessionStorage.setItem('appState_view', 'start');

                        const sParam = data.signerId ? `?signer=${data.signerId}` : '';
                        navigate(data.role === 'sender' ? `/lahettaja/${data.documentId}` : `/asiakirja/${data.documentId}${sParam}`, { replace: true });
                        return;
                    }
                    const fallback = parseFallbackState();
                    if (fallback) {
                        sessionStorage.setItem('appState_view', 'start');
                        const sParam = fallback.signerId ? `?signer=${fallback.signerId}` : '';
                        navigate(fallback.role === 'sender' ? `/lahettaja/${fallback.documentId}` : `/asiakirja/${fallback.documentId}${sParam}`, { replace: true });
                        return;
                    }
                } catch (_) { }
                navigate('/');
            }}
        />
    );
}
