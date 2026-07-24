import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Baby,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  HeartHandshake,
  LockKeyhole,
  Menu,
  MessageCircle,
  NotebookTabs,
  Quote,
  Settings2,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
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

const heroStats = [
  { value: '3 dk', label: 'ilk kayıt' },
  { value: '6 adım', label: 'başlangıç planı' },
  { value: 'Ücretsiz', label: 'aile hesabı' },
];

const experiences = [
  {
    quote: 'Görüşme öncesi ne anlatacağımı düşünmek yerine haftalık özeti açıyorum. Küçük değişimleri daha net görebiliyoruz.',
    name: 'Aile kullanıcısı',
    context: 'Günlük takip ve gelişim özeti',
  },
  {
    quote: 'Ailenin yalnızca paylaşmak istediği kayıtları görmek, görüşmeye daha hazırlıklı başlamamı sağlıyor.',
    name: 'Uzman kullanıcısı',
    context: 'Yetkili veri paylaşımı',
  },
];

const faqs = [
  {
    question: 'Aile hesabı gerçekten ücretsiz mi?',
    answer: 'Evet. Aile hesabını ücretsiz oluşturabilir, çocuk profili ve temel takip araçlarını kullanmaya başlayabilirsiniz.',
  },
  {
    question: 'Uzmanlar nasıl doğrulanıyor?',
    answer: 'Uzmanların kimlik, diploma ve mesleki yetkinlik bilgileri incelenir. Onay durumu profilde açıkça gösterilir.',
  },
  {
    question: 'Çocuğumun bilgilerini kimler görebilir?',
    answer: 'Bilgileriniz varsayılan olarak hesabınıza özeldir. Bir uzman ancak sizin verdiğiniz kapsam ve süre içindeki yetkiyle ilgili kayıtlara erişebilir.',
  },
  {
    question: 'Platform tanı veya tedavi öneriyor mu?',
    answer: 'Hayır. Platform takip, düzenleme ve iletişim desteği sağlar; tanı, acil yardım veya tıbbi karar mekanizması değildir.',
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

const trustSteps = [
  { icon: Eye, title: 'Ne paylaştığınızı görün', text: 'Uzman erişimleri Ayarlar içinden görüntülenir ve yönetilir.' },
  { icon: Settings2, title: 'Yetkiyi siz yönetin', text: 'Paylaşım iznini ihtiyaç değiştiğinde geri çekebilirsiniz.' },
  { icon: Database, title: 'Verinizi taşıyın veya silin', text: 'Hesap verisi dışa aktarma ve hesap silme talepleri kullanıcı kontrolündedir.' },
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
    <main id="ana-icerik" className="min-h-screen bg-white text-slate-950">
      <a
        href="#ana-icerik"
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-white px-4 py-2 font-bold text-primary-700 shadow-lg focus:not-sr-only"
      >
        Ana içeriğe geç
      </a>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link to="/tanitim" className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold leading-tight">Otizm Destek</span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-widest text-primary-600">Gelişim Platformu</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex">
            <a href="#rehber" className="transition-colors hover:text-primary-700">Nasıl çalışır?</a>
            <a href="#moduller" className="transition-colors hover:text-primary-700">Araçlar</a>
            <a href="#guven" className="transition-colors hover:text-primary-700">Güven</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link to="/giris" className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:inline-flex sm:px-4">
              Giriş
            </Link>
            <Link to="/kayit" className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition-colors hover:bg-primary-700 sm:px-4">
              Ücretsiz başla
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
              <a href="#rehber"   className="hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>Nasıl çalışır?</a>
              <a href="#moduller" className="hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>Araçlar</a>
              <a href="#guven"    className="hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>Güven</a>
              <Link to="/giris"  className="hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>Giriş yap</Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-white to-primary-50/70">
        <div className="pointer-events-none absolute -left-20 -top-20 -z-10 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:py-20 lg:min-h-[640px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-1.5 text-xs font-bold text-primary-700 shadow-sm">
              <HeartHandshake size={15} className="text-primary-600" />
              Aileler ve uzmanlar için güvenli gelişim alanı
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.35rem]">
              Çocuğunuzun gelişim yolculuğunda <span className="text-primary-600">yalnız değilsiniz.</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg font-medium leading-8 text-slate-700">
              Ailelerle deneyim paylaşın, doğrulanmış uzmanlara ulaşın ve gelişimi güvenle, tek bir yerde takip edin.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/kayit"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-0.5 hover:bg-primary-700"
              >
                Ücretsiz aile hesabı oluştur
                <ArrowRight size={16} />
              </Link>
              <a
                href="#rehber"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-primary-200 hover:text-primary-700"
              >
                Nasıl çalıştığını gör
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              {['Ücretsiz aile hesabı', 'Kontrollü paylaşım', 'İstediğiniz zaman çıkış'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl" aria-label="Otizm Destek aile paneli önizlemesi">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary-200/60 to-indigo-200/60 blur-2xl" />
            <div className="overflow-hidden rounded-[1.75rem] border border-white bg-white p-3 shadow-2xl shadow-primary-900/15">
              <div className="rounded-2xl bg-slate-50 p-4 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Bugün</p>
                    <p className="mt-1 text-lg font-black text-slate-950">Birlikte küçük adımlar</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">2 kayıt tamam</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><NotebookTabs size={20} /></span>
                    <p className="mt-3 text-xs font-bold text-slate-500">Günlük gözlem</p>
                    <p className="mt-1 text-sm font-black text-slate-900">Sakin ve iletişime açık</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CalendarCheck size={20} /></span>
                    <p className="mt-3 text-xs font-bold text-slate-500">Sıradaki görüşme</p>
                    <p className="mt-1 text-sm font-black text-slate-900">Yarın, 14:30</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-primary-600 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-black"><TrendingUp size={18} /> Haftalık gelişim</p>
                    <span className="text-xs font-bold text-primary-100">7 gün</span>
                  </div>
                  <div className="mt-5 flex h-20 items-end gap-2" aria-hidden="true">
                    {[38, 54, 48, 68, 63, 82, 76].map((height, index) => (
                      <span key={index} className="flex-1 rounded-t-md bg-white/75" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-xl sm:-left-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><ShieldCheck size={18} /></span>
              <span><span className="block text-xs font-black text-slate-900">Paylaşım sizde</span><span className="block text-[11px] font-semibold text-slate-500">Yetkiyi dilediğiniz an yönetin</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ürün önizlemesi ── */}
      <section id="urun" className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-700">Ürünün içinde</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                Günün önemli bilgisi tek bakışta.
              </h2>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                Bu önizleme, aile ana sayfasındaki gerçek bilgi mimarisini gösterir: önce bugün yapılacaklar, sonra kısa kayıt ve haftalık ilerleme.
              </p>
              <ul className="mt-6 space-y-3">
                {['Bir dakikalık günlük kayıt', 'Yaklaşan görev ve randevular', 'Uzmanla paylaşılabilen haftalık özet'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={17} className="shrink-0 text-emerald-600" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 p-3 shadow-2xl shadow-slate-200/70" aria-label="Aile paneli ürün önizlemesi">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Bugünün özeti</p>
                    <p className="mt-1 text-lg font-black text-slate-950">Merhaba, bugün 3 küçük adım var</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">1/3 tamam</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: NotebookTabs, label: 'Duygu kaydı', value: 'Tamamlandı', tone: 'bg-emerald-50 text-emerald-700' },
                    { icon: Clock3, label: 'Ev çalışması', value: '17:30', tone: 'bg-orange-50 text-orange-700' },
                    { icon: CalendarCheck, label: 'Uzman görüşmesi', value: 'Yarın', tone: 'bg-blue-50 text-blue-700' },
                  ].map(({ icon: Icon, label, value, tone }) => (
                    <div key={label} className="rounded-2xl border border-slate-100 p-4">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={18} /></span>
                      <p className="mt-3 text-xs font-bold text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-black text-indigo-950"><BarChart3 size={18} /> Haftalık ilerleme</div>
                    <span className="text-xs font-bold text-indigo-700">5 kayıt</span>
                  </div>
                  <div className="mt-4 flex h-20 items-end gap-2" aria-hidden="true">
                    {[42, 64, 50, 78, 68, 88, 74].map((height, index) => (
                      <span key={index} className="flex-1 rounded-t-md bg-indigo-500/80" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Başlangıç rehberi ── */}
      <section id="rehber" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 pt-12 sm:pt-16">
          <div className="grid grid-cols-3 gap-3">
            {heroStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
                <p className="text-lg font-black text-slate-950 sm:text-2xl">{item.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:py-14 lg:grid-cols-[0.44fr_0.56fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-widest text-primary-700">Başlangıç planı</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              İlk gününüzü 6 küçük adıma böldük.
            </h2>
            <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
              Kayıt olduktan sonra hangi ekrana gideceğinizi düşünmeniz gerekmez. Platform önce temel bilgiyi toplar, sonra günlük akışı sadeleştirir.
            </p>
            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:block">
              {guideSteps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveStepIndex(index)}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition-all last:border-b-0 ${
                    activeStepIndex === index
                      ? 'bg-primary-50 text-primary-900'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                    activeStepIndex === index ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold leading-tight">{step.title}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{step.screen}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{activeStep.screen}</p>
                  <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950">{activeStep.title}</h3>
                </div>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {activeStepIndex + 1}/{guideSteps.length}
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm ring-1 ring-primary-100">
                  <ActiveIcon size={25} />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-7 text-slate-700">{activeStep.intro}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Bu adımda</p>
                <div className="mt-3 grid gap-3">
                  {activeStep.tasks.map((task) => (
                    <div key={task} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm font-bold leading-6 text-slate-700">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                      {task}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-primary-50 px-4 py-3 text-sm font-extrabold leading-6 text-primary-900 ring-1 ring-primary-100">
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

      {/* ── Modüller ── */}
      <section id="moduller" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-700">Araçlar</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Temel işler tek yerde</h2>
            </div>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
              Kullanıcı önce profil, bugünün kaydı, randevu ve mesajlaşmaya yönlenir; ihtiyaç oldukça detay modüller açılır.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, text, color }) => {
              const c = colorMap[color];
              return (
                <div
                  key={title}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${c.border}`}
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${c.iconBg}`}>
                    <Icon size={22} className={c.iconText} />
                  </div>
                  <h3 className="mt-3 text-sm font-black text-slate-950 sm:mt-4 sm:text-base">{title}</h3>
                  <p className="mt-1.5 text-xs font-medium leading-5 text-slate-600 sm:text-sm sm:leading-6">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Uzmanlar ── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center">
          <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white"><UserCheck size={24} /></span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">Doğrulama süreci</span>
            </div>
            <h3 className="mt-8 text-2xl font-black">Güven, görünür bir süreçtir.</h3>
            <div className="mt-6 space-y-4">
              {['Kimlik ve iletişim bilgileri kontrol edilir', 'Diploma ve uzmanlık belgeleri incelenir', 'Onay durumu uzman profilinde gösterilir'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-black">{index + 1}</span>
                  <p className="text-sm font-bold text-slate-100">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary-700">Uzmanlarla çalışma</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">Doğru bilgi, doğru yetkiyle paylaşılır.</h2>
            <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600">
              Doğrulanmış uzman profillerini inceleyin. Görüşme öncesinde yalnızca gerekli kayıtları seçin, erişim kapsamını ve süresini siz belirleyin.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/kayit/uzman" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm hover:border-primary-200 hover:text-primary-700">
                Uzman olarak başvur <ArrowRight size={16} />
              </Link>
              <Link to="/guven-merkezi" className="inline-flex h-11 items-center gap-2 px-2 text-sm font-bold text-primary-700 hover:text-primary-800">
                Uzmanları nasıl doğruluyoruz?
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Güven sınırı ── */}
      <section id="guven" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-700">Güven sınırı</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950">
                Destek sağlar, tıbbi kararın yerine geçmez.
              </h2>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                Platform kayıtları düzenler, aile ve uzman iletişimini kolaylaştırır, gelişimi görünür kılar. Bunun ötesinde herhangi bir iddiada bulunmaz.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {safeguards.map(({ icon: Icon, title, text, color }) => {
                const c = colorMap[color];
                return (
                  <div
                    key={title}
                    className={`rounded-2xl border bg-slate-50 p-5 transition-all duration-200 hover:bg-white hover:shadow-md ${c.border}`}
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
          <div className="mt-10 grid gap-4 border-t border-slate-100 pt-10 md:grid-cols-3">
            {trustSteps.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm"><Icon size={19} /></span>
                <div><h3 className="text-sm font-black text-slate-950">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{text}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary-100 bg-primary-50 p-5">
            <div>
              <p className="text-sm font-black text-primary-950">Güvenlik ve veri kontrolü hakkında ayrıntılı bilgi</p>
              <p className="mt-1 text-xs leading-5 text-primary-800">Yetkilendirme, saklama, silme ve uzman doğrulama sürecini açıkça inceleyin.</p>
            </div>
            <Link to="/guven-merkezi" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-primary-700 shadow-sm ring-1 ring-primary-200 hover:bg-primary-50">
              Güven merkezini aç <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Deneyimler ── */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-widest text-primary-700">Kullanıcı deneyimi</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">Takibi kolaylaştıran küçük farklar</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">Platformu kullanan aile ve uzmanların en çok değer verdiği deneyimler.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {experiences.map((item) => (
              <figure key={item.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <Quote size={24} className="text-primary-500" aria-hidden="true" />
                <blockquote className="mt-5 text-lg font-bold leading-8 text-slate-800">“{item.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700"><Users size={18} /></span>
                  <span><span className="block text-sm font-black text-slate-950">{item.name}</span><span className="block text-xs font-semibold text-slate-500">{item.context}</span></span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── SSS ── */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.38fr_0.62fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary-700">Sık sorulanlar</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950">Başlamadan önce merak ettikleriniz</h2>
            <p className="mt-4 text-sm font-medium leading-7 text-slate-600">Daha fazla bilgi için güven merkezini ve kullanım koşullarını inceleyebilirsiniz.</p>
          </div>
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {faqs.map((item, index) => (
              <details key={item.question} className="group p-5" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-slate-950">
                  {item.question}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-primary-700 transition-transform group-open:rotate-45">+</span>
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
            <p className="text-xs font-black uppercase tracking-widest text-primary-200">Hazır olduğunuzda</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">İlk adım: çocuk profilini hazırlayın.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-primary-100">
              Kısa bir kayıt sonrası temel bilgileri ekleyip günlük akışı kullanmaya başlayabilirsiniz.
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
              <Link to="/guven-merkezi"      className="transition-colors hover:text-primary-700">Güven Merkezi</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} Otizm Destek Platformu. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </main>
  );
}
