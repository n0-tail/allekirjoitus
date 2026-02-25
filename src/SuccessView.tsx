import React, { useState } from 'react';
import { supabase } from './lib/supabase';

interface SuccessViewProps {
    data: {
        file: File | null;
        sender: string;
        recipient: string;
        fileName?: string;
        documentId?: string;
    };
    onReset: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ data, onReset }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const displayFileName = data.file?.name || data.fileName || 'Asiakirja.pdf';

    const handleDownload = async () => {
        if (!data.documentId || !displayFileName) {
            alert('Virhe: Asiakirjan tunnistetta ei löytynyt. Latausta ei voida suorittaa.');
            return;
        }

        setIsDownloading(true);
        try {
            const filePath = `${data.documentId}/${displayFileName}`;
            const { data: urlData, error } = await supabase.storage.from('pdfs').createSignedUrl(filePath, 60);

            if (error) {
                throw new Error(`Latausvirhe: ${error.message}`);
            }

            if (urlData?.signedUrl) {
                const a = document.createElement('a');
                a.href = urlData.signedUrl;
                a.download = displayFileName;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (err: unknown) {
            console.error(err);
            alert(err instanceof Error ? err.message : 'Tuntematon virhe tapahtui tiedostoa ladattaessa.');
        } finally {
            setIsDownloading(false);
        }
    };
    return (
        <div className="container animate-fade-in">
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '80px', height: '80px',
                        borderRadius: '50%', background: '#d1fae5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#10b981'
                    }}>
                        <svg style={{ width: '48px', height: '48px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                <h2 style={{ marginBottom: '1rem' }}>Sopimus on allekirjoitettu!</h2>
                <p style={{ marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                    Asiakirja on nyt sähköisesti allekirjoitettu ja kryptografisesti lukittu. Tästä PoC-versiosta voit ladata esimerkkikappaleen (PDF).
                </p>

                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
                    <button className="btn btn-primary" onClick={handleDownload} disabled={isDownloading}>
                        <svg style={{ width: '20px', height: '20px', marginRight: '0.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {isDownloading ? 'Ladataan...' : 'Lataa allekirjoitettu PDF'}
                    </button>

                    <button className="btn btn-secondary" onClick={onReset}>
                        Mene etusivulle
                    </button>
                </div>
            </div>
        </div>
    );
};
