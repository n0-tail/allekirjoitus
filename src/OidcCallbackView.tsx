import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

interface OidcCallbackViewProps {
    code: string;
    onSuccess: (verifiedName: string) => void;
    onFail: (err: string) => void;
}

export const OidcCallbackView: React.FC<OidcCallbackViewProps> = ({ code, onSuccess, onFail }) => {
    const [status, setStatus] = useState('Vahvistetaan identiteettiä sähköisesti...');

    useEffect(() => {
        let isMounted = true;

        const exchangeCode = async () => {
            try {
                // Determine the exact clean redirect URI we sent to Idura
                const redirectUri = window.location.origin + window.location.pathname;

                setStatus('Haetaan vahvistettuja henkilötietoja Suomen Luottamusverkostosta...');

                // Swap the code for the JWT payload via the Edge Function
                const { data, error } = await supabase.functions.invoke('auth-callback', {
                    body: { code, redirectUri }
                });

                if (error) {
                    throw new Error(`Tokenin vaihto epäonnistui: ${error.message}`);
                }

                if (!data || !data.success || !data.name) {
                    throw new Error('Palvelin ei palauttanut kelvollista nimeä tunnistautumisesta.');
                }

                setStatus('Tunnistautuminen onnistui! Siirrytään allekirjoitukseen...');

                // Clear the URL parameters to clean up the browser history
                window.history.replaceState({}, '', window.location.pathname);

                if (isMounted) {
                    // Small visual delay for UI purposes
                    setTimeout(() => onSuccess(data.name), 1000);
                }

            } catch (err: unknown) {
                console.error('OIDC Callback Error:', err);
                if (isMounted) {
                    onFail(err instanceof Error ? err.message : 'Tuntematon virhe tunnistuksessa.');
                }
            }
        };

        exchangeCode();

        return () => {
            isMounted = false;
        };
    }, [code, onSuccess, onFail]);

    return (
        <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <div className="card" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                <div className="sim-loader" style={{ padding: '2rem 0' }}>
                    <div className="spinner" style={{ borderTopColor: '#2563eb', margin: '0 auto 1.5rem auto' }}></div>
                    <div style={{ fontWeight: 500, fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                        Suomen Luottamusverkosto
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {status}
                    </p>
                </div>
            </div>
        </div>
    );
};
