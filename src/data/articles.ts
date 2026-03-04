export interface Article {
    slug: string;
    title: string;
    description: string;
    date: string;
    content: string; // Markdown / HTML content
}

export const articles: Article[] = [
    {
        slug: 'mika-on-sahkoinen-allekirjoitus',
        title: 'Mikä on sähköinen allekirjoitus ja miten se toimii?',
        description: 'Täydellinen opas sähköisen allekirjoituksen lainmukaisuuteen, eIDAS-asetukseen ja vahvaan pankkitunnistautumiseen (FTN) Suomessa.',
        date: '2026-03-04',
        content: `
      <h2>Sähköisen allekirjoituksen perusteet</h2>
      <p>Sähköinen allekirjoitus tarkoittaa tietojen sähköistä muotoa, joka on liitetty tai loogisesti yhdistetty muihin sähköisiin tietoihin, ja jota allekirjoittaja käyttää allekirjoittamiseen. Se on nykyaikainen, nopea ja tietoturvallinen tapa vahvistaa henkilöllisyys ja hyväksyä asiakirjan tai sopimuksen sisältö ilman perinteistä kynää ja paperia.</p>

      <h2>eIDAS-asetus ja lainmukaisuus</h2>
      <p>Euroopan unionissa sähköisiä allekirjoituksia säätelee <strong>eIDAS-asetus</strong> (EU 910/2014). Se varmistaa, että sähköiset allekirjoitukset, sähköiset leimat ja digitaaliset varmenteet tunnustetaan oikeudellisesti sitoviksi ristiin kaikkien EU-jäsenmaiden välillä.</p>
      <p>Helppoallekirjoitus.fi hyödyntää eIDAS-asetuksen mukaista <em>edistynyttä sähköistä allekirjoitusta</em>, joka takaa korkean turvallisuustason. Oikeudessa oikein tehty sähköinen allekirjoitus vahvalla tunnistautumisella on todistusvoimaltaan perinteistä käsin tehtyä allekirjoitusta (ja skannattua PDF-dokumenttia) luotettavampi, koska siihen liittyy digitaalinen, muuttumaton jälki alkuperästä.</p>

      <h2>Vahva pankkitunnistautuminen (FTN)</h2>
      <p>Suomessa sähköisen allekirjoituksen luotettavuuden ytimessä on <strong>Finnish Trust Network (FTN)</strong>, eli vahva sähköinen tunnistaminen. FTN perustuu suomalaisten pankkien, mobiilivarmenteen ja väestörekisterikeskuksen (varmennekortit) rajapintoihin.</p>
      <p>Kun asiakirja allekirjoitetaan vahvaa tunnistautumista käyttäen, allekirjoituksen väärentämisen riski on olematon. Järjestelmä hakee virallisen henkilöllisyyden Traficomin hyväksymän FTN-välittäjän kautta. Tämä poistaa perinteisten PDF-allekirjoitusten "piirrä nimesi hiirellä" -tyylisten ratkaisujen valtavat juridiset epävarmuudet.</p>

      <h2>Miten prosessi etenee käytännössä?</h2>
      <ol>
        <li><strong>PDF:n lataus:</strong> Lähettäjä pudottaa valmiin PDF-sopimuksen järjestelmään selaimesn kautta olemassaolevalta laitteeltaan.</li>
        <li><strong>Osapuolten määritys:</strong> Järjestelmälle ilmoitetaan kenen (tai keiden) edellytetään allekirjoittavan sopimus (esim. lähettäjä itse ja vuokralainen).</li>
        <li><strong>Tunnistautuminen ja leima:</strong> Osapuolet tunnistautuvat vuorollaan pankkitunnuksilla. Järjestelmä kirjoittaa PDF:n sisään kryptografisen leiman ja varmenteen sisältäen henkilöiden todennetut nimet ja aikaleimat.</li>
        <li><strong>Automaattinen nollatieto -tuhoaminen:</strong> Valmis asiakirja lähetetään heti osapuolille, ja tietosuojavaatimusten mukaisesti koko PDF tuhotaan palvelimelta automaattisesti prosessin päätyttyä (Zero-knowledge arkkitehtuuri).</li>
      </ol>
      <p>Sähköisen allekirjoituksen helppous mahdollistaa sitovien sopimusten solmimisen minuuteissa ajasta tai paikasta riippumatta.</p>
    `
    },
    {
        slug: 'sahkoinen-allekirjoitus-vuokrasopimukseen',
        title: 'Sähköinen allekirjoitus vuokrasopimukseen - Turvallisin tapa',
        description: 'Miten allekirjoitat vuokrasopimuksen sähköisesti pankkitunnuksilla ilman kuukausimaksuja? Katso ohjeet yksityishenkilöille ja asuntosijoittajille.',
        date: '2026-03-04',
        content: `
      <h2>Vuokrasopimuksen digitalisointi</h2>
      <p>Asuinhuoneiston vuokrasopimus on yksi tyypillisimmistä asiakirjoista, joka nykypäivänä allekirjoitetaan sähköisesti. Se säästää sekä vuokranantajan että vuokralaisen aikaa, sillä tapaamista pelkkää allekirjoitusta varten ei tarvitse erikseen sopia. Avainkäytännöt sähköisessä asioinnissa turvaavat molempien selustaa mahdollisissa riitatilanteissa.</p>

      <h2>Miksi pankkitunnistautuminen (FTN) on kriittistä vuokrasopimuksessa?</h2>
      <p>Vuokrasopimuksessa oikean henkilöllisyyden varmistaminen on kaiken a ja o. Pelkkä sähköpostivahvistus tai "ruudulle piirrettävä" allekirjoitus ei takaa, että ruudun takana on se henkilö, jonka nimellä vuokra-asunto oletetaan hankittavan. Tämä jättää oven auki identiteettivarkauksille tai maksuhäiriömerkintöjen kiertämiselle keksityllä nimellä.</p>
      <p>Vahva pankkitunnistautuminen sitoo henkilön oikean, virallisen identiteetin (nimi, henkilötunnus) kryptografisesti vuokrasopimus-PDF:ään. Tämä pitää huolen siitä, että käräjäoikeudessa laadittu sopimus on vedenpitävä.</p>

      <h2>Asuntosijoittajan ja yksityisen vuokranantajan kulut</h2>
      <p>Useimmat markkinoilla olevat sähköiset allekirjoituspalvelut vaativat jatkuvan kuukausimaksun. Yksityiselle vuokranantajalle tai pienelle asuntosijoittajalle kiinteä 15-30€/kk voi olla turha kulu, jos vuokrasopimuksia tehdään vain muutamia vuodessa ja vaihtuvuus on vähäistä.</p>
      <p>Helppoallekirjoitus.fi on suunniteltu nimenomaan poistamaan nämä kalliit kynnykset. Se toimii täysin kertamaksulla (vain muutama euro), ilman käyttäjätunnusten luontia tai lukittautumista kalliisiin pitkiin ohjelmistolisensseihin.</p>

      <h2>Viisi askelta vuokrasopimuksen sähköiseen allekirjoittamiseen:</h2>
      <ol>
        <li>Tee vuokrasopimus haluamassasi muodossa ja tallenna se PDF-päätekkeellä. Lukuisiä ilmaisia vuokrasopimuspohjia (DOCX) on saatavilla netistä Suomen Vuokranantajien sivuilta.</li>
        <li>Raahaa ja pudota PDF Helppoallekirjoituksen etusivulle.</li>
        <li>Lisää järjestelmään itsesi lähettäjäksi (jos pitkäaikainen vuokrasopimus edellyttää kummankin osapuolen nimen, allekirjoitat ensimmäisenä itsepankkitunnuksillasi).</li>
        <li>Lisää vuokralaisen sähköposti vastaanottajaksi ja suorita kertamaksu.</li>
        <li>Vuokralainen saa sähköpostilla suojatun linkin, käy läpi tunnistautumisen pankkitunnuksillaan ja järjestelmä lähettää valmiin, molempien eIDAS-varmenteella varustetun sopimuksen kummankin sähköpostiin erikseen säilytettäväksi.</li>
      </ol>
      <p>Palvelusta ei jää henkilötietojälkiä pilviankkuriin tietosuojariskeiksi (toisin kuin useimmissa kuukausimaksullisissa pilviarkistoissa), vaan PDF:t tuhoutuvat automaattisesti allekirjoittamisen jälkeen valmistumisen yhteydessä.</p>
    `
    },
    {
        slug: 'sahkoinen-allekirjoitus-hintavertailu',
        title: 'Sähköisen allekirjoituksen hinta: Visma Sign, DocuSign ja Helppoallekirjoitus',
        description: 'Maksa vain käytöstä. Vertaile markkinoiden suosituimpien sähköisten allekirjoituspalveluiden hinnat, piilokulut ja ominaisuudet pk-yrityksille.',
        date: '2026-03-04',
        content: `
      <h2>Sähköisten allekirjoituspalveluiden hinnoittelumallit (B2B ja B2C)</h2>
      <p>Markkinoilla on tällä hetkellä lukuisia sähköisen allekirjoituksen (eSign) tarjoajia. Haasteena varsinkin pienyrittäjillä (PK-sektori) sekä yksityishenkilöillä on usein ohjelmistojen hinnoitteluarkkitehtuuri, joka on raskaasti painottunut suurten Enterprise-yritysten jatkuvan laskutuksen jatkuviin sopimuksiin.</p>

      <h3>Miksi hinnoissa on niin isoja eroja?</h3>
      <p>Hintaerot selittyvät ominaisuuksien määrällä, joita et aina tarvitse. Isot ohjelmistotalot paketoivat mukaan ominaisuuksia kuten pitkäaikaisen oikeudellisen arkistoinnin, asiakirjamallien laajan dokumentinhallintajärjestelmän (DMS), erilliset monihyväksyntäketjut ristiin isoissa organisaatioissa sekä API-integraatiot CRM-järjestelmiin (kuten Salesforce).</p>
      <p>Jos tavoitteenasi on yksinkertaisesti laillistaa valmis PDF-tiedosto vahvalla tunnistautumisella ja vastaanottaa se sähköpostiisi taltioitavaksi, isojen palveluiden tilaus voi muodostua ns. "ominaisuusähkyksi" (feature bloat) ja siten maksaa liikaa.</p>

      <h2>Katsaus markkinoiden tyypillisiin tarjoajiin</h2>
      
      <h3>1. Isot globaalit toimijat (Esim. DocuSign, Adobe Sign)</h3>
      <p>Nämä ohjelmistot ovat visuaalisesti ensiluokkaisia ja maailmanlaajuisesti tunnettuja. Haasteena Suomen markkinoilla on vahvan pankkitunnistautumisen (FTN) puute tai sen lisämaksullisuus erillisten lisäosien kautta.</p>
      <ul>
        <li><strong>Aloitushinta:</strong> Tyypillisesti 10 - 25 EUR / kuukausi (sitova).</li>
        <li><strong>Tunnistautuminen:</strong> Oletuksena pelkkä vahvistamaton sähköpostiallekirjoitus ("piirtotekniikka"), FTN usein Premium-tasojen erillislisäosa.</li>
        <li><strong>Kenelle sopii:</strong> Monikansallisille enterprise-yrityksille omilla kansainvälisillä työnkuluilla.</li>
      </ul>

      <h3>2. Pohjoismaiset yritysratkaisut (Esim. Visma Sign, Scrive)</h3>
      <p>Nämä ratkaisut tarjoavat Suomessa tärkeän ja laadukkaan pankkitunnistautumisen (FTN) natiivina, ja ne sopivat laajasti yritysten päivittäiseen, jatkuvaan työnkulkuun, joissa volume on runsasta ja integroitavuutta haetaan yrityksen laskutukseen tai asiakasrekisteriin suoraan ERP-viitekehyksestä.</p>
      <ul>
        <li><strong>Aloitushinta:</strong> Kuukausimaksullisia alkaen usein n. 15 EUR/kk ja sen päälle transaktiokohtainen maksu asiakirjavolyymin mukaan (1 - 2 EUR per tapahtuma).</li>
        <li><strong>Kenelle sopii:</strong> Yrityksille (tilitoimistot, kiinteistönvälittäjät), jotka allekirjoituttavat satoja sopimuksia vuodessa ja haluavat keskittää kaikki asiakirjat pilviarkistoon yrityksen intraan.</li>
      </ul>

      <h3>3. Kertamaksulliset "Drop-in" ratkaisut (Helppoallekirjoitus.fi)</h3>
      <p>Tarkoitettu nimenomaan ratkaisemaan yksittäistentai satunnaisten yritysten tehokas yksinkertaistamisen tarve (Pay-as-you-go -malli).</p>
      <ul>
        <li><strong>Hinta:</strong> Ainoastaan pieni kertamaksu per allekirjoituspyyntö (alennuskampanjoista ja volumeista riippuen hieman yli tai alle 1,5 €/kpl).</li>
        <li><strong>Ei erillistä kuukausimaksua:</strong> Ei sisällä lainkaan automaattista viukausilaskutusta (SaaS-lukkiutumista).</li>
        <li><strong>Zero-Knowledge & Tietoturva:</strong> Dokumentteja ei tallenneta pysyvästi raskaaseen arkistoon palveluntarjoajalle tietomurtojen saaliiksi, vaan allekirjoitetut versiot hävitetään kokonaisvaltaisesti 24 tunnin säteellä valmiiksi saatumisesta GDPR-dataminimaatioperiaatteita noudattaen. Sinä omistat ja säilytät PDF-luonnoksesi itse vikasietoisessa palvelimessa tai arkistossasi.</li>
        <li><strong>Tunnistautuminen:</strong> Rääätälöity tähän malliin – huippuluokan suomalainen pankkitunnistautuminen FTN täysin sisäänrakennettuna itse kertamaksuhintaan per tunnistustapahtuma.</li>
      </ul>

      <h2>Yhteenveto hintaansa katsovalle</h2>
      <p>Jos teet tai otat vastaan kymmeniä tai jopa tuhansia vuokrasopimuksia päivittäin suuryrityksen automaation kautta, skaalautuva ison volyymin tilaus perinteisiltä pohjoismaisilta toimijoilta saattaa olla järkevää.</p>
      <p>Jollei käyttö ole arkipäivää (esim. yksityinen vuokranantaja tai toiminimiyrittäjä tarvitsee allekirjoituksia vain silloin tällöin 1-5 vuodessa), jatkuvasti tililtä veloitettava 15€/kk tekee allekirjoitusten todelliseksi kappalehinnaksi herkästi useita satoja euroja vuosi tasolla.</p>
      <p>Näissä tapauksissa "No-BS" malli, kuten Helppoallekirjoitus ja 1,49€ täysin sitoukseton paketti voi tuoda huimat euromääräiset säästöt palvelun lakisääteisen EIDAS-laadun sekä turvallisen ja sitovan tunnistautumisen pysyessä edelleen äärimmäisen vakavasti otettavalla enterprise-asteella.</p>
    `
    }
];
