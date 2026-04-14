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
    const [showObserverInput, setShowObserverInput] = useState(false);
    const [observerEmail, setObserverEmail] = useState('');
    const [observerPays, setObserverPays] = useState(false);

    const sendEmailsOnce = async () => {
        if (!data?.documentId) return;
        const key = `emails_sent_${data.documentId}`;
        if (sessionStorage.getItem(key)) return;
        
        try {
            await supabase.functions.invoke('send-email', {
                body: { documentId: data.documentId, emailType: 'invitation' }
            });
            sessionStorage.setItem(key, 'true');
        } catch (e) {
            console.warn("Failed sending emails", e);
        }
    };

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

                        <h2 style={{ marginBottom: '1rem' }}>{data.allSigners && data.allSigners.length > 0 ? 'Melkein valmista!' : 'Asiakirja on ladattu!'}</h2>
                        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
                            {data.allSigners && data.allSigners.length > 0 ? (
                                <>Sähköinen allekirjoituskutsu on luotu henkilölle <strong>{data.recipient}</strong>. Viimeistele lähetys valitsemalla alta haluamasi toimintatapa.</>
                            ) : (
                                <>Olet asettanut itsesi ainoaksi allekirjoittajaksi. Täydennä prosessi maksamalla käsittelymaksu ja tunnistautumalla.</>
                            )}
                        </p>

                        {data.allSigners && data.allSigners.length > 0 && (
                        <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Kutsut lähetetään automaattisesti vahvistuksen jälkeen</h3>

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
                        )}

                        {!data.senderPaid ? (
                            <>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginBottom: '0.75rem', padding: '1rem', fontSize: '1.125rem' }}
                                    onClick={() => {
                                        sendEmailsOnce();
                                        setView('payment');
                                    }}
                                >
                                    Siirry maksamaan ja tunnistautumaan &rarr;
                                </button>

                                {data.allSigners && data.allSigners.length > 0 && (
                                    <>
                                        {!showObserverInput ? (
                                            <button
                                                className="btn btn-secondary"
                                                style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem', opacity: 0.85 }}
                                                onClick={() => setShowObserverInput(true)}
                                            >
                                                Lähetä pelkästään vastaanottajille (et allekirjoita itse)
                                            </button>
                                        ) : (
                                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                                <label className="form-label">Sähköpostisi hallintaa varten</label>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                  Lopullinen sopimus ja kuitit toimitetaan tähän antamaasi osoitteeseen. Et aseta asiakirjaan omaa allekirjoitusta.
                                                </p>
                                                <input
                                                    type="email"
                                                    autoComplete="email"
                                                    className="form-input"
                                                    style={{ marginBottom: '0.75rem' }}
                                                    placeholder="toimisto@yritys.fi"
                                                    value={observerEmail}
                                                    onChange={e => setObserverEmail(e.target.value)}
                                                />

                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', textAlign: 'left' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={observerPays} 
                                                        onChange={e => setObserverPays(e.target.checked)} 
                                                        style={{ width: '1.2rem', height: '1.2rem' }}
                                                    />
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                                        Haluan maksaa asiakirjan kaikki kulut vastaanottajien puolesta
                                                    </span>
                                                </label>

                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem' }}
                                                    onClick={async () => {
                                                        if (!observerEmail || !observerEmail.includes('@')) {
                                                            toast.error('Syötä ensin kelvollinen sähköpostiosoite.');
                                                            return;
                                                        }
                                                        try {
                                                            const newSignerId = crypto.randomUUID();
                                                            const { error } = await supabase.rpc('set_sender_observer_with_email', { 
                                                                doc_id: data.documentId, 
                                                                new_signer_id: newSignerId,
                                                                actual_sender_email: observerEmail,
                                                                will_pay: observerPays
                                                            });
                                                            if (error) throw error;

                                                            if (observerPays) {
                                                                sessionStorage.setItem('payForAll', 'true');
                                                                sessionStorage.setItem('observerPays', 'true');
                                                                setView('payment');
                                                            } else {
                                                                await sendEmailsOnce();
                                                                toast.success('Sopimus lähetetty vastaanottajille.');
                                                                setView('waiting');
                                                            }
                                                        } catch (err: any) {
                                                            toast.error('Virhe: ' + (err.message || 'Tuntematon virhe'));
                                                        }
                                                    }}
                                                >
                                                    Vahvista ja lähetä
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', boxShadow: 'none' }}
                                                    onClick={() => setShowObserverInput(false)}
                                                >
                                                    Peruuta
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
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
                    reason={role === 'sender' ? (data.senderSigns === false || observerPays ? "Asiakirjan kaikki käsittelykulut" : "Lähettäjän käsittely- ja tunnistautumismaksu") : "Allekirjoittajan käsittely- ja tunnistautumismaksu"}
                    onPaymentSuccess={async () => {
                        if (data.senderSigns === false || sessionStorage.getItem('observerPays') === 'true') {
                            await sendEmailsOnce();
                            toast.success("Maksu vahvistettu! Asiakirja on lähetetty vastaanottajille.");
                            sessionStorage.removeItem('observerPays');
                            setView('waiting');
                        } else {
                            toast.success("Maksu vahvistettu! Siirrytään tunnistautumiseen...");
                            setView('loading');
                            const success = await initiateAuth(data, role);
                            if (!success) {
                                setView('start');
                            }
                        }
                    }}
                    documentId={data.documentId!}
                    role={role}
                    email={role === 'sender' ? data.sender : data.recipient}
                    signerId={data.signerId}
                    totalSigningParties={(data.allSigners?.length || 0) + (observerPays || data.senderSigns === false ? 0 : 1)}
                    senderSigns={observerPays ? false : data.senderSigns}
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

            {view === 'waiting' && (() => {
                const senderCounts = data.senderSigns !== false;
                const totalSigners = (data.allSigners?.length || 0) + (senderCounts ? 1 : 0);
                const signedCount = (data.allSigners?.filter(s => s.signed).length || 0) + (senderCounts && data.senderSigned ? 1 : 0);
                const allSigned = signedCount === totalSigners;

                return (
                    <div className="container animate-fade-in">
                        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ color: allSigned ? '#10b981' : '#f59e0b', margin: '0 auto 1.5rem auto' }}>
                                {allSigned ? (
                                    <svg style={{ width: '64px', height: '64px', margin: '0 auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg style={{ width: '64px', height: '64px', margin: '0 auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                            
                            {allSigned ? (
                                <>
                                    <h2 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>Asiakirjaa viimeistellään</h2>
                                    <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>
                                        Kaikki osapuolet ovat allekirjoittaneet asiakirjan. Järjestelmä luo parhaillaan lopullista PDF-tiedostoa. Tämä voi kestää hetken.<br /><br />
                                        {totalSigners > 1 && <strong style={{ color: 'var(--text-main)' }}>Valmiina: {signedCount} / {totalSigners}</strong>}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>Odotetaan muita osapuolia</h2>
                                    <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>
                                        Allekirjoituksesi on kirjattu järjestelmään. Odotamme vielä muiden osapuolten tunnistautumisia, ennen kuin lopullinen asiakirja voidaan luoda.<br /><br />
                                        <strong style={{ color: 'var(--text-main)' }}>Valmiina: {signedCount} / {totalSigners}</strong>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

            {view === 'success' && <SuccessView data={data} onReset={() => navigate('/')} />}
        </>
    );
}
