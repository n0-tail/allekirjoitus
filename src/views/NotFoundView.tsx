import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateSeoMeta } from '../lib/seo';

export const NotFoundView: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    updateSeoMeta({
      title: 'Sivua ei löytynyt (404) | Helppo Allekirjoitus',
      description: 'Etsimääsi sivua ei löytynyt. Siirry Helppo Allekirjoitus -palvelun etusivulle tai selaa ilmaisia suomalaisia sopimuspohjia.',
      canonicalPath: '/',
      noindex: true,
    });
  }, []);

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '680px', padding: '3.5rem 1rem', textAlign: 'center' }}>
      <div className="card" style={{ padding: '2.75rem 2rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
          Virhe 404
        </div>
        <h1 style={{ fontSize: '1.85rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Etsimääsi sivua ei löytynyt
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          Sivu on saatettu siirtää tai osoitteessa on kirjoitusvirhe. Voit siirtyä suoraan allekirjoittamaan PDF-asiakirjan tai täyttämään valmiin sopimuspohjan.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', padding: '0.8rem 1.4rem' }}>
            Siirry etusivulle (PDF-allekirjoitus) →
          </Link>
          <Link to="/sopimuspohjat/" className="btn btn-secondary" style={{ textDecoration: 'none', padding: '0.8rem 1.4rem' }}>
            Ilmaiset sopimuspohjat
          </Link>
        </div>
      </div>
    </div>
  );
};
