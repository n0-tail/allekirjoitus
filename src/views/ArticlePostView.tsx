import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { articles } from '../data/articles';

export const ArticlePostView: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const article = articles.find(a => a.slug === slug) || null;

    useEffect(() => {
        window.scrollTo(0, 0); // Scrollaa aina ylös kun artikkeli vaihtuu
        if (article) {
            document.title = `${article.title} | Helppo Allekirjoitus`;

            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.setAttribute('content', article.description);
            }
        }
    }, [article]);

    if (!article) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <h2>Artikkelia ei löytynyt.</h2>
                <p style={{ marginBottom: '1.5rem' }}>Etsimääsi sivua ei ole olemassa.</p>
                <button className="btn btn-primary" onClick={() => navigate('/')}>Palaa etusivulle</button>
            </div>
        );
    }

    // JSON-LD RAG/SEO Malleille
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.description,
        "datePublished": article.date,
        "author": {
            "@type": "Organization",
            "name": "Polarcomp Oy",
            "url": "https://helppoallekirjoitus.fi/"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Polarcomp Oy",
            "logo": {
                "@type": "ImageObject",
                "url": "https://helppoallekirjoitus.fi/logo.jpg"
            }
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>

            {/* RAG-optimoitu piilotettu Schema.org JSON Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <nav style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    onClick={() => navigate('/asiantuntija-artikkelit')}
                    style={{
                        background: 'none', border: 'none', color: 'var(--primary)',
                        cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '1rem', fontWeight: 500
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Kaikki artikkelit
                </button>

                <Link to="/" style={{ textDecoration: 'none' }}>
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                        Allekirjoita sopimus heti (1,49€) →
                    </button>
                </Link>
            </nav>

            <article className="card" style={{ padding: '3rem 2rem', textAlign: 'left' }}>
                <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                        {article.title}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <span>Julkaistu: {article.date}</span>
                        <span>|</span>
                        <span>Polarcomp Oy</span>
                    </div>
                </header>

                {/* Itse artikkelin sisältö, turvallisesti markdown/html-injektoitu luotetusta staattisesta tietokannasta */}
                <div
                    className="article-content"
                    style={{ lineHeight: 1.8, fontSize: '1.1rem', color: 'var(--text-main)' }}
                    dangerouslySetInnerHTML={{ __html: article.content }}
                />
                <style dangerouslySetInnerHTML={{
                    __html: `
          .article-content h2 { color: var(--text-main); margin-top: 2.5rem; margin-bottom: 1rem; font-size: 1.75rem; }
          .article-content h3 { color: var(--text-main); margin-top: 2rem; margin-bottom: 0.75rem; font-size: 1.35rem; }
          .article-content p { margin-bottom: 1.5rem; }
          .article-content ul, .article-content ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
          .article-content li { margin-bottom: 0.5rem; }
          .article-content strong { color: var(--primary); }
        `}} />
            </article>

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                <div style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
                    Vakuutuitko tietoturvasta ja hinnasta (1,49€)?
                </div>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                        Siirry allekirjoittamaan PDF tästä →
                    </button>
                </Link>
            </div>

        </div>
    );
};
