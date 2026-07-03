import { useState, useEffect } from 'react';
import { AlertTriangle, Volume2, Zap, Heart, Phone, ChevronDown, Sparkles, Activity, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { Card } from '@/components/ui/Card';

interface CrisisCard {
  id: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
  subtitle: string;
  steps: string[];
  avoid: string[];
  emergency?: string;
}

const CRISIS_CARDS: CrisisCard[] = [
  {
    id: 'meltdown',
    icon: Zap,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    title: 'Kriz / Meltdown',
    subtitle: 'Kontrol kaybı, ağlama, bağırma, kendine zarar verme girişimi',
    steps: [
      'Sakin kalın — sesiniz ve beden diliniz çocuğa geçer.',
      'Güvenli alan oluşturun: keskin/sert nesneleri uzaklaştırın.',
      'Sözel uyarıyı minimuma indirin; tek kelime veya kısa cümleler.',
      'Duyusal uyaranları azaltın: ışıkları kısın, sesi düşürün.',
      'Yanında olmaya devam edin — uzaklaşmayın ama dokunmayın.',
      'Kriz geçtikten sonra sakin ses tonuyla güvence verin.',
    ],
    avoid: [
      'Yüksek sesle konuşmayın.',
      'Mantık yürütmeye ya da açıklamaya çalışmayın.',
      'Cezalandırma veya tehdit etmeyin.',
      'Kalabalık içinde bırakmayın.',
    ],
    emergency: '112 — Acil Sağlık Hattı',
  },
  {
    id: 'sensory',
    icon: Volume2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    title: 'Duyusal Aşırı Yüklenme',
    subtitle: 'Ellerini kulaklarına kapatma, ışıktan/sesten kaçma, donup kalma',
    steps: [
      'Hemen daha sakin ve az uyarıcı bir ortama geçin.',
      'Sevilen duyusal nesneleri sunun (ağırlıklı battaniye, squishy).',
      'Tahmin edilebilir ve sakin bir ses tonuyla kısaca konuşun.',
      'Derin baskı (sıkı sarılma) çocuk onay verirse uygulanabilir.',
      'Zaman verin — birkaç dakika sessiz kalın.',
      'Tetikleyiciyi not alın, ilerleyen dönemde önlem alın.',
    ],
    avoid: [
      'Ortamı değiştirmeden sözlü yönlendirmeye devam etmeyin.',
      'Zorla bir şey tutturmaya çalışmayın.',
      '"Neden bu kadar abartıyorsun?" demeyin.',
    ],
  },
  {
    id: 'aggression',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    title: 'Saldırganlık / Kendine Zarar Verme',
    subtitle: 'Vurma, ısırma, kafaya vurma, nesneleri fırlatma',
    steps: [
      'Güvenli mesafe koruyun; yakınlarda başkası varsa uzaklaştırın.',
      'Düşük sesli, kısa ve sakin direktifler verin ("Dur", "Burada").',
      'Tahrik edici nesneleri ve kişileri ortamdan uzaklaştırın.',
      'Alternatif çıkış noktası sunun: yastık vurma, koşu.',
      'Kriz geçince olayı not edin; tetikleyiciyi analiz edin.',
    ],
    avoid: [
      'Fiziksel güç uygulamaktan kaçının (zorunlu değilse).',
      'Dikkat çekerek ya da izleyici yaratarak ortamı körüklemeyin.',
      'Eylem anında ödüllendirmeyin.',
    ],
    emergency: '112 — Acil Çağrı Merkezi',
  },
  {
    id: 'anxiety',
    icon: Heart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    title: 'Yoğun Kaygı / Panik',
    subtitle: 'Titrema, nefes darlığı, ağlama, ortalıktan çekilme',
    steps: [
      'Sakin bir ses tonuyla "Yanındayım, güvendesin" deyin.',
      'Derin nefes egzersizi yapın: 4 saniye içeri, 6 saniye dışarı.',
      '"Şu an 5 şey gör, 4 şey dokun" duyusal zemin egzersizi uygulayın.',
      'Güvenli kişi veya nesne sunun (sevdiği oyuncak, kulaklık).',
      'Krizin geçmesi için zaman verin, acele ettirmeyin.',
    ],
    avoid: [
      '"Sakin ol, sorun yok" diyerek küçümsemeyin.',
      'Sormaya devam edip baskı uygulamayın.',
      'Kaygı anında yeni talep eklemeyin.',
    ],
  },
];

const EMERGENCY_CONTACTS = [
  { 
    label: 'Acil Sağlık ve Güvenlik', 
    desc: 'Ambulans, Polis, İtfaiye',
    number: '112', 
    color: 'bg-gradient-to-b from-red-500 to-red-700 shadow-[0_10px_40px_-10px_rgba(239,68,68,0.7)] ring-4 ring-red-500/30 text-white hover:shadow-[0_0px_50px_rgba(239,68,68,0.8)]' 
  },
  { 
    label: 'Sosyal Destek Hattı', 
    desc: 'Kadın, Çocuk ve Sosyal Hizmetler',
    number: '183', 
    color: 'bg-gradient-to-b from-indigo-500 to-purple-700 shadow-[0_10px_40px_-10px_rgba(99,102,241,0.5)] ring-4 ring-indigo-500/20 text-white hover:shadow-[0_0px_50px_rgba(99,102,241,0.6)]' 
  },
];

function CrisisCardItem({ card }: { card: CrisisCard }) {
  const [open, setOpen] = useState(false);
  const Icon = card.icon;

  return (
    <Card className={`rounded-3xl border overflow-hidden transition-all duration-300 ${open ? 'shadow-lg scale-[1.01]' : 'shadow-sm'} ${card.borderColor}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-4 p-5 text-left relative overflow-hidden transition-all duration-300 ${card.bgColor} ${open ? 'bg-opacity-100' : 'bg-opacity-50 hover:bg-opacity-70'}`}
      >
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/20 blur-2xl rounded-full pointer-events-none"></div>
        <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-white/50 backdrop-blur-md`}>
          <Icon size={24} className={card.color} />
        </div>
        <div className="flex-1 min-w-0 z-10">
          <h3 className="text-base font-black text-gray-900 tracking-tight">{card.title}</h3>
          <p className="text-[11px] font-bold text-gray-500 mt-0.5 uppercase tracking-wider">{card.subtitle}</p>
        </div>
        <div className={`shrink-0 w-8 h-8 rounded-full bg-white/50 flex items-center justify-center transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={18} className="text-gray-600" />
        </div>
      </button>

      {open && (
        <div className="p-6 bg-white space-y-6 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
            <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle size={14} /> Ne Yapmalı?
            </h4>
            <ol className="space-y-3">
              {card.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700 font-medium">
                  <span className={`shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-black mt-0.5 shadow-sm`}>
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100/50">
            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle size={14} /> Kaçınılması Gerekenler
            </h4>
            <ul className="space-y-2">
              {card.avoid.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700 font-medium items-start">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">✕</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {card.emergency && (
            <div className="flex items-center gap-3 p-4 bg-red-600 rounded-2xl shadow-md shadow-red-200">
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <Phone size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-red-200 uppercase tracking-wider mb-0.5">Önerilen Acil Hat</p>
                <span className="text-sm text-white font-black">{card.emergency}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const playChime = (frequency: number) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Soothing chime volume envelope
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1.2);
  } catch {
    // Browsers block audio until first interaction
  }
};

export function CrisisGuidePage() {
  const [breathingStep, setBreathingStep] = useState<'idle' | 'inhale' | 'exhale'>('idle');
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (breathingStep === 'idle') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(0);
      return;
    }

    // Play chime when the step changes
    playChime(breathingStep === 'inhale' ? 523.25 : 349.23);

    let currentSeconds = breathingStep === 'inhale' ? 4 : 6;
    setTimeLeft(currentSeconds);

    const interval = setInterval(() => {
      currentSeconds -= 1;
      if (currentSeconds < 0) {
        clearInterval(interval);
        // Switch step, which restarts this useEffect loop with a clean new timer
        setBreathingStep(prev => prev === 'inhale' ? 'exhale' : 'inhale');
      } else {
        setTimeLeft(currentSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [breathingStep]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <PageOnboarding
        pageId="crisis-guide"
        title="Zor Anlarda Ne Yapmalı?"
        description="Çocuğunuz bunaldığında veya zor bir an yaşandığında ne yapacağınızı adım adım bulabilirsiniz."
        steps={[
          {
            icon: <AlertTriangle size={20} />,
            title: "Adımları Takip Edin",
            description: "Sakin kalın ve sayfadaki adımları sırayla uygulayın. Her durum için ayrı rehber var."
          },
          {
            icon: <Phone size={20} />,
            title: "Acil Numaralar",
            description: "Gerekirse tek tıkla ilgili kurumlara ulaşabilirsiniz."
          }
        ]}
      />

      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-100">
          <AlertTriangle size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Zor Anlarda Ne Yapmalı?</h1>
          <p className="text-xs text-gray-500">Kriz Rehberi — zor anlarda adım adım yardım</p>
        </div>
      </div>

      {/* Interactive Breathing Guide — en önce: en hızlı sakinleşme adımı */}
      <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-8 border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900"></div>

        <div className="relative z-10 space-y-2">
          <h4 className="text-base font-black text-white flex items-center justify-center gap-2">
            <Sparkles size={18} className="text-indigo-400 animate-pulse" />
            Nefes Regülatörü
          </h4>
          <p className="text-xs text-slate-400 max-w-md">Önce siz sakinleşin. <span className="text-indigo-300 font-bold">Başlatın</span> ve sesli yönergeleri halkanın büyüme-küçülme hızına uydurun.</p>
        </div>

        <div className="relative h-64 w-64 flex items-center justify-center z-10 mt-4 mb-4">
          {/* Layered glowing outer waves */}
          <div className={`absolute inset-0 rounded-full transition-all ease-in-out duration-1000 ${
            breathingStep === 'inhale'
              ? 'scale-150 bg-emerald-500/20 blur-xl animate-pulse'
              : breathingStep === 'exhale'
              ? 'scale-110 bg-indigo-500/10 blur-xl'
              : 'scale-100 bg-slate-800/50 opacity-20'
          }`} />
          <div className={`absolute inset-4 rounded-full transition-all ease-in-out duration-1000 ${
            breathingStep === 'inhale'
              ? 'scale-125 bg-emerald-400/30 shadow-[0_0_60px_rgba(52,211,153,0.6)] animate-ping opacity-30'
              : breathingStep === 'exhale'
              ? 'scale-95 bg-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.4)]'
              : 'scale-100 bg-slate-800/80 opacity-20'
          }`} />

          {/* Main interactive circle */}
          <div className={`h-40 w-40 rounded-full flex flex-col items-center justify-center transition-all duration-1000 ease-in-out text-center relative z-20 ${
            breathingStep === 'inhale'
              ? 'scale-125 bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_0_40px_rgba(52,211,153,0.8)] ring-4 ring-emerald-400/50'
              : breathingStep === 'exhale'
              ? 'scale-90 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.6)] ring-4 ring-indigo-500/50'
              : 'scale-100 bg-slate-800 border-2 border-dashed border-slate-600 text-slate-400 shadow-inner'
          }`}>
            {breathingStep === 'idle' ? (
              <div className="space-y-1">
                <span className="text-sm font-black text-slate-300">Hazır</span>
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-widest">Başlamak için dokunun</span>
              </div>
            ) : breathingStep === 'inhale' ? (
              <div className="space-y-0.5">
                <p className="text-xs font-black opacity-90 uppercase tracking-[0.2em] animate-pulse">Nefes Al</p>
                <p className="text-5xl font-black leading-none drop-shadow-md">{timeLeft}</p>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Saniye</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <p className="text-xs font-black opacity-90 uppercase tracking-[0.2em] animate-pulse">Nefes Ver</p>
                <p className="text-5xl font-black leading-none drop-shadow-md">{timeLeft}</p>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Saniye</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBreathingStep(prev => prev === 'idle' ? 'inhale' : 'idle')}
          className={`relative z-10 px-8 py-3.5 rounded-full text-sm font-black tracking-widest uppercase transition-all duration-300 cursor-pointer ${
            breathingStep === 'idle'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-[0_10px_20px_-10px_rgba(99,102,241,0.8)] hover:-translate-y-1'
              : 'bg-white/10 hover:bg-white/20 text-slate-300 backdrop-blur-md border border-white/10'
          }`}
        >
          {breathingStep === 'idle' ? 'Egzersizi Başlat' : 'Durdur'}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-100 to-yellow-50 p-5 shadow-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 text-amber-500/10 pointer-events-none">
          <AlertTriangle size={120} />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="bg-amber-500 text-white p-3 rounded-xl shadow-md shrink-0">
            <Activity size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1">ÖNEMLİ TIBBİ UYARI</h3>
            <p className="text-xs text-amber-800/90 leading-relaxed font-semibold">
              Bu rehber profesyonel tıbbi veya psikiyatrik müdahalenin yerine geçmez. Bilinç kaybı, şiddetli nöbet, solunum güçlüğü veya ciddi zarar verme durumlarında vakit kaybetmeden <strong className="text-amber-950 font-black">112 Acil Yardım Hattı'nı</strong> arayın.
            </p>
          </div>
          <Link to="/tibbi-uyari" className="shrink-0 bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm">
            Detaylı Bilgi
          </Link>
        </div>
      </div>

      {/* emergency contacts */}
      <div className="relative overflow-hidden rounded-[32px] p-6 sm:p-8 bg-slate-900 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-80"></div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-purple-500 to-red-500 opacity-50"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <p className="text-xs font-extrabold text-slate-300 uppercase tracking-[0.2em]">Acil Durum Müdahale</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {EMERGENCY_CONTACTS.map(c => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className={`${c.color} group relative rounded-[28px] p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden border border-white/10`}
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="h-16 w-16 mb-4 bg-white/20 rounded-full flex items-center justify-center shrink-0 backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform duration-500">
                  <Phone size={28} className="drop-shadow-lg" />
                </div>
                <p className="text-sm uppercase font-black tracking-widest text-white/90 drop-shadow-sm mb-1">{c.label}</p>
                <p className="text-[10px] font-bold text-white/70 tracking-wider mb-3">{c.desc}</p>
                <p className="text-5xl sm:text-6xl font-black drop-shadow-xl tracking-tighter">{c.number}</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* quick tip banner */}
      <div className="bg-indigo-50/70 border border-indigo-100/50 rounded-2xl p-4 text-sm text-indigo-900 shadow-sm shadow-indigo-50/30">
        <span className="font-bold text-indigo-700">İlk kural:</span> Siz sakin olun. Çocuk sizin duygusal durumunuzu
        ayna gibi yansıtır. Derin nefes alın, yavaş hareket edin.
      </div>

      {/* crisis cards */}
      <div className="space-y-3">
        {CRISIS_CARDS.map(card => (
          <CrisisCardItem key={card.id} card={card} />
        ))}
      </div>

      {/* after crisis section */}
      <Card className="border-gray-100 p-5 space-y-3 hover:border-gray-200/60 transition-colors">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Heart size={15} className="text-emerald-500" />
          Kriz Sonrası — İyileşme Zamanı
        </h3>
        <ul className="space-y-2">
          {[
            'Çocuğa sakin ortamda sessizce eşlik edin, konuşmaya zorlamayın.',
            'Sevildiğini ve güvende olduğunu hissettirin.',
            'Kriz tetikleyicilerini not edin (tarih, saat, ortam, önceki olay).',
            'Uzman ekibinizi kriz hakkında bilgilendirin.',
            'Kendinize de zaman ayırın — bakım verici de yorulur.',
          ].map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-gray-700">
              <span className="shrink-0 text-emerald-500 mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs text-center text-gray-400 pb-4">
        Bu rehber genel bilgi amacıyla hazırlanmıştır. Ağır vakalarda mutlaka uzman desteği alın.
      </p>
    </div>
  );
}
