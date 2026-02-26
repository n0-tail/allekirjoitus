import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';


interface ProcessingViewProps {
    data: {
        sender: string;
        recipient: string;
        documentId?: string;
        fileName?: string;
        verifiedName?: string;
    };
    onSuccess: () => void;
    onFail: (error: string) => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ data, onSuccess, onFail }) => {
    const [status, setStatus] = useState('Viimeistellään asiakirjaa...');

    useEffect(() => {
        let isMounted = true;

        const processDocument = async () => {
            try {
                if (!data.documentId || !data.fileName) {
                    throw new Error('Asiakirjan tunniste tai nimi puuttuu demoympäristössä. Et voi jatkaa ilman backend-reititystä.');
                }

                setStatus('Pyydetään palvelinta viimeistelemään asiakirja turvallisesti...');
                const { error: invokeError } = await supabase.functions.invoke('finalize-signature', {
                    body: {
                        documentId: data.documentId,
                        fileName: data.fileName,
                        verifiedName: data.verifiedName || data.recipient,
                        sender: data.sender,
                        recipient: data.recipient
                    }
                });

                if (invokeError) {
                    throw new Error(`Palvelinvirhe viimeistelyssä: ${invokeError.message}`);
                }

                if (isMounted) onSuccess();
            } catch (err: unknown) {
                console.error(err);
                if (isMounted) onFail(err instanceof Error ? err.message : 'Tuntematon virhe käsittelyssä.');
            }
        };

        processDocument();

        return () => {
            isMounted = false;
        };
    }, [data, onSuccess, onFail]);

    return (
        <div className="container animate-fade-in">
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div className="spinner" style={{ margin: '0 auto 2rem auto', width: '40px', height: '40px', borderWidth: '4px', borderTopColor: 'var(--primary)' }}></div>
                <h2 style={{ marginBottom: '1rem' }}>{status}</h2>
                <p style={{ color: 'var(--text-muted)' }}>Odota hetki, tallennamme sähköistä allekirjoitustasi kryptografisesti asiakirjaan.</p>
            </div>
        </div>
    );
};
