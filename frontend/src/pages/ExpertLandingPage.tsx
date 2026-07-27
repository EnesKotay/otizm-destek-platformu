import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, UserCheck } from 'lucide-react';
import { PublicHeader, type PublicNavItem } from '@/components/landing/PublicHeader';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { WeeklyReportPreview } from '@/components/landing/ProductPreviews';
import { expertBenefits, expertVerificationSteps } from '@/content/landing';

const navItems: PublicNavItem[] = [
  { label: 'Ana sayfa', href: '/', route: true },
  { label: 'Kriz rehberi', href: '/kriz-aninda-ne-yapmali', route: true },
  { label: 'Güven merkezi', href: '/guven-merkezi', route: true },
];

/**
 * Uzmanlara ayrı bir giriş sayfası: ana landing'in neredeyse tamamı aile
 * diliyle yazılı olduğu için uzman tarafı orada ortada kaybolan tek bir
 * bağlantıya sıkışıyordu.
 */
export function ExpertLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <a
        href="#ana-icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-primary-800 focus:shadow-lg"
      >
        Ana içeriğe geç
      </a>

      <PublicHeader navItems={navItems} />

      <main id="ana-icerik">
        {/* ── Hero ── */}
        <section className="relative isolate overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-white to-primary-50/70">
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-1.5 text-xs font-bold text-primary-800 shadow-sm">
                <UserCheck size={15} className="text-primary-700" aria-hidden="true" />
                Uzmanlar için
              </p>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl">
                Seansa, ailenin gerçek haftasını bilerek başlayın.
              </h1>

              <p className="mt-5 text-lg font-medium leading-8 text-slate-700">
                Danışan takibi, randevu yönetimi ve rapor hazırlığı tek panelde. Ailenin yetki verdiği günlük
                kayıtlar görüşmeden önce derli toplu şekilde önünüzde olur.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/kayit/uzman"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-0.5 hover:bg-primary-700"
                >
                  Uzman olarak başvur
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link
                  to="/giris"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-primary-200 hover:text-primary-800"
                >
                  Hesabım var
                </Link>
              </div>

              <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                {['Başvuru ücretsiz', 'Doğrulanmış profil rozeti', 'Yetki dışına erişim yok'].map((item) => (
                  <li key={item} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div aria-label="Uzmanla paylaşılan haftalık özet önizlemesi" role="img">
              <WeeklyReportPreview />
            </div>
          </div>
        </section>

        {/* ── Faydalar ── */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Panelde ne var?</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Takip, hatırlamaya bağlı kalmasın</h2>
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {expertBenefits.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Doğrulama ── */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Başvuru süreci</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950">
                Doğrulama, ailelerin size güvenmesinin nedeni.
              </h2>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600">
                Doğrulanmamış hesaplar aile verisine erişemez. Belge incelemesi tamamlandığında profilinizde onay
                rozeti görünür ve aileler size bağlantı talebi gönderebilir.
              </p>
              <Link
                to="/kayit/uzman"
                className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                Başvuruyu başlat
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white">
                  <ShieldCheck size={24} aria-hidden="true" />
                </span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-extrabold text-emerald-300">
                  Doğrulama süreci
                </span>
              </div>
              <ol className="mt-8 space-y-4">
                {expertVerificationSteps.map((item, index) => (
                  <li key={item} className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-extrabold">
                      {index + 1}
                    </span>
                    <p className="text-sm font-bold text-slate-100">{item}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-primary-700 text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-extrabold sm:text-4xl">Danışanlarınızı tek panelde toplayın.</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-primary-50">
                Başvurunuzu oluşturun, belge doğrulaması tamamlandığında paneliniz aktif olsun.
              </p>
            </div>
            <Link
              to="/kayit/uzman"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-primary-800 shadow-lg transition-colors hover:bg-primary-50"
            >
              Uzman olarak başvur
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
