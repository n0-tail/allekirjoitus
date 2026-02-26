import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface UploadViewProps { }

export const UploadView: React.FC<UploadViewProps> = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
    if (file && sender && recipient) {
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
            recipient_email: recipient,
            file_name: file.name,
            status: 'pending'
          });

        if (dbError) throw new Error(`Virhe tietokantaan tallennettaessa: ${dbError.message}`);

        // 4. Send email via Edge Function
        const link = `${window.location.origin}${import.meta.env.BASE_URL}asiakirja/${docId}`;

        // We catch the email error but don't stop the flow, as the user can still copy the link manually in the UI
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: recipient,
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
      <section style={{ textAlign: 'center', marginBottom: '3rem', padding: '1rem 0' }} className="animate-fade-in">
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', lineHeight: 1.2 }}>
          Sido sopimukset <span style={{ color: 'var(--primary)' }}>turvallisesti</span> verkossa.
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Lataa PDF luottamuksellisesti, tunnistaudu pankkitunnuksilla ja pyydä sitova sähköinen allekirjoitus toiselta osapuolelta.
          Helppoa ja laillista.
        </p>
      </section>

      {/* MAIN FORM CARD */}
      <div className="card animate-fade-in" style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border)',
        position: 'relative',
        zIndex: 10
      }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Aloita uusi allekirjoituspyyntö</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">1. Valitse asiakirja (PDF)</label>
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">2. Lähettäjän sähköposti (Sinun)</label>
              <input
                type="email"
                className="form-input"
                placeholder="esim. matti.meikalainen@email.com"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">3. Vastaanottajan sähköposti</label>
              <input
                type="email"
                className="form-input"
                placeholder="esim. maija.meikalainen@email.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: '400px', fontSize: '1.125rem', padding: '1rem' }}
              disabled={!file || !sender || !recipient || isUploading}
            >
              {isUploading ? 'Lähetetään turvallisesti...' : 'Lähetä ja jatka tunnistautumaan \u2192'}
            </button>
          </div>
        </form>
      </div>

      {/* HOW IT WORKS */}
      <section style={{ marginTop: '5rem', marginBottom: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2rem' }}>Miten palvelu toimii?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>

          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ width: '56px', height: '56px', background: '#eff6ff', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>1. Lataa asiakirja</h3>
            <p style={{ color: 'var(--text-muted)' }}>Pudota PDF-tiedosto ja syötä osapuolten sähköpostiosoitteet. Tiedosto siirtyy salattuna palvelimelle.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ width: '56px', height: '56px', background: '#eff6ff', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>2. Maksa & Tunnistaudu</h3>
            <p style={{ color: 'var(--text-muted)' }}>Molemmat osapuolet maksavat 3 € käsittelykulun ja tunnistautuvat vahvasti omilla pankkitunnuksillaan.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ width: '56px', height: '56px', background: '#eff6ff', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>3. Valmis Asiakirja</h3>
            <p style={{ color: 'var(--text-muted)' }}>Kun molemmat ovat valmiita, järjestelmä liittää asiakirjaan virallisen allekirjoitustodistuksen aikaleimoineen.</p>
          </div>

        </div>
      </section>

      {/* TRUST BADGES */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4rem', padding: '2rem 1rem', background: '#f8fafc', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✅</span> Vahva tunnistautuminen (FTN)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🔒</span> Täysin salattavat yhteydet
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚖️</span> Lakiin perustuva luotettavuus
          </div>
        </div>
      </div>
    </div>
  );
};
