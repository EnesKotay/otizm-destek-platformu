import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  HeartHandshake,
  Layers,
  LineChart,
  LockKeyhole,
  Menu,
  MessageCircle,
  NotebookTabs,
  Share2,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';

const guideSteps = [
  {
    icon: UserCheck,
    screen: 'Kayıt',
    title: 'Hesabınızı seçin',
    intro: 'Aile hesabı günlük takip için, uzman hesabı danışan yönetimi için kullanılır.',
    tasks: ['Rolünüzü seçin', 'Temel hesap bilgilerini girin', 'Giriş yaptıktan sonra başlangıç ekranına geçin'],
    result: 'Platform size rolünüze uygun menüleri gösterir.',
  },
  {
    icon: Baby,
    screen: 'Çocuklarım',
    title: 'Çocuk profilini oluşturun',
    intro: 'Tüm günlük kayıtlar, randevular, notlar ve uzman paylaşımları bu profile bağlanır.',
    tasks: ['Temel bilgileri ekleyin', 'İletişim düzeyi ve hassasiyetleri yazın', 'Terapi ve okul notlarını tamamlayın'],
    result: 'Dağınık bilgiler tek güvenli profilde toplanır.',
  },
  {
    icon: NotebookTabs,
    screen: 'Günlük takip',
    title: 'Kısa gözlemler ekleyin',
    intro: 'Her gün uzun rapor yazmak zorunda değilsiniz; küçük ama düzenli kayıtlar yeterlidir.',
    tasks: ['Duygu, uyku veya ilaç durumunu işaretleyin', 'Önemli davranış veya beslenme notu girin', 'O gün işe yarayan şeyi kısa yazın'],
    result: 'Uzman görüşmelerine net ve güncel bilgiyle gidersiniz.',
  },
  {
    icon: CalendarCheck,
    screen: 'Takvim',
    title: 'Randevu ve görevleri planlayın',
    intro: 'Seanslar, ev çalışmaları ve hatırlatmalar aynı takvimde görünür.',
    tasks: ['Seans tarihini ekleyin', 'Ev çalışmasını görev olarak yazın', 'Yaklaşan işleri ana sayfadan kontrol edin'],
    result: 'Aile rutini ve uzman planı karışmadan ilerler.',
  },
  {
    icon: MessageCircle,
    screen: 'Uzmanlar ve mesajlar',
    title: 'Uzmanla güvenli iletişim kurun',
    intro: 'Gerektiğinde uzman bulun, mesaj gönderin veya randevu talebi oluşturun.',
    tasks: ['Uygun uzmanı inceleyin', 'Bağlantı veya randevu talebi gönderin', 'Sadece gerekli bilgileri paylaşın'],
    result: 'Uzman yalnızca yetkili olduğu bilgiler üzerinden takip yapar.',
  },
  {
    icon: TrendingUp,
    screen: 'Gelişim paneli',
    title: 'İlerlemeyi birlikte görün',
    intro: 'Kayıtlar zamanla anlamlı hale gelir; tekrar eden zorlanmalar ve küçük gelişmeler görünür olur.',
    tasks: ['Haftalık özeti inceleyin', 'Tekrar eden konuları fark edin', 'Bir sonraki görüşmeye not hazırlayın'],
    result: 'Takip, tahmine değil düzenli veriye dayanır.',
  },
];

type ModuleColor = 'blue' | 'violet' | 'emerald' | 'orange' | 'indigo' | 'teal';

const colorMap: Record<ModuleColor, { iconBg: string; iconText: string; border: string }> = {
  blue:    { iconBg: 'bg-blue-50',    iconText: 'text-blue-600',    border: 'border-blue-100 hover:border-blue-300 hover:shadow-blue-50' },
  violet:  { iconBg: 'bg-violet-50',  iconText: 'text-violet-600',  border: 'border-violet-100 hover:border-violet-300 hover:shadow-violet-50' },
  emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', border: 'border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-50' },
  orange:  { iconBg: 'bg-orange-50',  iconText: 'text-orange-600',  border: 'border-orange-100 hover:border-orange-300 hover:shadow-orange-50' },
  indigo:  { iconBg: 'bg-indigo-50',  iconText: 'text-indigo-600',  border: 'border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-50' },
  teal:    { iconBg: 'bg-teal-50',    iconText: 'text-teal-600',    border: 'border-teal-100 hover:border-teal-300 hover:shadow-teal-50' },
};

const modules: { icon: React.ElementType; title: string; text: string; color: ModuleColor }[] = [
  { icon: Baby,         title: 'Çocuk profili',  text: 'Temel bilgiler ve hassasiyetler',       color: 'blue' },
  { icon: NotebookTabs, title: 'Günlük takip',   text: 'Duygu, uyku, davranış ve notlar',       color: 'violet' },
  { icon: CalendarCheck,title: 'Takvim',         text: 'Randevu, görev ve hatırlatma',           color: 'emerald' },
  { icon: MessageCircle,title: 'Mesajlar',       text: 'Aile ve uzman iletişimi',                color: 'orange' },
  { icon: BookOpen,     title: 'Rehberler',      text: 'Kriz, haklar ve pratik içerikler',       color: 'indigo' },
  { icon: TrendingUp,   title: 'Gelişim paneli', text: 'Özetler ve ilerleme görünümü',           color: 'teal' },
];

const platformFeatures = [
  {
    icon: Layers,
    title: 'Dağınıklık biter',
    description: 'Farklı defterler, WhatsApp mesajları ve hafıza yerine her şey tek, düzenli bir profilde.',
    color: 'blue' as ModuleColor,
  },
  {
    icon: LineChart,
    title: 'Takip netleşir',
    description: 'Günlük küçük kayıtlar zamanla örüntülere dönüşür; uzman görüşmesine hazır gidersiniz.',
    color: 'emerald' as ModuleColor,
  },
  {
    icon: Share2,
    title: 'İletişim kolaylaşır',
    description: 'Aile ve uzman aynı bağlamı paylaşır; her seferinde sıfırdan anlatmak gerekmez.',
    color: 'violet' as ModuleColor,
  },
];

const safeguards = [
  {
    icon: ShieldCheck,
    title: 'Kontrollü paylaşım',
    text: 'Çocuk bilgileri hesap bazlı tutulur; uzman erişimi yetkilendirme ile ilerler.',
    color: 'emerald' as ModuleColor,
  },
  {
    icon: LockKeyhole,
    title: 'Rol bazlı kullanım',
    text: 'Aile, uzman ve admin ekranları birbirinden ayrıdır.',
    color: 'blue' as ModuleColor,
  },
  {
    icon: Stethoscope,
    title: 'Tıbbi karar değildir',
    text: 'Platform takip ve iletişim desteği sağlar; tanı veya tedavi yerine geçmez.',
    color: 'violet' as ModuleColor,
  },
];

function BrandMark() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
      <HeartHandshake size={20} />
    </span>
  );
}

export function PublicLandingPage() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeStep = guideSteps[activeStepIndex];
  const ActiveIcon = activeStep.icon;
  const progress = ((activeStepIndex + 1) / guideSteps.length) * 100;

  const goPrevious = () => setActiveStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => setActiveStepIndex((i) => Math.min(guideSteps.length - 1, i + 1));

  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link to="/tanitim" className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold leading-tight">Otizm Destek</span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-widest text-primary-600">Gelişim Platformu</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
            <a href="#rehber"  className="transition-colors hover:text-primary-700">Rehber</a>
            <a href="#moduller" className="transition-colors hover:text-primary-700">Modüller</a>
            <a href="#guven"   className="transition-colors hover:text-primary-700">Güven</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link to="/giris" className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex sm:px-4">
              Giriş
            </Link>
            <Link to="/kayit" className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700 sm:px-4">
              Ücretsiz Başla
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menüyü aç/kapat"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-5 py-4 lg:hidden">
            <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700">
              <a href="#rehber"   className="hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>Rehber</a>
              <a href="#moduller" className="hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>Modüller</a>
              <a href="#guven"    className="hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>Güven</a>
              <Link to="/giris"  className="hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>Giriş yap</Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="rehber" className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-primary-50/40">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary-100/50 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-blue-50/70 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-1.5 text-xs font-bold text-primary-700 shadow-sm">
              <CheckCircle2 size={14} />
              Başlamak için aşağı kaydırmanız gerekmez
            </div>

            <h1 className="mt-7 text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Adım adım ne yapacağınızı gösteren{' '}
              <span className="text-primary-600">otizm destek</span> platformu
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Çocuk profili, günlük kayıt, randevu, uzman iletişimi ve gelişim takibi tek düzenli akışta birleşir.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/kayit"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary-700"
              >
                Aile hesabı aç
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/kayit/uzman"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Uzman başvurusu
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Platform özellikleri şeridi */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              {[
                '✓ Ücretsiz başlayın',
                '✓ KVKK uyumlu',
                '✓ 10+ modül',
              ].map((item) => (
                <span key={item} className="text-sm font-semibold text-slate-500">{item}</span>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['1', 'Profil oluştur'],
                ['2', 'Günlük takip et'],
                ['3', 'Uzmanla paylaş'],
              ].map(([number, label]) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-black text-primary-700">
                    {number}
                  </span>
                  <span className="text-sm font-extrabold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Step Guide Card ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 ring-1 ring-slate-100">
            <div className="border-b border-slate-100 bg-gradient-to-r from-white to-primary-50/30 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Başlangıç planı</p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-950">Platformda sırayla ne yapacağım?</h2>
                </div>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {activeStepIndex + 1}/{guideSteps.length}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 border-b border-slate-100">
              {guideSteps.map((step, index) => {
                const isActive = activeStepIndex === index;
                const isDone = index < activeStepIndex;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setActiveStepIndex(index)}
                    className={`relative h-14 border-r border-slate-100 text-sm font-black transition-colors last:border-r-0 ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-primary-700'
                    }`}
                    aria-label={`${index + 1}. adım: ${step.title}`}
                  >
                    {isDone ? <CheckCircle2 size={15} className="mx-auto" /> : index + 1}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-4 ring-primary-50/60">
                  <ActiveIcon size={25} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{activeStep.screen}</p>
                  <h3 className="mt-1 text-2xl font-extrabold leading-tight text-slate-950">{activeStep.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{activeStep.intro}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Bu adımda</p>
                <div className="mt-3 grid gap-3">
                  {activeStep.tasks.map((task) => (
                    <div key={task} className="flex items-start gap-3 text-sm font-bold leading-6 text-slate-700">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                      {task}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-gradient-to-r from-primary-50 to-slate-50 px-4 py-3 text-sm font-extrabold leading-6 text-slate-800 ring-1 ring-primary-100/50">
                {activeStep.result}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={activeStepIndex === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft size={16} />
                  Önceki
                </button>
                {activeStepIndex === guideSteps.length - 1 ? (
                  <Link
                    to="/kayit"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
                  >
                    Kayıt ol
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
                  >
                    Sonraki adım
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Neden bu platform? ── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-primary-700">Platform avantajları</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Neden bu platform?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Otizm destek sürecindeki en yaygın üç zorluğu doğrudan çözmek için tasarlandı.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {platformFeatures.map(({ icon: Icon, title, description, color }) => {
              const c = colorMap[color];
              return (
                <div
                  key={title}
                  className={`group rounded-2xl border bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${c.border}`}
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.iconBg}`}>
                    <Icon size={24} className={c.iconText} />
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Modüller ── */}
      <section id="moduller" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-700">Platform modülleri</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Her ekranın görevi net</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Kullanıcı hangi sayfaya neden girdiğini anlar; kayıt, planlama, iletişim ve takip birbirine bağlı çalışır.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, text, color }) => {
              const c = colorMap[color];
              return (
                <div
                  key={title}
                  className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${c.border}`}
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${c.iconBg}`}>
                    <Icon size={22} className={c.iconText} />
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Güven sınırı ── */}
      <section id="guven" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-700">Güven sınırı</p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950">
                Destek sağlar, tıbbi kararın yerine geçmez.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Platform kayıtları düzenler, aile ve uzman iletişimini kolaylaştırır, gelişimi görünür kılar. Bunun ötesinde herhangi bir iddiada bulunmaz.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {safeguards.map(({ icon: Icon, title, text, color }) => {
                const c = colorMap[color];
                return (
                  <div
                    key={title}
                    className={`rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${c.border}`}
                  >
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg}`}>
                      <Icon size={20} className={c.iconText} />
                    </div>
                    <h3 className="mt-4 text-sm font-extrabold text-slate-950">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary-200">Hazır olduğunuzda</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">İlk adım: hesabınızı açın.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-primary-100">
              Ücretsiz, kurulum gerektirmeden, hemen başlayın.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/kayit"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-primary-700 shadow-lg transition-colors hover:bg-primary-50"
            >
              Ücretsiz başla
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/giris"
              className="inline-flex h-12 items-center rounded-xl border border-white/30 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Giriş yap
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="text-sm font-extrabold text-slate-950">Otizm Destek</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Gelişim Platformu</p>
              </div>
            </div>
            <p className="max-w-xs text-xs leading-5 text-slate-500">
              Aile ve uzman iletişimini, günlük takibi ve gelişim kaydını tek çatı altında toplar.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
              <Link to="/kvkk"               className="transition-colors hover:text-primary-700">KVKK</Link>
              <Link to="/gizlilik"           className="transition-colors hover:text-primary-700">Gizlilik</Link>
              <Link to="/kullanim-sartlari"  className="transition-colors hover:text-primary-700">Kullanım Şartları</Link>
              <Link to="/tibbi-uyari"        className="transition-colors hover:text-primary-700">Tıbbi Uyarı</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Otizm Destek Platformu. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </main>
  );
}
