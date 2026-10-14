import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { contractTemplates } from '../data/contractTemplates';

export const TemplateIndexView: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = 'Ilmaiset sopimuspohjat (PDF) – Täytä ja allekirjoita verkossa | Helppo Allekirjoitus';
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute(
                'content',
                'Täytä virallinen suomalainen sopimuspohja suoraan selaimessa: vuokrasopimus, auton kauppakirja, velkakirja, valtakirja tai NDA. Lataa PDF ilmaiseksi tai allekirjoita pankkitunnuksilla (1,49 €).'
            );
        }
    }, []);

    return (
        <div className="container animate-fade-in" style={{ maxWidth: '880px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <Link
                    to="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontSize: '0.925rem',
                        fontWeight: 500
                    }}
                >
                    ← Palaa etusivulle (PDF-allekirjoitus)
                </Link>
            </div>

            <div className="card" style={{ padding: '2.5rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <span
                        style={{
                            display: 'inline-block',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--primary)',
                            marginBottom: '0.5rem'
                        }}
                    >
                        Suomalaiset sopimusmallit • PDF & FTN
                    </span>
                    <h1 style={{ fontSize: '2rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                        Valmiit sopimuspohjat sähköiseen allekirjoitukseen
                    </h1>
                    <p style={{ fontSize: '1.025rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '720px' }}>
                        Eikö sinulla ole vielä valmista PDF-sopimusta? Valitse alta sopimustyyppi, täytä tiedot suoraan selaimessa ja lataa valmis PDF maksutta — tai vie se yhdellä klikkauksella pankkitunnuksilla allekirjoitettavaksi (1,49 € / osapuoli).
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {contractTemplates.map((tpl) => (
                        <Link
                            key={tpl.slug}
                            to={`/sopimuspohjat/${tpl.slug}`}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: '#ffffff',
                                textDecoration: 'none',
                                transition: 'var(--transition)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                    {tpl.category}
                                </div>
                                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                    {tpl.title}
                                </h2>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                                    {tpl.summary}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                                <span>Täytä sopimus verkossa</span>
                                <span>→</span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div
                    style={{
                        marginTop: '2.25rem',
                        padding: '1.25rem 1.5rem',
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                    }}
                >
                    <div>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                            Etsitkö muokattavaa Word-pohjaa (.docx) tai harvinaisempaa asiakirjaa?
                        </strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Sisarpalvelustamme Dokumenttipohja.fi löydät yli 70 ilmaista suomalaista sopimus-, pöytäkirja- ja asiakirjamallia.
                        </span>
                    </div>
                    <a
                        href="https://dokumenttipohja.fi/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ textDecoration: 'none', fontSize: '0.875rem', padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}
                    >
                        Avaa Dokumenttipohja.fi ↗
                    </a>
                </div>
            </div>
        </div>
    );
};
