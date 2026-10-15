import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { contractTemplates, generateContractPdfFile } from '../data/contractTemplates';
import { updateSeoMeta } from '../lib/seo';

export const TemplateDetailView: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const template = contractTemplates.find((t) => t.slug === slug) || null;

    const [values, setValues] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (template) {
            updateSeoMeta({
                title: template.seoTitle,
                description: template.seoDescription,
                canonicalPath: `/sopimuspohjat/${template.slug}/`,
            });
            const defaults: Record<string, string> = {};
            template.fields.forEach((f) => {
                if (f.defaultValue) defaults[f.key] = f.defaultValue;
            });
            setValues(defaults);
        } else {
            updateSeoMeta({
                title: 'Sopimuspohjaa ei löytynyt | Helppo Allekirjoitus',
                description: 'Valitse haluamasi suomalainen sopimusmalli listasta.',
                canonicalPath: '/sopimuspohjat/',
                noindex: true,
            });
        }
    }, [template]);

    if (!template) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <h2>Sopimuspohjaa ei löytynyt.</h2>
                <p style={{ margin: '0.75rem 0 1.5rem' }}>Valitse haluamasi sopimusmalli listasta.</p>
                <button className="btn btn-primary" onClick={() => navigate('/sopimuspohjat/')}>
                    Katso kaikki sopimuspohjat
                </button>
            </div>
        );
    }

    const extractEmails = (): { senderEmail?: string; recipientEmail?: string } => {
        const senderKeys = ['landlordEmail', 'sellerEmail', 'creditorEmail', 'grantorEmail', 'partyAEmail'];
        const recipientKeys = ['tenantEmail', 'buyerEmail', 'debtorEmail', 'partyBEmail'];
        let senderEmail = '';
        let recipientEmail = '';
        for (const k of senderKeys) {
            if (values[k]?.trim()) {
                senderEmail = values[k].trim();
                break;
            }
        }
        for (const k of recipientKeys) {
            if (values[k]?.trim()) {
                recipientEmail = values[k].trim();
                break;
            }
        }
        return { senderEmail, recipientEmail };
    };

    const handleSignDirect = async () => {
        setIsGenerating(true);
        try {
            const pdfFile = await generateContractPdfFile(template, values);
            const { senderEmail, recipientEmail } = extractEmails();
            toast.success('PDF-sopimus luotu! Voit nyt jatkaa tunnistautumiseen.');
            navigate('/', {
                state: {
                    generatedFile: pdfFile,
                    senderEmail,
                    recipientEmail,
                },
            });
        } catch (err) {
            console.error(err);
            toast.error('PDF-asiakirjan luominen epäonnistui.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadFreePdf = async () => {
        setIsGenerating(true);
        try {
            const pdfFile = await generateContractPdfFile(template, values);
            const url = URL.createObjectURL(pdfFile);
            const a = document.createElement('a');
            a.href = url;
            a.download = pdfFile.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('PDF-sopimus ladattu laitteellesi.');
        } catch (err) {
            console.error(err);
            toast.error('PDF-lataus epäonnistui.');
        } finally {
            setIsGenerating(false);
        }
    };

    const previewSections = template.buildSections(values);
    const otherTemplates = contractTemplates.filter((t) => t.slug !== template.slug);

    return (
        <div className="container animate-fade-in" style={{ maxWidth: '920px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Link
                    to="/sopimuspohjat/"
                    style={{
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontSize: '0.925rem',
                        fontWeight: 500
                    }}
                >
                    ← Kaikki sopimuspohjat
                </Link>
                {template.docxUrl && (
                    <a
                        href={template.docxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                            textDecoration: 'underline'
                        }}
                    >
                        Lataa tyhjä Word-pohja (.docx) ↗
                    </a>
                )}
            </div>

            <div className="card" style={{ padding: '2.25rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.75rem' }}>
                    <span
                        style={{
                            display: 'inline-block',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--primary)',
                            marginBottom: '0.35rem'
                        }}
                    >
                        {template.category} • Ilmainen PDF-generaattori
                    </span>
                    <h1 style={{ fontSize: '1.85rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        {template.title}
                    </h1>
                    <p style={{ fontSize: '0.975rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        {template.summary} {template.legalNote}
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                    {template.fields.map((field) => (
                        <div
                            key={field.key}
                            style={{
                                gridColumn: field.type === 'textarea' ? '1 / -1' : undefined,
                            }}
                        >
                            <label className="form-label" style={{ fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                                {field.label}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    placeholder={field.placeholder}
                                    value={values[field.key] || ''}
                                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                                    style={{ resize: 'vertical', fontSize: '0.925rem' }}
                                />
                            ) : (
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={field.placeholder}
                                    value={values[field.key] || ''}
                                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                                    style={{ fontSize: '0.925rem', padding: '0.65rem 0.85rem' }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Live Document Preview */}
                <div
                    style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.5rem',
                        marginBottom: '1.75rem'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)' }}>
                            Esikatselu: {template.title.toUpperCase()}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            A4 PDF • Laadittu {new Date().toLocaleDateString('fi-FI')}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                        {previewSections.map((sec, idx) => (
                            <div key={idx}>
                                <div style={{ fontWeight: 700, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.25rem' }}>
                                    {sec.heading}
                                </div>
                                {sec.paragraphs.map((p, pIdx) => (
                                    <p key={pIdx} style={{ whiteSpace: 'pre-line', color: '#334155', fontSize: '0.85rem', lineHeight: 1.55, marginBottom: '0.35rem' }}>
                                        {p}
                                    </p>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSignDirect}
                        disabled={isGenerating}
                        style={{ flex: '1 1 320px', padding: '0.95rem 1.5rem', fontSize: '1rem' }}
                    >
                        {isGenerating ? 'Luodaan asiakirjaa...' : 'Allekirjoita tämä sopimus pankkitunnuksilla (1,49 €) →'}
                    </button>

                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleDownloadFreePdf}
                        disabled={isGenerating}
                        style={{ padding: '0.95rem 1.25rem', fontSize: '0.925rem' }}
                    >
                        Lataa pelkkä PDF maksutta
                    </button>
                </div>
            </div>

            {/* SEO & Legal Guidance Section */}
            <section className="card" style={{ marginTop: '1.75rem', padding: '2rem' }}>
                <h2 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                    Näin laadit ja allekirjoitat asiakirjan ({template.title.toLowerCase()}) verkossa
                </h2>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1rem' }}>
                    Yllä olevalla lomakkeella voit täyttää suomalaisen asiakirjamallin (<strong>{template.title.toLowerCase()}</strong>) suoraan selaimessasi. Asiakirja muodostetaan laitteellasi, ja voit joko ladata valmiin A4 PDF-tiedoston täysin maksutta tai siirtyä suoraan vahvaan sähköiseen allekirjoitukseen.
                </p>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                    {template.legalNote} Kun sopimus allekirjoitetaan pankkitunnuksilla (Finnish Trust Network: OP, Nordea, Danske Bank, S-Pankki, Säästöpankki, POP Pankki, Aktia, Ålandsbanken) tai mobiilivarmenteella, osapuolten viralliset nimet vahvistetaan pankin rekisteristä ja PDF-tiedoston loppuun liitetään virallinen allekirjoitustodistus aikaleimoineen ja SHA-256-tiivisteineen.
                </p>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                        Muut ilmaiset sopimuspohjat
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                        {otherTemplates.map((other) => (
                            <Link
                                key={other.slug}
                                to={`/sopimuspohjat/${other.slug}/`}
                                style={{
                                    padding: '0.65rem 0.9rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: '#f8fafc',
                                    textDecoration: 'none',
                                    color: 'var(--text-main)',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span>{other.title}</span>
                                <span style={{ color: 'var(--primary)' }}>→</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

