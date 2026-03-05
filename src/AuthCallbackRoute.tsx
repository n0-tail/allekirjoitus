import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { OidcCallbackView } from './OidcCallbackView';

export function AuthCallbackRoute() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code') || '';

    return (
        <OidcCallbackView
            code={code}
            onSuccess={(name) => {
                let currentRole: 'sender' | 'recipient' = 'recipient';
                let docId = '';
                try {
                    const stashed = sessionStorage.getItem('signatureData');
                    if (stashed) {
                        const stashedData = JSON.parse(stashed);
                        if (stashedData.role) currentRole = stashedData.role;
                        if (stashedData.documentId) docId = stashedData.documentId;

                        // Päivitetään heti data ja view processing-tilaan tulevaa Flow'ta varten
                        sessionStorage.setItem('appState_view', 'processing');
                        sessionStorage.setItem('appState_data', JSON.stringify({ ...stashedData, verifiedName: name }));
                    }
                } catch (_) { }

                // Ohjataan takaisin oikeaan roolinäkymään, joka poimii sessionStoragesta processing-tilan
                if (currentRole === 'sender') {
                    navigate(`/lahettaja/${docId}`, { replace: true });
                } else {
                    navigate(`/asiakirja/${docId}`, { replace: true });
                }
            }}
            onFail={(err) => {
                toast.error(`Tunnistautuminen epäonnistui: ${err}`);
                // Yritetään kaivaa docId jotta voidaan palata
                try {
                    const stashed = sessionStorage.getItem('signatureData');
                    if (stashed) {
                        const data = JSON.parse(stashed);
                        // Varmistetaan, ettei menetetä payment/authenticating state
                        sessionStorage.setItem('appState_view', 'authenticating');

                        navigate(data.role === 'sender' ? `/lahettaja/${data.documentId}` : `/asiakirja/${data.documentId}`, { replace: true });
                        return;
                    }
                } catch (_) { }
                navigate('/');
            }}
        />
    );
}
