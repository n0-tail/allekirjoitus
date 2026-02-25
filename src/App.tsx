import { useState } from 'react';
import { UploadView } from './UploadView';
import { RecipientView } from './RecipientView';
import { MockBankAuth } from './MockBankAuth';
import { ProcessingView } from './ProcessingView';
import { SuccessView } from './SuccessView';
import './index.css';

type AppState = 'upload' | 'sent' | 'recipient' | 'auth' | 'processing' | 'success';

interface SignatureData {
  file: File | null;
  sender: string;
  recipient: string;
  documentId?: string;
  fileName?: string;
}

function App() {
  const getInitialView = (): AppState => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('document') && params.get('sender') && params.get('recipient')) return 'recipient';
    }
    return 'upload';
  };

  const getInitialData = (): SignatureData => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const documentId = params.get('document');
      const sender = params.get('sender');
      const recipient = params.get('recipient');
      const fileName = params.get('file');

      if (documentId && sender && recipient) {
        return { file: null, sender, recipient, documentId, fileName: fileName || 'Sopimusasiakirja.pdf' };
      }
    }
    return { file: null, sender: '', recipient: '' };
  };

  const [view, setView] = useState<AppState>(getInitialView);
  const [data, setData] = useState<SignatureData>(getInitialData);
  const [copied, setCopied] = useState(false);

  const handleSend = (submittedData: SignatureData) => {
    // Generate a mock document ID only if one wasn't provided by the backend upload
    const docId = submittedData.documentId || Math.random().toString(36).substring(2, 10).toUpperCase();
    setData({ ...submittedData, documentId: docId });
    setView('sent');
  };

  const handleAuthSuccess = () => {
    setView('processing');
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
            <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ width: '32px', height: '32px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h2 style={{ marginBottom: '1rem' }}>Asiakirja on valmiina!</h2>
              <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
                Sähköinen allekirjoituskutsu on luotu henkilölle <strong>{data.recipient}</strong>.
              </p>

              <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Lähetä kutsu eteenpäin</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.documentId && (
                    <a
                      href={`mailto:${data.recipient}?subject=Allekirjoituspyyntö: ${data.file?.name || 'Asiakirja'}&body=Hei,%0A%0A${data.sender} on lähettänyt sinulle asiakirjan (${data.file?.name || 'Asiakirja'}) sähköisesti allekirjoitettavaksi.%0A%0APääset lukemaan ja allekirjoittamaan asiakirjan tästä turvallisesta linkistä:%0A${window.location.origin}${window.location.pathname}?document=${data.documentId}&sender=${encodeURIComponent(data.sender)}&recipient=${encodeURIComponent(data.recipient)}&file=${encodeURIComponent(data.file?.name || 'Asiakirja')}%0A%0AYstävällisin terveisin,%0ALuottokirja`}
                      className="btn btn-primary"
                      style={{ textDecoration: 'none', width: '100%' }}
                    >
                      <svg style={{ width: '20px', height: '20px', marginRight: '0.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Avaa sähköpostisovellus
                    </a>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>TAI KOOPIOI LINKKI</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      style={{ flex: 1, fontSize: '0.875rem', background: 'white' }}
                      value={`${window.location.origin}${window.location.pathname}?document=${data.documentId}&sender=${data.sender}&recipient=${data.recipient}&file=${data.file?.name || 'Asiakirja'}`}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`}
                      title="Kopioi leikepöydälle"
                      style={{ minWidth: '120px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?document=${data.documentId}&sender=${data.sender}&recipient=${data.recipient}&file=${data.file?.name || 'Asiakirja'}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? (
                        <>
                          <svg style={{ width: '20px', height: '20px', marginRight: '0.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Kopioitu!
                        </>
                      ) : (
                        <>
                          <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.5rem', background: '#fffbeb', border: '1px dashed #fcd34d', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#b45309', marginBottom: '0.5rem' }}>Nopea demo-tila</h3>
                <p style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '1rem' }}>
                  Haluatko vain demota palvelun putken alusta loppuun ilman sähköpostien säätöä? Ohita askeleet ja hyppää suoraan vastaanottajan saappaisiin.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ background: '#d97706', width: '100%' }}
                  onClick={() => setView('recipient')}
                >
                  Simuloi vastaanottajaa heti →
                </button>
              </div>

              <button className="btn btn-secondary" onClick={resetFlow} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                ← Palaa alkuun
              </button>
            </div>
          </div>
        )}

        {view === 'recipient' && <RecipientView data={data} onSignClick={() => setView('auth')} />}

        {view === 'processing' && (
          <ProcessingView
            data={data}
            onSuccess={() => setView('success')}
            onFail={(err) => {
              alert(`Virhe asiakirjan käsittelyssä: ${err}`);
              setView('recipient');
            }}
          />
        )}

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
