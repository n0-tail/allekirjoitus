import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { reportError } from './lib/errorReporter';
import toast from 'react-hot-toast';

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

    useEffect(() => {
        // Report Google Ads Conversion for successful completion
        try {
            if (typeof window !== 'undefined' && 'gtag' in window) {
                // @ts-ignore
                window.gtag('event', 'conversion', { 'send_to': 'AW-18003487273/KysACNSbsp4cEKnU3YhD' });
            }
        } catch (err) {
            console.error('Sisäinen virhe konversiotapahtuman lähetyksessä:', err);
        }
    }, []);
    const displayFileName = data.file?.name || data.fileName || 'Asiakirja.pdf';

    const handleDownload = async () => {
        if (!data.documentId || !displayFileName) {
            toast.error('Virhe: Asiakirjan tunnistetta ei löytynyt. Latausta ei voida suorittaa.');
            return;
        }

        setIsDownloading(true);
        try {
            const { data: urlData, error } = await supabase.functions.invoke('get-download-url', {
                body: { documentId: data.documentId }
            });

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
            reportError('Tiedoston lataus epäonnistui (SuccessView)', err);
            toast.error(err instanceof Error ? err.message : 'Tuntematon virhe tapahtui tiedostoa ladattaessa.');
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
                    Asiakirja on nyt sähköisesti allekirjoitettu ja varustettu kryptografisella allekirjoitustodistuksella. Voit ladata allekirjoitetun asiakirjan alla olevasta painikkeesta.
                </p>

                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.85rem', width: '100%', maxWidth: '320px' }}>
                    <button className="btn btn-primary" onClick={handleDownload} disabled={isDownloading}>
                        <svg style={{ width: '20px', height: '20px', marginRight: '0.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {isDownloading ? 'Ladataan...' : 'Lataa allekirjoitettu PDF'}
                    </button>

                    <button className="btn btn-secondary" onClick={onReset}>
                        Allekirjoita uusi asiakirja
                    </button>
                </div>

                <div style={{ marginTop: '2.5rem', paddingTop: '1.75rem', borderTop: '1px solid var(--border)', textAlign: 'left', background: '#f8fafc', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Tarvitsetko itse sähköisen allekirjoituksen tai sopimuspohjan?
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                        Helppo Allekirjoitus -palvelussa voit allekirjoittaa minkä tahansa PDF-sopimuksen pankkitunnuksilla hintaan <strong>1,49 €</strong> ilman rekisteröitymistä tai kuukausimaksuja, tai luoda valmiin vuokrasopimuksen, kauppakirjan tai valtakirjan maksutta.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        <a href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                            Aloita uusi allekirjoitus (1,49 €) →
                        </a>
                        <a href="/sopimuspohjat" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                            Katso ilmaiset sopimuspohjat →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
