import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_META: Record<string, { title: string; description: string; index: boolean }> = {
  '/': { title: 'Otizm Destek Platformu', description: 'Otizmli çocukların aileleri için gelişim takibi, bilgi ve uzman desteği.', index: true },
  '/tanitim': { title: 'Platformu Tanıyın | Otizm Destek', description: 'Otizm Destek Platformu özelliklerini ve ailelere sunduğu araçları keşfedin.', index: true },
  '/kvkk': { title: 'KVKK Aydınlatma Metni | Otizm Destek', description: 'Kişisel verilerin işlenmesi ve haklarınız hakkında bilgi.', index: true },
  '/gizlilik': { title: 'Gizlilik Politikası | Otizm Destek', description: 'Otizm Destek Platformu gizlilik ve veri koruma politikası.', index: true },
  '/kullanim-sartlari': { title: 'Kullanım Şartları | Otizm Destek', description: 'Platform kullanım şartları ve sorumluluklar.', index: true },
  '/tibbi-uyari': { title: 'Tıbbi Uyarı | Otizm Destek', description: 'Platform bilgilerinin kapsamı ve profesyonel destek uyarısı.', index: true },
};

function setMeta(name: string, content: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(property ? 'property' : 'name', name);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = PUBLIC_META[pathname] || {
      title: 'Otizm Destek Platformu',
      description: 'Güvenli gelişim takibi ve aile destek platformu.',
      index: false,
    };
    document.title = meta.title;
    setMeta('description', meta.description);
    setMeta('robots', meta.index ? 'index,follow' : 'noindex,nofollow');
    setMeta('og:title', meta.title, true);
    setMeta('og:description', meta.description, true);
    setMeta('og:type', 'website', true);

    const baseUrl = (import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '');
    const canonicalUrl = baseUrl + pathname;
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    setMeta('og:url', canonicalUrl, true);

    window.setTimeout(() => {
      const heading = document.querySelector<HTMLElement>('main h1, [role="main"] h1, h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }, 0);
  }, [pathname]);

  return <span className="sr-only" role="status" aria-live="polite">{PUBLIC_META[pathname]?.title || 'Otizm Destek Platformu'}</span>;
}
