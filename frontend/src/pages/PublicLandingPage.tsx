import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  LifeBuoy,
  Phone,
  QrCode,
  UserCheck,
} from 'lucide-react';
import { PublicHeader, type PublicNavItem } from '@/components/landing/PublicHeader';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { GuideStepper } from '@/components/landing/GuideStepper';
import { DailyFlowPreview, WeeklyReportPreview } from '@/components/landing/ProductPreviews';
import {
  accentMap,
  designRationale,
  expertVerificationSteps,
  faqs,
  heroHighlights,
  heroStats,
  modules,
  safeguards,
  trustSteps,
} from '@/content/landing';

const navItems: PublicNavItem[] = [
  { label: 'Araçlar', href: '#moduller' },
  { label: 'Nasıl çalışır?', href: '#rehber' },
  { label: 'Güven', href: '#guven' },
  { label: 'Kriz rehberi', href: '/kriz-aninda-ne-yapmali', route: true },
];

export function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      {/* Skip link <main>'in DIŞINDA ve ondan önce olmalı: önceden <main> içinde
          durduğu için kendi kendine atlıyor, yani hiçbir işe yaramıyordu. */}
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
          <div className="pointer-events-none absolute -left-20 -top-20 -z-10 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:py-20 lg:min-h-[640px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-1.5 text-xs font-bold text-primary-800 shadow-sm">
                <HeartHandshake size={15} className="text-primary-700" aria-hidden="true" />
                Aileler ve uzmanlar için güvenli gelişim alanı
              </p>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.35rem]">
                Çocuğunuzun gelişim yolculuğunda <span className="text-primary-700">yalnız değilsiniz.</span>
              </h1>

              <p className="mt-5 max-w-lg text-lg font-medium leading-8 text-slate-700">
                Günlük gelişimi tek yerde takip edin, zor anlarda hazır rehbere ulaşın ve doğrulanmış uzmanlarla
                yalnızca sizin belirlediğiniz kadarını paylaşın.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/kayit"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-0.5 hover:bg-primary-700"
                >
                  Ücretsiz aile hesabı oluştur
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <a
                  href="#rehber"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-primary-200 hover:text-primary-800"
                >
                  Nasıl çalıştığını gör
                </a>
              </div>

              <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                {heroHighlights.map((item) => (
                  <li key={item} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div aria-label="Aile paneli günlük akış önizlemesi" role="img">
              <DailyFlowPreview />
            </div>
          </div>
        </section>

        {/* ── Doğrulanabilir nitelikler ──
            Kanıtlanamayan kullanıcı sayısı/başarı metriği yerine ürünün
            doğrulanabilir özellikleri gösteriliyor. */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-6xl grid-cols-3 gap-3 px-5 py-6">
            {heroStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
                <p className="text-lg font-extrabold text-slate-950 sm:text-2xl">{item.value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Ayırt edici araçlar: acil kart + kriz rehberi ── */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="flex flex-col justify-between rounded-3xl border border-rose-100 bg-rose-50/50 p-6 sm:p-8">
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                    <QrCode size={24} aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-extrabold leading-tight text-slate-950">
                    Acil durum kartı, kelimeler yetmediğinde konuşur.
                  </h2>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
                    Çocuğunuzun iletişim biçimini, hassasiyetlerini, sakinleştiren yöntemleri ve acil iletişim
                    bilgilerini tek bir karta yazın. QR kodu okutan öğretmen, sağlık görevlisi veya bir yabancı,
                    hesap açmadan yalnızca sizin izin verdiğiniz bilgileri görür.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/kayit"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-700"
                  >
                    Kartı oluştur
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </article>

              <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-orange-300">
                    <LifeBuoy size={24} aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-extrabold leading-tight">Zor bir an için üyelik beklenmez.</h2>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-300">
                    Kriz, meltdown ve duyusal aşırı yüklenme anında ne yapmalı, nelerden kaçınmalı — adım adım.
                    Kriz rehberi kayıt olmadan, doğrudan açılır.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/kriz-aninda-ne-yapmali"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    Kriz rehberini aç
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                  <a
                    href="tel:112"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    <Phone size={15} aria-hidden="true" />
                    112
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── Araçlar ── */}
        <section id="moduller" className="border-b border-slate-200 bg-slate-50 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Araçlar</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Dağınık defterler yerine tek panel</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
                Günlük takipten acil durum kartına, BEP hazırlığından topluluk desteğine kadar ihtiyaç duyduğunuz
                araçlar aynı yerde. Kullanmadıklarınız yolunuza çıkmaz.
              </p>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {modules.map(({ icon: Icon, title, text, color }) => {
                const accent = accentMap[color];
                return (
                  <li
                    key={title}
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${accent.border}`}
                  >
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent.iconBg}`}>
                      <Icon size={22} className={accent.iconText} aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-sm font-extrabold text-slate-950 sm:mt-4 sm:text-base">{title}</h3>
                    <p className="mt-1.5 text-xs font-medium leading-5 text-slate-600 sm:text-sm sm:leading-6">{text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── Kontrollü paylaşım / haftalık özet ── */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Kontrollü paylaşım</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
                  Uzman, yalnızca izin verdiğinizi görür.
                </h2>
                <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                  Haftalık özet, dağınık notlarınızı görüşmede kullanılabilir bir çıktıya dönüştürür. Paylaşımı
                  açarken kimin, hangi kayıtları, ne kadar süreyle göreceğini siz belirlersiniz.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Varsayılan olarak hiçbir kayıt paylaşılmaz',
                    'Kapsam ve süre paylaşım anında seçilir',
                    'Verilen yetki tek tuşla geri alınır',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm font-bold text-slate-700">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div aria-label="Uzmanla paylaşılan haftalık özet önizlemesi" role="img">
                <WeeklyReportPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ── Başlangıç rehberi ── */}
        <section id="rehber" className="border-b border-slate-200 bg-slate-50 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
            <GuideStepper />
          </div>
        </section>

        {/* ── Uzmanlar ── */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center">
            <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white">
                  <UserCheck size={24} aria-hidden="true" />
                </span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-extrabold text-emerald-300">
                  Doğrulama süreci
                </span>
              </div>
              <h3 className="mt-8 text-2xl font-extrabold">Güven, görünür bir süreçtir.</h3>
              <ol className="mt-6 space-y-4">
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
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Uzmanlarla çalışma</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
                Doğru bilgi, doğru yetkiyle paylaşılır.
              </h2>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600">
                Doğrulanmış uzman profillerini inceleyin. Görüşme öncesinde yalnızca gerekli kayıtları seçin, erişim
                kapsamını ve süresini siz belirleyin.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/uzmanlar-icin"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  Uzmanlar için sayfa
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link
                  to="/guven-merkezi"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm hover:border-primary-200 hover:text-primary-800"
                >
                  Uzmanları nasıl doğruluyoruz?
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Güven sınırı ── */}
        <section id="guven" className="border-b border-slate-200 bg-white scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Güven sınırı</p>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950">
                  Destek sağlar, tıbbi kararın yerine geçmez.
                </h2>
                <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                  Platform kayıtları düzenler, aile ve uzman iletişimini kolaylaştırır, gelişimi görünür kılar. Bunun
                  ötesinde herhangi bir iddiada bulunmaz.
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-3">
                {safeguards.map(({ icon: Icon, title, text, color }) => {
                  const accent = accentMap[color];
                  return (
                    <li
                      key={title}
                      className={`rounded-2xl border bg-slate-50 p-5 transition-all duration-200 hover:bg-white hover:shadow-md ${accent.border}`}
                    >
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent.iconBg}`}>
                        <Icon size={20} className={accent.iconText} aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-sm font-extrabold text-slate-950">{title}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
                    </li>
                  );
                })}
              </ul>
            </div>

            <ul className="mt-10 grid gap-4 border-t border-slate-100 pt-10 md:grid-cols-3">
              {trustSteps.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span>
                    <h3 className="text-sm font-extrabold text-slate-950">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary-100 bg-primary-50 p-5">
              <div>
                <p className="text-sm font-extrabold text-primary-950">Güvenlik ve veri kontrolü hakkında ayrıntılı bilgi</p>
                <p className="mt-1 text-xs leading-5 text-primary-900">
                  Yetkilendirme, saklama, silme ve uzman doğrulama sürecini açıkça inceleyin.
                </p>
              </div>
              <Link
                to="/guven-merkezi"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-primary-800 shadow-sm ring-1 ring-primary-200 hover:bg-primary-50"
              >
                Güven merkezini aç
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Tasarım gerekçesi ──
            Doğrulanabilir kullanıcı yorumu bulunana kadar atıfsız alıntı yerine
            ürün kararlarının gerekçesi gösteriliyor. */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Tasarım yaklaşımı</p>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Neden böyle çalışıyor?</h2>
              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Ürünü şekillendiren üç temel karar.
              </p>
            </div>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {designRationale.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold leading-snug text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── SSS ── */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.38fr_0.62fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Sık sorulanlar</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950">
                Başlamadan önce merak ettikleriniz
              </h2>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                Daha fazla bilgi için güven merkezini ve kullanım koşullarını inceleyebilirsiniz.
              </p>
            </div>
            <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {faqs.map((item, index) => (
                <details key={item.question} className="group p-5" open={index === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold text-slate-950">
                    {item.question}
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-primary-800 transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pr-10 text-sm font-medium leading-7 text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden bg-primary-700 text-white">
          <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary-200">Hazır olduğunuzda</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">İlk adım: çocuk profilini hazırlayın.</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-primary-50">
                Kısa bir kayıt sonrası temel bilgileri ekleyip günlük akışı kullanmaya başlayabilirsiniz.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/kayit"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-primary-800 shadow-lg transition-colors hover:bg-primary-50"
              >
                Ücretsiz başla
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                to="/giris"
                className="inline-flex h-12 items-center rounded-xl border border-white/40 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Giriş yap
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
