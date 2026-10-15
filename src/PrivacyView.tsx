import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateSeoMeta } from './lib/seo';

const PrivacyView: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        updateSeoMeta({
            title: 'Tietosuojaseloste (GDPR) | Helppo Allekirjoitus',
            description: 'Polarcomp Oy:n tietosuojaseloste ja GDPR-informaatio. Automaattinen 24 tunnin asiakirjojen poisto ja tietojen minimointi.',
            canonicalPath: '/tietosuoja/',
        });
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
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Tietosuojaseloste</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    <strong>Päivitetty:</strong> 17.8.2026
                </p>

                <div style={{ lineHeight: 1.7, color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>1. Rekisterinpitäjä</h2>
                        <p>Polarcomp Oy / 0969733-4<br />Halmetie 7, 98120 Kemijärvi<br />tietosuoja@polarcomp.fi</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>2. Rekisterin nimi</h2>
                        <p>Sähköisen allekirjoituspalvelun asiakas- ja käyttäjärekisteri.</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>3. Henkilötietojen käsittelyn tarkoitus ja oikeusperuste</h2>
                        <p>Käsittelemme henkilötietoja asiakirjojen sähköisen allekirjoittamisen toteuttamiseksi, osapuolten luotettavaa tunnistamista varten (vahva sähköinen tunnistaminen) sekä maksujen prosessointiin. Käsittelyn oikeusperusteena on sopimuksen täytäntöönpano ja lakisääteiset velvoitteet.</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>4. Käsiteltävät henkilötiedot</h2>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <li>Nimi ja sähköpostiosoite (käyttäjän syöttämänä)</li>
                            <li>Vahvan tunnistautumisen kautta saadut yksilöivät tiedot (kuten virallinen koko nimi OIDC-palveluntarjoajalta)</li>
                            <li>Palveluun ladatut asiakirjat (PDF) ja niiden sisältö väliaikaisesti prosessoinnin ajan</li>
                            <li>IP-osoite, aikaleimat ja lokitiedot tietoturvan varmentamiseksi</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>5. Tietojen säännönmukaiset luovutukset</h2>
                        <p>Tietoja luovutetaan palvelun toteuttamiseen osallistuville kumppaneille (kuten maksunvälittäjälle ja tunnistautumispalvelulle) siinä määrin kuin on välttämätöntä. Tietoja ei luovuteta kolmansille osapuolille suoramarkkinointiin. Kaikki arkaluonteinen tietoliikenne on salattua (HTTPS).</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>6. Tietojen säilytysaika ja suojaus</h2>
                        <p>Asiakirjoja (PDF) ja niiden liitännäistietoja säilytetään tietokannassamme vain teknisen prosessin vaatiman ajan. Kun allekirjoitus on suoritettu ja asiakirjat on toimitettu osapuolille sähköpostitse, järjestelmämme on suunniteltu poistamaan tai anonymisoimaan niihin liittyvä data säännöllisesti.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyView;
