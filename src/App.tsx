import { useState, useEffect } from 'react';
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
  documentId?: string;
  fileName?: string;
}

function App() {
  const [view, setView] = useState<AppState>('upload');
  const [data, setData] = useState<SignatureData>({ file: null, sender: '', recipient: '' });

  // Check URL parameters on load for recipient viewing routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const documentId = params.get('document');
    const sender = params.get('sender');
    const recipient = params.get('recipient');
    const fileName = params.get('file');

    if (documentId && sender && recipient) {
      // Simulate that the file is loaded from a server since we don't have the File object
      setData({
        file: null,
        sender,
        recipient,
        documentId,
        fileName: fileName || 'Sopimusasiakirja.pdf'
      });
      setView('recipient');
    }
  }, []);

  const handleSend = (submittedData: SignatureData) => {
    // Generate a mock document ID
    const docId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setData({ ...submittedData, documentId: docId });
    setView('sent');
  };

  const handleAuthSuccess = () => {
    setView('success');
  };

  const resetFlow = () => {
    setData({ file: null, sender: '', recipient: '' });
    setView('upload');
    // Clear URL parameters
    window.history.replaceState({}, '', window.location.pathname);
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
          {view !== 'upload' && view !== 'sent' && data.recipient && (
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
              <h2 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Asiakirja on valmis lähetettäväksi!</h2>
              <p style={{ marginBottom: '2rem' }}>
                Allekirjoituskutsu sähköpostiin <strong>{data.recipient}</strong>.
              </p>

              <div style={{ padding: '1.5rem', background: '#eff6ff', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '0.875rem', color: '#1e3a8a', marginBottom: '1rem' }}>
                  <strong>Demo-ohje:</strong> Selaimesi avaa nyt sähköpostiohjelmasi ja luo viestin, joka sisältää uniikin linkin tähän sovellukseen parametrilla: <br /> `?document={data.documentId}`.
                </p>

                {data.documentId && (
                  <a
                    href={`mailto:${data.recipient}?subject=Allekirjoituspyyntö: ${data.file?.name || 'Asiakirja'}&body=Hei,%0A%0A${data.sender} on lähettänyt sinulle asiakirjan (${data.file?.name || 'Asiakirja'}) sähköisesti allekirjoitettavaksi.%0A%0APääset lukemaan ja allekirjoittamaan asiakirjan tästä turvallisesta linkistä:%0A${window.location.origin}${window.location.pathname}?document=${data.documentId}&sender=${encodeURIComponent(data.sender)}&recipient=${encodeURIComponent(data.recipient)}&file=${encodeURIComponent(data.file?.name || 'Asiakirja')}%0A%0AYstävällisin terveisin,%0ALuottokirja PoC`}
                    className="btn btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    Käynnistä sähköpostin lähetys
                  </a>
                )}

                <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #bfdbfe', paddingTop: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#1e3a8a', marginBottom: '1rem' }}>
                    Voit myös kopioida linkin suoraan tästä ja avata sen testataksesi vastaanottajan kokemusta:
                  </p>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    style={{ fontSize: '0.8rem', textAlign: 'center', background: '#e0f2fe' }}
                    value={`${window.location.origin}${window.location.pathname}?document=${data.documentId}&sender=${data.sender}&recipient=${data.recipient}&file=${data.file?.name || 'Asiakirja'}`}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>

              <button className="btn btn-secondary" onClick={resetFlow}>
                Lähetä uusi asiakirja
              </button>
            </div>
          </div>
        )}

        {view === 'recipient' && <RecipientView data={data} onSignClick={() => setView('auth')} />}

        {view === 'success' && <SuccessView onReset={resetFlow} />}
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
