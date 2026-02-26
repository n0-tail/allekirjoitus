import { useState, useEffect } from 'react';
import { UploadView } from './UploadView';
import { RecipientView } from './RecipientView';
import { OidcCallbackView } from './OidcCallbackView';
import { ProcessingView } from './ProcessingView';
import { SuccessView } from './SuccessView';
import { Tietosuojaseloste } from './Tietosuojaseloste';
import { PaymentView } from './PaymentView';
import { supabase } from './lib/supabase';
import './index.css';

type AppState = 'upload' | 'sent' | 'sender-payment' | 'recipient' | 'recipient-payment' | 'processing' | 'waiting' | 'success' | 'privacy' | 'callback';

interface SignatureData {
  file: File | null;
  sender: string;
  recipient: string;
  documentId?: string;
  fileName?: string;
  verifiedName?: string;
  role?: 'sender' | 'recipient';
}

function App() {
  const getInitialView = (): AppState => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('code') && params.get('state')) return 'callback';
      if (params.get('payment_intent_client_secret')) {
        const stashed = sessionStorage.getItem('appState_view');
        if (stashed) return stashed as AppState;
      }
      if (params.get('document') && params.get('sender') && params.get('recipient')) return 'recipient';
    }
    return 'upload';
  };

  const getInitialData = (): SignatureData => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);

      if (params.get('code') && params.get('state')) {
        const stashed = sessionStorage.getItem('signatureData');
        if (stashed) {
          try {
            return JSON.parse(stashed);
          } catch { /* ignore */ }
        }
        return { file: null, sender: '', recipient: '', documentId: params.get('state') || '' };
      }

      if (params.get('payment_intent_client_secret')) {
        const stashed = sessionStorage.getItem('appState_data');
        if (stashed) {
          try {
            return JSON.parse(stashed);
          } catch { /* ignore */ }
        }
      }

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

  // Stash state for Payment returns
  useEffect(() => {
    sessionStorage.setItem('appState_view', view);
    sessionStorage.setItem('appState_data', JSON.stringify(data));
  }, [view, data]);

  const handleSend = (submittedData: SignatureData) => {
    // Generate a mock document ID only if one wasn't provided by the backend upload
    const docId = submittedData.documentId || Math.random().toString(36).substring(2, 10).toUpperCase();
    setData({ ...submittedData, documentId: docId });
    setView('sent');
  };

  const resetFlow = () => {
    setData({ file: null, sender: '', recipient: '' });
    setView('upload');
    // Clear URL parameters
    window.history.replaceState({}, '', window.location.pathname);
  };

  const initiateAuth = (role: 'sender' | 'recipient') => {
    if (!data.documentId) {
      alert('Virhe: Asiakirjan tunnistetta ei löytynyt.');
      return;
    }

    // Tallenna tilatiedot istuntoon, jotta voimme jatkaa OIDC-paluun jälkeen
    sessionStorage.setItem('signatureData', JSON.stringify({
      documentId: data.documentId,
      sender: data.sender,
      recipient: data.recipient,
      fileName: data.file?.name || data.fileName || 'Asiakirja.pdf',
      role: role // Save role so we know what to do after callback
    }));

    const clientId = import.meta.env.VITE_IDURA_CLIENT_ID;
    const domain = import.meta.env.VITE_IDURA_DOMAIN;

    if (!clientId || !domain) {
      console.warn("Idura OIDC muuttujia ei löydy.");
      alert("Tunnistautuminen ei ole käytössä (muuttujat puuttuvat).");
      return;
    }

    const redirectUri = window.location.origin + window.location.pathname;

    supabase.functions.invoke('init-auth', {
      body: {
        state: data.documentId,
        redirectUri: redirectUri
      }
    })
      .then(({ data: authData, error }) => {
        if (error) {
          console.error("Init-auth error:", error);
          alert("Virhe tunnistautumisen alustuksessa (Backend): " + error.message);
          return;
        }

        if (authData && authData.authUrl) {
          window.location.href = authData.authUrl;
        } else if (authData && authData.error) {
          alert("Virhe tunnistautumisen alustuksessa (IdP): " + authData.error);
        } else {
          alert("Palvelin ei palauttanut kelvollista ohjausosoitetta eikä virhettä.");
        }
      })
      .catch(err => {
        console.error("Fetch error configuring auth:", err);
        alert("Yhteysvirhe tunnistautumisen alustuksessa: " + err.message);
      });
  }

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Allekirjoitus
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

              <h2 style={{ marginBottom: '1rem' }}>Asiakirja on lähetetty!</h2>
              <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
                Sähköinen allekirjoituskutsu on luotu henkilölle <strong>{data.recipient}</strong>. Sinun täytyy enää maksaa käsittelymaksu ja tunnistautua, jotta allekirjoituspyyntö on virallinen.
              </p>

              <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Kutsu on lähetetty sähköpostitse</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>VOIT MYÖS KOPIOIDA LINKIN TÄSTÄ</span>
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

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '1rem', padding: '1rem', fontSize: '1.125rem' }}
                onClick={() => setView('sender-payment')}
              >
                Siirry maksamaan ja tunnistautumaan &rarr;
              </button>



              <button className="btn btn-secondary" onClick={resetFlow} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                ← Palaa alkuun
              </button>
            </div>
          </div>
        )}

        {view === 'sender-payment' && (
          <PaymentView
            reason="Lähettäjän käsittely- ja tunnistautumismaksu"
            onPaymentSuccess={() => initiateAuth('sender')}
            documentId={data.documentId!}
            role="sender"
          />
        )}

        {view === 'recipient' && (
          <RecipientView
            data={data}
            onSignClick={() => setView('recipient-payment')}
            onPrivacyClick={() => setView('privacy')}
          />
        )}

        {view === 'recipient-payment' && (
          <PaymentView
            reason="Allekirjoittajan käsittely- ja tunnistautumismaksu"
            onPaymentSuccess={() => initiateAuth('recipient')}
            documentId={data.documentId!}
            role="recipient"
          />
        )}

        {view === 'processing' && (
          <ProcessingView
            data={data}
            onSuccess={() => setView('success')}
            onWaiting={() => setView('waiting')}
            onFail={(err) => {
              alert(`Virhe asiakirjan käsittelyssä: ${err}`);
              setView('recipient');
            }}
          />
        )}

        {view === 'waiting' && (
          <div className="container animate-fade-in">
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ color: '#f59e0b', marginBottom: '1rem' }}>
                <svg style={{ width: '48px', height: '48px', margin: '0 auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2>Tallennettu onnistuneesti!</h2>
              <p>Allekirjoituksesi on kirjattu turvallisesti järjestelmään. Odotamme vielä toisen osapuolen tunnistautumista tai maksua, ennen kuin lopullinen allekirjoitettu asiakirja voidaan luoda ja lähettää teille sähköpostitse.</p>
            </div>
          </div>
        )}

        {view === 'success' && <SuccessView data={data} onReset={resetFlow} />}

        {view === 'privacy' && <Tietosuojaseloste onBack={() => setView(data.documentId ? 'recipient' : 'upload')} />}

        {view === 'callback' && (
          <OidcCallbackView
            code={new URLSearchParams(window.location.search).get('code') || ''}
            onSuccess={(name) => {
              let currentRole: 'sender' | 'recipient' = 'recipient';

              // Hae istunnosta, olimmeko lähettäjä vai vastaanottaja
              try {
                const stashed = sessionStorage.getItem('signatureData');
                if (stashed) {
                  const stashedData = JSON.parse(stashed);
                  if (stashedData.role) currentRole = stashedData.role;
                }
              } catch (_) { }

              setData(prev => ({ ...prev, verifiedName: name, role: currentRole }));
              setView('processing');
            }}
            onFail={(err) => {
              alert(`Tunnistautuminen epäonnistui: ${err}`);
              setView('recipient');
            }}
          />
        )}
      </main>
      <footer style={{ marginTop: 'auto', padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <div>&copy; {new Date().getFullYear()} Polarcomp Oy (polarcomp.fi). Y-tunnus: 1234567-8</div>
        <div style={{ marginTop: '0.5rem' }}>
          <button
            onClick={() => setView('privacy')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Tietosuojaseloste
          </button>
        </div>
      </footer>
    </>
  );
}

export default App;
