import fs from 'node:fs';
import path from 'node:path';

// Article data — duplicated from src/data/articles.ts for build-time injection.
// Keep this in sync with the source file when adding/editing articles.
const articles = [
    {
        slug: 'mika-on-sahkoinen-allekirjoitus',
        title: 'Mikä on sähköinen allekirjoitus ja miten se toimii?',
        description: 'Täydellinen opas sähköisen allekirjoituksen lainmukaisuuteen, eIDAS-asetukseen ja vahvaan pankkitunnistautumiseen (FTN) Suomessa.',
        date: '2024-05-15',
        content: `<h2>Sähköisen allekirjoituksen perusteet</h2>
<p>Sähköinen allekirjoitus tarkoittaa tietojen sähköistä muotoa, joka on liitetty tai loogisesti yhdistetty muihin sähköisiin tietoihin, ja jota allekirjoittaja käyttää allekirjoittamiseen. Se on nykyaikainen, nopea ja tietoturvallinen tapa vahvistaa henkilöllisyys ja hyväksyä asiakirjan tai sopimuksen sisältö ilman perinteistä kynää ja paperia.</p>
<h2>eIDAS-asetus ja lainmukaisuus</h2>
<p>Euroopan unionissa sähköisiä allekirjoituksia säätelee <strong>eIDAS-asetus</strong> (EU 910/2014). Se varmistaa, että sähköiset allekirjoitukset, sähköiset leimat ja digitaaliset varmenteet tunnustetaan oikeudellisesti sitoviksi ristiin kaikkien EU-jäsenmaiden välillä.</p>
<p>Helppoallekirjoitus.fi hyödyntää eIDAS-asetuksen mukaista <em>edistynyttä sähköistä allekirjoitusta</em>, joka takaa korkean turvallisuustason. Oikeudessa oikein tehty sähköinen allekirjoitus vahvalla tunnistautumisella on todistusvoimaltaan perinteistä käsin tehtyä allekirjoitusta (ja skannattua PDF-dokumenttia) luotettavampi, koska siihen liittyy digitaalinen, muuttumaton jälki alkuperästä.</p>
<h2>Vahva pankkitunnistautuminen (FTN)</h2>
<p>Suomessa sähköisen allekirjoituksen luotettavuuden ytimessä on <strong>Finnish Trust Network (FTN)</strong>, eli vahva sähköinen tunnistaminen. FTN perustuu suomalaisten pankkien, mobiilivarmenteen ja väestörekisterikeskuksen (varmennekortit) rajapintoihin.</p>
<p>Kun asiakirja allekirjoitetaan vahvaa tunnistautumista käyttäen, allekirjoituksen väärentämisen riski on olematon. Järjestelmä hakee virallisen henkilöllisyyden Traficomin hyväksymän FTN-välittäjän kautta. Tämä poistaa perinteisten PDF-allekirjoitusten "piirrä nimesi hiirellä" -tyylisten ratkaisujen valtavat juridiset epävarmuudet.</p>
<h2>Miten prosessi etenee käytännössä?</h2>
<ol>
<li><strong>PDF:n lataus:</strong> Lähettäjä pudottaa valmiin PDF-sopimuksen järjestelmään selaimen kautta olemassaolevalta laitteeltaan.</li>
<li><strong>Osapuolten määritys:</strong> Järjestelmälle ilmoitetaan kenen (tai keiden) edellytetään allekirjoittavan sopimus (esim. lähettäjä itse ja vuokralainen).</li>
<li><strong>Tunnistautuminen ja leima:</strong> Osapuolet tunnistautuvat vuorollaan pankkitunnuksilla. Järjestelmä kirjoittaa PDF:n sisään kryptografisen leiman ja varmenteen sisältäen henkilöiden todennetut nimet ja aikaleimat.</li>
<li><strong>Automaattinen nollatieto -tuhoaminen:</strong> Valmis asiakirja lähetetään heti osapuolille, ja tietosuojavaatimusten mukaisesti koko PDF tuhotaan palvelimelta automaattisesti prosessin päätyttyä (Zero-knowledge arkkitehtuuri).</li>
</ol>
<p>Sähköisen allekirjoituksen helppous mahdollistaa sitovien sopimusten solmimisen minuuteissa ajasta tai paikasta riippumatta.</p>`
    },
    {
        slug: 'sahkoinen-allekirjoitus-vuokrasopimukseen',
        title: 'Sähköinen allekirjoitus vuokrasopimukseen - Turvallisin tapa',
        description: 'Miten allekirjoitat vuokrasopimuksen sähköisesti pankkitunnuksilla ilman kuukausimaksuja? Katso ohjeet yksityishenkilöille ja asuntosijoittajille.',
        date: '2025-02-10',
        content: `<h2>Vuokrasopimuksen digitalisointi</h2>
<p>Asuinhuoneiston vuokrasopimus on yksi tyypillisimmistä asiakirjoista, joka nykypäivänä allekirjoitetaan sähköisesti. Se säästää sekä vuokranantajan että vuokralaisen aikaa, sillä tapaamista pelkkää allekirjoitusta varten ei tarvitse erikseen sopia.</p>
<h2>Miksi pankkitunnistautuminen (FTN) on kriittistä vuokrasopimuksessa?</h2>
<p>Vuokrasopimuksessa oikean henkilöllisyyden varmistaminen on kaiken a ja o. Pelkkä sähköpostivahvistus tai "ruudulle piirrettävä" allekirjoitus ei takaa, että ruudun takana on se henkilö, jonka nimellä vuokra-asunto oletetaan hankittavan. Tämä jättää oven auki identiteettivarkauksille tai maksuhäiriömerkintöjen kiertämiselle keksityllä nimellä.</p>
<p>Vahva pankkitunnistautuminen sitoo henkilön oikean, virallisen identiteetin (nimi, henkilötunnus) kryptografisesti vuokrasopimus-PDF:ään. Tämä pitää huolen siitä, että käräjäoikeudessa laadittu sopimus on vedenpitävä.</p>
<h2>Asuntosijoittajan ja yksityisen vuokranantajan kulut</h2>
<p>Useimmat markkinoilla olevat sähköiset allekirjoituspalvelut vaativat jatkuvan kuukausimaksun. Yksityiselle vuokranantajalle tai pienelle asuntosijoittajalle kiinteä 15-30€/kk voi olla turha kulu, jos vuokrasopimuksia tehdään vain muutamia vuodessa ja vaihtuvuus on vähäistä.</p>
<p>Helppoallekirjoitus.fi on suunniteltu nimenomaan poistamaan nämä kalliit kynnykset. Se toimii täysin kertamaksulla (vain muutama euro), ilman käyttäjätunnusten luontia tai lukittautumista kalliisiin pitkiin ohjelmistolisensseihin.</p>
<h2>Viisi askelta vuokrasopimuksen sähköiseen allekirjoittamiseen:</h2>
<ol>
<li>Tee vuokrasopimus haluamassasi muodossa ja tallenna se PDF-päätekkeellä.</li>
<li>Raahaa ja pudota PDF Helppoallekirjoituksen etusivulle.</li>
<li>Lisää järjestelmään itsesi lähettäjäksi.</li>
<li>Lisää vuokralaisen sähköposti vastaanottajaksi ja suorita kertamaksu.</li>
<li>Vuokralainen saa sähköpostilla suojatun linkin, käy läpi tunnistautumisen pankkitunnuksillaan ja järjestelmä lähettää valmiin, molempien eIDAS-varmenteella varustetun sopimuksen kummankin sähköpostiin.</li>
</ol>
<p>Palvelusta ei jää henkilötietojälkiä pilveen tietosuojariskeiksi, vaan PDF:t tuhoutuvat automaattisesti allekirjoittamisen jälkeen.</p>`
    },
    {
        slug: 'sahkoinen-allekirjoitus-hintavertailu',
        title: 'Sähköisen allekirjoituksen hinta: Visma Sign, DocuSign ja Helppoallekirjoitus',
        description: 'Maksa vain käytöstä. Vertaile markkinoiden suosituimpien sähköisten allekirjoituspalveluiden hinnat, piilokulut ja ominaisuudet pk-yrityksille.',
        date: '2025-11-20',
        content: `<h2>Sähköisten allekirjoituspalveluiden hinnoittelumallit (B2B ja B2C)</h2>
<p>Markkinoilla on tällä hetkellä lukuisia sähköisen allekirjoituksen (eSign) tarjoajia. Haasteena varsinkin pienyrittäjillä (PK-sektori) sekä yksityishenkilöillä on usein ohjelmistojen hinnoitteluarkkitehtuuri, joka on raskaasti painottunut suurten Enterprise-yritysten jatkuvan laskutuksen jatkuviin sopimuksiin.</p>
<h3>Miksi hinnoissa on niin isoja eroja?</h3>
<p>Hintaerot selittyvät ominaisuuksien määrällä, joita et aina tarvitse. Isot ohjelmistotalot paketoivat mukaan ominaisuuksia kuten pitkäaikaisen oikeudellisen arkistoinnin, asiakirjamallien laajan dokumentinhallintajärjestelmän (DMS), erilliset monihyväksyntäketjut ristiin isoissa organisaatioissa sekä API-integraatiot CRM-järjestelmiin (kuten Salesforce).</p>
<h2>Katsaus markkinoiden tyypillisiin tarjoajiin</h2>
<h3>1. Isot globaalit toimijat (Esim. DocuSign, Adobe Sign)</h3>
<p>Haasteena Suomen markkinoilla on vahvan pankkitunnistautumisen (FTN) puute tai sen lisämaksullisuus erillisten lisäosien kautta.</p>
<ul>
<li><strong>Aloitushinta:</strong> Tyypillisesti 10–25 EUR / kuukausi (sitova).</li>
<li><strong>Tunnistautuminen:</strong> Oletuksena pelkkä vahvistamaton sähköpostiallekirjoitus, FTN usein Premium-tasojen erillislisäosa.</li>
</ul>
<h3>2. Pohjoismaiset yritysratkaisut (Esim. Visma Sign, Scrive)</h3>
<p>Tarjoavat Suomessa tärkeän pankkitunnistautumisen (FTN) natiivina. Sopivat yritysten päivittäiseen, jatkuvaan työnkulkuun.</p>
<ul>
<li><strong>Aloitushinta:</strong> Kuukausimaksullisia alkaen usein n. 15 EUR/kk ja sen päälle transaktiokohtainen maksu.</li>
</ul>
<h3>3. Kertamaksulliset ratkaisut (Helppoallekirjoitus.fi)</h3>
<p>Tarkoitettu nimenomaan yksittäisten tai satunnaisten allekirjoitusten tarpeeseen (Pay-as-you-go -malli).</p>
<ul>
<li><strong>Hinta:</strong> Ainoastaan pieni kertamaksu per allekirjoituspyyntö (1,49 €/kpl).</li>
<li><strong>Ei erillistä kuukausimaksua.</strong></li>
<li><strong>Zero-Knowledge &amp; Tietoturva:</strong> Dokumentteja ei tallenneta pysyvästi. Allekirjoitetut versiot hävitetään 24 tunnin kuluessa GDPR-dataminimaatioperiaatteita noudattaen.</li>
<li><strong>Tunnistautuminen:</strong> Suomalainen pankkitunnistautuminen FTN sisäänrakennettuna kertamaksuhintaan.</li>
</ul>
<h2>Yhteenveto hintaansa katsovalle</h2>
<p>Jos allekirjoituksia tarvitaan vain silloin tällöin (esim. yksityinen vuokranantaja tai toiminimiyrittäjä), jatkuvasti tililtä veloitettava 15€/kk tekee allekirjoitusten todelliseksi kappalehinnaksi herkästi satoja euroja vuositasolla. Näissä tapauksissa Helppoallekirjoitus ja 1,49€ sitoukseton paketti voi tuoda merkittävät säästöt palvelun lakisääteisen eIDAS-laadun pysyessä enterprise-asteella.</p>`
    }
];

// Non-article static routes
const staticRoutes = [
    { route: '/ehdot', title: 'Käyttöehdot | Helppo Allekirjoitus', description: 'Helppoallekirjoitus.fi -palvelun käyttöehdot.' },
    { route: '/tietosuoja', title: 'Tietosuojaseloste | Helppo Allekirjoitus', description: 'Polarcomp Oy:n tietosuojaseloste ja GDPR-informaatio.' },
    { route: '/asiantuntija-artikkelit', title: 'Asiantuntija-artikkelit | Helppo Allekirjoitus', description: 'Oppaat ja artikkelit sähköisestä allekirjoituksesta, eIDAS-asetuksesta ja FTN-tunnistautumisesta.' }
];

const distDir = path.join(process.cwd(), 'dist');
const indexFile = path.join(distDir, 'index.html');

console.log('Running postbuild script...');

if (!fs.existsSync(indexFile)) {
    console.error(`Error: index.html not found in ${distDir}`);
    process.exit(1);
}

const baseHtml = fs.readFileSync(indexFile, 'utf-8');

// Ensure the 404.html is built as well
fs.copyFileSync(indexFile, path.join(distDir, '404.html'));
console.log('✔ Copied index.html to 404.html');

// Helper function to update SEO tags
function updateSeoTags(html, { route, title, description }) {
    let out = html;
    
    // Update Title
    if (title) {
        out = out.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
        out = out.replace(/<meta name="twitter:title" content="[^"]+"\s*\/>/, `<meta name="twitter:title" content="${title}" />`);
        out = out.replace(/<meta property="og:title" content="[^"]+"\s*\/>/, `<meta property="og:title" content="${title}" />`);
    }

    // Update Description
    if (description) {
        out = out.replace(/<meta name="description"\s*\n?\s*content="[^"]+"\s*\/>/, `<meta name="description" content="${description}" />`);
        out = out.replace(/<meta name="twitter:description"\s*\n?\s*content="[^"]+"\s*\/>/, `<meta name="twitter:description" content="${description}" />`);
        out = out.replace(/<meta property="og:description"\s*\n?\s*content="[^"]+"\s*\/>/, `<meta property="og:description" content="${description}" />`);
    }

    // Update URLs (Canonical, Alternate, OG) - using trailing slash for canonicalization parity
    const fullUrl = "https://helppoallekirjoitus.fi" + route + "/";
    out = out.replace(/<link rel="canonical" href="[^"]+"\s*\/>/, '<link rel="canonical" href="' + fullUrl + '" />');
    out = out.replace(/<link rel="alternate" hreflang="fi" href="[^"]+"\s*\/>/, '<link rel="alternate" hreflang="fi" href="' + fullUrl + '" />');
    out = out.replace(/<meta property="og:url" content="[^"]+"\s*\/>/, '<meta property="og:url" content="' + fullUrl + '" />');
    
    return out;
}

// Copy index.html to static routes and update SEO tags
staticRoutes.forEach(config => {
    const routeDir = path.join(distDir, config.route);
    if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
    }
    
    const modifiedHtml = updateSeoTags(baseHtml, config);
    const destFile = path.join(routeDir, 'index.html');
    fs.writeFileSync(destFile, modifiedHtml, 'utf-8');
    console.log(`✔ Injected SEO metadata into ${config.route}/index.html`);
});

// For article routes: inject article content as sr-only HTML into each copy AND update SEO tags
const SR_ONLY_MARKER = '<!-- End sr-only content -->';

articles.forEach(article => {
    const route = `/asiantuntija-artikkelit/${article.slug}`;
    const routeDir = path.join(distDir, route);

    if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
    }

    // Update the SEO tags (Canonical, Title, Description)
    let modifiedHtml = updateSeoTags(baseHtml, {
        route,
        title: `${article.title} | Helppo Allekirjoitus`,
        description: article.description
    });

    // Build article-specific sr-only content block
    const articleSrOnly = `
    <!-- Article sr-only content injected by postbuild -->
    <div class="sr-only" data-nosnippet>
      <article>
        <h1>${article.title}</h1>
        <p><em>${article.description}</em></p>
        <p>Julkaistu: ${article.date} | Polarcomp Oy</p>
        ${article.content}
        <p><a href="https://helppoallekirjoitus.fi/">Allekirjoita sopimus heti (1,49€) →</a></p>
      </article>
    </div>
    <!-- End article sr-only content -->`;

    // Inject the article content just before the sr-only closing marker
    modifiedHtml = modifiedHtml.replace(
        SR_ONLY_MARKER,
        SR_ONLY_MARKER + articleSrOnly
    );

    const destFile = path.join(routeDir, 'index.html');
    fs.writeFileSync(destFile, modifiedHtml, 'utf-8');
    console.log(`✔ Injected article content & SEO metadata into ${route}/index.html`);
});

console.log('Postbuild script completed successfully.');
