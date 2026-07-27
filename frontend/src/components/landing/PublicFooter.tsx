import { Link } from 'react-router-dom';
import { LifeBuoy, Mail, Phone } from 'lucide-react';
import { BrandMark } from '@/components/landing/PublicHeader';

/**
 * İletişim adresi env üzerinden yapılandırılır. Varsayılan değer kullanılacaksa
 * bu kutunun gerçekten okunan bir posta kutusuna düşmesi gerekir — aksi halde
 * kullanıcılar boşluğa yazar ve güven kaybı yaşanır.
 */
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'destek@otizmdestek.com';

const legalLinks = [
  { to: '/kvkk', label: 'KVKK' },
  { to: '/gizlilik', label: 'Gizlilik' },
  { to: '/kullanim-sartlari', label: 'Kullanım Şartları' },
  { to: '/tibbi-uyari', label: 'Tıbbi Uyarı' },
  { to: '/guven-merkezi', label: 'Güven Merkezi' },
];

const platformLinks = [
  { to: '/', label: 'Ana sayfa' },
  { to: '/kriz-aninda-ne-yapmali', label: 'Kriz rehberi' },
  { to: '/uzmanlar-icin', label: 'Uzmanlar için' },
  { to: '/kayit', label: 'Ücretsiz kayıt' },
  { to: '/giris', label: 'Giriş yap' },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="text-sm font-extrabold text-slate-950">Otizm Destek</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary-700">Gelişim Platformu</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              Aile ve uzman iletişimini, günlük takibi ve gelişim kaydını tek çatı altında toplar.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary-700 hover:text-primary-800"
            >
              <Mail size={16} aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </div>

          <nav aria-label="Platform bağlantıları">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Platform</h2>
            <ul className="mt-4 space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Yasal bağlantılar">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Yasal</h2>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Acil durum uyarısı footer'da kalıcı: sayfanın neresinde olursa olsun
            kullanıcı tıbbi acil durumda nereye başvuracağını görebilmeli. */}
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-rose-900">
            <LifeBuoy size={18} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
            Bu platform tıbbi tanı veya acil yardım hizmeti değildir. Hayati tehlike durumunda 112'yi arayın.
          </p>
          <a
            href="tel:112"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition-colors hover:bg-rose-700"
          >
            <Phone size={15} aria-hidden="true" />
            112'yi ara
          </a>
        </div>

        <p className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Otizm Destek Platformu. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
