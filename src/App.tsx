import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { UploadView } from './UploadView';
import PrivacyView from './PrivacyView';
import TermsView from './TermsView';
import { ArticleIndexView } from './views/ArticleIndexView';
import { ArticlePostView } from './views/ArticlePostView';
import { DocumentFlow } from './DocumentFlow';
import { AuthCallbackRoute } from './AuthCallbackRoute';
import { VerifyView } from './VerifyView';
import './index.css';

function App() {
  const navigate = useNavigate();

  return (
    <>
      <header className="app-header">
        <div className="app-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Helppo Allekirjoitus" style={{ height: '36px', width: 'auto', borderRadius: '4px' }} />
        </div>
      </header>

      <main style={{ padding: '2rem 1rem' }}>
        <Routes>
          <Route path="/" element={<UploadView />} />
          <Route path="/asiakirja/:id" element={<DocumentFlow role="recipient" />} />
          <Route path="/lahettaja/:id" element={<DocumentFlow role="sender" />} />
          <Route path="/verify/:id" element={<VerifyView />} />
          <Route path="/auth/callback" element={<AuthCallbackRoute />} />
          <Route path="/ehdot" element={<TermsView />} />
          <Route path="/tietosuoja" element={<PrivacyView />} />
          <Route path="/asiantuntija-artikkelit" element={<ArticleIndexView />} />
          <Route path="/asiantuntija-artikkelit/:slug" element={<ArticlePostView />} />
        </Routes>
      </main>

      <footer style={{ marginTop: 'auto', padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <div style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
          <strong>Polarcomp Oy</strong><br />
          Halmetie 7, 98120 Kemijärvi<br />
          Y-tunnus: 0969733-4<br />
          <a href="mailto:sales@polarcomp.fi" style={{ color: 'inherit', textDecoration: 'none' }}>sales@polarcomp.fi</a> | +358 40 041 8289
        </div>
        <div>&copy; {new Date().getFullYear()} Polarcomp Oy (<a href="https://polarcomp.fi" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>polarcomp.fi</a>)</div>
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <Link to="/ehdot" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
            Käyttöehdot
          </Link>
          <Link to="/tietosuoja" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
            Tietosuojaseloste
          </Link>
          <Link to="/asiantuntija-artikkelit" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
            Asiantuntija-artikkelit
          </Link>
        </div>
      </footer>
    </>
  );
}

export default App;
