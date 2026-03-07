import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface UploadViewProps { }

export const UploadView: React.FC<UploadViewProps> = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Helppo Allekirjoitus – Sähköinen allekirjoitus verkossa | eIDAS & FTN";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Allekirjoita sopimukset sähköisesti pankkitunnuksilla. Vahva FTN-tunnistautuminen, juridisesti sitova eIDAS-yhteensopiva palvelu. Helppo, turvallinen ja edullinen.');
    }
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [sender, setSender] = useState('');
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
    const allEmailsFilled = recipients.every(r => r.email.trim() !== '');
    if (file && sender && allEmailsFilled) {
      setIsUploading(true);

      try {
        // 1. Generate unique ID
        const docId = crypto.randomUUID();
        const filePath = `${docId}/${file.name}`;

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
            signers: recipients,
            file_name: file.name,
            status: 'pending'
          });

        if (dbError) throw new Error(`Virhe tietokantaan tallennettaessa: ${dbError.message}`);

        // We catch the email error but don't stop the flow, as the user can still copy the link manually in the UI
        try {
          // Send personal invitation to each signer
          const emailPromises = recipients.map(rec => {
            const link = `${window.location.origin}${import.meta.env.BASE_URL}asiakirja/${docId}?signer=${rec.id}`;
            return supabase.functions.invoke('send-email', {
              body: {
                to: rec.email,
                subject: `Allekirjoituspyyntö: ${file.name}`,
                html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <h2 style="color: #111827; margin-top: 0;">Hei!</h2>
                  <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                    <strong>${sender}</strong> on lähettänyt sinulle asiakirjan <em>(${file.name})</em> sähköisesti allekirjoitettavaksi.
                  </p>
                  <div style="margin: 30px 0;">
                    <a href="${link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                      Avaa ja allekirjoita asiakirja
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                    Ystävällisin terveisin,<br>Allekirjoitus
                  </p>
                </div>`
              }
            });
          });

          // Lähetetään sähköposti myös lähettäjälle itselleen paluulinkillä
          const senderLink = `${window.location.origin}${import.meta.env.BASE_URL}lahettaja/${docId}`;
          const senderEmailPromise = supabase.functions.invoke('send-email', {
            body: {
              to: sender,
              subject: `Allekirjoituspyyntösi: ${file.name}`,
              html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #111827; margin-top: 0;">Allekirjoituspyyntösi on luotu!</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  Olet luonut sähköisen allekirjoituspyynnön asiakirjalle <em>(${file.name})</em>.
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  Sinun tulee maksaa käsittelymaksu ja tunnistautua asettaaksesi oman allekirjoituksesi asiakirjaan. Voit palata maksamaan ja tunnistautumaan myöhemmin tästä linkistä:
                </p>
                <div style="margin: 30px 0;">
                  <a href="${senderLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                    Jatka maksulinkkiin
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                  Ystävällisin terveisin,<br>Allekirjoitus
                </p>
              </div>`
            }
          });

          await Promise.all([...emailPromises, senderEmailPromise]);
        } catch {
          console.warn("Sähköpostin lähetys epäonnistui (reunafunktiota ei ehkä ole vielä julkaistu), jatketaan silti.");
        }

        // 5. Proceed to next view via React Router
        navigate(`/lahettaja/${docId}`);
      } catch (err: unknown) {
        console.error('Upload failed:', err);
        toast.error(err instanceof Error ? err.message : 'Tuntematon virhe tapahtui');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* HERO SECTION */}
      <section className="hero-section animate-fade-in" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', lineHeight: 1.2 }}>
          Sido sopimukset <span style={{ color: 'var(--primary)' }}>turvallisesti</span> verkossa.
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Lataa PDF luottamuksellisesti, tunnistaudu pankkitunnuksilla ja pyydä sitova sähköinen allekirjoitus toiselta osapuolelta.
          Helppoa ja laillista.
        </p>
      </section>

      {/* MAIN FORM CARD */}
      <div className="glass-card animate-fade-in" style={{ position: 'relative', zIndex: 10 }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Aloita uusi allekirjoituspyyntö</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Valitse asiakirja (PDF)</label>
            <div
              className={`dropzone ${file ? 'active' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <svg className="dropzone-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {file ? (
                <div>
                  <strong>{file.name}</strong>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--primary)' }}>Asiakirja on valmis ladattavaksi</p>
                </div>
              ) : (
                <p>Raahaa ja pudota PDF -tiedosto tähän, tai klikkaa selataksesi laitteeltasi</p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.75rem', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 500 }}>
              <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Zéro-knowledge -periaate: Emme lue tai tallenna sopimuksianne. Tiedostot tuhotaan 24h kuluessa.
            </div>
          </div>

          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

              {/* LEFT COLUMN: Sender */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Lähettäjän sähköposti (Sinun)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="esim. matti.meikalainen@email.com"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: All Recipients + Add Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recipients.map((rec, index) => (
                  <div key={rec.id} className="form-group animate-fade-in" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      {index === 0 ? 'Vastaanottaja 1' : `Vastaanottaja ${index + 1}`}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="email"
                        className="form-input"
                        placeholder={index === 0 ? "esim. maija.meikalainen@email.com" : "esim. matti.virtanen@email.com"}
                        value={rec.email}
                        onChange={(e) => updateRecipient(rec.id, e.target.value)}
                        required
                      />

                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeRecipient(rec.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.6rem',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s',
                            flexShrink: 0
                          }}
                          title="Poista vastaanottaja"
                        >
                          <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    onClick={addRecipient}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      background: 'rgba(37, 99, 235, 0.03)',
                      border: '1px dashed rgba(37, 99, 235, 0.3)',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      width: '100%',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'; e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.5)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.03)'; e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)'; }}
                  >
                    <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Lisää vastaanottaja</span>
                  </button>
                </div>
              </div>

            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: '400px', fontSize: '1.125rem', padding: '1rem' }}
                disabled={!file || !sender || recipients.some(r => r.email.trim() === '') || isUploading}
              >
                {isUploading ? 'Lähetetään turvallisesti...' : 'Jatka ja tunnistaudu →'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* HOW IT WORKS */}
      <section style={{ marginTop: '3rem', marginBottom: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2rem' }}>Miten palvelu toimii?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>

          <div style={{ textAlign: 'center', padding: '1rem' }} className="step-card">
            <div style={{ width: '56px', height: '56px', background: '#eff6ff', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Lataa asiakirja</h3>
            <p style={{ color: 'var(--text-muted)' }}>Pudota PDF-tiedosto ja syötä osapuolten sähköpostiosoitteet. Tiedosto siirtyy salattuna palvelimelle.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '1rem' }} className="step-card">
            <div style={{ width: '56px', height: '56px', background: '#eff6ff', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Maksa & Tunnistaudu</h3>
            <p style={{ color: 'var(--text-muted)' }}>Kaikki osapuolet tunnistautuvat vahvasti omilla pankkitunnuksillaan. Kulu on 1,49 € / hlö (lähettäjä voi myös maksaa kaikkien puolesta).</p>
          </div>

          <div style={{ textAlign: 'center', padding: '1rem' }} className="step-card">
            <div style={{ width: '56px', height: '56px', background: '#eff6ff', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Valmis Asiakirja</h3>
            <p style={{ color: 'var(--text-muted)' }}>Kun molemmat ovat valmiita, järjestelmä liittää asiakirjaan virallisen allekirjoitustodistuksen aikaleimoineen.</p>
          </div>

        </div>
      </section>

      {/* TRUST & CREDENTIALS */}
      <section style={{ marginTop: '4rem', padding: '2rem 1rem', background: '#f8fafc', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>Miksi luottaa palveluumme?</h2>
        <div className="trust-grid">

          <div style={{ textAlign: 'center', padding: '1rem' }} className="step-card">
            <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto', color: 'var(--primary)' }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>eIDAS-yhteensopiva</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sähköinen allekirjoitus on juridisesti sitova EU:n eIDAS-asetuksen (910/2014, Art. 25) mukaisesti.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '1rem' }} className="step-card">
            <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto', color: 'var(--primary)' }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>FTN-tunnistautuminen</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Traficomin hyväksymä vahva tunnistautuminen omilla pankkitunnuksilla (Finnish Trust Network).</p>
          </div>

          <div style={{ textAlign: 'center', padding: '1rem' }} className="step-card">
            <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto', color: 'var(--primary)' }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Turvallinen maksu</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Maksut käsitellään Stripen kautta — PCI DSS Level 1 -sertifioitu, maailman johtava maksualusta.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '1rem' }} className="step-card">
            <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto', color: 'var(--primary)' }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Suomalainen palvelu</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Polarcomp Oy (Y-tunnus: 0969733-4). Tiedot käsitellään EU:n tietosuoja-asetuksen (GDPR) mukaisesti.</p>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>Usein kysytyt kysymykset</h2>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <details style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>Onko sähköinen allekirjoitus laillinen Suomessa?</summary>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Kyllä. EU:n eIDAS-asetus (910/2014) tunnustaa sähköiset allekirjoitukset juridisesti sitoviksi kaikissa EU-maissa. Suomen lainsäädäntö ei aseta sopimusten muodollisia muotovaatimuksia, joten sähköinen allekirjoitus on pätevä useimmissa sopimuksissa.
            </p>
          </details>

          <details style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>Miten tunnistautuminen toimii?</summary>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Käytämme Finnish Trust Network (FTN) -tunnistautumista, jonka valvoo Traficom. Tunnistaudut omilla pankkitunnuksillasi (OP, Nordea, Danske Bank jne.), jolloin henkilöllisyytesi vahvistetaan luotettavasti.
            </p>
          </details>

          <details style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>Mitä tiedoilleni tapahtuu?</summary>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Asiakirjat ja henkilötiedot käsitellään EU:n tietosuoja-asetuksen (GDPR) mukaisesti. Allekirjoitetut asiakirjat poistetaan palvelimilta automaattisesti 24 tunnin kuluessa allekirjoituksen valmistumisesta. Palveluun ei jää talteen henkilötietoja eikä asiakirjoja.
            </p>
          </details>

          <details style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>Paljonko palvelu maksaa?</summary>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Palvelun käyttö maksaa 1,49 € per henkilö (lähettäjä voi myös maksaa kaikkien puolesta). Maksu sisältää tunnistautumisen, asiakirjan käsittelyn ja allekirjoitustodistuksen. Ei kuukausimaksuja tai piilokustannuksia.
            </p>
          </details>

          <details style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>Mitä tiedostoja voi allekirjoittaa?</summary>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Palvelu tukee PDF-tiedostoja. Voit allekirjoittaa sähköisesti esimerkiksi vuokrasopimuksia, työsopimuksia, kauppasopimuksia, valtakirjoja ja muita sopimusasiakirjoja.
            </p>
          </details>

        </div>
      </section>

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
  );
};
