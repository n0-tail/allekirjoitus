import { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { UploadView } from './UploadView';
import { DocumentFlow } from './DocumentFlow';
import { AuthCallbackRoute } from './AuthCallbackRoute';
import './index.css';

const PrivacyView = lazy(() => import('./PrivacyView'));
const TermsView = lazy(() => import('./TermsView'));
const ArticleIndexView = lazy(() => import('./views/ArticleIndexView').then(m => ({ default: m.ArticleIndexView })));
const ArticlePostView = lazy(() => import('./views/ArticlePostView').then(m => ({ default: m.ArticlePostView })));
const TemplateIndexView = lazy(() => import('./views/TemplateIndexView').then(m => ({ default: m.TemplateIndexView })));
const TemplateDetailView = lazy(() => import('./views/TemplateDetailView').then(m => ({ default: m.TemplateDetailView })));
const VerifyView = lazy(() => import('./VerifyView').then(m => ({ default: m.VerifyView })));

function App() {
  const navigate = useNavigate();

  return (
    <>
      <div style={{ background: '#0f172a', color: '#cbd5e1', fontSize: '0.775rem', padding: '0.4rem 1rem', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>Suomalainen sähköinen allekirjoituspalvelu • Vahva pankkitunnistautuminen (FTN)</span>
          <span style={{ color: '#94a3b8' }}>Polarcomp Oy (Y-tunnus 0969733-4)</span>
        </div>
      </div>

      <header className="app-header">
        <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="app-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Helppo Allekirjoitus" width={161} height={36} style={{ height: '36px', width: '161px', borderRadius: '4px' }} />
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <Link to="/" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 500 }}>
              Allekirjoita PDF
            </Link>
            <Link to="/sopimuspohjat" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 500 }}>
              Sopimuspohjat
            </Link>
            <Link to="/asiantuntija-artikkelit" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>
              Oppaat
            </Link>
            <span style={{ background: '#eff6ff', color: 'var(--primary)', border: '1px solid #bfdbfe', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              1,49 € / allekirjoitus
            </span>
          </nav>
        </div>
      </header>

      <main style={{ padding: '1.75rem 1rem' }}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>Ladataan sivua...</div>}>
          <Routes>
            <Route path="/" element={<UploadView />} />
            <Route path="/asiakirja/:id" element={<DocumentFlow role="recipient" />} />
            <Route path="/lahettaja/:id" element={<DocumentFlow role="sender" />} />
            <Route path="/verify/:id" element={<VerifyView />} />
            <Route path="/auth/callback" element={<AuthCallbackRoute />} />
            <Route path="/ehdot" element={<TermsView />} />
            <Route path="/tietosuoja" element={<PrivacyView />} />
            <Route path="/sopimuspohjat" element={<TemplateIndexView />} />
            <Route path="/sopimuspohjat/:slug" element={<TemplateDetailView />} />
            <Route path="/asiantuntija-artikkelit" element={<ArticleIndexView />} />
            <Route path="/asiantuntija-artikkelit/:slug" element={<ArticlePostView />} />
          </Routes>
        </Suspense>
      </main>

      <footer style={{ marginTop: 'auto', padding: '2.5rem 1rem', background: '#ffffff', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
            <strong>Polarcomp Oy</strong> • Halmetie 7, 98120 Kemijärvi • Y-tunnus: 0969733-4<br />
            <span style={{ color: 'var(--text-muted)' }}>
              Asiakaspalvelu: <a href="mailto:sales@polarcomp.fi" style={{ color: 'inherit', textDecoration: 'underline' }}>sales@polarcomp.fi</a> | +358 40 041 8289 | <a href="https://polarcomp.fi" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>polarcomp.fi</a>
            </span>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <Link to="/sopimuspohjat" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              Ilmaiset sopimuspohjat (PDF)
            </Link>
            <Link to="/asiantuntija-artikkelit" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              Asiantuntija-artikkelit
            </Link>
            <a href="https://dokumenttipohja.fi/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              Dokumenttipohja.fi (Word-pohjat) ↗
            </a>
            <Link to="/ehdot" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>
              Käyttöehdot
            </Link>
            <Link to="/tietosuoja" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>
              Tietosuojaseloste
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
