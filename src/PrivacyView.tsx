import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyView: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-8 sm:p-10">
                    <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-6 inline-flex border-b border-transparent hover:border-indigo-800 transition-colors">
                        {'← Takaisin etusivulle'}
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Tietosuojaseloste</h1>

                    <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
                        <p><strong>Päivitetty:</strong> {new Date().toLocaleDateString('fi-FI')}</p>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Rekisterinpitäjä</h2>
                            <p>[Yrityksen Nimi] / [Y-tunnus]<br />[Osoite]<br />[Sähköposti]</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Rekisterin nimi</h2>
                            <p>Sähköisen allekirjoituspalvelun asiakas- ja käyttäjärekisteri.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Henkilötietojen käsittelyn tarkoitus ja oikeusperuste</h2>
                            <p>Käsittelemme henkilötietoja asiakirjojen sähköisen allekirjoittamisen toteuttamiseksi, osapuolten luotettavaa tunnistamista varten (vahva sähköinen tunnistaminen) sekä maksujen prosessointiin. Käsittelyn oikeusperusteena on sopimuksen täytäntöönpano ja lakisääteiset velvoitteet.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Käsiteltävät henkilötiedot</h2>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Nimi ja sähköpostiosoite (käyttäjän syöttämänä)</li>
                                <li>Vahvan tunnistautumisen kautta saadut yksilöivät tiedot (kuten virallinen koko nimi OIDC-palveluntarjoajalta)</li>
                                <li>Palveluun ladatut asiakirjat (PDF) ja niiden sisältö väliaikaisesti prosessoinnin ajan</li>
                                <li>IP-osoite, aikaleimat ja lokitiedot tietoturvan varmentamiseksi</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Tietojen säännönmukaiset luovutukset</h2>
                            <p>Tietoja luovutetaan palvelun toteuttamiseen osallistuville kumppaneille (kuten maksunvälittäjälle ja tunnistautumispalvelulle) siinä määrin kuin on välttämätöntä. Tietoja ei luovuteta kolmansille osapuolille suoramarkkinointiin. Kaikki arkaluonteinen tietoliikenne on salattua (HTTPS).</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Tietojen säilytysaika ja suojaus</h2>
                            <p>Asiakirjoja (PDF) ja niiden liitännäistietoja säilytetään tietokannassamme vain teknisen prosessin vaatiman ajan. Kun allekirjoitus on suoritettu ja asiakirjat on toimitettu osapuolille sähköpostitse, järjestelmämme on suunniteltu poistamaan tai anonymisoimaan niihin liittyvä data säännöllisesti.</p>
                            <p className="mt-2 text-sm text-gray-500 italic">*Tämä on esimerkkiluonnos, varmista sisällön paikkansapitävyys juristin kanssa ennen tuotantoa.*</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyView;
