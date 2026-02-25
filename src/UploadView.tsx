import React, { useState } from 'react';
import { supabase } from './lib/supabase';

interface UploadViewProps {
  onSend: (data: { file: File | null; sender: string; recipient: string; documentId?: string }) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onSend }) => {
  const [file, setFile] = useState<File | null>(null);
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);

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
        const link = `${window.location.origin}${window.location.pathname}?document=${docId}&sender=${encodeURIComponent(sender)}&recipient=${encodeURIComponent(recipient)}&file=${encodeURIComponent(file.name)}`;

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

        // 5. Proceed to next view
        onSend({ file, sender, recipient, documentId: docId });
      } catch (err: unknown) {
        console.error('Upload failed:', err);
        setError(err instanceof Error ? err.message : 'Tuntematon virhe tapahtui');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="container animate-fade-in">
      <div className="card">
        <h2 style={{ marginBottom: '0.5rem' }}>Uusi allekirjoituspyyntö</h2>
        <p style={{ marginBottom: '2rem' }}>Lähetä asiakirja allekirjoitettavaksi helposti ja turvallisesti.</p>

        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius)', marginBottom: '1.5rem', border: '1px solid #fca5a5' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Asiakirja (PDF)</label>
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
                  <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Valittu asiakirja</p>
                </div>
              ) : (
                <p>Raahaa ja pudota PDF -tiedosto tähän, koodi tai klikkaa selataksesi</p>
              )}
            </div>
          </div>

          <div className="form-group">
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

          <div className="form-group">
            <label className="form-label">Vastaanottajan sähköposti (Allekirjoittaja)</label>
            <input
              type="email"
              className="form-input"
              placeholder="esim. maija.meikalainen@email.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || !sender || !recipient || isUploading}
            >
              {isUploading ? 'Lähetetään...' : 'Lähetä allekirjoitettavaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
