import fs from 'node:fs';
import path from 'node:path';
import { articles } from './src/data/articles.ts';

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
