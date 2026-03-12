import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { RecipientView } from './RecipientView';
import { ProcessingView } from './ProcessingView';
import { SuccessView } from './SuccessView';
import { PaymentView } from './PaymentView';
import { useDocumentFlow } from './hooks/useDocumentFlow';
import { supabase } from './lib/supabase';
import type { SignatureData } from './types';

export function initiateAuth(data: SignatureData, role: 'sender' | 'recipient'): Promise<boolean> {
    if (!data.documentId) {
        toast.error('Virhe: Asiakirjan tunnistetta ei löytynyt.');
        return Promise.resolve(false);
    }

    sessionStorage.setItem('signatureData', JSON.stringify({ ...data, role }));

    const clientId = import.meta.env.VITE_IDURA_CLIENT_ID;
    const domain = import.meta.env.VITE_IDURA_DOMAIN;

    if (!clientId || !domain) {
        console.warn("Idura OIDC muuttujia ei löydy.");
        toast.error("Tunnistautuminen ei ole käytössä (muuttujat puuttuvat).");
        return Promise.resolve(false);
    }

    const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;

    return supabase.functions.invoke('init-auth', {
        body: {
            state: data.documentId,
            redirectUri: redirectUri
        }
    })
        .then(({ data: authData, error }) => {
            if (error) {
                toast.error("Virhe tunnistautumisen alustuksessa: " + error.message);
                return false;
            }

            if (authData && authData.authUrl) {
                window.location.href = authData.authUrl;
                return true;
            } else if (authData && authData.error) {
                toast.error("Virhe tunnistautumisen alustuksessa: " + authData.error);
                return false;
            } else {
                toast.error("Palvelin ei palauttanut kelvollista ohjausosoitetta.");
                return false;
            }
        })
        .catch(err => {
            toast.error("Yhteysvirhe tunnistautumisen alustuksessa: " + err.message);
            return false;
        });
}

export function DocumentFlow({ role }: { role: 'sender' | 'recipient' }) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data, view, setView } = useDocumentFlow(id, role);
    const [copiedId, setCopiedId] = useState<string | null>(null);

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
                                {data.allSigners && data.allSigners.length > 0 && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>VOIT MYÖS KOPIOIDA LINKIN VASTAANOTTAJALLE TÄSTÄ</span>
                                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                                        </div>

                                        {data.allSigners.map((signer) => {
                                            const signerLink = `${window.location.origin}${import.meta.env.BASE_URL}asiakirja/${data.documentId}?signer=${signer.id}`;
                                            return (
                                                <div key={signer.id} style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        className="form-input"
                                                        style={{ flex: 1, fontSize: '0.875rem', background: 'white' }}
                                                        value={signerLink}
                                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                                    />
                                                    <button
                                                        className={`btn ${copiedId === signer.id ? 'btn-primary' : 'btn-secondary'}`}
                                                        title="Kopioi leikepöydälle"
                                                        style={{ minWidth: '120px' }}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(signerLink);
                                                            setCopiedId(signer.id);
                                                            toast.success(`Vastaanottajan ${signer.email} linkki kopioitu!`);
                                                            setTimeout(() => setCopiedId(null), 2000);
                                                        }}
                                                    >
                                                        {copiedId === signer.id ? 'Kopioitu!' : 'Kopioi linkki'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>

                        {!data.senderPaid ? (
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginBottom: '1rem', padding: '1rem', fontSize: '1.125rem' }}
                                onClick={() => setView('payment')}
                            >
                                Siirry maksamaan ja tunnistautumaan &rarr;
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginBottom: '1rem', padding: '1rem', fontSize: '1.125rem' }}
                                onClick={async () => {
                                    setView('loading');
                                    const success = await initiateAuth(data, role);
                                    if (!success) {
                                        setView('start');
                                    }
                                }}
                            >
                                Jatka tunnistautumiseen &rarr;
                            </button>
                        )}
                    </div>
                </div>
            )}

            {view === 'start' && role === 'recipient' && (
                <RecipientView
                    data={data}
                    isPaid={data.allSigners?.find(s => s.id === data.signerId)?.paid || false}
                    onSignClick={() => setView('payment')}
                    onAuthDirectClick={async () => {
                        toast.success("Maksu on jo hoidettu (Lähettäjä). Siirrytään tunnistautumiseen!");
                        setView('loading');
                        const success = await initiateAuth(data, role);
                        if (!success) {
                            setView('start'); // Palaa takaisin jos epäonnistui
                        }
                    }}
                    onPrivacyClick={() => navigate('/tietosuoja')}
                />
            )}

            {view === 'payment' && (
                <PaymentView
                    reason={role === 'sender' ? "Lähettäjän käsittely- ja tunnistautumismaksu" : "Allekirjoittajan käsittely- ja tunnistautumismaksu"}
                    onPaymentSuccess={async () => {
                        toast.success("Maksu vahvistettu! Siirrytään tunnistautumiseen...");
                        setView('loading');
                        const success = await initiateAuth(data, role);
                        if (!success) {
                            setView('start');
                        }
                    }}
                    documentId={data.documentId!}
                    role={role}
                    email={role === 'sender' ? data.sender : data.recipient}
                    signerId={data.signerId}
                    numSigners={data.allSigners?.length || 0}
                />
            )}

            {view === 'authenticating' && (
                <div className="container animate-fade-in">
                    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem auto', borderTopColor: 'var(--primary)' }}></div>
                        <h2 style={{ marginBottom: '1rem' }}>Siirrytään tunnistautumiseen...</h2>
                        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Odota hetki, sinut ohjataan automaattisesti eteenpäin.</p>
                    </div>
                </div>
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
                        <div style={{ color: '#f59e0b', margin: '0 auto 1.5rem auto' }}>
                            <svg style={{ width: '64px', height: '64px', margin: '0 auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>Odotetaan muita osapuolia</h2>
                        {data.allSigners && data.allSigners.length > 0 ? (
                            <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>
                                Allekirjoituksesi on kirjattu järjestelmään. Odotamme vielä muiden osapuolten tunnistautumisia, ennen kuin lopullinen asiakirja voidaan luoda.<br /><br />
                                <strong style={{ color: 'var(--text-main)' }}>Valmiina: {data.allSigners.filter(s => s.signed).length} / {data.allSigners.length}</strong>
                            </p>
                        ) : (
                            <p>Allekirjoituksesi on kirjattu järjestelmään. Odotamme vielä toisen osapuolen tunnistautumista...</p>
                        )}
                    </div>
                </div>
            )}

            {view === 'success' && <SuccessView data={data} onReset={() => navigate('/')} />}
        </>
    );
}
