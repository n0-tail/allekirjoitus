import React, { useState } from 'react';
import { UploadView } from './UploadView';
import { RecipientView } from './RecipientView';
import { MockBankAuth } from './MockBankAuth';
import { SuccessView } from './SuccessView';
import './index.css';

type AppState = 'upload' | 'sent' | 'recipient' | 'auth' | 'success';

interface SignatureData {
  file: File | null;
  sender: string;
  recipient: string;
}

function App() {
  const [view, setView] = useState<AppState>('upload');
  const [data, setData] = useState<SignatureData>({ file: null, sender: '', recipient: '' });

  const handleSend = (submittedData: SignatureData) => {
    setData(submittedData);
    setView('sent');
  };

  const handleAuthSuccess = () => {
    setView('success');
  };

  const resetFlow = () => {
    setData({ file: null, sender: '', recipient: '' });
    setView('upload');
  };

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Luottokirja
        </div>
        <div>
          {view !== 'upload' && view !== 'sent' && (
            <span className="badge badge-success" style={{ background: '#eff6ff', color: 'var(--primary)' }}>
              Vastaanottaja: {data.recipient}
            </span>
          )}
        </div>
      </header>

      <main style={{ padding: '2rem 1rem' }}>
        {view === 'upload' && <UploadView onSend={handleSend} />}

        {view === 'sent' && (
          <div className="container animate-fade-in">
            <div className="card" style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Asiakirja lähetetty!</h2>
              <p style={{ marginBottom: '2rem' }}>
                Allekirjoituskutsu on lähetetty osoitteeseen <strong>{data.recipient}</strong>.
              </p>

              <div style={{ padding: '1.5rem', background: '#eff6ff', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '0.875rem', color: '#1e3a8a', marginBottom: '1rem' }}>
                  <strong>Demo-ohje:</strong> Oikeassa palvelussa vastaanottaja saisi sähköpostin. Klikkaa alla olevaa painiketta siirtyäksesi suoraan vastaanottajan näkymään (simulai avattua sähköpostilinkkiä).
                </p>
                <button className="btn btn-primary" onClick={() => setView('recipient')}>
                  Siirry vastaanottajan näkymään →
                </button>
              </div>

              <button className="btn btn-secondary" onClick={resetFlow}>
                Lähetä uusi asiakirja
              </button>
            </div>
          </div>
        )}

        {view === 'recipient' && <RecipientView data={data} onSignClick={() => setView('auth')} />}

        {view === 'success' && <SuccessView data={data} onReset={resetFlow} />}
      </main>

      {view === 'auth' && (
        <MockBankAuth
          onSuccess={handleAuthSuccess}
          onCancel={() => setView('recipient')}
        />
      )}
    </>
  );
}

export default App;
