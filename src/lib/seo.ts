export interface SeoMetaOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  noindex?: boolean;
}

const SITE_ORIGIN = 'https://helppoallekirjoitus.fi';

function setMetaContent(selector: string, attrName: 'name' | 'property', attrValue: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function updateSeoMeta({ title, description, canonicalPath = '/', noindex = false }: SeoMetaOptions) {
  document.title = title;

  setMetaContent('meta[name="description"]', 'name', 'description', description);
  setMetaContent('meta[property="og:title"]', 'property', 'og:title', title);
  setMetaContent('meta[property="og:description"]', 'property', 'og:description', description);
  setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMetaContent('meta[name="twitter:description"]', 'name', 'twitter:description', description);

  const normalizedPath =
    canonicalPath === '/' || canonicalPath === ''
      ? '/'
      : `${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`.replace(/\/?$/, '/');

  const fullUrl = `${SITE_ORIGIN}${normalizedPath}`;

  const canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonicalEl) {
    canonicalEl.setAttribute('href', fullUrl);
  }

  const hreflangEl = document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="fi"]');
  if (hreflangEl) {
    hreflangEl.setAttribute('href', fullUrl);
  }

  setMetaContent('meta[property="og:url"]', 'property', 'og:url', fullUrl);
  setMetaContent('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
}
