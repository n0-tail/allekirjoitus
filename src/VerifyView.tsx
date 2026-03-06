import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';

export const VerifyView = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [docData, setDocData] = useState<any | null>(null);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                if (!id) throw new Error('Virheellinen linkki.');

                const { data, error: dbError } = await supabase
                    .from('documents')
                    .select('id, sender_name, sender_email, signers, status, file_name, created_at, updated_at, document_hash, audit_trail')
                    .eq('id', id)
                    .single();

                if (dbError || !data) {
                    throw new Error('Asiakirjaa ei löytynyt tai tarkistuslinkki on vanhentunut.');
                }

                setDocData(data);
            } catch (err: any) {
                setError(err.message || 'Tapahtui tuntematon virhe.');
            } finally {
                setLoading(false);
            }
        };

        fetchDoc();
    }, [id]);

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div className="spinner" style={{ borderTopColor: '#10b981', marginBottom: '1rem' }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Haetaan allekirjoitustietoja...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '1.5rem', borderRadius: '1rem', maxWidth: '28rem', width: '100%', border: '1px solid #fee2e2', textAlign: 'center' }}>
                    <svg style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto', color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Tarkistus epäonnistui</h2>
                    <p>{error}</p>
                    <Link to="/" style={{ display: 'inline-block', marginTop: '1.5rem', color: '#10b981', fontWeight: 500, textDecoration: 'none' }}>
                        Palaa etusivulle
                    </Link>
                </div>
            </div>
        );
    }

    const isSigned = docData?.status === 'signed';
    const participants = [
        { name: docData?.sender_name, email: docData?.sender_email },
        ...(docData?.signers || []).map((s: any) => ({ name: s.name, email: s.email, signed: s.signed }))
    ];

    return (
        <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1rem' }} className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '2rem' }}>
                <p style={{ display: 'inline-block', padding: '0.375rem 1rem', borderRadius: '9999px', background: '#ecfdf5', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 500, fontSize: '0.875rem', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    Todistuksen tarkistus (Aitoustodistus)
                </p>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                    Validointiportaali
                </h1>
                <p style={{ fontSize: '1.125rem', color: '#64748b', maxWidth: '36rem', margin: '0 auto' }}>
                    Tarkista sähköisesti allekirjoitetun asiakirjan aitous ja tila.
                </p>
            </div>

            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Allekirjoituksen tila</h2>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>ID: {docData?.id}</p>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', borderRadius: '9999px', fontWeight: 500,
                        background: isSigned ? '#ecfdf5' : '#fffbeb',
                        color: isSigned ? '#10b981' : '#f59e0b',
                        border: `1px solid ${isSigned ? '#d1fae5' : '#fef3c7'}`
                    }}>
                        {isSigned ? (
                            <>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Hyväksytty
                            </>
                        ) : (
                            <>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s ease-in-out infinite' }}></div>
                                Odottaa allekirjoituksia
                            </>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '1rem', background: '#f8fafc', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Tiedoston nimi</p>
                        <p style={{ color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {docData?.file_name || 'Tuntematon asiakirja'}
                        </p>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '1rem', background: '#f8fafc', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Laskettu SHA-256 Tiiviste</p>
                        <p style={{ color: '#1e293b', fontWeight: 500, fontSize: '0.875rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {docData?.document_hash || 'Lasketaan kun kaikki ovat allekirjoittaneet'}
                        </p>
                    </div>
                </div>

                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Osapuolet ({participants.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {participants.map((p, idx) => {
                        const auditLogEntry = (docData?.audit_trail || []).slice().reverse().find((a: any) => a.email === p.email);

                        return (
                            <div key={idx} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '1rem', borderRadius: '0.75rem', background: 'white',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 500, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {p.name || 'Nimi ei vielä vahvistettu'}
                                        {(idx === 0 || p.signed) && (
                                            <svg style={{ width: '16px', height: '16px', color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </span>
                                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{p.email}</span>
                                </div>
                                {auditLogEntry && (
                                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>IP: {auditLogEntry.ip}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tunnistus: {auditLogEntry.auth_method.replace("Vahva sähköinen tunnistautuminen (FTN)", "Vahva FTN")}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                        Takaisin palveluun
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
};
