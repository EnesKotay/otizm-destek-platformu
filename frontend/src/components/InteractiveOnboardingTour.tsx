import { useState } from 'react';
import {
  Heart,
  Activity,
  Users,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Play,
  RotateCcw,
  Check,
  Baby,
  FileText,
  AlertTriangle,
  Pill
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type SimulatorTab = 'daily-log' | 'tasks' | 'expert' | 'crisis';

export function InteractiveOnboardingTour({ onStartWizard }: { onStartWizard: () => void }) {
  const [activeTab, setActiveTab] = useState<SimulatorTab>('daily-log');

  // Daily Log Simulator States
  const [selectedMood, setSelectedMood] = useState<'sakin' | 'hassas' | 'huzursuz' | null>(null);
  const [logSimulated, setLogSimulated] = useState(false);

  // Task Simulator States
  const [completedMockTasks, setCompletedMockTasks] = useState<Record<string, boolean>>({
    task1: false,
    task2: false,
    task3: false,
  });

  // Expert Simulator States
  const [shares, setShares] = useState({
    mood: true,
    notes: false,
    meds: true,
  });
  const [isDoctorConnected, setIsDoctorConnected] = useState(true);

  // Crisis Simulator States
  const [crisisLevel, setCrisisLevel] = useState<'dusuk' | 'orta' | 'yuksek'>('orta');

  // Reset simulator when switching tabs
  const handleTabChange = (tab: SimulatorTab) => {
    setActiveTab(tab);
    setLogSimulated(false);
    setSelectedMood(null);
    setCompletedMockTasks({ task1: false, task2: false, task3: false });
  };

  // Task progress calculation
  const totalMockTasks = 3;
  const doneMockTasksCount = Object.values(completedMockTasks).filter(Boolean).length;
  const mockTasksProgressPct = Math.round((doneMockTasksCount / totalMockTasks) * 100);

  return (
    <Card className="overflow-hidden border border-indigo-100 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/10 p-0 shadow-md rounded-[32px]">
      {/* Banner / Header */}
      <div className="bg-indigo-600 px-6 py-6 text-white relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/30 blur-2xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-100">
              💡 İnteraktif Deneyim
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Platformu Test Edin</h2>
          <p className="mt-1 text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-2xl">
            Henüz kendi çocuk profilinizi ve gerçek verilerinizi girmeden önce, sistemin nasıl çalıştığını aşağıdan deneyimleyebilirsiniz.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-100 bg-white p-1 gap-1 shrink-0 scrollbar-none">
        {[
          { id: 'daily-log', label: '1. Günlük Kayıt', icon: Heart },
          { id: 'tasks', label: '2. Bugün Ne Yapacağım?', icon: Activity },
          { id: 'expert', label: '3. Uzman Paylaşımı', icon: Users },
          { id: 'crisis', label: '4. Zor An Rehberi', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as SimulatorTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-6 min-h-[360px] flex flex-col justify-between">
        
        {/* Tab 1: Daily Log Simulator */}
        {activeTab === 'daily-log' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Heart className="text-rose-500" size={18} />
                Ruh Hali ve Gözlem Girişi
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Günde bir kez çocuğunuzun durumunu işaretleyin. Bu durum sonraki adım önerilerini şekillendirir.
              </p>
            </div>

            {/* Simulated Form */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Bugün Çocuğunuzun Durumu Nasıl?</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'sakin', label: 'Sakin / Dengeli', emoji: '😇', tone: 'border-emerald-200 bg-emerald-50/50 text-emerald-800' },
                  { id: 'hassas', label: 'Duyusal Hassas', emoji: '🥺', tone: 'border-amber-200 bg-amber-50/50 text-amber-800' },
                  { id: 'huzursuz', label: 'Huzursuz / Yoğun', emoji: '😠', tone: 'border-rose-200 bg-rose-50/50 text-rose-800' },
                ].map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => {
                      setSelectedMood(mood.id as 'sakin' | 'hassas' | 'huzursuz');
                      setLogSimulated(false);
                    }}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedMood === mood.id
                        ? `${mood.tone} ring-2 ring-indigo-500 scale-[1.02] font-bold shadow-sm`
                        : 'border-slate-100 hover:border-slate-200 text-slate-600 bg-slate-50/30'
                    }`}
                  >
                    <span className="text-2xl mb-1.5">{mood.emoji}</span>
                    <span className="text-[11px] leading-tight">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Feedback */}
            {selectedMood && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setLogSimulated(true)}
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold text-xs"
                >
                  <Play size={12} className="mr-1.5" />
                  Kayıt Yapılmasını Simüle Et
                </Button>
                {logSimulated && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedMood(null);
                      setLogSimulated(false);
                    }}
                    className="rounded-xl border-slate-200 hover:bg-slate-50"
                  >
                    <RotateCcw size={13} />
                  </Button>
                )}
              </div>
            )}

            {logSimulated && selectedMood && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-emerald-600 shrink-0" size={16} />
                  <p className="text-xs font-bold text-emerald-900">Başarıyla Kaydedildi!</p>
                </div>
                <p className="text-xs text-emerald-800/90 leading-relaxed">
                  {selectedMood === 'huzursuz' && (
                    <span><strong>Huzursuz</strong> kaydı sebebiyle: Platform ana sayfasındaki görev listesine hemen <strong>&quot;Sakinleştirici Duyusal Mola (Ağır Battaniye / Ritmetik Sallanma)&quot;</strong> görevi 1. sıradan eklendi ve alarm durumları güncellendi.</span>
                  )}
                  {selectedMood === 'hassas' && (
                    <span><strong>Duyusal Hassas</strong> kaydı sebebiyle: Bugünün görev akışına <strong>&quot;Duyusal Hazırlık ve Minder İtme&quot;</strong> çalışması eklendi. Gürültülü ortamlardan kaçınılması öneriliyor.</span>
                  )}
                  {selectedMood === 'sakin' && (
                    <span><strong>Sakin / Dengeli</strong> kaydı sebebiyle: Çocuğunuzun gelişimi için en verimli an! Görev listesine <strong>&quot;Sıra Alma ve Sosyal Top Oyunu (6 dk)&quot;</strong> görevi yerleştirildi.</span>
                  )}
                </p>
                <div className="text-[10px] text-emerald-600/80 font-semibold uppercase tracking-wider mt-1">
                  💡 Gerçek kullanımda bu veriler grafiklere dökülerek haftalık örüntüler çıkarılır.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Task Simulator */}
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="text-indigo-500" size={18} />
                  Bugün Ne Yapacağım? (Görevler)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Uygulama, günlük hedefleri ve seans ödevlerini yapılması gereken saat sırasına göre dizer.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {mockTasksProgressPct}% Tamam
                </span>
              </div>
            </div>

            {/* Task list simulation */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${mockTasksProgressPct}%` }}
                />
              </div>

              {/* Task Items */}
              {[
                { id: 'task1', title: 'İlaç Kontrolünü Tamamla', duration: '2 dk', icon: Pill, detail: 'Terapist onaylı günlük vitamin dozunu kaydet.' },
                { id: 'task2', title: 'İki Seçenekle İletişim Çalışması', duration: '5 dk', icon: Baby, detail: 'Çocuğunuza net iki nesne göstererek isteme becerisini teşvik edin.' },
                { id: 'task3', title: 'Gözlem Notu Ekle', duration: '2 dk', icon: FileText, detail: 'Gün içindeki önemli bir anı (örn. göz teması veya reaksiyon) not et.' },
              ].map((task) => {
                const isCompleted = completedMockTasks[task.id];
                return (
                  <button
                    key={task.id}
                    onClick={() => {
                      setCompletedMockTasks(prev => ({
                        ...prev,
                        [task.id]: !prev[task.id]
                      }));
                    }}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isCompleted
                        ? 'border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/30'
                        : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      isCompleted 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 bg-white text-transparent'
                    }`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className={`text-xs font-bold ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {task.title}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400">{task.duration}</span>
                      </div>
                      <p className={`text-[10px] mt-0.5 ${isCompleted ? 'text-slate-400/80' : 'text-slate-500'}`}>
                        {task.detail}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Success state */}
            {mockTasksProgressPct === 100 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-center space-y-1.5 animate-in zoom-in-95 duration-300">
                <span className="text-2xl">🎉</span>
                <h4 className="text-xs font-extrabold text-emerald-900">Tebrikler, Gün Bitti!</h4>
                <p className="text-xs text-emerald-800/90 leading-relaxed max-w-md mx-auto">
                  Tüm günlük görevlerin tamamlanması halinde ana sayfa otomatik olarak kutlama moduna geçer ve sonraki gelişim basamaklarını önerir.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Expert Simulator */}
        {activeTab === 'expert' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="text-violet-500" size={18} />
                Uzman Bağlantısı ve Gizlilik Denetimi
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Çocuğunuzun takvimini ve notlarını onay verdiğiniz uzmanlarla güvenle paylaşabilirsiniz. Kontrol her zaman sizdedir.
              </p>
            </div>

            {/* Expert Box */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-extrabold text-sm shadow-sm">
                    CŞ
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Dr. Canan Şahin</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Çocuk Psikiyatristi</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsDoctorConnected(!isDoctorConnected)}
                  className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                    isDoctorConnected 
                      ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' 
                      : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isDoctorConnected ? 'Erişimi Kes' : 'Yeniden Bağlan'}
                </button>
              </div>

              {isDoctorConnected ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paylaşım İzinleri</p>
                  
                  <div className="space-y-2">
                    {[
                      { key: 'mood', label: 'Ruh Hali Kayıtları', desc: 'Günlük duygu ve uyku örüntülerini görsün.' },
                      { key: 'notes', label: 'Gözlem Notları', desc: 'Aldığım serbest notlar ve davranış kayıtları.' },
                      { key: 'meds', label: 'İlaç Takip Raporu', desc: 'Hangi ilacın saat kaçta alındığı bilgisi.' },
                    ].map((item) => {
                      const val = shares[item.key as keyof typeof shares];
                      return (
                        <div key={item.key} className="flex items-center justify-between gap-4 p-2 rounded-xl bg-slate-50/50 hover:bg-slate-50">
                          <div>
                            <p className="text-[11px] font-bold text-slate-800">{item.label}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => setShares(prev => ({ ...prev, [item.key]: !val }))}
                            className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                              val ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all shadow-sm ${
                              val ? 'right-0.75' : 'left-0.75'
                            }`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl">
                  Dr. Canan Şahin ile veri paylaşımı durduruldu. Uzman, çocuk profilini görüntüleyemez.
                </div>
              )}
            </div>

            {isDoctorConnected && (
              <div className="flex items-center gap-1.5 justify-center text-[10px] text-indigo-600 font-extrabold bg-indigo-50/40 py-2 rounded-xl border border-indigo-100/50">
                <ShieldCheck size={12} />
                Tüm verileriniz uçtan uca şifreli saklanır ve sadece izin verdiğiniz hekimler tarafından incelenir.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Crisis Guide Simulator */}
        {activeTab === 'crisis' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={18} />
                Zor An (Kriz) Rehberi
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kriz anlarında, yoğun öfke nöbetleri veya erimelerde (meltdown) saniyeler içinde uygulayabileceğiniz pratik eylemler gösterilir.
              </p>
            </div>

            {/* Selector */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Simüle Edilecek Durum Seviyesi</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dusuk', label: 'Hassasiyet / Mızmızlanma', color: 'border-yellow-200 bg-yellow-50/30 text-yellow-800' },
                    { id: 'orta', label: 'Öfke Nöbeti (Tantrum)', color: 'border-orange-200 bg-orange-50/30 text-orange-800' },
                    { id: 'yuksek', label: 'Duyusal Erime (Meltdown)', color: 'border-rose-200 bg-rose-50/30 text-rose-800' },
                  ].map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setCrisisLevel(level.id as 'dusuk' | 'orta' | 'yuksek')}
                      className={`px-2 py-3 rounded-xl border text-[10px] font-bold text-center leading-tight transition-all cursor-pointer ${
                        crisisLevel === level.id
                          ? `${level.color} ring-2 ring-indigo-500 scale-[1.02] shadow-sm`
                          : 'border-slate-100 bg-slate-50/30 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action guide container */}
              <div className="space-y-3.5 pt-3 border-t border-slate-100">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Önerilen Sakinleşme Adımları</p>
                
                <div className="space-y-2.5">
                  {crisisLevel === 'dusuk' && [
                    { t: 'Seçenek Sunun', d: 'Kontrol hissi vermek için iki net alternatif arasından seçim yapmasını isteyin.' },
                    { t: 'Çevreyi Azaltın', d: 'Varsa televizyon, tablet veya yüksek sesli cihazları kapatın.' }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-[10px] font-bold text-yellow-700">{i+1}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.t}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.d}</p>
                      </div>
                    </div>
                  ))}

                  {crisisLevel === 'orta' && [
                    { t: 'Güvenliği Sağlayın', d: 'Kendine veya eşyalara zarar vermeyeceği güvenli bir alana geçirin.' },
                    { t: 'Dikkatini Başka Yöne Çekin', d: 'Ritmik sallanan bir oyuncak veya hafif bası uygulayan bir nesne verin.' },
                    { t: 'Sessiz Kalın', d: 'Uzun açıklamalar veya soru sorma yerine sakin ve kısa cümleler kullanın.' }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-700">{i+1}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.t}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.d}</p>
                      </div>
                    </div>
                  ))}

                  {crisisLevel === 'yuksek' && [
                    { t: 'Sıfır İletişim', d: 'Bu aşamada çocuk sözel komutları alamaz. Konuşmayı kesin, göz temasını azaltın.' },
                    { t: 'Derin Basınç', d: 'Varsa ağır battaniye örtün veya kucağınıza alıp hafifçe sıkıştırarak beden farkındalığı sağlayın.' },
                    { t: 'Sakinleşmesini Bekleyin', d: 'Ortamdan gürültüyü uzaklaştırın, sadece güvenliğini denetleyerek yanında sessizce bekleyin.' }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">{i+1}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.t}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Wizard Button */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Baby size={16} className="text-indigo-600 animate-bounce" />
            <p className="text-xs font-bold text-slate-700">Platformu keşfetmeyi tamamladınız mı?</p>
          </div>
          <button
            type="button"
            onClick={onStartWizard}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-5 py-3 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            İlk Çocuk Profilini Oluştur ve Başla
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </Card>
  );
}
