import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { reportError } from './lib/errorReporter';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { contractTemplates } from './data/contractTemplates';
import { articles } from './data/articles';

interface UploadViewProps { }

export const UploadView: React.FC<UploadViewProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "Helppo Allekirjoitus – Sähköinen allekirjoitus verkossa | eIDAS & FTN";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Helppo ja kotimainen sähköinen allekirjoitus ilman rekisteröintiä tai kuukausimaksuja, vain 1,49 € per allekirjoitus.');
    }
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [sender, setSender] = useState('');
  const [showCertPreview, setShowCertPreview] = useState(false);

  interface Recipient {
    id: string;
    email: string;
    paid?: boolean;
    name?: string | null;
    signed?: boolean;
  }

  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: crypto.randomUUID(), email: '' }
  ]);
  const [isUploading, setIsUploading] = useState(false);

  // Pick up generated contract PDF if navigated from /sopimuspohjat/:slug
  useEffect(() => {
    const state = location.state as {
      generatedFile?: File;
      senderEmail?: string;
      recipientEmail?: string;
    } | null;

    if (state?.generatedFile) {
      setFile(state.generatedFile);
      if (state.senderEmail) {
        setSender(state.senderEmail);
      }
      if (state.recipientEmail) {
        setRecipients([{ id: crypto.randomUUID(), email: state.recipientEmail }]);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const addRecipient = () => {
    if (recipients.length >= 20) {
      toast.error('Voit lisätä enintään 20 vastaanottajaa kerrallaan.');
      return;
    }
    setRecipients([...recipients, { id: crypto.randomUUID(), email: '' }]);
  };

  const removeRecipient = (idToRemove: string) => {
    setRecipients(recipients.filter(r => r.id !== idToRemove));
  };

  const updateRecipient = (idToUpdate: string, newEmail: string) => {
    setRecipients(
      recipients.map(r => (r.id === idToUpdate ? { ...r, email: newEmail } : r))
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Valitse ensin allekirjoitettava PDF-tiedosto.');
      document.getElementById('file-upload')?.click();
      return;
    }
    if (!sender.trim()) {
      toast.error('Syötä oma sähköpostiosoitteesi.');
      return;
    }
    const validRecipients = recipients.filter(r => r.email.trim() !== '');
    
    // Allow submission if all *added* recipient lines are valid, OR if the first (default) is just left empty
    const canSubmit = file && sender && (recipients.length > 1 ? validRecipients.length === recipients.length : true);
    if (!canSubmit) {
      toast.error('Täytä kaikkien lisättyjen allekirjoittajien sähköpostiosoitteet.');
      return;
    }

    if (canSubmit) {
      setIsUploading(true);

      try {
        // 1. Generate unique ID and normalize filename
        const docId = crypto.randomUUID();
        // Supabase Storage can be very strict about characters. 
        // We replace any non-alphanumeric, non-dot, non-dash characters with underscores.
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${docId}/${safeFileName}`;

        // 2. Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(filePath, file);

        if (uploadError) throw new Error(`Virhe tiedoston latauksessa: ${uploadError.message}`);

        // 3. Insert metadata to database
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            id: docId,
            sender_email: sender,
            signers: validRecipients,
            file_name: file.name,
            status: 'pending'
          });

        if (dbError) throw new Error(`Virhe tietokantaan tallennettaessa: ${dbError.message}`);

        // NOLLAA VÄLIMUISTI UUTTA ASIAKIRJAA VARTEN:
        sessionStorage.removeItem('observerPays');
        sessionStorage.removeItem('payForAll');
        sessionStorage.removeItem('appState_data');
        sessionStorage.removeItem('appState_view');

        // 5. Proceed to next view via React Router
        navigate(`/lahettaja/${docId}`);
      } catch (err: unknown) {
        console.error('Upload failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Tuntematon virhe tapahtui';
        toast.error(errorMessage);

        // Report critical upload errors to admin
        reportError('Tiedoston lataus epäonnistui (UploadView.tsx)', err);

      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div>
      {/* FULL-WIDTH NORDIC NAVY HERO BAND */}
      <section className="hero-band">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginBottom: '1.1rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255, 255, 255, 0.14)', border: '1px solid rgba(255, 255, 255, 0.28)', color: '#ffffff', fontSize: '0.775rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
              <svg width="16" height="11" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', flexShrink: 0 }} aria-hidden="true">
                <rect width="18" height="12" fill="#FFFFFF" />
                <rect x="5" width="3" height="12" fill="#002F6C" />
                <rect y="4.5" width="18" height="3" fill="#002F6C" />
              </svg>
              Aidosti suomalainen palvelu
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#f8fafc', fontSize: '0.775rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
              ✓ Traficomin valvoma FTN-tunnistautuminen
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.18)', color: '#e2e8f0', fontSize: '0.775rem', fontWeight: 500, padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
              ✓ EU eIDAS (910/2014)
            </span>
            <span style={{ background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(52, 211, 153, 0.4)', color: '#a7f3d0', fontSize: '0.775rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
              Kertamaksu 1,49 € • Ei tilausta
            </span>
          </div>

          <h1 style={{ fontSize: '2.35rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem', lineHeight: 1.18, letterSpacing: '-0.025em' }}>
            Sähköinen allekirjoitus suomalaisilla pankkitunnuksilla
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#cbd5e1', maxWidth: '660px', margin: '0 auto', lineHeight: 1.6 }}>
            Allekirjoita vuokrasopimus, kauppakirja, valtakirja tai muu PDF-asiakirja juridisesti sitovasti ilman tunnusten luomista tai kuukausimaksuja. Valmis sopimus ja virallinen allekirjoitustodistus toimitetaan suoraan sähköpostiin.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1rem' }}>
        {/* OVERLAPPING MAIN UPLOAD CARD */}
        <div className="upload-hero-card animate-fade-in">
          <form onSubmit={handleSubmit}>
            {/* STEP 1: PDF FILE */}
            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  1. Valitse allekirjoitettava PDF-asiakirja
                </label>
                <Link to="/sopimuspohjat" style={{ fontSize: '0.825rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                  Puuttuuko PDF? Täytä valmis sopimuspohja →
                </Link>
              </div>
              <div
                className={`dropzone ${file ? 'active' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
                style={{ padding: '1.75rem 1.5rem', gap: '0.75rem' }}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {file ? (
                  <div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '1.025rem', display: 'block' }}>{file.name}</strong>
                    <span style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-block' }}>
                      ✓ PDF-tiedosto valittu • Klikkaa vaihtaaksesi tiedoston
                    </span>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Valitse PDF-tiedosto laitteeltasi tai pudota se tähän
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      Salattu TLS-yhteys • Asiakirja poistetaan palvelimelta automaattisesti 24 h kuluessa valmistumisesta
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2: SIGNERS (100% VERTICALLY ALIGNED INPUTS) */}
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                2. Syötä osapuolten sähköpostiosoitteet
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>

                {/* LEFT COLUMN: Sender */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Allekirjoittaja 1 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Sinä / Lähettäjä)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="form-input"
                    placeholder="esim. matti.meikalainen@email.fi"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    required
                  />
                  <span style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.45rem', lineHeight: 1.45 }}>
                    Voit seuraavassa vaiheessa myös lähettää asiakirjan vain muille allekirjoitettavaksi.
                  </span>
                </div>

                {/* RIGHT COLUMN: All Recipients + Add Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recipients.map((rec, index) => (
                    <div key={rec.id} className="animate-fade-in">
                      <label className="form-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {`Allekirjoittaja ${index + 2} `}
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                          {index === 0 ? '(Vastapuoli — valinnainen)' : '(Vastapuoli)'}
                        </span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="email"
                          name="email"
                          autoComplete="email"
                          className="form-input"
                          placeholder="esim. vastaanottaja@email.fi"
                          value={rec.email}
                          onChange={(e) => updateRecipient(rec.id, e.target.value)}
                          required={index > 0}
                        />

                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeRecipient(rec.id)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '0.6rem',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                            title="Poista allekirjoittaja"
                          >
                            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addRecipient}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                      padding: '0.15rem 0',
                      textAlign: 'left',
                      width: 'fit-content'
                    }}
                  >
                    + Lisää useampi allekirjoittaja
                  </button>
                </div>

              </div>

              {/* BOTTOM ACTION BAR */}
              <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Hinta: <strong style={{ color: 'var(--text-main)' }}>1,49 € / allekirjoittaja</strong> (sis. ALV 25,5 %, pankkitunnistautumisen ja todistuksen)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCertPreview(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                      marginTop: '0.25rem'
                    }}
                  >
                    Katso miltä valmis allekirjoitustodistus näyttää →
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minWidth: '260px', fontSize: '1rem', padding: '0.9rem 1.75rem', boxShadow: '0 2px 4px rgba(29, 78, 216, 0.2)' }}
                  disabled={isUploading}
                >
                  {isUploading ? 'Siirretään asiakirjaa...' : 'Jatka ja tunnistaudu →'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* SUPPORTED FINNISH BANKS STRIP */}
        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
          <strong style={{ color: 'var(--text-main)' }}>Tuetut tunnistustavat (FTN):</strong> OP • Nordea • Danske Bank • S-Pankki • Säästöpankki • POP Pankki • Aktia • Ålandsbanken • Mobiilivarmenne
        </div>

        {/* SMART CONTRACT TEMPLATES BAR (Suggestion #1) */}
        <section style={{ marginTop: '1.75rem', padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '0.2rem' }}>Eikö sinulla ole vielä valmista PDF-sopimusta?</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Täytä valmis suomalainen sopimuspohja suoraan selaimessa ja siirry yhdellä klikkauksella allekirjoittamaan:
              </p>
            </div>
            <Link to="/sopimuspohjat" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
              Kaikki sopimuspohjat →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {contractTemplates.map((tpl) => (
              <Link
                key={tpl.slug}
                to={`/sopimuspohjat/${tpl.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              >
                <span>{tpl.title}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>→</span>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Tarvitsetko muokattavan Word-asiakirjan (.docx)?</span>
            <a href="https://dokumenttipohja.fi/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
              Katso yli 70 ilmaista Word-mallia sisarsivustoltamme Dokumenttipohja.fi ↗
            </a>
          </div>
        </section>

      {/* HOW IT WORKS */}
      <section style={{ marginTop: '2.75rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>Näin sähköinen allekirjoitus etenee</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>

          <div className="step-card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Vaihe 1
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Lataa PDF ja syötä sähköpostit</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Valitse valmis PDF-sopimus laitteeltasi ja syötä allekirjoittajien sähköpostiosoitteet. Voit allekirjoittaa myös itse tai maksaa kaikkien osapuolten kulut kerralla.
            </p>
          </div>

          <div className="step-card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Vaihe 2
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Tunnistaudu pankkitunnuksilla (FTN)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Osapuolet saavat sähköpostiinsa kutsulinkin ja tunnistautuvat vahvasti omilla suomalaisilla pankkitunnuksillaan (OP, Nordea, Danske Bank, S-Pankki, Säästöpankki, POP, Aktia, Ålandsbanken).
            </p>
          </div>

          <div className="step-card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Vaihe 3
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Valmis sopimus + allekirjoitustodistus</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Kun kaikki osapuolet ovat tunnistautuneet, PDF-asiakirjaan liitetään virallinen allekirjoitustodistus aikaleimoineen ja QR-tarkistuskoodeineen, ja se lähetetään kaikkien sähköpostiin.
            </p>
          </div>

        </div>
      </section>

      {/* TRUST & TECHNICAL SPECIFICATION */}
      <section style={{ marginTop: '2.75rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>Juridinen sitovuus ja tietosuoja</h2>
        <div className="trust-grid">

          <div className="step-card">
            <h3 style={{ fontSize: '0.975rem', marginBottom: '0.35rem' }}>eIDAS-asetus (EU 910/2014)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Vahvaan sähköiseen tunnistautumiseen perustuva allekirjoitus on juridisesti sitova Suomen sopimusoikeudessa ja koko EU-alueella.
            </p>
          </div>

          <div className="step-card">
            <h3 style={{ fontSize: '0.975rem', marginBottom: '0.35rem' }}>Finnish Trust Network (FTN)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Allekirjoittajan virallinen nimi haetaan suoraan Traficomin valvomasta luottamusverkostosta pankkitunnistautumisen yhteydessä.
            </p>
          </div>

          <div className="step-card">
            <h3 style={{ fontSize: '0.975rem', marginBottom: '0.35rem' }}>Automaattinen 24 h tietojen poisto</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Emme kerää pysyvää sopimusarkistoa. Valmiit PDF-asiakirjat poistetaan palvelimilta automaattisesti 24 tunnin kuluttua allekirjoituksesta.
            </p>
          </div>

          <div className="step-card">
            <h3 style={{ fontSize: '0.975rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', boxShadow: '0 0 0 1px #cbd5e1', flexShrink: 0 }} aria-hidden="true">
                <rect width="18" height="12" fill="#FFFFFF" />
                <rect x="5" width="3" height="12" fill="#002F6C" />
                <rect y="4.5" width="18" height="3" fill="#002F6C" />
              </svg>
              Aidosti suomalainen palvelu
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Palvelusta vastaa vuonna 1994 perustettu kotimainen Polarcomp Oy (Y-tunnus 0969733-4, Kemijärvi). Maksut välittää PCI DSS Level 1 -sertifioitu Stripe.
            </p>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section style={{ marginTop: '2.75rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>Usein kysytyt kysymykset</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          <details style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.975rem', color: 'var(--text-main)' }}>Onko sähköinen allekirjoitus laillinen Suomessa?</summary>
            <p style={{ marginTop: '0.65rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Kyllä. EU:n eIDAS-asetus (910/2014) tunnustaa sähköiset allekirjoitukset juridisesti sitoviksi kaikissa EU-maissa. Suomen lainsäädäntö ei aseta useimmille sopimuksille (kuten vuokrasopimuksille, työsopimuksille, velkakirjoille tai irtaimen kauppakirjoille) muotovaatimusta, jota vahva pankkitunnistautuminen ei täyttäisi.
            </p>
          </details>

          <details style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.975rem', color: 'var(--text-main)' }}>Miten tunnistautuminen toimii?</summary>
            <p style={{ marginTop: '0.65rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Käytämme Liikenne- ja viestintävirasto Traficomin valvomaa Finnish Trust Network (FTN) -tunnistautumista. Tunnistaudut omilla pankkitunnuksillasi (OP, Nordea, Danske Bank, S-Pankki, Säästöpankki, POP Pankki, Aktia, Ålandsbanken), jolloin virallinen nimesi vahvistetaan suoraan pankin rekisteristä.
            </p>
          </details>

          <details style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.975rem', color: 'var(--text-main)' }}>Mitä tiedoilleni ja sopimukselleni tapahtuu?</summary>
            <p style={{ marginTop: '0.65rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Asiakirjat ja henkilötiedot käsitellään EU:n tietosuoja-asetuksen (GDPR) mukaisesti. Kun kaikki osapuolet ovat allekirjoittaneet asiakirjan, valmis PDF lähetetään liitteenä kaikkien sähköpostiin ja poistetaan palvelimiltamme automaattisesti 24 tunnin kuluessa.
            </p>
          </details>

          <details style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.975rem', color: 'var(--text-main)' }}>Paljonko palvelu maksaa ja voiko lähettäjä maksaa kaikkien puolesta?</summary>
            <p style={{ marginTop: '0.65rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Palvelun käyttö maksaa 1,49 € per allekirjoittaja (sis. ALV 25,5 %). Lähettäjä voi halutessaan maksaa koko asiakirjan kaikki kulut kerralla, jolloin vastaanottajat pääsevät suoraan tunnistautumaan pankkitunnuksillaan ilman maksua. Lähettäjä voi myös lähettää asiakirjan muille allekirjoitettavaksi ilman omaa allekirjoitustaan.
            </p>
          </details>

          <details style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.975rem', color: 'var(--text-main)' }}>Miten voin tarkistaa allekirjoitetun PDF-asiakirjan aitouden myöhemmin?</summary>
            <p style={{ marginTop: '0.65rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Jokaisen allekirjoitetun PDF-sopimuksen viimeiselle sivulle liitetään virallinen allekirjoitustodistus ja QR-koodi. Tarkistussivulla voit myös pudottaa PDF-tiedoston tarkistimeen, joka laskee tiedoston SHA-256-tiivisteen ja varmistaa, ettei PDF-sopimusta ole muokattu yhdenkään tavun vertaa allekirjoituksen jälkeen.
            </p>
          </details>

        </div>
      </section>

      {/* INTERNAL SEO LINKS TO ARTICLES */}
      <section style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Oppaat ja tietoa sähköisestä allekirjoituksesta</h2>
          <Link to="/asiantuntija-artikkelit" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Kaikki artikkelit →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {articles.map((art) => (
            <Link
              key={art.slug}
              to={`/asiantuntija-artikkelit/${art.slug}`}
              className="step-card"
              style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <h3 style={{ fontSize: '0.975rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>{art.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>{art.description}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.775rem', color: 'var(--text-muted)', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9' }}>
                <span>Julkaistu {art.displayDate}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Lue opas →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CERTIFICATE PREVIEW MODAL (Suggestion #2) */}
      {showCertPreview && (
        <div
          className="modal-overlay"
          onClick={() => setShowCertPreview(false)}
          style={{ zIndex: 100 }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Esimerkki: Virallinen allekirjoitustodistus</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Tämä sivu liitetään automaattisesti jokaisen allekirjoitetun PDF-asiakirjan loppuun.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCertPreview(false)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
              >
                Sulje ✕
              </button>
            </div>

            {/* Simulated A4 Certificate Sheet */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '1.5rem', boxShadow: 'inset 0 0 0 4px #f8fafc', fontSize: '0.825rem', color: '#0f172a' }}>
              <div style={{ height: '6px', background: '#2563eb', margin: '-1.5rem -1.5rem 1.25rem -1.5rem', borderRadius: '5px 5px 0 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <strong style={{ color: '#1d4ed8', fontSize: '1rem' }}>Helppo Allekirjoitus</strong>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Luotettava Sähköinen Allekirjoitus</span>
              </div>

              <div style={{ textAlign: 'center', margin: '1rem 0 1.25rem' }}>
                <div style={{ display: 'inline-flex', width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: '0.4rem' }}>
                  ✓
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.02em' }}>
                  SÄHKÖINEN ALLEKIRJOITUSTODISTUS
                </div>
                <div style={{ color: '#64748b', fontSize: '0.775rem' }}>
                  Vahvistettu {new Date().toLocaleDateString('fi-FI')} klo 14.32.10
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Asiakirjan tiedot</div>
                <div><strong>Tunnus (ID):</strong> 8f4e2b10-9c4a-4d3b-a12f-7c8d9e0f1a2b</div>
                <div><strong>Tiedosto:</strong> Asuinhuoneiston_vuokrasopimus.pdf</div>
                <div><strong>SHA-256-tiiviste:</strong> e3b0c44298fc1c149afbf4c8996fb924...</div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>OSAPUOLI 1: LÄHETTÄJÄ</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>MEIKÄLÄINEN MATTI TAPANI</div>
                <div style={{ color: '#475569' }}>Sähköposti: matti.meikalainen@esimerkki.fi</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Tunnistustapa: Vahva sähköinen tunnistautuminen (FTN / Pankkitunnukset) • IP: 84.249.xx.xx</div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>OSAPUOLI 2: VASTAANOTTAJA</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>VIRTANEN MAIJA KAROLIINA</div>
                <div style={{ color: '#475569' }}>Sähköposti: maija.virtanen@esimerkki.fi</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Tunnistustapa: Vahva sähköinen tunnistautuminen (FTN / Pankkitunnukset) • IP: 91.152.xx.xx</div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b' }}>
                <span>Sisältää QR-koodin ja SHA-256-aitoustarkistuksen osoitteessa helppoallekirjoitus.fi/verify/...</span>
                <strong style={{ color: '#1d4ed8' }}>eIDAS & FTN</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ JSON-LD Schema (invisible, for Google rich results) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Onko sähköinen allekirjoitus laillinen Suomessa?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Kyllä. EU:n eIDAS-asetus (910/2014) tunnustaa sähköiset allekirjoitukset juridisesti sitoviksi kaikissa EU-maissa. Suomen lainsäädäntö ei aseta sopimusten muodollisia muotovaatimuksia, joten sähköinen allekirjoitus on pätevä useimmissa sopimuksissa."
                }
              },
              {
                "@type": "Question",
                "name": "Miten tunnistautuminen toimii?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Käytämme Finnish Trust Network (FTN) -tunnistautumista, jonka valvoo Traficom. Tunnistaudut omilla pankkitunnuksillasi (OP, Nordea, Danske Bank jne.), jolloin henkilöllisyytesi vahvistetaan luotettavasti."
                }
              },
              {
                "@type": "Question",
                "name": "Mitä tiedoilleni tapahtuu?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Asiakirjat ja henkilötiedot käsitellään EU:n tietosuoja-asetuksen (GDPR) mukaisesti. Allekirjoitetut asiakirjat poistetaan palvelimilta automaattisesti 24 tunnin kuluessa allekirjoituksen valmistumisesta. Palveluun ei jää talteen henkilötietoja eikä asiakirjoja."
                }
              },
              {
                "@type": "Question",
                "name": "Paljonko palvelu maksaa?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Palvelun käyttö maksaa 1,49 € per henkilö (lähettäjä voi myös maksaa kaikkien puolesta). Maksu sisältää tunnistautumisen, asiakirjan käsittelyn ja allekirjoitustodistuksen. Ei kuukausimaksuja tai piilokustannuksia."
                }
              },
              {
                "@type": "Question",
                "name": "Mitä tiedostoja voi allekirjoittaa?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Palvelu tukee PDF-tiedostoja. Voit allekirjoittaa sähköisesti esimerkiksi vuokrasopimuksia, työsopimuksia, kauppasopimuksia, valtakirjoja ja muita sopimusasiakirjoja."
                }
              }
            ]
          })
        }}
      />
      </div>
    </div>
  );
};
