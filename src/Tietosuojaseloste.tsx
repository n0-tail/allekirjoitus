import React from 'react';

interface TietosuojaselosteProps {
    onBack: () => void;
}

export const Tietosuojaseloste: React.FC<TietosuojaselosteProps> = ({ onBack }) => {
    return (
        <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
            <div className="card">
                <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: '2rem', padding: '0.5rem 1rem' }}>
                    &larr; Palaa takaisin
                </button>

                <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: 'var(--text-main)' }}>Tietosuojaseloste</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontStyle: 'italic' }}>Päivitetty viimeksi: 25.02.2026</p>

                <div style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
                    <h2 style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>1. Rekisterinpitäjä</h2>
                    <p>Polarcomp Oy (Y-tunnus: 1234567-8)<br />Sähköposti: tietosuoja@polarcomp.fi<br />Verkkosivusto: polarcomp.fi</p>

                    <h2 style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>2. Rekisterin nimi ja henkilötietojen käsittelyn tarkoitus</h2>
                    <p>Rekisterin nimi: Allekirjoitus-palvelun käyttäjärekisteri.</p>
                    <p>Henkilötietojen käsittelyn oikeusperusteena on yrityksen oikeutettu etu (artikla 6, kohta 1f) tarjota sähköistä allekirjoituspalvelua sekä lakisääteisen velvoitteen noudattaminen vahvan sähköisen tunnistautumisen osalta. Käsittelyn tarkoituksena on asiakirjojen sähköinen allekirjoittaminen ja allekirjoittajan henkilöllisyyden luotettava varmentaminen Suomen Luottamusverkoston (FTN) kautta.</p>

                    <h2 style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>3. Rekisterin tietosisältö</h2>
                    <p>Järjestelmä tallentaa sähköisen tunnistautumisen yhteydessä seuraavat henkilötiedot:</p>
                    <ul>
                        <li>Tunnistautujan etu- ja sukunimi</li>
                        <li>Tunnistautujan henkilötunnus</li>
                        <li>Tunnistautumisen aikaleima</li>
                        <li>Tunnistautujan sähköpostiosoite (mikäli annettu lähetyksen yhteydessä)</li>
                    </ul>

                    <h2 style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>4. Säännönmukaiset tietolähteet</h2>
                    <p>Henkilötiedot saadaan säännönmukaisesti Suomen Luottamusverkoston (FTN) tunnistusvälittäjältä tunnistautumistapahtuman yhteydessä, käyttäjän omalla suostumuksella.</p>

                    <h2 style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>5. Tietojen säännönmukaiset luovutukset ja siirto EU:n tai ETA:n ulkopuolelle</h2>
                    <p>Tietoja ei luovuteta säännönmukaisesti ulkopuolisille tahoille, lukuun ottamatta teknisen infrastruktuurin palveluntarjoajia (esim. Supabase ja Resend), jotka toimivat henkilötietojen käsittelijöinä. Osa käsitteltävistä tiedoista saattaa siirtyä EU:n tai ETA-alueen ulkopuolelle, jolloin siirrossa noudatetaan EU:n komission mallilausekkeita.</p>

                    <h2 style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>6. Rekisterin suojauksen periaatteet ja säilytysaika</h2>
                    <p>Sähköisesti käsiteltävät rekisterin sisältävät tiedot on suojattu palomuurein, salasanoin (Row Level Security) ja muilla teknisillä keinoilla. Yhteydet ovat kryptattuja. Varsinaiset allekirjoitetut asikirjat (PDF-tiedostot) tuhotaan automaattisesti järjestelmästä 24 tuntia allekirjoitushetken jälkeen.</p>

                    <h2 style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>7. Tarkastusoikeus ja oikeus vaatia tiedon korjaamista</h2>
                    <p>Rekisteröidyllä on oikeus tarkastaa, mitä häntä koskevia tietoja rekisteriin on talletettu. Tarkastuspyyntö on lähetettävä kirjallisesti ja allekirjoitettuna rekisterinpitäjälle. Rekisteröidyllä on oikeus vaatia virheellisen tiedon korjaamista tai omien tietojensa poistamista järjestelmästä ("oikeus tulla unohdetuksi"), lukuun ottamatta tietoja, joiden säilyttämiseen on lakisääteinen vaatimus arkistoinnin tai auditoinnin osalta.</p>
                </div>
            </div>
        </div>
    );
};
