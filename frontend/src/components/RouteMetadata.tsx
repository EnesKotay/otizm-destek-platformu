import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { faqs } from '@/content/landing';

interface PublicMeta {
  title: string;
  description: string;
  index: boolean;
  /**
   * Kanonik adres farklıysa ezme yolu. `/tanitim` ile `/` birebir aynı bileşeni
   * render ettiği için ikisi ayrı ayrı indexlenirse Google açısından duplicate
   * content olur ve sayfa otoritesi bölünür; `/tanitim` kanonik olarak `/`
   * gösterir.
   */
  canonicalPath?: string;
  /** Sayfaya özel paylaşım görseli; verilmezse marka OG görseli kullanılır. */
  image?: string;
}

const DEFAULT_OG_IMAGE = '/og-image.png';

const SHARED_LANDING_META = {
  title: 'Otizm Destek Platformu — Aileler ve uzmanlar için gelişim takibi',
  description:
    'Otizmli çocukların aileleri için güvenli gelişim takibi: günlük kayıt, acil durum kartı, BEP hazırlığı, kriz rehberi ve doğrulanmış uzmanlarla kontrollü paylaşım. Aile hesabı ücretsiz.',
  index: true,
};

const PUBLIC_META: Record<string, PublicMeta> = {
  '/': { ...SHARED_LANDING_META },
  '/tanitim': { ...SHARED_LANDING_META, canonicalPath: '/' },
  '/kriz-aninda-ne-yapmali': {
    title: 'Kriz ve Meltdown Anında Ne Yapmalı? | Otizm Destek',
    description:
      'Otizmli çocukta kriz, meltdown ve duyusal aşırı yüklenme anında adım adım ne yapmalı, nelerden kaçınmalı. Acil numaralar dahil, üyelik gerekmeden erişilebilir rehber.',
    index: true,
  },
  '/uzmanlar-icin': {
    title: 'Uzmanlar İçin | Otizm Destek Platformu',
    description:
      'Danışan takibi, randevu yönetimi ve rapor hazırlığı tek panelde. Ailenin yetki verdiği kayıtlarla görüşmeye hazırlıklı başlayın. Uzman başvurusu ücretsiz.',
    index: true,
  },
  '/kvkk': {
    title: 'KVKK Aydınlatma Metni | Otizm Destek',
    description: 'Kişisel verilerin işlenmesi ve haklarınız hakkında bilgi.',
    index: true,
  },
  '/gizlilik': {
    title: 'Gizlilik Politikası | Otizm Destek',
    description: 'Otizm Destek Platformu gizlilik ve veri koruma politikası.',
    index: true,
  },
  '/kullanim-sartlari': {
    title: 'Kullanım Şartları | Otizm Destek',
    description: 'Platform kullanım şartları ve sorumluluklar.',
    index: true,
  },
  '/tibbi-uyari': {
    title: 'Tıbbi Uyarı | Otizm Destek',
    description: 'Platform bilgilerinin kapsamı ve profesyonel destek uyarısı.',
    index: true,
  },
  '/guven-merkezi': {
    title: 'Güven Merkezi | Otizm Destek',
    description: 'Veri güvenliği, uzman doğrulaması ve kullanıcı kontrolleri hakkında bilgi.',
    index: true,
  },
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

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

/**
 * Rotaya ait yapılandırılmış veriyi tek bir <script> etiketinde tutar.
 * FAQPage şeması SSS bölümünü Google'da zengin sonuç olarak göstermeye uygun
 * hale getirir; Organization/WebSite marka bilgisini netleştirir.
 */
function setJsonLd(data: unknown[]) {
  const id = 'route-structured-data';
  const existing = document.getElementById(id);
  if (data.length === 0) {
    existing?.remove();
    return;
  }
  const script = (existing as HTMLScriptElement | null) ?? document.createElement('script');
  if (!existing) {
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data.length === 1 ? data[0] : data);
}

function buildJsonLd(pathname: string, baseUrl: string): unknown[] {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Otizm Destek Platformu',
    url: `${baseUrl}/`,
    logo: `${baseUrl}/icon-512.png`,
    description:
      'Otizmli çocukların aileleri ve alanda çalışan uzmanlar için gelişim takibi, güvenli paylaşım ve iletişim platformu.',
  };

  if (pathname === '/' || pathname === '/tanitim') {
    return [
      organization,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Otizm Destek Platformu',
        url: `${baseUrl}/`,
        inLanguage: 'tr-TR',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ];
  }

  if (pathname === '/kriz-aninda-ne-yapmali') {
    return [
      organization,
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Kriz ve meltdown anında ne yapmalı?',
        description:
          'Otizmli çocukta kriz, meltdown ve duyusal aşırı yüklenme anında adım adım müdahale rehberi.',
        inLanguage: 'tr-TR',
        isAccessibleForFree: true,
        mainEntityOfPage: `${baseUrl}/kriz-aninda-ne-yapmali`,
        publisher: { '@type': 'Organization', name: 'Otizm Destek Platformu' },
      },
    ];
  }

  return PUBLIC_META[pathname]?.index ? [organization] : [];
}

export function RouteMetadata() {
  const { pathname } = useLocation();
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    const meta = PUBLIC_META[pathname] || {
      title: 'Otizm Destek Platformu',
      description: 'Güvenli gelişim takibi ve aile destek platformu.',
      index: false,
    };

    const baseUrl = (import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '');
    const canonicalUrl = baseUrl + (meta.canonicalPath ?? pathname);
    const imageUrl = baseUrl + (meta.image ?? DEFAULT_OG_IMAGE);

    document.title = meta.title;
    setMeta('description', meta.description);
    setMeta('robots', meta.index ? 'index,follow' : 'noindex,nofollow');

    setMeta('og:title', meta.title, true);
    setMeta('og:description', meta.description, true);
    setMeta('og:type', 'website', true);
    setMeta('og:site_name', 'Otizm Destek Platformu', true);
    setMeta('og:locale', 'tr_TR', true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:image', imageUrl, true);
    setMeta('og:image:width', '1200', true);
    setMeta('og:image:height', '630', true);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', meta.title);
    setMeta('twitter:description', meta.description);
    setMeta('twitter:image', imageUrl);

    setCanonical(canonicalUrl);
    setJsonLd(buildJsonLd(pathname, baseUrl));

    // Odak yalnızca SPA içi rota DEĞİŞİMİNDE başlığa taşınır.
    //
    // İlk yüklemede taşınmamalı: odak h1'e alındığında ilk Tab tuşu h1'den
    // sonraki öğeye atlar ve sayfanın başındaki "Ana içeriğe geç" bağlantısı
    // klavyeyle hiç ulaşılamaz hale gelir. Bayrak yerine önceki yolun
    // karşılaştırılması kullanılıyor; efekt aynı rota için birden fazla kez
    // çalışsa da (StrictMode / yeniden mount) davranış bozulmuyor.
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;

    // Lazy yüklenen rotalarda efekt çalıştığında ekranda henüz Suspense
    // fallback'i vardır ve h1 DOM'a girmemiştir; kısa süre boyunca bekle.
    let frameId = 0;
    let attempts = 0;
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>('main h1, [role="main"] h1, h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        return;
      }
      if (attempts < 60) {
        attempts += 1;
        frameId = requestAnimationFrame(focusHeading);
      }
    };
    frameId = requestAnimationFrame(focusHeading);

    return () => cancelAnimationFrame(frameId);
  }, [pathname]);

  return (
    <span className="sr-only" role="status" aria-live="polite">
      {PUBLIC_META[pathname]?.title || 'Otizm Destek Platformu'}
    </span>
  );
}
