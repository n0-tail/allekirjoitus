import React from 'react';
import { Link } from 'react-router-dom';

const TermsView: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-8 sm:p-10">
                    <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-6 inline-flex border-b border-transparent hover:border-indigo-800 transition-colors">
                        {'← Takaisin etusivulle'}
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Käyttöehdot</h1>

                    <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
                        <p><strong>Päivitetty:</strong> {new Date().toLocaleDateString('fi-FI')}</p>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Palvelun kuvaus</h2>
                            <p>Tämä palvelu ("Palvelu") tarjoaa alustan PDF-asiakirjojen sähköiseen allekirjoittamiseen yksityishenkilöiden välillä hyödyntäen vahvaa sähköistä tunnistautumista (FTN). Palvelun tarjoaa Polarcomp Oy ("Palveluntarjoaja").</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Käyttäjän velvollisuudet</h2>
                            <p>Käyttäjä vakuuttaa lataamiensa asiakirjojen olevan lainmukaisia. Palvelua ei saa käyttää laittoman, loukkaavan tai haitallisen materiaalin välittämiseen. Käyttäjä vastaa itse asiakirjan sisällön oikeellisuudesta ja siitä, että hänellä on oikeus asiakirjan allekirjoittamiseen.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Vastuunrajoitus</h2>
                            <p>Palvelu tarjotaan "sellaisena kuin se on". Palveluntarjoaja ei takaa palvelun katkotonta toimivuutta. Palveluntarjoaja ei vastaa välillisistä tai välittömistä vahingoista, jotka aiheutuvat palvelun käytöstä, käyttökatkoista tai asiakirjojen katoamisesta tai turmeltumisesta. Vastuun enimmäismäärä rajoittuu aina kyseisestä allekirjoitustapahtumasta maksettuun palvelumaksuun.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Maksut</h2>
                            <p>Palvelun käytöstä peritään hinnastossa esitetty kertamaksu. Maksu tapahtuu kolmannen osapuolen maksunvälittäjän (esim. Stripe) kautta. Maksun palauttaminen ei ole mahdollista sen jälkeen, kun digitaalisen prosessin (tunnistautuminen tai sähköpostien välitys) suorittaminen on alkanut.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Immateriaalioikeudet</h2>
                            <p>Palvelun ja sen käyttöliittymän omistusoikeudet kuuluvat Palveluntarjoajalle. Lataamiensa asiakirjojen tekijänoikeudet ja omistusoikeudet säilyvät käyttäjällä.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Ehtojen muutokset</h2>
                            <p>Palveluntarjoaja pidättää oikeuden muuttaa näitä ehtoja milloin tahansa. Uudet ehdot astuvat voimaan, kun ne julkaistaan palvelussa.</p>
                            <p className="mt-2 text-sm text-gray-500 italic">*Tämä on esimerkkiluonnos, varmista sisällön paikkansapitävyys juristin kanssa ennen tuotantoa.*</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsView;
