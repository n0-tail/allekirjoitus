import fs from 'node:fs';
import path from 'node:path';

// Define the static routes to generate index.html for
const routes = [
    '/ehdot',
    '/tietosuoja',
    '/asiantuntija-artikkelit',
    '/asiantuntija-artikkelit/mika-on-sahkoinen-allekirjoitus',
    '/asiantuntija-artikkelit/sahkoinen-allekirjoitus-vuokrasopimukseen',
    '/asiantuntija-artikkelit/sahkoinen-allekirjoitus-hintavertailu'
];

const distDir = path.join(process.cwd(), 'dist');
const indexFile = path.join(distDir, 'index.html');

console.log('Running postbuild script to generate static HTML fallbacks...');

if (!fs.existsSync(indexFile)) {
    console.error(`Error: index.html not found in ${distDir}`);
    process.exit(1);
}

// Ensure the 404.html is built as well
fs.copyFileSync(indexFile, path.join(distDir, '404.html'));
console.log('✔ Copied index.html to 404.html');

routes.forEach(route => {
    const routeDir = path.join(distDir, route);

    if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
    }

    const destFile = path.join(routeDir, 'index.html');
    fs.copyFileSync(indexFile, destFile);
    console.log(`✔ Copied index.html to ${route}/index.html`);
});

console.log('Postbuild script completed successfully.');
