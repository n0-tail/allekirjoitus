import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { articles } from '../data/articles';

export const ArticleIndexView: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Tietoa ja oppaita sähköisestä allekirjoituksesta | Helppo Allekirjoitus";

        // Yksinkertainen meta description päivitys (tekoäly lukee nämä dynaamisesti reactin renderöinnin jälkeen)
        let metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Lue asiantuntija-artikkelit sähköisestä allekirjoituksesta, juridiikasta, hinnoittelusta ja vuokrasopimuksista. Zero-knowledge ja eIDAS/FTN.');
        }
    }, []);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <button
                onClick={() => navigate(-1)}
                style={{
                    background: 'none', border: 'none', color: 'var(--primary)',
                    cursor: 'pointer', padding: '0', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '1rem', fontWeight: 500
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Takaisin
            </button>

            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'left' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text)' }}>Asiantuntija-artikkelit ja oppaat</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
                    Syvennä osaamistasi sähköisen allekirjoittamisen juridiikasta (eIDAS) ja arkipäivän käyttötapauksista asiantuntija-artikkeleidemme avulla. Yksityishenkilöille ja yrityksille.
                </p>

                <nav>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {articles.map((article) => (
                            <li key={article.slug}>
                                <Link
                                    to={`/asiantuntija-artikkelit/${article.slug}`}
                                    style={{
                                        display: 'block', padding: '1.5rem', borderRadius: '12px',
                                        border: '1px solid var(--border)', textDecoration: 'none',
                                        transition: 'all 0.2s', background: 'rgba(255,255,255,0.03)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: 'var(--text)' }}>{article.title}</h2>
                                    <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                        {article.description}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--text-muted)', opacity: 0.8 }}>Julkaistu: {article.date}</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            Lue artikkeli
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
};
