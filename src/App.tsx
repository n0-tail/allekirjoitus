import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UploadView } from './UploadView';
import { RecipientView } from './RecipientView';
import { OidcCallbackView } from './OidcCallbackView';
import { ProcessingView } from './ProcessingView';
import { SuccessView } from './SuccessView';
import { Tietosuojaseloste } from './Tietosuojaseloste';
import { PaymentView } from './PaymentView';
import { supabase } from './lib/supabase';
import './index.css';

export interface SignatureData {
  file: File | null;
  sender: string;
  recipient: string;
  documentId?: string;
  fileName?: string;
  verifiedName?: string;
  role?: 'sender' | 'recipient';
}

function initiateAuth(data: SignatureData, role: 'sender' | 'recipient') {
  if (!data.documentId) {
    toast.error('Virhe: Asiakirjan tunnistetta ei löytynyt.');
    return;
  }

  sessionStorage.setItem('signatureData', JSON.stringify({
    ...data,
    role: role
  }));

  const clientId = import.meta.env.VITE_IDURA_CLIENT_ID;
  const domain = import.meta.env.VITE_IDURA_DOMAIN;

  if (!clientId || !domain) {
    console.warn("Idura OIDC muuttujia ei löydy.");
    toast.error("Tunnistautuminen ei ole käytössä (muuttujat puuttuvat).");
    return;
  }

  const redirectUri = window.location.origin + '/auth/callback';

  supabase.functions.invoke('init-auth', {
    body: {
      state: data.documentId,
      redirectUri: redirectUri
    }
  })
    .then(({ data: authData, error }) => {
      if (error) {
        toast.error("Virhe tunnistautumisen alustuksessa: " + error.message);
        return;
      }

      if (authData && authData.authUrl) {
        window.location.href = authData.authUrl;
      } else if (authData && authData.error) {
        toast.error("Virhe tunnistautumisen alustuksessa: " + authData.error);
      } else {
        toast.error("Palvelin ei palauttanut kelvollista ohjausosoitetta.");
      }
    })
    .catch(err => {
      toast.error("Yhteysvirhe tunnistautumisen alustuksessa: " + err.message);
    });
}

function DocumentFlow({ role }: { role: 'sender' | 'recipient' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<SignatureData | null>(null);
  const [view, setView] = useState<'loading' | 'start' | 'payment' | 'processing' | 'waiting' | 'success' | 'error'>('loading');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Jos olemme palanneet onnistuneesta maksusta (Stripe redirect_status)
    if (searchParams.get('payment_intent_client_secret')) {
      const stashedData = sessionStorage.getItem('appState_data');
      if (stashedData) {
        try {
          setData(JSON.parse(stashedData));

          // Jos maksu onnistui, ohjataan heti tunnistautumaan
          if (searchParams.get('redirect_status') === 'succeeded') {
            toast.success("Maksu vahvistettu! Siirrytään tunnistautumiseen...");
            initiateAuth(JSON.parse(stashedData), role);
            return;
          } else {
            setView('start'); // Jos peruutettu
          }
        } catch { }
      }
    }

    // Jos jatkamme IDURA-paluun jälkeen (sessionStorange 'processing' tai vastaava ei enää käytössä tässä, 
    // se hoidetaan AuthCallbackRoute:ssa joka ohjaa takaisin tänne)

    supabase.rpc('get_document', { doc_id: id }).single()
      .then(({ data, error }) => {
        const doc = data as { id: string, file_name: string, sender_email: string, recipient_email: string } | null;
        if (error || !doc) {
          toast.error("Asiakirjaa ei löytynyt järjestelmästä.");
          setView('error');
        } else {
          // Haetaan sessionstoragesta jos siellä on jo jotain (esim OIDC paluu)
          const stashedSession = sessionStorage.getItem('appState_view');
          const stashedData = sessionStorage.getItem('appState_data');
          if (stashedSession === 'processing' && stashedData) {
            setData(JSON.parse(stashedData));
            setView('processing');
            sessionStorage.removeItem('appState_view');
            return;
          }

          setData({
            file: null,
            documentId: doc.id,
            sender: doc.sender_email,
            recipient: doc.recipient_email,
            fileName: doc.file_name,
            role: role
          });
          setView('start');
        }
      });
  }, [id, role, searchParams]);

  useEffect(() => {
    if (data && view !== 'loading' && view !== 'error') {
      sessionStorage.setItem('appState_data', JSON.stringify(data));
      sessionStorage.setItem('appState_view', view);
    }
  }, [data, view]);

  if (view === 'loading') return <div style={{ textAlign: 'center', padding: '4rem' }}>Ladataan asiakirjaa...</div>;
  if (view === 'error' || !data) return <div style={{ textAlign: 'center', padding: '4rem', color: 'red' }}>Asiakirjan lataaminen epäonnistui. Se on joko vanhentunut tai sitä ei ole olemassa.</div>;

  return (
    <>
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <span className="badge badge-success" style={{ background: '#eff6ff', color: 'var(--primary)', display: 'inline-block' }}>
          Olet: {role === 'sender' ? data.sender : data.recipient}
        </span>
      </div>

      {view === 'start' && role === 'sender' && (
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
                    value={`${window.location.origin}/asiakirja/${data.documentId}`}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`}
                    title="Kopioi leikepöydälle"
                    style={{ minWidth: '120px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/asiakirja/${data.documentId}`);
                      setCopied(true);
                      toast.success("Linkki kopioitu!");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? 'Kopioitu!' : 'Kopioi linkki'}
                  </button>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '1rem', padding: '1rem', fontSize: '1.125rem' }}
              onClick={() => setView('payment')}
            >
              Siirry maksamaan ja tunnistautumaan &rarr;
            </button>
          </div>
        </div>
      )}

      {view === 'start' && role === 'recipient' && (
        <RecipientView
          data={data}
          onSignClick={() => setView('payment')}
          onPrivacyClick={() => navigate('/tietosuoja')}
        />
      )}

      {view === 'payment' && (
        <PaymentView
          reason={role === 'sender' ? "Lähettäjän käsittely- ja tunnistautumismaksu" : "Allekirjoittajan käsittely- ja tunnistautumismaksu"}
          onPaymentSuccess={() => initiateAuth(data, role)}
          documentId={data.documentId!}
          role={role}
        />
      )}

      {view === 'processing' && (
        <ProcessingView
          data={data}
          onSuccess={() => setView('success')}
          onWaiting={() => setView('waiting')}
          onFail={(err) => {
            toast.error(`Virhe asiakirjan käsittelyssä: ${err}`);
            setView('start');
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

      {view === 'success' && <SuccessView data={data} onReset={() => navigate('/')} />}
    </>
  );
}

function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';

  return (
    <OidcCallbackView
      code={code}
      onSuccess={(name) => {
        let currentRole: 'sender' | 'recipient' = 'recipient';
        let docId = '';
        try {
          const stashed = sessionStorage.getItem('signatureData');
          if (stashed) {
            const stashedData = JSON.parse(stashed);
            if (stashedData.role) currentRole = stashedData.role;
            if (stashedData.documentId) docId = stashedData.documentId;

            // Päivitetään heti data ja view processing-tilaan tulevaa Flow'ta varten
            sessionStorage.setItem('appState_view', 'processing');
            sessionStorage.setItem('appState_data', JSON.stringify({ ...stashedData, verifiedName: name }));
          }
        } catch (_) { }

        // Ohjataan takaisin oikeaan roolinäkymään, joka poimii sessionStoragesta processing-tilan
        if (currentRole === 'sender') {
          navigate(`/lahettaja/${docId}`, { replace: true });
        } else {
          navigate(`/asiakirja/${docId}`, { replace: true });
        }
      }}
      onFail={(err) => {
        toast.error(`Tunnistautuminen epäonnistui: ${err}`);
        // Yritetään kaivaa docId jotta voidaan palata
        try {
          const stashed = sessionStorage.getItem('signatureData');
          if (stashed) {
            const data = JSON.parse(stashed);
            navigate(data.role === 'sender' ? `/lahettaja/${data.documentId}` : `/asiakirja/${data.documentId}`, { replace: true });
            return;
          }
        } catch (_) { }
        navigate('/');
      }}
    />
  );
}

function App() {
  const navigate = useNavigate();

  return (
    <>
      <header className="app-header">
        <div className="app-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Allekirjoitus
        </div>
      </header>

      <main style={{ padding: '2rem 1rem' }}>
        <Routes>
          <Route path="/" element={<UploadView />} />
          <Route path="/asiakirja/:id" element={<DocumentFlow role="recipient" />} />
          <Route path="/lahettaja/:id" element={<DocumentFlow role="sender" />} />
          <Route path="/auth/callback" element={<AuthCallbackRoute />} />
          <Route path="/tietosuoja" element={<Tietosuojaseloste onBack={() => window.history.back()} />} />
        </Routes>
      </main>

      <footer style={{ marginTop: 'auto', padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <div>&copy; {new Date().getFullYear()} Polarcomp Oy (polarcomp.fi). Y-tunnus: 1234567-8</div>
        <div style={{ marginTop: '0.5rem' }}>
          <button
            onClick={() => navigate('/tietosuoja')}
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
