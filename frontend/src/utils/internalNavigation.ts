const SAFE_INTERNAL_PATHS = [
  '/anasayfa', '/cocuklarim', '/tedavi', '/notlar', '/takvim', '/mesajlar',
  '/gruplar', '/forum', '/topluluk', '/dertlesme-duvari', '/benzer-aileler',
  '/ayarlar', '/bildirimler', '/bilgi-bankasi', '/uzmanlar', '/randevular',
  '/danisanlarim', '/bep-raporu', '/gunluk-takip', '/gelisim-paneli',
  '/kriz-rehberi', '/gorevler', '/rutinler', '/acil-kart',
  '/kullanici-rehberi', '/yardim', '/bulusmalar', '/haftalik-soru',
  '/profil', '/admin',
] as const;

export function safeInternalPath(value?: string | null, fallback = '/bildirimler') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    const isKnownPath = SAFE_INTERNAL_PATHS.some(
      path => url.pathname === path || url.pathname.startsWith(`${path}/`),
    );
    return isKnownPath ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
