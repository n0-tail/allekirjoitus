import React, { useState, useEffect } from 'react';

interface MockBankAuthProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const MockBankAuth: React.FC<MockBankAuthProps> = ({ onSuccess, onCancel }) => {
    const [step, setStep] = useState<'select' | 'auth' | 'success'>('select');

    const handleBankSelect = () => {
        setStep('auth');
        // Simulate auth processing delay
        setTimeout(() => {
            setStep('success');
            setTimeout(() => {
                onSuccess();
            }, 1500);
        }, 3000);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content animate-fade-in">
                {step === 'select' && (
                    <>
                        <h3 style={{ marginBottom: '0.5rem' }}>Tunnistautuminen</h3>
                        <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Valitse pankkisi tunnistautuaksesi (Demo)</p>
                        <div className="bank-grid">
                            <button className="bank-btn" onClick={handleBankSelect}>Osuuspankki</button>
                            <button className="bank-btn" onClick={handleBankSelect}>Nordea</button>
                            <button className="bank-btn" onClick={handleBankSelect}>Danske Bank</button>
                            <button className="bank-btn" onClick={handleBankSelect}>Mobiilivarmenne</button>
                        </div>
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '1.5rem' }}
                            onClick={onCancel}
                        >
                            Keskeytä
                        </button>
                    </>
                )}

                {step === 'auth' && (
                    <div className="sim-loader">
                        <div className="spinner"></div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Odotetaan tunnistautumista...</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Vahvista kirjautuminen mobiilisovelluksellasi</div>
                        </div>
                        <button className="btn btn-secondary" onClick={onCancel}>Peruuta</button>
                    </div>
                )}

                {step === 'success' && (
                    <div className="sim-loader" style={{ padding: '3rem 0' }}>
                        <svg style={{ width: '64px', height: '64px', color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div style={{ fontWeight: 500, fontSize: '1.25rem' }}>Tunnistautuminen onnistui!</div>
                        <p style={{ color: 'var(--text-muted)' }}>Allekirjoitetaan asiakirjaa...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
