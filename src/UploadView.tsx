import React, { useState } from 'react';

interface UploadViewProps {
  onSend: (data: { file: File | null; sender: string; recipient: string }) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onSend }) => {
  const [file, setFile] = useState<File | null>(null);
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && sender && recipient) {
      onSend({ file, sender, recipient });
    }
  };

  return (
    <div className="container animate-fade-in">
      <div className="card">
        <h2 style={{ marginBottom: '0.5rem' }}>Uusi allekirjoituspyyntö</h2>
        <p style={{ marginBottom: '2rem' }}>Lähetä asiakirja allekirjoitettavaksi helposti ja turvallisesti.</p>

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
              disabled={!file || !sender || !recipient}
            >
              Lähetä allekirjoitettavaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
