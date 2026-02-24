import React, { useState } from 'react';

interface MockBankAuthProps {
    onSuccess: () => void;
    onCancel: () => void;
}

type AuthStep = 'select' | 'login' | 'verify' | 'success';

interface Bank {
    id: string;
    name: string;
    color: string;
    logo: string;
}

const banks: Bank[] = [
    { id: 'op', name: 'Osuuspankki', color: '#ff6600', logo: 'O' },
    { id: 'nordea', name: 'Nordea', color: '#0000a0', logo: 'N' },
    { id: 'danske', name: 'Danske Bank', color: '#003755', logo: 'D' },
    { id: 'mobile', name: 'Mobiilivarmenne', color: '#2563eb', logo: 'M' },
];

export const MockBankAuth: React.FC<MockBankAuthProps> = ({ onSuccess, onCancel }) => {
    const [step, setStep] = useState<AuthStep>('select');
    const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
    const [userId, setUserId] = useState('');

    const handleBankSelect = (bank: Bank) => {
        setSelectedBank(bank);
        setStep('login');
    };

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userId.trim().length > 3) {
            setStep('verify');
            // Simulate user opening their phone app
            setTimeout(() => {
                setStep('success');
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }, 4000);
        }
    };

    return (
        <div className="modal-overlay" style={{ background: 'rgba(0, 0, 0, 0.6)' }}>
            <div className="modal-content animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>

                {/* Trust Network Header */}
                <div style={{ background: '#f1f5f9', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Suomen Luottamusverkosto
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={onCancel}>
                        Sulje ✕
                    </button>
                </div>

                <div style={{ padding: '2rem' }}>
                    {step === 'select' && (
                        <>
                            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Valitse tunnistustapa</h3>
                            <div className="bank-grid" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
                                {banks.map(bank => (
                                    <button
                                        key={bank.id}
                                        className="bank-btn"
                                        onClick={() => handleBankSelect(bank)}
                                        style={{ justifyContent: 'flex-start', gap: '1rem', padding: '1rem 1.5rem' }}
                                    >
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '4px',
                                            background: bank.color, color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '1.2rem'
                                        }}>
                                            {bank.logo}
                                        </div>
                                        {bank.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {step === 'login' && selectedBank && (
                        <div className="animate-fade-in">
                            <div style={{
                                background: selectedBank.color, color: 'white',
                                padding: '2rem', margin: '-2rem -2rem 2rem -2rem',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{selectedBank.logo}</div>
                                <h2>{selectedBank.name} Tunnistus</h2>
                            </div>

                            <form onSubmit={handleLoginSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Käyttäjätunnus</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={userId}
                                        onChange={(e) => setUserId(e.target.value)}
                                        placeholder="Esim. 12345678"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep('select')}>
                                        Takaisin
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 2, background: selectedBank.color }} disabled={userId.length < 4}>
                                        Seuraava
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === 'verify' && selectedBank && (
                        <div className="sim-loader" style={{ padding: '2rem 0' }}>
                            <div className="spinner" style={{ borderTopColor: selectedBank.color }}></div>
                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <div style={{ fontWeight: 500, fontSize: '1.25rem', marginBottom: '1rem' }}>Vahvista sovelluksessa</div>
                                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                                    Tarkistenumero: <strong style={{ fontSize: '1.5rem', letterSpacing: '4px', color: selectedBank.color }}>7842</strong>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    Avasimme yhteyden {selectedBank.name} -sovellukseesi. Vahvista tapahtuma puhelimellasi.
                                </p>
                            </div>
                            <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={onCancel}>Keskeytä</button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="sim-loader animate-fade-in" style={{ padding: '3rem 0' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: '#10b981', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <svg style={{ width: '32px', height: '32px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <div style={{ fontWeight: 600, fontSize: '1.25rem', color: '#10b981' }}>Tunnistautuminen onnistui!</div>
                                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Palataan palveluun...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
