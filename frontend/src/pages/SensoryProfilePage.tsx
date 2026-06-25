import { useEffect, useState } from 'react';
import { Save, Printer, Info, CheckCircle, ChevronDown, ChevronUp, Copy, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { sensoryProfileService } from '@/services/sensoryProfileService';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';

interface SensoryDomain {
  key: string;
  label: string;
  icon: string;
  description: string;
  triggers: string[];
  accommodations: string[];
}

const DOMAINS: SensoryDomain[] = [
  {
    key: 'auditory', label: 'İşitsel (Ses)', icon: '👂',
    description: 'Seslere karşı hassasiyet',
    triggers: ['Yüksek sesler', 'Ansızın gelen sesler', 'Kalabalık gürültüsü', 'Müzik aletleri', 'Elektrik süpürgesi', 'Çan/zil sesi', 'Birden fazla ses kaynağı'],
    accommodations: ['Kulaklık kullanımı', 'Sessiz oda sağlama', 'Önceden uyarı verme', 'Ses engelleyici kulaklık', 'Beyaz gürültü', 'Sakin ortam seçimi'],
  },
  {
    key: 'visual', label: 'Görsel (Işık)', icon: '👁',
    description: 'Işık ve görsel uyaranlara karşı hassasiyet',
    triggers: ['Parlak ışık', 'Floresan lamba', 'Parlayan yüzeyler', 'Hızlı hareket', 'Yoğun renkler', 'Ekran parlaklığı', 'Güneş ışığı'],
    accommodations: ['Güneş gözlüğü', 'Loş aydınlatma', 'Perdeler / güneşlik', 'Ekran filtresi', 'Sakin görsel ortam', 'Mat yüzey tercihi'],
  },
  {
    key: 'tactile', label: 'Dokunsal (Doku)', icon: '🤚',
    description: 'Dokunmaya ve dokulara karşı hassasiyet',
    triggers: ['Etiketler / dikişler', 'Belirli kumaşlar', 'Yüz yıkama', 'Saç tarama', 'Ayakkabı / çorap', 'Kum / çamur', 'Kalabalıkta temas'],
    accommodations: ['Etiketsiz giysiler', 'Seçilen kumaş türleri', 'Yumuşak fırça kullanımı', 'Kendi isteğiyle dokunma', 'Sıkıştırıcı giysiler', 'Eldiven kullanımı'],
  },
  {
    key: 'taste', label: 'Tatsal (Tat)', icon: '👅',
    description: 'Tat ve ağız duyusuna karşı hassasiyet',
    triggers: ['Yoğun tatlar', 'Belirli dokular', 'Yeni yiyecekler', 'Karma tatlar', 'Acı / ekşi', 'Sıcak yiyecekler', 'Soğuk içecekler'],
    accommodations: ['Seçilmiş menü', 'Doku bazlı alternatiﬂer', 'Kademeli yeni yiyecek sunma', 'Ayrı tabak servisi', 'Sıcaklık kontrolü'],
  },
  {
    key: 'smell', label: 'Koku', icon: '👃',
    description: 'Koku duyusuna karşı hassasiyet',
    triggers: ['Parfüm / kolonya', 'Yemek kokuları', 'Temizlik ürünleri', 'Market kokuları', 'Boyalar', 'Egzoz', 'Hayvan kokusu'],
    accommodations: ['Kokusuz ürün tercihi', 'İyi havalandırma', 'Yemek koku sızıntısını engelleme', 'Maske kullanımı', 'Koku nötralizan'],
  },
  {
    key: 'vestibular', label: 'Vestibüler (Denge/Hareket)', icon: '🔄',
    description: 'Hareket ve denge duyusuna tepkiler',
    triggers: ['Asansör', 'Merdiven yürüyüşü', 'Salıncak', 'Araba yolculuğu', 'Spor aktiviteleri', 'Eğimli zemin'],
    accommodations: ['Yavaş geçişler', 'Tutunma desteği', 'Düz zemin tercihi', 'Kısa yolculuklar', 'Önceden uyarı'],
  },
  {
    key: 'proprioceptive', label: 'Proprioseptif (Beden Farkındalığı)', icon: '💪',
    description: 'Kas ve eklem basıncına tepkiler',
    triggers: ['Dar alanlar', 'Kalabalık', 'Beklenmedik temas', 'Fiziksel aktivite eksikliği', 'Otururken fidanlık'],
    accommodations: ['Ağırlıklı battaniye', 'Sıkıştırıcı yelekler', 'Hamur oynama', 'Tırmanma aktiviteleri', 'Derin dokunma masajı', 'Zıplama matı'],
  },
];

type SensitivityLevel = 'hypersensitive' | 'hyposensitive' | 'typical' | '';

interface DomainProfile {
  sensitivity: SensitivityLevel;
  selectedTriggers: string[];
  customTriggers: string;
  selectedAccommodations: string[];
  customAccommodations: string;
  notes: string;
}


function emptyDomain(): DomainProfile {
  return { sensitivity: '', selectedTriggers: [], customTriggers: '', selectedAccommodations: [], customAccommodations: '', notes: '' };
}

const SENSITIVITY_CONFIG = {
  hypersensitive: { label: 'Aşırı Duyarlı', color: 'bg-red-100 text-red-700 border-red-300', desc: 'Uyarana normal dışı güçlü tepki verir' },
  hyposensitive:  { label: 'Az Duyarlı',    color: 'bg-blue-100 text-blue-700 border-blue-300', desc: 'Uyarana çok az ya da tepki vermez' },
  typical:        { label: 'Tipik',          color: 'bg-green-100 text-green-700 border-green-300', desc: 'Beklenen düzeyde tepki verir' },
};

export function SensoryProfilePage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [profile, setProfile] = useState<Record<string, DomainProfile>>({});
  const [saved, setSaved] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>('auditory');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!children.length) childService.getAll().then(setChildren).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedChild && children.length) setSelectedChild(children[0]);
  }, [children, selectedChild, setSelectedChild]);

  useEffect(() => {
    if (!selectedChildId) return;
    sensoryProfileService.get(selectedChildId).then(data => {
      if (data) { setProfile(data); setSaved(true); }
      else {
        const empty: Record<string, DomainProfile> = {};
        DOMAINS.forEach(d => { empty[d.key] = emptyDomain(); });
        setProfile(empty); setSaved(false);
      }
    }).catch(() => {});
  }, [selectedChildId]);

  const updateDomain = (key: string, patch: Partial<DomainProfile>) => {
    setProfile(p => ({ ...p, [key]: { ...p[key], ...patch } }));
  };

  const toggleItem = (domainKey: string, field: 'selectedTriggers' | 'selectedAccommodations', item: string) => {
    setProfile(p => {
      const current = p[domainKey]?.[field] ?? [];
      const updated = current.includes(item) ? current.filter(x => x !== item) : [...current, item];
      return { ...p, [domainKey]: { ...p[domainKey], [field]: updated } };
    });
  };

  const handleSave = async () => {
    if (!selectedChildId) return;
    try {
      await sensoryProfileService.save(selectedChildId, profile);
      setSaved(true);
      toast.success('Duyusal profil kaydedildi.');
    } catch { toast.error('Kaydedilemedi.'); }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => { window.print(); setIsPrinting(false); }, 100);
  };

  const buildTextSummary = (): string => {
    const lines: string[] = [
      `DUYUSAL PROFİL RAPORU — ${selectedChild?.name}`,
      `Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
      `Tamamlanan Alan: ${completedDomains}/${DOMAINS.length}`,
      '',
    ];
    DOMAINS.forEach(d => {
      const dp = { ...emptyDomain(), ...profile[d.key] };
      if (!dp.sensitivity) return;
      const sc = SENSITIVITY_CONFIG[dp.sensitivity];
      lines.push(`${d.icon} ${d.label} — ${sc.label}`);
      if (dp.selectedTriggers.length) lines.push(`  Tetikleyiciler: ${dp.selectedTriggers.join(', ')}`);
      if (dp.customTriggers) lines.push(`  Diğer tetikleyiciler: ${dp.customTriggers}`);
      if (dp.selectedAccommodations.length) lines.push(`  Stratejiler: ${dp.selectedAccommodations.join(', ')}`);
      if (dp.customAccommodations) lines.push(`  Diğer stratejiler: ${dp.customAccommodations}`);
      if (dp.notes) lines.push(`  Not: ${dp.notes}`);
      lines.push('');
    });
    return lines.join('\n');
  };

  const handleCopyToClipboard = () => {
    const text = buildTextSummary();
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Profil metni panoya kopyalandı.');
    }).catch(() => toast.error('Kopyalama başarısız.'));
  };

  const handleEmailShare = () => {
    const text = buildTextSummary();
    const subject = encodeURIComponent(`${selectedChild?.name} — Rahatlatan Şeyler Raporu`);
    const body = encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const completedDomains = DOMAINS.filter(d => profile[d.key]?.sensitivity).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      <div className="print:hidden space-y-6">
        <PageOnboarding
          pageId="sensory-profile"
          title="Rahatlatan Şeyler'e Hoş Geldiniz"
          description="Çocuğunuzun duyusal tetikleyicilerini ve onu sakinleştiren stratejileri detaylıca kaydedin."
          steps={[
            {
              icon: <Info size={20} />,
              title: "Hassasiyetleri Belirleyin",
              description: "Ses, ışık, dokunma gibi alanlardaki hassasiyetleri işaretleyin."
            },
            {
              icon: <Save size={20} />,
              title: "Öğretmenlerle Paylaşın",
              description: "Doldurduğunuz profili yazdırarak okul ve uzmanlarla kolayca paylaşın."
            }
          ]}
        />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rahatlatan Şeyler Haritası</h1>
            <p className="text-gray-500 mt-1">Her duyusal alandaki hassasiyeti ve düzenlemeleri kaydedin</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {saved && completedDomains > 0 && (
              <>
                <Button variant="outline" onClick={handleCopyToClipboard}><Copy size={14} className="mr-1" />Kopyala</Button>
                <Button variant="outline" onClick={handleEmailShare}><Mail size={14} className="mr-1" />E-posta</Button>
                <Button variant="outline" onClick={handlePrint}><Printer size={15} className="mr-1" />Yazdır</Button>
              </>
            )}
            <Button onClick={handleSave}><Save size={15} className="mr-1" />Kaydet</Button>
          </div>
        </div>

        {/* Child selector */}
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button key={c.id} onClick={() => setSelectedChild(c)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${selectedChildId === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {!selectedChildId ? (
          <EmptyState icon={<span className="text-2xl">🧠</span>} title="Çocuk profili bulunamadı" description="Lütfen önce Çocuklarım sayfasından profil ekleyin." />
        ) : (
          <>
            {/* Progress & Sensory Wheel */}
            <div className="grid md:grid-cols-3 gap-6 items-stretch mb-6">
              {/* Progress Card */}
              <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-indigo-50/60 blur-2xl pointer-events-none" />
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100/60 border border-indigo-200/40 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                    📈 Değerlendirme Durumu
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 tracking-tight">{selectedChild?.name} — Rahatlatan Şeyler Tamamlanma</h3>
                    <p className="text-xs text-gray-500 mt-1">Her duyu alanı doldurulduğunda yapay zeka haritası şekillenir.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-indigo-950 font-bold">
                      <span>Tamamlanan Duyu Grupları</span>
                      <span>{completedDomains}/{DOMAINS.length} (%{Math.round((completedDomains / DOMAINS.length) * 100)})</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500" style={{ width: `${(completedDomains / DOMAINS.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
                {saved && (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold mt-4 pt-3 border-t border-gray-50">
                    <CheckCircle size={14} /> Bilgiler Kaydedildi ve Güncel
                  </div>
                )}
              </div>

              {/* Sensory Wheel Card */}
              <div className="bg-white rounded-3xl border border-gray-100 p-5 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                <div className="absolute -left-16 -top-16 w-36 h-36 rounded-full bg-indigo-50/40 blur-2xl pointer-events-none" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Rahatlatan Şeyler Haritası</p>
                <p className="text-[10px] text-gray-400 mb-4">Etkileşimli çark ile duyu alanlarını inceleyin</p>
                
                {/* Interactive SVG Sensory Wheel */}
                <div className="relative w-52 h-52 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Concentric Circle Grids */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                    <circle cx="60" cy="60" r="30" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                    <circle cx="60" cy="60" r="15" fill="none" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />
                    
                    {/* Radial divider spokes */}
                    {DOMAINS.map((_, index) => {
                      const angle = (360 / DOMAINS.length) * index;
                      const rad = (val: number) => (val * Math.PI) / 180;
                      const x = 60 + 45 * Math.cos(rad(angle));
                      const y = 60 + 45 * Math.sin(rad(angle));
                      return (
                        <line
                          key={index}
                          x1="60"
                          y1="60"
                          x2={x}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeWidth="1.5"
                          strokeDasharray="2,2"
                        />
                      );
                    })}
                    
                    {/* Wedges representing the 7 sensory domains */}
                    {DOMAINS.map((d, index) => {
                      const dp = profile[d.key];
                      const angle = (360 / DOMAINS.length) * index;
                      const endAngle = (360 / DOMAINS.length) * (index + 1);
                      
                      // Determine radius based on sensitivity level
                      let r = 35; // unassessed default beautiful baseline radius
                      let fill = '#f8fafc'; // light slate-gray
                      let strokeColor = '#e2e8f0';
                      let isDashed = true;
                      
                      if (dp?.sensitivity === 'hypersensitive') {
                        r = 45;
                        fill = '#fca5a5'; // beautiful soft rose/red
                        strokeColor = '#f87171';
                        isDashed = false;
                      } else if (dp?.sensitivity === 'hyposensitive') {
                        r = 30;
                        fill = '#93c5fd'; // beautiful soft sky blue
                        strokeColor = '#60a5fa';
                        isDashed = false;
                      } else if (dp?.sensitivity === 'typical') {
                        r = 38;
                        fill = '#6ee7b7'; // beautiful soft emerald
                        strokeColor = '#34d399';
                        isDashed = false;
                      }
                      
                      const rad = (val: number) => (val * Math.PI) / 180;
                      const x1 = 60 + r * Math.cos(rad(angle));
                      const y1 = 60 + r * Math.sin(rad(angle));
                      const x2 = 60 + r * Math.cos(rad(endAngle));
                      const y2 = 60 + r * Math.sin(rad(endAngle));
                      
                      const dPath = `M 60 60 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
                      
                      return (
                        <path
                          key={d.key}
                          d={dPath}
                          fill={fill}
                          stroke={strokeColor}
                          strokeWidth="1"
                          strokeDasharray={isDashed ? "2,2" : "none"}
                          opacity={dp?.sensitivity ? "0.85" : "0.5"}
                          className={`transition-all duration-300 hover:opacity-100 cursor-pointer origin-[60px_60px] hover:scale-[1.03] ${expandedDomain === d.key ? 'filter drop-shadow-md' : ''}`}
                          onClick={() => setExpandedDomain(expandedDomain === d.key ? null : d.key)}
                        />
                      );
                    })}
                    
                    {/* Outer circle for clean edge */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.4" />
                    
                    {/* Center core */}
                    <circle cx="60" cy="60" r="8" fill="#ffffff" className="shadow-sm" stroke="#e2e8f0" strokeWidth="1" />
                    
                    {/* Emojis around the wheel */}
                    {DOMAINS.map((d, index) => {
                      const angle = (360 / DOMAINS.length) * index;
                      const endAngle = (360 / DOMAINS.length) * (index + 1);
                      const middleAngle = angle + (endAngle - angle) / 2;
                      
                      const rad = (val: number) => (val * Math.PI) / 180;
                      // Place at radius 54
                      const emojiX = 60 + 54 * Math.cos(rad(middleAngle));
                      const emojiY = 60 + 54 * Math.sin(rad(middleAngle));
                      
                      return (
                        <g key={d.key} className="cursor-pointer" onClick={() => setExpandedDomain(expandedDomain === d.key ? null : d.key)}>
                          {/* Hover effect background for emoji */}
                          <circle
                            cx={emojiX}
                            cy={emojiY}
                            r="7"
                            fill={expandedDomain === d.key ? "#e0e7ff" : "transparent"}
                            className="transition-colors duration-200 hover:fill-slate-100"
                          />
                          <text
                            x={emojiX}
                            y={emojiY}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-[9px] select-none filter hover:scale-125 transition-transform duration-200"
                          >
                            {d.icon}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-indigo-950 pointer-events-none select-none">
                    🧠
                  </div>
                </div>
                
                <div className="flex gap-2.5 justify-center mt-4 flex-wrap text-[9px] font-bold text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 border border-red-500/20" />Aşırı</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 border border-blue-500/20" />Az</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 border border-emerald-500/20" />Tipik</span>
                </div>
              </div>

          </div>

          {/* Domains */}
          <div className="space-y-3">
            {DOMAINS.map(domain => {
              const dp = { ...emptyDomain(), ...profile[domain.key] };
              const isExpanded = expandedDomain === domain.key;
              const sc = dp.sensitivity ? SENSITIVITY_CONFIG[dp.sensitivity] : null;

              return (
                <div key={domain.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedDomain(isExpanded ? null : domain.key)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="text-2xl shrink-0">{domain.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{domain.label}</h3>
                        {sc && <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{domain.description}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-5 space-y-5 border-t border-gray-100 pt-4">
                      {/* Sensitivity level */}
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Hassasiyet Düzeyi</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.entries(SENSITIVITY_CONFIG) as [SensitivityLevel, typeof SENSITIVITY_CONFIG[keyof typeof SENSITIVITY_CONFIG]][]).map(([key, cfg]) => (
                            <button key={key} type="button"
                              onClick={() => updateDomain(domain.key, { sensitivity: dp.sensitivity === key ? '' : key })}
                              className={`p-3 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${dp.sensitivity === key ? cfg.color + ' border-current scale-[1.02] shadow-sm' : 'border-gray-100 hover:border-gray-300 bg-gray-50/50 hover:bg-slate-50'}`}>
                              <p className="text-xs font-bold">{cfg.label}</p>
                              <p className="text-[10px] text-current opacity-70 mt-0.5">{cfg.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Triggers */}
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Tetikleyiciler (olanları işaretleyin)</p>
                        <div className="flex flex-wrap gap-2">
                          {domain.triggers.map(t => (
                            <button key={t} type="button"
                              onClick={() => toggleItem(domain.key, 'selectedTriggers', t)}
                              className={`text-xs px-3.5 py-1.5 rounded-full border font-semibold shadow-sm transition-all duration-200 cursor-pointer ${dp.selectedTriggers.includes(t) ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50 hover:border-rose-300'}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                        <input value={dp.customTriggers} onChange={e => updateDomain(domain.key, { customTriggers: e.target.value })}
                          placeholder="Diğer tetikleyiciler (virgülle ayırın)..."
                          className="mt-2.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all" />
                      </div>

                      {/* Accommodations */}
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Uyum Stratejileri (işe yarayanlar)</p>
                        <div className="flex flex-wrap gap-2">
                          {domain.accommodations.map(a => (
                            <button key={a} type="button"
                              onClick={() => toggleItem(domain.key, 'selectedAccommodations', a)}
                              className={`text-xs px-3.5 py-1.5 rounded-full border font-semibold shadow-sm transition-all duration-200 cursor-pointer ${dp.selectedAccommodations.includes(a) ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50 hover:border-emerald-300'}`}>
                              {a}
                            </button>
                          ))}
                        </div>
                        <input value={dp.customAccommodations} onChange={e => updateDomain(domain.key, { customAccommodations: e.target.value })}
                          placeholder="Diğer stratejiler..."
                          className="mt-2.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Ek Notlar</p>
                        <textarea value={dp.notes} onChange={e => updateDomain(domain.key, { notes: e.target.value })}
                          rows={2} placeholder="Bu alana özel notlarınız..."
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>

    {/* Print summary */}
    {isPrinting && (
      <div className="hidden print:block p-8 bg-white text-black min-h-screen">
        <div className="max-w-4xl mx-auto border border-gray-200 p-8 rounded-2xl shadow-sm bg-white">
          {/* Beautiful Clinic Style Header */}
          <div className="flex justify-between items-start border-b pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{selectedChild?.name} — Rahatlatan Şeyler Raporu</h1>
              <p className="text-sm text-slate-500 mt-1">Otizm Destek Platformu • Bireysel Duyusal Değerlendirme</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">Klinik Rapor</span>
              <p className="text-xs text-slate-400 mt-2">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {/* Completed stats */}
          <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Tamamlanma Durumu</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{completedDomains}/{DOMAINS.length} Alan (%{Math.round((completedDomains / DOMAINS.length) * 100)})</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Değerlendirilen Çocuk</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{selectedChild?.name}</p>
            </div>
          </div>

          {/* List of Domains */}
          <div className="space-y-6">
            {DOMAINS.map(d => {
              const dp = { ...emptyDomain(), ...profile[d.key] };
              if (!dp.sensitivity) return null;
              const sc = SENSITIVITY_CONFIG[dp.sensitivity];
              return (
                <div key={d.key} className="border border-slate-100 rounded-xl p-5 break-inside-avoid bg-white shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
                    <h2 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                      <span className="text-xl">{d.icon}</span> {d.label}
                    </h2>
                    <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${sc?.color}`}>
                      {sc?.label}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dp.selectedTriggers.length > 0 && (
                      <div className="text-sm text-slate-700">
                        <strong className="text-slate-900 block font-bold text-xs uppercase tracking-wider text-rose-600 mb-1">⚠️ Tetikleyiciler:</strong>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {dp.selectedTriggers.map(t => (
                            <span key={t} className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium">{t}</span>
                          ))}
                          {dp.customTriggers && dp.customTriggers.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                            <span key={t} className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-md text-xs font-medium italic">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {dp.selectedAccommodations.length > 0 && (
                      <div className="text-sm text-slate-700 mt-2">
                        <strong className="text-slate-900 block font-bold text-xs uppercase tracking-wider text-emerald-600 mb-1">🛡️ Düzenleme & Uyum Stratejileri:</strong>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {dp.selectedAccommodations.map(a => (
                            <span key={a} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-medium">{a}</span>
                          ))}
                          {dp.customAccommodations && dp.customAccommodations.split(',').map(a => a.trim()).filter(Boolean).map(a => (
                            <span key={a} className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md text-xs font-medium italic">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {dp.notes && (
                      <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-3">
                        <strong className="text-slate-900 block font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">📝 Ek Notlar & Açıklamalar:</strong>
                        <p className="text-xs text-slate-600 italic whitespace-pre-line mt-1">{dp.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
            <p>Otizm Destek Aile ve Uzman Platformu</p>
            <p>Bu rapor veli/uzman tarafından beyan edilen gözlemlere dayanmaktadır.</p>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
