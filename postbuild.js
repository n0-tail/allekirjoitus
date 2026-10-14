import fs from 'node:fs';
import path from 'node:path';
import { articles } from './src/data/articles.ts';

// Non-article static routes
const staticRoutes = [
    { route: '/ehdot', title: 'Käyttöehdot | Helppo Allekirjoitus', description: 'Helppoallekirjoitus.fi -palvelun käyttöehdot.' },
    { route: '/tietosuoja', title: 'Tietosuojaseloste | Helppo Allekirjoitus', description: 'Polarcomp Oy:n tietosuojaseloste ja GDPR-informaatio.' },
    { route: '/asiantuntija-artikkelit', title: 'Asiantuntija-artikkelit | Helppo Allekirjoitus', description: 'Oppaat ja artikkelit sähköisestä allekirjoituksesta, eIDAS-asetuksesta ja FTN-tunnistautumisesta.' },
    { route: '/sopimuspohjat', title: 'Ilmaiset sopimuspohjat verkossa – Täytä PDF ja allekirjoita | Helppo Allekirjoitus', description: 'Täytä suomalainen vuokrasopimus, kauppakirja, velkakirja, valtakirja tai salassapitosopimus selaimessa. Lataa ilmainen PDF tai allekirjoita pankkitunnuksilla (1,49 €).' }
];

const templateRoutes = [
    {
        slug: 'asuinhuoneiston-vuokrasopimus',
        title: 'Asuinhuoneiston vuokrasopimus – Ilmainen pohja & PDF-generaattori | Helppo Allekirjoitus',
        heading: 'Asuinhuoneiston vuokrasopimus (AHVL 481/1995)',
        description: 'Laadi suomalainen asuinhuoneiston vuokrasopimus selaimessa. Lataa valmis PDF ilmaiseksi tai allekirjoita sähköisesti pankkitunnuksilla (1,49 €).'
    },
    {
        slug: 'ajoneuvon-kauppakirja',
        title: 'Ajoneuvon kauppakirja – Ilmainen auton kauppakirjapohja (PDF) | Helppo Allekirjoitus',
        heading: 'Ajoneuvon kauppakirja (auto, moottoripyörä, vene, työkone)',
        description: 'Täytä ajoneuvon tai auton kauppakirja suoraan selaimessa. Lataa virallinen PDF ilmaiseksi tai vahvista kauppa pankkitunnuksilla.'
    },
    {
        slug: 'velkakirja',
        title: 'Velkakirja – Ilmainen velkakirjapohja & PDF-generaattori | Helppo Allekirjoitus',
        heading: 'Velkakirja (velkakirjalaki 622/1947)',
        description: 'Laadi selkeä suomalainen velkakirja yksityishenkilöiden tai yritysten välille. Lataa PDF ilmaiseksi tai allekirjoita pankkitunnuksilla.'
    },
    {
        slug: 'valtakirja',
        title: 'Valtakirja – Ilmainen valtakirjapohja & PDF-generaattori | Helppo Allekirjoitus',
        heading: 'Yksilöity valtakirja asioiden hoitamiseen',
        description: 'Luo virallinen yksilöity valtakirja selaimessa. Lataa valmis PDF-asiakirja ilmaiseksi tai allekirjoita vahvalla pankkitunnistautumisella.'
    },
    {
        slug: 'salassapitosopimus-nda',
        title: 'Salassapitosopimus (NDA) – Ilmainen suomalainen sopimuspohja (PDF) | Helppo Allekirjoitus',
        heading: 'Salassapitosopimus (NDA) yrityksille ja hankkeille',
        description: 'Laadi molemminpuolinen suomalainen salassapitosopimus (NDA) selaimessa. Lataa PDF ilmaiseksi tai allekirjoita pankkitunnuksilla.'
    },
    {
        slug: 'irtaimen-kauppakirja',
        title: 'Irtaimen omaisuuden kauppakirja – Ilmainen pohja (PDF) | Helppo Allekirjoitus',
        heading: 'Irtaimen omaisuuden kauppakirja (kauppalaki 355/1987)',
        description: 'Täytä kauppakirja koneen, laitteen tai muun irtaimen omaisuuden kauppaan. Lataa ilmainen PDF tai allekirjoita sähköisesti verkossa.'
    }
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

    // Inject Article Schema into <head>
    const fullArticleUrl = "https://helppoallekirjoitus.fi" + route + "/";
    const articleJsonLd = `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(article.title)},
    "description": ${JSON.stringify(article.description)},
    "datePublished": ${JSON.stringify(article.date)},
    "dateModified": ${JSON.stringify(article.date)},
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": ${JSON.stringify(fullArticleUrl)}
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
  </script>
</head>`;
    modifiedHtml = modifiedHtml.replace('</head>', articleJsonLd);

    // Build article-specific sr-only content block
    const articleSrOnly = `
    <!-- Article sr-only content injected by postbuild -->
    <div class="sr-only" data-nosnippet>
      <article>
        <h1>${article.title}</h1>
        <p><em>${article.description}</em></p>
        <p>Julkaistu: ${article.date} | Polarcomp Oy</p>
        ${article.content}
        <p><a href="https://helppoallekirjoitus.fi/">Allekirjoita sopimus heti (1,49 €) →</a></p>
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

// For contract template routes: inject SEO metadata and sr-only description
templateRoutes.forEach(tmpl => {
    const route = `/sopimuspohjat/${tmpl.slug}`;
    const routeDir = path.join(distDir, route);

    if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
    }

    let modifiedHtml = updateSeoTags(baseHtml, {
        route,
        title: tmpl.title,
        description: tmpl.description
    });

    const tmplSrOnly = `
    <!-- Template sr-only content injected by postbuild -->
    <div class="sr-only" data-nosnippet>
      <article>
        <h1>${tmpl.heading}</h1>
        <p>${tmpl.description}</p>
        <p>Asiakirja luodaan suoraan selaimessasi. Voit ladata valmiin PDF-tiedoston veloituksetta omalle laitteellesi tai siirtyä yhdellä painikkeella vahvaan pankkitunnistautumiseen (FTN, 1,49 € / allekirjoittaja).</p>
        <p><a href="https://helppoallekirjoitus.fi/sopimuspohjat/">Selaa kaikkia sopimuspohjia</a> | <a href="https://dokumenttipohja.fi/">Dokumenttipohja.fi (Word-pohjat)</a></p>
      </article>
    </div>
    <!-- End template sr-only content -->`;

    modifiedHtml = modifiedHtml.replace(
        SR_ONLY_MARKER,
        SR_ONLY_MARKER + tmplSrOnly
    );

    const destFile = path.join(routeDir, 'index.html');
    fs.writeFileSync(destFile, modifiedHtml, 'utf-8');
    console.log(`✔ Injected template SEO metadata into ${route}/index.html`);
});

console.log('Postbuild script completed successfully.');
