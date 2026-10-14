import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const TermsView: React.FC = () => {
    useEffect(() => {
        document.title = "Käyttöehdot | Helppo Allekirjoitus";
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Helppo Allekirjoitus -palvelun käyttöehdot. Tutustu sähköisen allekirjoituspalvelumme ehtoihin, vastuisiin, teknisiin rajoitteisiin ja eIDAS-yhteensopivuuteen.');
        }
    }, []);

    return (
        <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
            <div className="card" style={{ padding: '2.5rem' }}>
                <Link
                    to="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        marginBottom: '1.5rem'
                    }}
                >
                    {'← Takaisin etusivulle'}
                </Link>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Käyttöehdot</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    <strong>Päivitetty:</strong> 17.8.2026
                </p>

                <div style={{ lineHeight: 1.7, color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>1. Palvelun kuvaus</h2>
                        <p>Tämä palvelu ("Palvelu") tarjoaa alustan PDF-asiakirjojen sähköiseen allekirjoittamiseen yksityishenkilöiden välillä hyödyntäen vahvaa sähköistä tunnistautumista (FTN). Palvelun tarjoaa Polarcomp Oy ("Palveluntarjoaja").</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>2. Käyttäjän velvollisuudet</h2>
                        <p>Käyttäjä vakuuttaa lataamiensa asiakirjojen olevan lainmukaisia. Palvelua ei saa käyttää laittoman, loukkaavan tai haitallisen materiaalin välittämiseen. Käyttäjä vastaa itse asiakirjan sisällön oikeellisuudesta ja siitä, että hänellä on oikeus asiakirjan allekirjoittamiseen.</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>3. Vastuunrajoitus</h2>
                        <p>Palvelu tarjotaan "sellaisena kuin se on". Palveluntarjoaja ei takaa palvelun katkotonta toimivuutta. Palveluntarjoaja ei vastaa välillisistä tai välittömistä vahingoista, jotka aiheutuvat palvelun käytöstä, käyttökatkoista tai asiakirjojen katoamisesta tai turmeltumisesta. Vastuun enimmäismäärä rajoittuu aina kyseisestä allekirjoitustapahtumasta maksettuun palvelumaksuun.</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>4. Maksut</h2>
                        <p>Palvelun käytöstä peritään hinnastossa esitetty kertamaksu. Maksu tapahtuu kolmannen osapuolen maksunvälittäjän (esim. Stripe) kautta. Maksun palauttaminen ei ole mahdollista sen jälkeen, kun digitaalisen prosessin (tunnistautuminen tai sähköpostien välitys) suorittaminen on alkanut.</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>5. Immateriaalioikeudet</h2>
                        <p>Palvelun ja sen käyttöliittymän omistusoikeudet kuuluvat Palveluntarjoajalle. Lataamiensa asiakirjojen tekijänoikeudet ja omistusoikeudet säilyvät käyttäjällä.</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>6. Ehtojen muutokset</h2>
                        <p>Palveluntarjoaja pidättää oikeuden muuttaa näitä ehtoja milloin tahansa. Uudet ehdot astuvat voimaan, kun ne julkaistaan palvelussa.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TermsView;
