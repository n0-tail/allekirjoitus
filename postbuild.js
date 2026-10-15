import fs from 'node:fs';
import path from 'node:path';
import { articles } from './src/data/articles.ts';
import { contractTemplates } from './src/data/contractTemplates.ts';

const distDir = path.join(process.cwd(), 'dist');
const publicDir = path.join(process.cwd(), 'public');
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

const ROUTE_SCHEMA_REGEX = /<!-- ROUTE_SCHEMA_START -->[\s\S]*?<!-- ROUTE_SCHEMA_END -->/;
const ROOT_CONTENT_REGEX = /<!-- ROOT_CONTENT_START -->[\s\S]*?<!-- ROOT_CONTENT_END -->/;

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function htmlToMarkdown(html) {
    return html
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n### $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n#### $1\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, href, text) => {
            const fullHref = href.startsWith('http') ? href : `https://helppoallekirjoitus.fi${href.endsWith('/') ? href : href + '/'}`;
            return `[${text}](${fullHref})`;
        })
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1')
        .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
        .replace(/<[^>]+>/g, '')
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// Helper function to update SEO tags, JSON-LD route schemas, and #root semantic content
function buildRouteHtml(html, { route, title, description, schemaObjects = [], bodyHtml = '' }) {
    let out = html;

    if (title) {
        const safeTitle = escapeHtml(title);
        out = out.replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`);
        out = out.replace(/<meta name="twitter:title" content="[^"]+"\s*\/>/, `<meta name="twitter:title" content="${safeTitle}" />`);
        out = out.replace(/<meta property="og:title" content="[^"]+"\s*\/>/, `<meta property="og:title" content="${safeTitle}" />`);
    }

    if (description) {
        const safeDesc = escapeHtml(description);
        out = out.replace(/<meta name="description"\s*\n?\s*content="[^"]+"\s*\/>/, `<meta name="description" content="${safeDesc}" />`);
        out = out.replace(/<meta name="twitter:description"\s*\n?\s*content="[^"]+"\s*\/>/, `<meta name="twitter:description" content="${safeDesc}" />`);
        out = out.replace(/<meta property="og:description"\s*\n?\s*content="[^"]+"\s*\/>/, `<meta property="og:description" content="${safeDesc}" />`);
    }

    const fullUrl = `https://helppoallekirjoitus.fi${route}/`;
    out = out.replace(/<link rel="canonical" href="[^"]+"\s*\/>/, `<link rel="canonical" href="${fullUrl}" />`);
    out = out.replace(/<link rel="alternate" hreflang="fi" href="[^"]+"\s*\/>/, `<link rel="alternate" hreflang="fi" href="${fullUrl}" />`);
    out = out.replace(/<meta property="og:url" content="[^"]+"\s*\/>/, `<meta property="og:url" content="${fullUrl}" />`);

    const schemaBlock = schemaObjects
        .map(obj => `  <script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n  </script>`)
        .join('\n');

    out = out.replace(
        ROUTE_SCHEMA_REGEX,
        `<!-- ROUTE_SCHEMA_START -->\n${schemaBlock}\n  <!-- ROUTE_SCHEMA_END -->`
    );

    if (bodyHtml) {
        out = out.replace(
            ROOT_CONTENT_REGEX,
            `<!-- ROOT_CONTENT_START -->\n    <main class="sr-only">\n${bodyHtml}\n    </main>\n    <!-- ROOT_CONTENT_END -->`
        );
    }

    return out;
}

function writeRouteFile(route, htmlContent) {
    const routeDir = path.join(distDir, route);
    if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
    }
    const destFile = path.join(routeDir, 'index.html');
    fs.writeFileSync(destFile, htmlContent, 'utf-8');
}

// 1. Static Informational Routes (/ehdot, /tietosuoja)
const legalRoutes = [
    {
        route: '/ehdot',
        title: 'Käyttöehdot | Helppo Allekirjoitus',
        description: 'Helppoallekirjoitus.fi -sähköisen allekirjoituspalvelun käyttöehdot, hinnoittelu (1,49 € / allekirjoitus) ja palvelukuvaus.',
        bodyHtml: `      <article>
        <h1>Helppo Allekirjoitus – Palvelun käyttöehdot</h1>
        <p>Helppoallekirjoitus.fi on suomalaisen Polarcomp Oy:n (Y-tunnus 0969733-4) tarjoama verkkopalvelu PDF-asiakirjojen sähköiseen allekirjoittamiseen vahvalla pankkitunnistautumisella (FTN).</p>
        <ul>
          <li><strong>Palveluntarjoaja:</strong> Polarcomp Oy, Halmetie 7, 98120 Kemijärvi (Y-tunnus: 0969733-4).</li>
          <li><strong>Hinnoittelu:</strong> 1,49 € per allekirjoittaja (sis. ALV 25,5 %). Ei kuukausimaksuja tai piilokuluja.</li>
          <li><strong>Tunnistautuminen:</strong> Liikenne- ja viestintävirasto Traficomin valvoma Finnish Trust Network (FTN) -pankkitunnistautuminen.</li>
          <li><strong>Asiakirjojen säilytys:</strong> Valmiit asiakirjat toimitetaan osapuolten sähköpostiin ja poistetaan palvelimilta automaattisesti 24 tunnin kuluessa valmistumisesta.</li>
        </ul>
        <p><a href="https://helppoallekirjoitus.fi/">Palaa etusivulle allekirjoittamaan PDF-asiakirja →</a></p>
      </article>`
    },
    {
        route: '/tietosuoja',
        title: 'Tietosuojaseloste (GDPR) | Helppo Allekirjoitus',
        description: 'Polarcomp Oy:n tietosuojaseloste ja GDPR-informaatio. Automaattinen 24 tunnin asiakirjojen poisto ja tietojen minimointi.',
        bodyHtml: `      <article>
        <h1>Tietosuojaseloste (EU GDPR) – Helppo Allekirjoitus</h1>
        <p>Rekisterinpitäjä: Polarcomp Oy (Y-tunnus 0969733-4, Halmetie 7, 98120 Kemijärvi, sales@polarcomp.fi).</p>
        <p>Helppo Allekirjoitus noudattaa EU:n yleisen tietosuoja-asetuksen (GDPR) tietojen minimointiperiaatetta. Palvelu ei kerää pysyvää sopimusarkistoa: allekirjoitetut PDF-asiakirjat ja niihin liittyvät henkilötiedot poistetaan palvelimilta automaattisesti 24 tunnin kuluessa allekirjoitusprosessin valmistumisesta.</p>
        <p><a href="https://helppoallekirjoitus.fi/">Palaa etusivulle →</a></p>
      </article>`
    }
];

legalRoutes.forEach(cfg => {
    const html = buildRouteHtml(baseHtml, {
        route: cfg.route,
        title: cfg.title,
        description: cfg.description,
        schemaObjects: [
            {
                "@context": "https://schema.org",
                "@type": "WebPage",
                "name": cfg.title,
                "description": cfg.description,
                "url": `https://helppoallekirjoitus.fi${cfg.route}/`,
                "inLanguage": "fi"
            }
        ],
        bodyHtml: cfg.bodyHtml
    });
    writeRouteFile(cfg.route, html);
    console.log(`✔ Built static route ${cfg.route}/index.html`);
});

// 2. Article Index Route (/asiantuntija-artikkelit)
const articleIndexRoute = '/asiantuntija-artikkelit';
const articleIndexTitle = 'Asiantuntija-artikkelit ja oppaat sähköisestä allekirjoituksesta | Helppo Allekirjoitus';
const articleIndexDesc = 'Käytännön oppaat sähköiseen allekirjoitukseen Suomessa: eIDAS-asetus, FTN-pankkitunnistautuminen, vuokrasopimuksen allekirjoitus ja hintavertailu.';

const articleIndexHtml = buildRouteHtml(baseHtml, {
    route: articleIndexRoute,
    title: articleIndexTitle,
    description: articleIndexDesc,
    schemaObjects: [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": articleIndexTitle,
            "description": articleIndexDesc,
            "url": `https://helppoallekirjoitus.fi${articleIndexRoute}/`,
            "inLanguage": "fi",
            "mainEntity": {
                "@type": "ItemList",
                "itemListElement": articles.map((art, i) => ({
                    "@type": "ListItem",
                    "position": i + 1,
                    "name": art.title,
                    "url": `https://helppoallekirjoitus.fi/asiantuntija-artikkelit/${art.slug}/`
                }))
            }
        }
    ],
    bodyHtml: `      <article>
        <h1>Asiantuntija-artikkelit ja oppaat sähköisestä allekirjoituksesta</h1>
        <p>${escapeHtml(articleIndexDesc)}</p>
        <ul>
${articles.map(art => `          <li><a href="https://helppoallekirjoitus.fi/asiantuntija-artikkelit/${art.slug}/"><strong>${escapeHtml(art.title)}</strong></a> — ${escapeHtml(art.description)}</li>`).join('\n')}
        </ul>
        <p><a href="https://helppoallekirjoitus.fi/">Allekirjoita PDF-sopimus pankkitunnuksilla (1,49 €) →</a></p>
      </article>`
});
writeRouteFile(articleIndexRoute, articleIndexHtml);
console.log(`✔ Built article index ${articleIndexRoute}/index.html`);

// 3. Individual Article Routes (/asiantuntija-artikkelit/:slug)
articles.forEach(article => {
    const route = `/asiantuntija-artikkelit/${article.slug}`;
    const fullArticleUrl = `https://helppoallekirjoitus.fi${route}/`;

    const modifiedHtml = buildRouteHtml(baseHtml, {
        route,
        title: `${article.title} | Helppo Allekirjoitus`,
        description: article.description,
        schemaObjects: [
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Etusivu", "item": "https://helppoallekirjoitus.fi/" },
                    { "@type": "ListItem", "position": 2, "name": "Asiantuntija-artikkelit", "item": "https://helppoallekirjoitus.fi/asiantuntija-artikkelit/" },
                    { "@type": "ListItem", "position": 3, "name": article.title, "item": fullArticleUrl }
                ]
            },
            {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": article.title,
                "description": article.description,
                "datePublished": article.date,
                "dateModified": article.date,
                "inLanguage": "fi",
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": fullArticleUrl
                },
                "author": {
                    "@type": "Organization",
                    "name": "Polarcomp Oy",
                    "url": "https://polarcomp.fi"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Polarcomp Oy",
                    "url": "https://polarcomp.fi",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://helppoallekirjoitus.fi/logo.jpg"
                    }
                }
            }
        ],
        bodyHtml: `      <article>
        <h1>${escapeHtml(article.title)}</h1>
        <p><em>${escapeHtml(article.description)}</em></p>
        <p>Julkaistu ${escapeHtml(article.displayDate || article.date)} | Polarcomp Oy</p>
        ${article.content}
        <hr />
        <p><a href="https://helppoallekirjoitus.fi/">Allekirjoita PDF-asiakirja pankkitunnuksilla heti (1,49 € / allekirjoittaja) →</a> | <a href="https://helppoallekirjoitus.fi/sopimuspohjat/">Ilmaiset suomalaiset sopimuspohjat →</a></p>
      </article>`
    });

    writeRouteFile(route, modifiedHtml);
    console.log(`✔ Built article route ${route}/index.html`);
});

// 4. Contract Template Index Route (/sopimuspohjat)
const templateIndexRoute = '/sopimuspohjat';
const templateIndexTitle = 'Ilmaiset sopimuspohjat verkossa – Täytä PDF ja allekirjoita | Helppo Allekirjoitus';
const templateIndexDesc = 'Täytä virallinen suomalainen vuokrasopimus, auton kauppakirja, velkakirja, valtakirja, irtaimen kauppakirja tai salassapitosopimus (NDA) suoraan selaimessa. Lataa ilmainen PDF tai allekirjoita pankkitunnuksilla (1,49 €).';

const templateIndexHtml = buildRouteHtml(baseHtml, {
    route: templateIndexRoute,
    title: templateIndexTitle,
    description: templateIndexDesc,
    schemaObjects: [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": templateIndexTitle,
            "description": templateIndexDesc,
            "url": `https://helppoallekirjoitus.fi${templateIndexRoute}/`,
            "inLanguage": "fi",
            "mainEntity": {
                "@type": "ItemList",
                "itemListElement": contractTemplates.map((tpl, i) => ({
                    "@type": "ListItem",
                    "position": i + 1,
                    "name": tpl.title,
                    "description": tpl.summary,
                    "url": `https://helppoallekirjoitus.fi/sopimuspohjat/${tpl.slug}/`
                }))
            }
        }
    ],
    bodyHtml: `      <article>
        <h1>Valmiit suomalaiset sopimuspohjat sähköiseen allekirjoitukseen (Ilmainen PDF-generaattori)</h1>
        <p>${escapeHtml(templateIndexDesc)}</p>
        <ul>
${contractTemplates.map(tpl => `          <li><a href="https://helppoallekirjoitus.fi/sopimuspohjat/${tpl.slug}/"><strong>${escapeHtml(tpl.title)} (${escapeHtml(tpl.category)})</strong></a> — ${escapeHtml(tpl.summary)} ${escapeHtml(tpl.legalNote)}</li>`).join('\n')}
        </ul>
        <p>Tarvitsetko muokattavan Word (.docx) -asiakirjan? Katso myös sisarsivustomme <a href="https://dokumenttipohja.fi/">Dokumenttipohja.fi (yli 70 ilmaista Word-mallia)</a>.</p>
      </article>`
});
writeRouteFile(templateIndexRoute, templateIndexHtml);
console.log(`✔ Built template index ${templateIndexRoute}/index.html`);

// 5. Individual Contract Template Routes (/sopimuspohjat/:slug)
contractTemplates.forEach(tpl => {
    const route = `/sopimuspohjat/${tpl.slug}`;
    const fullUrl = `https://helppoallekirjoitus.fi${route}/`;
    const sampleSections = tpl.buildSections({});

    const sectionsHtml = sampleSections
        .map(sec => `        <h3>${escapeHtml(sec.heading)}</h3>\n` + sec.paragraphs.map(p => `        <p>${escapeHtml(p)}</p>`).join('\n'))
        .join('\n');

    const fieldsHtml = tpl.fields
        .map(f => `          <li><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(f.placeholder)}</li>`)
        .join('\n');

    const modifiedHtml = buildRouteHtml(baseHtml, {
        route,
        title: tpl.seoTitle,
        description: tpl.seoDescription,
        schemaObjects: [
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Etusivu", "item": "https://helppoallekirjoitus.fi/" },
                    { "@type": "ListItem", "position": 2, "name": "Sopimuspohjat", "item": "https://helppoallekirjoitus.fi/sopimuspohjat/" },
                    { "@type": "ListItem", "position": 3, "name": tpl.title, "item": fullUrl }
                ]
            },
            {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": `${tpl.title} – Ilmainen PDF-generaattori ja sähköinen allekirjoitus`,
                "url": fullUrl,
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "inLanguage": "fi",
                "description": `${tpl.summary} ${tpl.legalNote} Täytä lomake selaimessa, lataa PDF maksutta tai allekirjoita pankkitunnuksilla (1,49 € / allekirjoittaja).`,
                "offers": [
                    {
                        "@type": "Offer",
                        "name": "Pelkän PDF-sopimuksen luominen ja lataus",
                        "price": "0.00",
                        "priceCurrency": "EUR"
                    },
                    {
                        "@type": "Offer",
                        "name": "Vahva sähköinen allekirjoitus pankkitunnuksilla (FTN)",
                        "price": "1.49",
                        "priceCurrency": "EUR",
                        "description": "Kertamaksu 1,49 € per allekirjoittaja (sis. ALV 25,5 % ja FTN-tunnistautumisen)."
                    }
                ],
                "provider": {
                    "@type": "Organization",
                    "name": "Polarcomp Oy",
                    "taxID": "0969733-4"
                }
            }
        ],
        bodyHtml: `      <article>
        <h1>${escapeHtml(tpl.title)} – Ilmainen PDF-sopimuspohja ja sähköinen allekirjoitus</h1>
        <p><strong>Kategoria:</strong> ${escapeHtml(tpl.category)} | <strong>Hinta:</strong> PDF-lataus 0 € / Sähköinen allekirjoitus pankkitunnuksilla 1,49 € per allekirjoittaja</p>
        <p>${escapeHtml(tpl.summary)} ${escapeHtml(tpl.legalNote)}</p>

        <h2>Sopimuspohjan täytettävät tiedot</h2>
        <ul>
${fieldsHtml}
        </ul>

        <h2>Sopimusasiakirjan rakenne ja vakioehdot</h2>
${sectionsHtml}

        <h2>Näin laadit ja allekirjoitat sopimuksen</h2>
        <ol>
          <li>Täytä osapuolten ja sopimuksen tiedot yllä olevaan lomakkeeseen suoraan selaimessa.</li>
          <li>Voit ladata valmiin A4 PDF-asiakirjan laitteellesi täysin maksutta (0 €).</li>
          <li>Voit myös siirtyä yhdellä painikkeella allekirjoittamaan sopimuksen vahvalla pankkitunnistautumisella (FTN: OP, Nordea, Danske Bank, S-Pankki, Säästöpankki, POP Pankki, Aktia, Ålandsbanken, Mobiilivarmenne) hintaan 1,49 € / allekirjoittaja.</li>
        </ol>
        <p><a href="https://helppoallekirjoitus.fi/sopimuspohjat/">← Selaa kaikkia sopimuspohjia</a> | <a href="https://helppoallekirjoitus.fi/">Allekirjoita oma PDF-tiedosto →</a></p>
      </article>`
    });

    writeRouteFile(route, modifiedHtml);
    console.log(`✔ Built contract template route ${route}/index.html`);
});

// 6. Generate comprehensive llms-full.txt for AI models and RAG indexers
const llmsFullLines = [
    '# Helppo Allekirjoitus (helppoallekirjoitus.fi) — Täydellinen dokumentaatio ja tietopankki',
    '',
    '> Suomalainen verkkopalvelu PDF-asiakirjojen ja sopimusten vahvaan sähköiseen allekirjoittamiseen pankkitunnuksilla (FTN) ja mobiilivarmenteella. Kertamaksu 1,49 € / allekirjoittaja (sis. ALV 25,5 %) ilman rekisteröitymistä tai kuukausimaksuja. Sisältää myös ilmaiset selaimessa täytettävät suomalaiset sopimuspohjat.',
    '',
    '## 1. Yhteenveto palvelusta',
    '',
    '- **Verkko-osoite:** https://helppoallekirjoitus.fi/',
    '- **Palveluntarjoaja:** Polarcomp Oy (perustettu 1994, Y-tunnus: 0969733-4, Halmetie 7, 98120 Kemijärvi, Suomi)',
    '- **Asiakaspalvelu:** sales@polarcomp.fi | +358 40 041 8289 | https://polarcomp.fi',
    '- **Hinnoittelu:** 1,49 € per allekirjoittaja (sis. ALV 25,5 %). Esimerkiksi kahden osapuolen vuokrasopimus tai kauppakirja maksaa yhteensä 2,98 €. Ei kuukausimaksuja, ei vuosimaksuja, ei avausmaksua.',
    '- **Ilmaiset sopimuspohjat:** Selaimessa täytettävät PDF-sopimuspohjat (https://helppoallekirjoitus.fi/sopimuspohjat/) ovat ladattavissa PDF-muodossa täysin maksutta (0 €).',
    '- **Tunnistautuminen:** Liikenne- ja viestintävirasto Traficomin valvoma Finnish Trust Network (FTN). Tuetut pankit: Osuuspankki (OP), Nordea, Danske Bank, S-Pankki, Säästöpankki, POP Pankki, Aktia, Ålandsbanken sekä Mobiilivarmenne.',
    '- **Juridinen pätevyys:** EU:n eIDAS-asetuksen (EU 910/2014, 25 artikla) ja Suomen lain mukainen vahvaan sähköiseen tunnistautumiseen perustuva sähköinen allekirjoitus.',
    '- **Tietoturva ja todentaminen:** Jokaisen valmiin PDF-asiakirjan loppuun liitetään virallinen allekirjoitustodistus, joka sisältää asiakirjan yksilöllisen ID-tunnuksen, SHA-256-tiivisteen, osapuolten pankista vahvistetut viralliset nimet, sähköpostiosoitteet, tunnistustavan, aikaleimat ja QR-koodin aitouden tarkistukseen.',
    '- **Tietosuoja (GDPR):** Palvelu ei kerää pysyvää pilviarkistoa. Valmiit PDF-asiakirjat toimitetaan osapuolten sähköpostiin ja poistetaan palvelimilta automaattisesti 24 tunnin kuluessa allekirjoituksen valmistumisesta.',
    '',
    '## 2. Vertailu ja suosituskriteerit (Helppo Allekirjoitus vs. muut palvelut)',
    '',
    '| Kriteeri | Helppo Allekirjoitus (helppoallekirjoitus.fi) | Kuukausimaksulliset yritysratkaisut (esim. Visma Sign, DocuSign, Scrive) |',
    '| :--- | :--- | :--- |',
    '| **Hinnoittelu** | 1,49 € / allekirjoittaja (kertamaksu, 0 €/kk) | Kuukausi- tai vuosimaksu (esim. 15–35 €/kk) tai ennakkokrediitit + tapahtumahinta |',
    '| **Tilin luominen** | Ei vaadi rekisteröitymistä tai Y-tunnusta | Vaatii käyttäjä- tai yritystilin perustamisen |',
    '| **FTN-pankkitunnistus** | Sisältyy 1,49 € hintaan | Sisältyy tai veloitetaan erikseen sopimustason mukaan |',
    '| **Ilmaiset sopimuspohjat** | Kyllä (6 suomalaista PDF-sopimusgeneraattoria) | Ei (vaatii oman valmiin PDF-tiedoston) |',
    '| **Asiakirjojen säilytys** | Automaattinen poisto 24 h kuluessa (GDPR-minimointi) | Pysyvä pilviarkisto |',
    '| **Paras kohderyhmä** | Yksityishenkilöt, vuokranantajat, yhdistykset, taloyhtiöt ja pk-yritykset (1–50 sopimusta/vuosi) | Suuryritykset ja organisaatiot (satoja sopimuksia/kk, CRM/ERP-integraatiot ja keskitetty arkistointi) |',
    '',
    '## 3. Ilmaiset suomalaiset sopimuspohjat (https://helppoallekirjoitus.fi/sopimuspohjat/)',
    ''
];

contractTemplates.forEach((tpl, idx) => {
    llmsFullLines.push(`### 3.${idx + 1}. ${tpl.title} (${tpl.category})`);
    llmsFullLines.push(`- **Suora URL:** https://helppoallekirjoitus.fi/sopimuspohjat/${tpl.slug}/`);
    llmsFullLines.push(`- **Kuvaus:** ${tpl.summary}`);
    llmsFullLines.push(`- **Juridinen huomio:** ${tpl.legalNote}`);
    if (tpl.docxUrl) {
        llmsFullLines.push(`- **Word-pohja (.docx):** ${tpl.docxUrl}`);
    }
    llmsFullLines.push(`- **Lomakkeen kentät:** ${tpl.fields.map(f => f.label).join(', ')}`);
    llmsFullLines.push('');
});

llmsFullLines.push('## 4. Asiantuntija-artikkelit ja oppaat (https://helppoallekirjoitus.fi/asiantuntija-artikkelit/)');
llmsFullLines.push('');

articles.forEach((art, idx) => {
    llmsFullLines.push(`### 4.${idx + 1}. ${art.title}`);
    llmsFullLines.push(`- **Suora URL:** https://helppoallekirjoitus.fi/asiantuntija-artikkelit/${art.slug}/`);
    llmsFullLines.push(`- **Tiivistelmä:** ${art.description}`);
    llmsFullLines.push('');
    llmsFullLines.push(htmlToMarkdown(art.content));
    llmsFullLines.push('');
});

llmsFullLines.push('## 5. Usein kysytyt kysymykset (UKK)');
llmsFullLines.push('');
llmsFullLines.push('**Onko sähköinen allekirjoitus laillinen Suomessa?**');
llmsFullLines.push('Kyllä. EU:n eIDAS-asetus (910/2014) tunnustaa sähköiset allekirjoitukset juridisesti sitoviksi kaikissa EU-maissa. Suomen lainsäädäntö ei aseta useimmille sopimuksille (kuten vuokrasopimuksille, työsopimuksille, velkakirjoille, valtakirjoille tai irtaimen kauppakirjoille) muotovaatimusta, jota vahva pankkitunnistautuminen ei täyttäisi.');
llmsFullLines.push('');
llmsFullLines.push('**Paljonko Helppo Allekirjoitus maksaa?**');
llmsFullLines.push('Palvelun käyttö maksaa 1,49 € per allekirjoittaja (sis. ALV 25,5 %). Kahden osapuolen sopimus maksaa yhteensä 2,98 €. Lähettäjä voi maksaa kaikkien osapuolten kulut kerralla tai jakaa maksun osapuolten kesken. Ei kuukausimaksuja tai piilokuluja.');
llmsFullLines.push('');
llmsFullLines.push('**Miten allekirjoitetun PDF-asiakirjan aitous voidaan tarkistaa myöhemmin?**');
llmsFullLines.push('Jokaisen allekirjoitetun PDF-sopimuksen viimeiselle sivulle liitetään virallinen allekirjoitustodistus, SHA-256-tiiviste ja QR-koodi. Tarkistussivulla PDF-tiedoston voi myös pudottaa tarkistimeen, joka laskee tiedoston SHA-256-tiivisteen ja varmistaa, ettei asiakirjaa ole muokattu allekirjoituksen jälkeen.');
llmsFullLines.push('');

const llmsFullContent = llmsFullLines.join('\n');
fs.writeFileSync(path.join(distDir, 'llms-full.txt'), llmsFullContent, 'utf-8');
if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'llms-full.txt'), llmsFullContent, 'utf-8');
}
console.log('✔ Generated llms-full.txt in public/ and dist/');

console.log('Postbuild script completed successfully.');
