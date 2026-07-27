import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicHeader, type PublicNavItem } from '@/components/landing/PublicHeader';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { CrisisGuideContent } from '@/pages/CrisisGuidePage';

const navItems: PublicNavItem[] = [
  { label: 'Ana sayfa', href: '/', route: true },
  { label: 'Uzmanlar için', href: '/uzmanlar-icin', route: true },
  { label: 'Güven merkezi', href: '/guven-merkezi', route: true },
];

/**
 * Kriz rehberinin üyelik gerektirmeyen sürümü.
 *
 * Bilinçli olarak giriş duvarının dışında: bu içeriği arayan kişi çoğunlukla
 * zor bir anın ortasında ve arama motorundan geliyor; kayıt ekranıyla
 * karşılaşmamalı. Aynı zamanda platformun organik olarak bulunabildiği tek
 * gerçek giriş kapısı.
 */
export function PublicCrisisGuidePage() {
  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-950">
      <a
        href="#ana-icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-primary-800 focus:shadow-lg"
      >
        Ana içeriğe geç
      </a>

      <PublicHeader navItems={navItems} />

      <main id="ana-icerik">
        <CrisisGuideContent />

        <section className="mx-auto max-w-4xl px-4 pb-12">
          <div className="flex flex-col gap-4 rounded-3xl border border-primary-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-xl font-extrabold leading-snug text-slate-950">
                Tetikleyicileri kaydedin, tekrarı azaltın.
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600">
                Krizin ne zaman, nerede ve hangi durumdan sonra yaşandığını kaydettiğinizde tekrar eden örüntüler
                görünür hale gelir. Ücretsiz aile hesabıyla günlük takibi başlatabilirsiniz.
              </p>
            </div>
            <Link
              to="/kayit"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              Ücretsiz başla
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
