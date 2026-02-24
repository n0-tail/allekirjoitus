import React from 'react';

interface RecipientViewProps {
    data: { file: File | null; sender: string; recipient: string };
    onSignClick: () => void;
}

export const RecipientView: React.FC<RecipientViewProps> = ({ data, onSignClick }) => {
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
                            <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{data.file?.name}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>PDF Asiakirja • 1 sivu</div>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginTop: '1rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Toimi näin:</h3>
                    <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem', color: 'var(--text-muted)' }}>
                        <li style={{ marginBottom: '0.5rem' }}>Lue asiakirja läpi huolellisesti (PoC: Tässä voisi olla PDF-esikatselu).</li>
                        <li style={{ marginBottom: '0.5rem' }}>Tunnistaudu vahvasti verkkopankkitunnuksillasi.</li>
                        <li>Allekirjoitus liitetään asiakirjaan sähköisesti.</li>
                    </ol>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => alert('Demoympäristössä esikatselu on ohitettu.')}>
                            Lataa esikatselu
                        </button>
                        <button className="btn btn-primary" onClick={onSignClick}>
                            Tunnistaudu & Allekirjoita
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
