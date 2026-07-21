import { useState, useRef, useEffect } from 'react';
import {
  HelpCircle, ChevronDown, ChevronUp, Mail, MessageCircle,
  BookOpen, Users, Calendar, Baby, ShieldCheck, Star,
  Compass, Search, Flag, X, Zap, Volume2, VolumeX,
  Video,
  ChevronRight, Bot,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
// ─── Data ────────────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { icon: Baby, label: 'Çocuk Profili', desc: 'Ekle & düzenle', to: '/cocuklarim', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: Calendar, label: 'Randevu Al', desc: 'Uzman bul & planla', to: '/uzmanlar', color: 'bg-green-50 text-green-600 border-green-100' },
  { icon: Users, label: 'Gruplara Katıl', desc: 'Topluluk & destek', to: '/gruplar', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { icon: BookOpen, label: 'Bilgi Bankası', desc: 'Makaleler & rehber', to: '/bilgi-bankasi', color: 'bg-orange-50 text-orange-600 border-orange-100' },
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
  const [speaking, setSpeaking] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) setHeight(open ? contentRef.current.scrollHeight : 0);
  }, [open]);

  const toggleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${item.q}. ${item.a}`);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.95;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${open ? 'border-primary-200 shadow-sm' : 'border-gray-100 shadow-none'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${open ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'}`}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-800 pr-4">
          <Highlight text={item.q} query={search} />
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSpeech}
            className={`p-1.5 rounded-full text-xs transition-colors ${speaking ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            title="Sesli Dinle"
          >
            {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${open ? 'bg-primary-100 text-primary-600 rotate-0' : 'bg-gray-100 text-gray-400'}`}>
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </div>
      </button>
      <div
        style={{ height, overflow: 'hidden', transition: 'height 0.25s ease' }}
      >
        <div ref={contentRef} className="px-4 pb-4 pt-3 bg-primary-50/40 text-sm text-gray-600 leading-relaxed border-t border-primary-100">
          <Highlight text={item.a} query={search} />
        </div>
      </div>
    </Card>
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
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-primary-600">SSS ve destek</p>
        <h1 className="text-2xl font-black tracking-tight text-gray-950">Yardım Merkezi</h1>
        <p className="text-sm font-medium leading-6 text-gray-500">
          Platformda takıldığınız konular için sık sorulan soruları ve destek kanallarını burada bulabilirsiniz. Rolünüze özel başlangıç adımları ve sayfa haritası için Kullanıcı Rehberi'ne bakın.
        </p>
      </header>

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

      {/* Kullanıcı Rehberi'ne yönlendirme — başlangıç adımları ve sayfa haritası tekrar burada listelenmez */}
      {!search && (
        <section>
          <button
            onClick={() => navigate('/kullanici-rehberi')}
            className="w-full flex items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-indigo-200 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Compass size={22} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Yeni misiniz? Kullanıcı Rehberi'nden başlayın</p>
              <p className="text-xs text-gray-500 mt-0.5">Rolünüze özel ilk adımlar ve platformdaki tüm sayfaların amacı tek yerde.</p>
            </div>
            <ChevronRight size={18} className="text-indigo-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
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
