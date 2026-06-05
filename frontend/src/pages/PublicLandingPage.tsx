import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Baby,
  Brain,
  CalendarCheck,
  CheckCircle2,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  TrendingUp,
  Clock,
  BookOpen,
  Zap,
  Heart,
  ChevronRight,
} from 'lucide-react';


const journey = [
  {
    step: '01',
    icon: Baby,
    title: 'Çocuk Profili Oluştur',
    detail: 'Yaş, tanı bilgisi, terapi hedefleri ve hassasiyetler tek güvenli profilde toplanır.',
    color: 'bg-blue-50 text-blue-700',
    border: 'border-blue-100',
  },
  {
    step: '02',
    icon: Brain,
    title: 'Günlük Destek Planı Al',
    detail: 'Duygu, uyku, ilaç ve notlara göre kısa, uygulanabilir günlük akış önerilir.',
    color: 'bg-violet-50 text-violet-700',
    border: 'border-violet-100',
  },
  {
    step: '03',
    icon: CalendarCheck,
    title: 'Randevu ve Takip',
    detail: 'Uzman görüşmeleri, takvim ve gelişim notları aile ritmine göre düzenlenir.',
    color: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-100',
  },
  {
    step: '04',
    icon: Users,
    title: 'Aile ve Uzman Ağı',
    detail: 'Benzer aileler, onaylı uzmanlar ve güvenli mesajlaşma aynı platformda birleşir.',
    color: 'bg-amber-50 text-amber-700',
    border: 'border-amber-100',
  },
];

const features = [
  {
    icon: Zap,
    title: 'Günlük Akış',
    detail: 'Çocuğunuzun durumuna göre kişiselleştirilmiş günlük egzersiz ve aktivite önerileri.',
  },
  {
    icon: BookOpen,
    title: 'Gelişim Takibi',
    detail: 'Haftalık ve aylık gelişim raporları, hedef ilerleme grafikleri ve uzman notları.',
  },
  {
    icon: TrendingUp,
    title: 'BEP Oluşturucu',
    detail: 'Bireysel Eğitim Planı hazırlamak için rehberli şablonlar ve uzman desteği.',
  },
  {
    icon: Clock,
    title: 'Kriz Rehberi',
    detail: 'Zor anlarda anında erişilebilir kılavuzlar ve uzman acil destek hattı.',
  },
  {
    icon: Heart,
    title: 'Aile Refahı',
    detail: 'Yalnız olmadığınızı hissettiren benzer ailelerle bağlantı ve destek duvarı.',
  },
  {
    icon: MessageCircle,
    title: 'Güvenli Mesajlaşma',
    detail: 'Uzmanlarınızla şifreli, kayıt altında ve KVKK uyumlu doğrudan iletişim.',
  },
];


const trust = [
  'KVKK ve gizlilik metinleri görünür',
  'Uzman profillerinde doğrulama rozeti',
  'Çocuk verisi için kontrollü paylaşım',
  'Tıbbi karar yerine destekleyici takip',
];

export function PublicLandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link to="/tanitim" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <HeartHandshake size={20} />
            </span>
            <span>
              <span className="block text-sm font-extrabold leading-tight">Otizm Destek</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-600">Gelişim Platformu</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <a href="#akis" className="hover:text-primary-700 transition-colors">Nasıl Çalışır</a>
            <a href="#ozellikler" className="hover:text-primary-700 transition-colors">Özellikler</a>
            <a href="#guven" className="hover:text-primary-700 transition-colors">Güven</a>
            <a href="#uzman" className="hover:text-primary-700 transition-colors">Uzmanlar</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/giris"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Giriş
            </Link>
            <Link
              to="/kayit"
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-700 shadow-sm"
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-violet-50/30">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-primary-200/20 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-violet-200/15 blur-3xl" />
        </div>
        <div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1fr_1fr] relative">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-4 py-1.5 text-xs font-bold text-primary-700 shadow-sm">
              <Sparkles size={14} />
              Aile, uzman ve günlük takip aynı yerde
            </div>
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl leading-[1.08]">
                Otizm yolculuğunda{' '}
                <span className="text-primary-600">güçlü bir rehber</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Çocuğunuzun gelişimini düzenli takip edin, uzmanlarla güvenli iletişim kurun ve her gün uygulanabilir küçük adımlarla ilerleyin.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/kayit"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5"
              >
                Ücretsiz Başla
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/kayit/uzman"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                Uzman Başvurusu
                <ChevronRight size={16} className="text-slate-400" />
              </Link>
            </div>
            <div className="grid max-w-lg gap-2.5 sm:grid-cols-2">
              {trust.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Hero Card */}
          <div className="relative">
            <div className="absolute -top-4 -right-4 w-64 h-64 rounded-full bg-primary-100/40 blur-2xl pointer-events-none" />
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/50 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bugünkü Özet</p>
                    <h2 className="mt-0.5 text-base font-extrabold text-slate-950">Sade destek akışı hazır</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Güvenli
                  </span>
                </div>
              </div>
              <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-lg font-black text-white shadow-sm">
                      A
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-950">Aktif çocuk profili</p>
                      <p className="text-xs text-slate-500">8 yaş · iletişim odağı</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {[
                      { label: 'Duygu kaydı tamam', color: 'bg-emerald-500' },
                      { label: 'İlaç kontrolü yapıldı', color: 'bg-emerald-500' },
                      { label: 'Uzman notu bekliyor', color: 'bg-amber-400' },
                    ].map(({ label, color }) => (
                      <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                        <span className="text-sm font-semibold text-slate-700">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">3 Kısa Adım</p>
                  <div className="mt-3.5 space-y-2.5">
                    {[
                      { title: 'Duyusal hazırlık', duration: '4 dk' },
                      { title: 'İki seçenekle iletişim', duration: '5 dk' },
                      { title: 'Sıra alma oyunu', duration: '6 dk' },
                    ].map(({ title, duration }, index) => (
                      <div
                        key={title}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm hover:border-primary-100 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-black text-primary-700">
                            {index + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{title}</span>
                        </div>
                        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
                          {duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="akis" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Nasıl Çalışır</p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Kayıttan günlük takibe dört adım</h2>
            <p className="mt-4 text-base text-slate-600">
              Kayıt olun, profilinizi oluşturun ve aile rutininize uygun destek planını dakikalar içinde kullanmaya başlayın.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {journey.map(({ step, icon: Icon, title, detail, color, border }) => (
              <div
                key={title}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${border}`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                    <Icon size={22} />
                  </div>
                  <span className="text-3xl font-black text-slate-100">{step}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ozellikler" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Platform Özellikleri</p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Aile ve uzman için tasarlandı</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, detail }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all hover:-translate-y-0.5 hover:border-primary-100 hover:bg-white hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-primary-700 shadow-sm group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-sm font-extrabold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="guven" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Güven & Gizlilik</p>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-950">
                Aile verisi hassastır; kontrol ailede kalır.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Çocuğunuzla ilgili her bilgi yalnızca sizin belirlediğiniz kişilerle paylaşılır. Hiçbir zaman reklam veya üçüncü taraflarla paylaşılmaz.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { Icon: ShieldCheck, title: 'KVKK ve Gizlilik', to: '/kvkk', desc: 'Veri politikasını okuyun ve haklarınızı bilin.' },
                { Icon: BadgeCheck, title: 'Uzman Doğrulama', to: '/uzmanlar', desc: 'Tüm uzmanlar kimlik ve belge doğrulamasından geçer.' },
                { Icon: MessageCircle, title: 'Güvenli İletişim', to: '/gizlilik', desc: 'Şifreli mesajlaşma ve kayıt altında iletişim.' },
              ].map(({ Icon, title, to, desc }) => (
                <Link
                  key={title}
                  to={to}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md hover:bg-white group"
                >
                  <Icon size={24} className="text-primary-700" />
                  <p className="mt-4 text-sm font-extrabold text-slate-950">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary-600 group-hover:gap-2 transition-all">
                    Detaylar <ChevronRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="uzman" className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary-600/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 py-16 text-center">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary-300">Hazır olduğunuzda</p>
          <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
            İlk profili oluşturun veya<br /> uzman ağını keşfedin.
          </h2>
          <p className="mt-4 text-base text-slate-400 max-w-lg mx-auto">
            Kayıt tamamen ücretsizdir. Kredi kartı gerekmez. İstediğiniz zaman çıkabilirsiniz.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/kayit"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-slate-900 transition-all hover:bg-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Aile hesabı aç
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/kayit/uzman"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 px-7 text-sm font-bold text-white transition-all hover:bg-white/10"
            >
              Uzman başvurusu
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Zaten hesabınız var mı?{' '}
            <Link to="/giris" className="text-primary-400 hover:text-primary-300 font-bold">
              Giriş yapın →
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
                  <HeartHandshake size={18} />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Otizm Destek</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Gelişim Platformu</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-6 text-slate-500">
                Otizm yolculuğundaki aileleri ve uzmanları güvenle buluşturan platform.
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">Platform</p>
              <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
                <li><a href="#akis" className="hover:text-primary-700">Nasıl Çalışır</a></li>
                <li><a href="#ozellikler" className="hover:text-primary-700">Özellikler</a></li>
                <li><a href="#guven" className="hover:text-primary-700">Güven</a></li>
                <li><Link to="/uzmanlar" className="hover:text-primary-700">Uzmanlar</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">Hesap</p>
              <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
                <li><Link to="/kayit" className="hover:text-primary-700">Kayıt Ol</Link></li>
                <li><Link to="/giris" className="hover:text-primary-700">Giriş Yap</Link></li>
                <li><Link to="/kayit/uzman" className="hover:text-primary-700">Uzman Başvurusu</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">Yasal</p>
              <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
                <li><Link to="/kvkk" className="hover:text-primary-700">KVKK</Link></li>
                <li><Link to="/gizlilik" className="hover:text-primary-700">Gizlilik Politikası</Link></li>
                <li><Link to="/kullanim-kosullari" className="hover:text-primary-700">Kullanım Koşulları</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <p>© 2025 Otizm Destek. Tüm hakları saklıdır.</p>
            <p>Türkiye'de sevgiyle geliştirildi 🇹🇷</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
