import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import toast from 'react-hot-toast';

interface RecipientViewProps {
    data: {
        file: File | null;
        sender: string;
        recipient: string;
        fileName?: string;
        documentId?: string;
    };
    onSignClick: () => void;
    onPrivacyClick?: () => void;
}

export const RecipientView: React.FC<RecipientViewProps> = ({ data, onSignClick, onPrivacyClick }) => {
    const displayFileName = data.file?.name || data.fileName || 'Asiakirja.pdf';
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!data.documentId || !displayFileName) {
            toast.error('Virhe: Asiakirjan tunnistetta ei löytynyt. Lataus ei onnistu esikatselussa.');
            return;
        }

        setIsDownloading(true);
        try {
            const filePath = `${data.documentId}/${displayFileName}`;
            const { data: urlData, error } = await supabase.storage.from('pdfs').createSignedUrl(filePath, 60); // 60 sekuntia voimassa

            if (error) {
                throw new Error(`Latausvirhe: ${error.message}`);
            }

            if (urlData?.signedUrl) {
                // Trigger download in browser
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
            toast.error(err instanceof Error ? err.message : 'Tuntematon virhe tapahtui tiedostoa ladattaessa.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSignClick = () => {
        if (!data.documentId) {
            toast.error('Virhe: Asiakirjan tunnistetta ei löytynyt.');
            return;
        }

        // Tallenna tilatiedot istuntoon, jotta voimme jatkaa OIDC-paluun jälkeen
        sessionStorage.setItem('signatureData', JSON.stringify({
            documentId: data.documentId,
            sender: data.sender,
            recipient: data.recipient,
            fileName: displayFileName
        }));

        // Pyydetään pääkomponenttia siirtymään maksu/tunnistautumis-näkymään
        onSignClick();
    };

    return (
        <div className="container animate-fade-in">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.5rem' }}>Allekirjoituspyyntö</h2>
                        <p>Olet saanut asiakirjan allekirjoitettavaksi käyttäjältä <strong>{data.sender}</strong>.</p>
                    </div>
                    <span className="badge badge-pending">Odottaa allekirjoitusta</span>
                </div>

                <div className="form-group" style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <svg style={{ width: '32px', height: '32px', color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{displayFileName}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>PDF Asiakirja • 1 sivu</div>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginTop: '1rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Toimi näin:</h3>
                    <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem', color: 'var(--text-muted)' }}>
                        <li style={{ marginBottom: '0.5rem' }}>Lataa ja lue asiakirja läpi huolellisesti esikatselusta.</li>
                        <li style={{ marginBottom: '0.5rem' }}>Tunnistaudu vahvasti verkkopankkitunnuksillasi.</li>
                        <li>Allekirjoitus liitetään asiakirjaan sähköisesti.</li>
                    </ol>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                            Tunnistautumalla vahvasti hyväksyt palvelun <a href="#" onClick={(e) => { e.preventDefault(); onPrivacyClick && onPrivacyClick(); }} style={{ color: 'var(--primary)' }}>Tietosuojaselosteen</a>.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={handleDownload} disabled={isDownloading}>
                                {isDownloading ? 'Ladataan...' : 'Lataa esikatselu'}
                            </button>
                            <button className="btn btn-primary" onClick={handleSignClick}>
                                Tunnistaudu & Allekirjoita
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
