import { useState, useRef, useEffect } from 'react';
import {
  HelpCircle, ChevronDown, ChevronUp, Mail, MessageCircle,
  BookOpen, Users, Calendar, Baby, ShieldCheck, Star,
  CheckCircle, ArrowRight, Search, Flag, X, Zap,
  Phone, Video, Clock, TrendingUp, Heart, Award,
  ChevronRight, Bot,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ─── Data ────────────────────────────────────────────────────────────────────

const PLATFORM_STATS = [
  { label: 'Aile', value: '5.200+', icon: Heart, color: 'text-rose-500' },
  { label: 'Uzman', value: '200+', icon: Award, color: 'text-amber-500' },
  { label: 'Cevaplanan Soru', value: '12.000+', icon: CheckCircle, color: 'text-emerald-500' },
  { label: 'Memnuniyet', value: '98%', icon: TrendingUp, color: 'text-blue-500' },
];

const QUICK_LINKS = [
  { icon: Baby, label: 'Çocuk Profili', desc: 'Ekle & düzenle', to: '/cocuklarim', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: Calendar, label: 'Randevu Al', desc: 'Uzman bul & planla', to: '/uzmanlar', color: 'bg-green-50 text-green-600 border-green-100' },
  { icon: Users, label: 'Gruplara Katıl', desc: 'Topluluk & destek', to: '/gruplar', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { icon: BookOpen, label: 'Bilgi Bankası', desc: 'Makaleler & rehber', to: '/bilgi-bankasi', color: 'bg-orange-50 text-orange-600 border-orange-100' },
];

const FIRST_WEEK_STEPS = [
  {
    icon: Baby,
    color: 'bg-blue-100 text-blue-600',
    title: 'Çocuk profili oluşturun',
    desc: '"Çocuklarım" sayfasına gidin, "Yeni Çocuk Ekle" butonuna tıklayın ve temel bilgileri doldurun. Doğum tarihi, tanı bilgisi ve notları girebilirsiniz.',
    to: '/cocuklarim',
    time: '~3 dk',
  },
  {
    icon: Calendar,
    color: 'bg-green-100 text-green-600',
    title: 'İlk randevunuzu planlayın',
    desc: '"Uzmanlar" sayfasından uzmanlık alanına göre filtreleyerek bir uzman bulun, profiline tıklayın ve "Randevu Al" butonuyla uygun bir saat seçin.',
    to: '/uzmanlar',
    time: '~5 dk',
  },
  {
    icon: Users,
    color: 'bg-purple-100 text-purple-600',
    title: 'Bir gruba katılın',
    desc: '"Gruplar" sayfasında çocuğunuzun durumuna benzer grupları keşfedin. Katıldıktan sonra grup içi canlı sohbet panelini kullanabilirsiniz.',
    to: '/gruplar',
    time: '~2 dk',
  },
  {
    icon: BookOpen,
    color: 'bg-orange-100 text-orange-600',
    title: 'Bilgi Bankası\'nı keşfedin',
    desc: 'Uzmanlar tarafından yazılmış otizm, terapi yöntemleri ve erken müdahale hakkında rehber makaleleri okuyun.',
    to: '/bilgi-bankasi',
    time: '~5 dk',
  },
  {
    icon: ShieldCheck,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Ayarlarınızı kişiselleştirin',
    desc: '"Ayarlar" sayfasında bildirim tercihlerinizi ve erişilebilirlik seçeneklerinizi (büyük yazı, sakin mod, yüksek kontrast) yapılandırın.',
    to: '/ayarlar',
    time: '~2 dk',
  },
];

interface FaqItem { q: string; a: string }
interface FaqCategory {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: FaqItem[];
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    label: 'Genel Kullanım',
    icon: HelpCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    items: [
      {
        q: 'Platforma nasıl kayıt olabilirim?',
        a: 'Ana ekrandaki "Kayıt Ol" butonuna tıklayın, e-posta adresinizi ve şifrenizi girin. Doğrulama e-postasını onayladıktan sonra çocuk profili oluşturma rehberi sizi karşılayacak.',
      },
      {
        q: 'Şifremi unuttum, ne yapmalıyım?',
        a: 'Giriş sayfasındaki "Şifremi Unuttum" bağlantısına tıklayın, kayıtlı e-posta adresinizi girin. Birkaç dakika içinde şifre sıfırlama bağlantısı gelecektir.',
      },
      {
        q: 'Birden fazla çocuk profili açabilir miyim?',
        a: 'Evet, "Çocuklarım" sayfasından istediğiniz kadar çocuk profili oluşturabilirsiniz. Her çocuk için ayrı takvim, not ve gelişim takibi yapılır.',
      },
      {
        q: 'Platform ücretsiz mi?',
        a: 'Temel özellikler (çocuk profili, grup sohbeti, forum, bilgi bankası) tamamen ücretsizdir. Uzman randevuları ve bazı premium içerikler ücretli olabilir.',
      },
    ],
  },
  {
    label: 'Uzmanlar',
    icon: Star,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    items: [
      {
        q: 'Uzmanların doğrulaması nasıl yapılıyor?',
        a: 'Uzmanlar platforma başvururken lisans belgesi, diploma ve kurum bilgilerini yükler. Moderasyon ekibimiz bu belgeleri inceleyerek "Onaylı Uzman" rozetini verir.',
      },
      {
        q: 'Uzman değerlendirmesi yapabilir miyim?',
        a: 'Evet, uzmanla en az bir randevunuz olduktan sonra "Uzmanlar" sayfasından profili açıp yıldız puanı ve yorum bırakabilirsiniz. Tüm yorumlar anonimdir.',
      },
      {
        q: 'Bir uzmanı nasıl şikayet ederim?',
        a: 'Uzman profil sayfasının altındaki "Şikayet Et" butonuna tıklayın, nedeninizi seçin ve isteğe bağlı açıklama ekleyin. Şikayetiniz moderasyon ekibine iletilir ve gizli tutulur.',
      },
      {
        q: 'Uzman olarak nasıl başvurabilirim?',
        a: '"Uzmanlar" sayfasındaki "Siz de uzman mısınız?" alanından ya da kayıt ekranındaki "Uzman Olarak Kayıt Ol" seçeneğinden başvurabilirsiniz. Lisans belgelerinizi yükleyin, ekibimiz en geç 48 saatte inceler.',
      },
    ],
  },
  {
    label: 'Gruplar ve Sohbet',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    items: [
      {
        q: 'Grup sohbeti nasıl kullanılır?',
        a: '"Gruplar" sayfasında üye olduğunuz bir grubun kartındaki "Sohbet" butonuna tıklayın. Sayfa sağ tarafında canlı grup sohbet paneli açılır. Enter ile mesaj gönderebilir, Shift+Enter ile yeni satır ekleyebilirsiniz.',
      },
      {
        q: 'Bir grup nasıl oluşturabilirim?',
        a: '"Gruplar" sayfasındaki "Grup Oluştur" butonuna tıklayın. Grup adı, açıklama ve kategori belirleyin. Oluşturduğunuz grup otomatik olarak "Gruplarım" sekmesinde görünür.',
      },
      {
        q: 'Gruptan nasıl ayrılabilirim?',
        a: '"Gruplarım" sekmesinde ilgili grup kartındaki "Ayrıl" butonuna tıklayın. Grup mesaj geçmişiniz silinmez.',
      },
      {
        q: 'Direkt mesaj nasıl gönderebilirim?',
        a: '"Mesajlar" sayfasından yeni sohbet başlatabilir ya da bir uzman profilindeki "Mesaj" butonu ile direkt konuşma açabilirsiniz.',
      },
    ],
  },
  {
    label: 'Erişilebilirlik',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    items: [
      {
        q: 'Yazıları büyütebilir miyim?',
        a: '"Ayarlar" sayfasının "Erişilebilirlik" bölümünde "Büyük yazı modu"nu açın. Tüm metin boyutları anında büyür ve tercih tarayıcıda kalıcı olarak kaydedilir.',
      },
      {
        q: 'Animasyonları kapatmak mümkün mü?',
        a: 'Evet, "Ayarlar > Erişilebilirlik > Animasyonları azalt" seçeneğiyle tüm geçiş efektleri ve animasyonlar devre dışı bırakılır.',
      },
      {
        q: '"Sakin mod" ne işe yarar?',
        a: 'Sakin mod ekrandaki renk yoğunluğunu azaltır ve göz yorgunluğunu azaltmaya yardımcı olur. Duyusal hassasiyeti olan kullanıcılar için tasarlanmıştır.',
      },
      {
        q: 'Platform klavye ile kullanılabilir mi?',
        a: 'Evet. "Ayarlar > Erişilebilirlik > Klavye odak göstergesi"ni açtığınızda Tab tuşuyla gezerken her odaklanan element belirgin biçimde çerçevelenir.',
      },
    ],
  },
  {
    label: 'Gizlilik ve Güvenlik',
    icon: Flag,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    items: [
      {
        q: 'Verilerim güvende mi?',
        a: 'Tüm verileriniz şifrelenmiş bağlantı üzerinden iletilir ve KVKK kapsamında korunur. "Ayarlar" sayfasından verilerinizi indirebilir veya hesabınızı kalıcı olarak silebilirsiniz.',
      },
      {
        q: 'Bir içeriği nasıl raporlayabilirim?',
        a: 'Forum gönderileri, uzman profilleri ve grup içerikleri için "Şikayet Et" seçeneğini kullanın. Tüm raporlar moderasyon ekibine iletilir ve 24 saat içinde incelenir.',
      },
      {
        q: 'Hesabımı nasıl silebilirim?',
        a: '"Ayarlar > KVKK ve Gizlilik > Hesabımı Sil" seçeneğine tıklayın ve "SİL" yazarak onaylayın. Bu işlem geri alınamaz; tüm verileriniz kalıcı olarak silinir.',
      },
    ],
  },
];

const POPULAR_QUESTIONS = [
  'Uzman doğrulaması nasıl yapılıyor?',
  'Birden fazla çocuk profili açabilir miyim?',
  'Platform ücretsiz mi?',
  'Hesabımı nasıl silebilirim?',
];

// ─── Highlight helper ─────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── AccordionItem ────────────────────────────────────────────────────────────

function AccordionItem({ item, search }: { item: FaqItem; search: string }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) setHeight(open ? contentRef.current.scrollHeight : 0);
  }, [open]);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${open ? 'border-primary-200 shadow-sm' : 'border-gray-100'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${open ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'}`}
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-gray-800 pr-4">
          <Highlight text={item.q} query={search} />
        </span>
        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${open ? 'bg-primary-100 text-primary-600 rotate-0' : 'bg-gray-100 text-gray-400'}`}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>
      <div
        style={{ height, overflow: 'hidden', transition: 'height 0.25s ease' }}
      >
        <div ref={contentRef} className="px-4 pb-4 pt-3 bg-primary-50/40 text-sm text-gray-600 leading-relaxed border-t border-primary-100">
          <Highlight text={item.a} query={search} />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HelpPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalizedSearch = search.toLowerCase().trim();

  const filteredCategories = FAQ_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(
      item =>
        !normalizedSearch ||
        item.q.toLowerCase().includes(normalizedSearch) ||
        item.a.toLowerCase().includes(normalizedSearch)
    ),
  })).filter(cat => cat.items.length > 0);

  const visibleCategories = activeCategory
    ? filteredCategories.filter(c => c.label === activeCategory)
    : filteredCategories;

  const totalResults = filteredCategories.reduce((s, c) => s + c.items.length, 0);

  function handlePopularClick(q: string) {
    setSearch(q);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-indigo-500 p-8 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-1">
            <HelpCircle size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Yardım Merkezi</h1>
          <p className="text-primary-100 text-sm max-w-md mx-auto leading-relaxed">
            Platformu nasıl kullanacağınızı öğrenin, sık sorulan soruları inceleyin veya destek ekibiyle iletişime geçin.
          </p>
          {/* Stats */}
          <div className="flex justify-center gap-6 pt-3">
            {PLATFORM_STATS.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold">
                    <Icon size={14} className="text-white/80" />
                    {stat.value}
                  </div>
                  <div className="text-xs text-primary-200">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Soru veya konu ara…"
            className="w-full pl-10 pr-10 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            >
              <X size={11} className="text-gray-600" />
            </button>
          )}
        </div>

        {/* Popular questions */}
        {!search && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Zap size={11} /> Popüler:
            </span>
            {POPULAR_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => handlePopularClick(q)}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-600 transition-colors border border-transparent hover:border-primary-200"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Search result count */}
        {search && (
          <p className="text-xs text-gray-500">
            {totalResults > 0
              ? <><span className="font-semibold text-primary-600">{totalResults}</span> sonuç bulundu</>
              : <span className="text-gray-400">"{search}" için sonuç bulunamadı</span>
            }
          </p>
        )}
      </div>

      {/* Quick Links */}
      {!search && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Hızlı Erişim</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS.map(link => {
              const Icon = link.icon;
              return (
                <button
                  key={link.label}
                  onClick={() => navigate(link.to)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all hover:shadow-md hover:-translate-y-0.5 ${link.color}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{link.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{link.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* First Week Guide */}
      {!search && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-primary-500" />
            İlk hafta ne yapmalıyım?
          </h2>
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[30px] top-9 bottom-9 w-px bg-gradient-to-b from-primary-200 via-primary-100 to-transparent hidden sm:block" />
            <div className="space-y-3">
              {FIRST_WEEK_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-primary-100 transition-all group"
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold ring-2 ring-white ring-offset-0 z-10">
                        {i + 1}
                      </span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${step.color}`}>
                        <Icon size={18} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Clock size={10} />
                          {step.time}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                    <button
                      onClick={() => navigate(step.to)}
                      className="shrink-0 p-2 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors group-hover:bg-primary-50 group-hover:text-primary-500"
                      aria-label={`${step.title} sayfasına git`}
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Category Filter */}
      {!search && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              !activeCategory ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            Tümü
          </button>
          {FAQ_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = cat.items.length;
            const isActive = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(a => a === cat.label ? null : cat.label)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                }`}
              >
                <Icon size={11} />
                {cat.label}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* FAQ Sections */}
      <section className="space-y-8">
        {search && filteredCategories.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <HelpCircle size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">"{search}" için sonuç bulunamadı</p>
            <p className="text-xs text-gray-400 mt-1">Farklı kelimeler deneyebilir veya destek ekibimizle iletişime geçebilirsiniz.</p>
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-xs text-primary-600 hover:underline"
            >
              Aramayı temizle
            </button>
          </div>
        )}

        {visibleCategories.map(cat => {
          const Icon = cat.icon;
          return (
            <div key={cat.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg ${cat.bgColor} flex items-center justify-center`}>
                  <Icon size={14} className={cat.color} />
                </div>
                <h2 className="text-base font-bold text-gray-900">{cat.label}</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {cat.items.length} soru
                </span>
              </div>
              <div className="space-y-2">
                {cat.items.map((item, i) => (
                  <AccordionItem key={i} item={item} search={normalizedSearch} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* AI Support Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Bot size={22} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">AI Asistan ile Anında Yardım</p>
          <p className="text-xs text-gray-500 mt-0.5">Sağ alttaki sohbet butonuna tıklayarak yapay zeka destekli asistanımızdan hızlı yanıt alabilirsiniz.</p>
        </div>
        <ChevronRight size={16} className="text-indigo-400 shrink-0" />
      </div>

      {/* Contact / Support */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Aradığınızı bulamadınız mı?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/mesajlar')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
              <MessageCircle size={17} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Mesaj Gönder</p>
              <p className="text-xs text-gray-400">Ortalama ~2 saat yanıt</p>
            </div>
          </button>
          <button
            onClick={() => window.open('mailto:destek@platform.com', '_blank')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-200 transition-all group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
              <Mail size={17} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">E-posta</p>
              <p className="text-xs text-gray-400">destek@platform.com</p>
            </div>
          </button>
          <button
            className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 transition-all group text-left cursor-not-allowed opacity-60"
            disabled
          >
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Video size={17} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Video Görüşme</p>
              <p className="text-xs text-gray-400">Yakında geliyor</p>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-xs text-gray-500">Destek ekibimiz şu anda <span className="font-medium text-gray-700">çevrimiçi</span> · Pazartesi–Cuma 09:00–18:00</p>
        </div>
      </Card>

      {/* Moderation note */}
      <div className="text-center text-xs text-gray-400 pb-4 space-y-2">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} /> Platform moderasyonu aktif · İçerik kurallarımız herkese eşit uygulanır
        </p>
        <p>
          <button onClick={() => navigate('/kullanim-sartlari')} className="underline hover:text-gray-600">Kullanım Şartları</button>
          {' · '}
          <button onClick={() => navigate('/gizlilik')} className="underline hover:text-gray-600">Gizlilik Politikası</button>
          {' · '}
          <button onClick={() => navigate('/kvkk')} className="underline hover:text-gray-600">KVKK</button>
        </p>
      </div>
    </div>
  );
}
