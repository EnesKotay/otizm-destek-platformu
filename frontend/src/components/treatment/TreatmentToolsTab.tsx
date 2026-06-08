import { useState, useEffect } from 'react';
import {
  Thermometer, TriangleAlert, Sparkles, Lightbulb,
  Volume2, Trash2, Heart, Award, CheckCircle2, UserCheck,
  ArrowRight, RefreshCw, FileText, ExternalLink
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SensoryMetric, SensoryProfileState, ToolCard } from '@/features/treatment/types';

interface TreatmentToolsTabProps {
  savingTreatment: boolean;
  sensoryMetrics: SensoryMetric[];
  sensoryProfile: SensoryProfileState;
  toolCards: ToolCard[];
  triggerSummary: string;
  onSaveSensoryProfile: () => void;
  onUpdateSensoryProfile: (key: keyof SensoryProfileState, value: number) => void;
}

export function TreatmentToolsTab({
  savingTreatment,
  sensoryMetrics,
  sensoryProfile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toolCards: _toolCards,
  triggerSummary,
  onSaveSensoryProfile,
  onUpdateSensoryProfile,
}: TreatmentToolsTabProps) {
  // ── 5 INTERACTIVE TOOLS NAVIGATION STATE ──
  const [activeTool, setActiveTool] = useState<'story' | 'aac' | 'calm' | 'token' | 'collab'>('story');

  // ── 1. AI SOCIAL STORY GENERATOR STATES ──
  const [childName, setChildName] = useState('Ahmet');
  const [customScenario, setCustomScenario] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generatedStory, setGeneratedStory] = useState<{ title: string; steps: string[] } | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);

  const storyTemplates = [
    { id: 'haircut', title: 'Berbere Gitmek', scenario: 'Ahmet berbere gidecek, saçları kesilirken makas sesleri duyacak ama canı hiç acımayacak. Saçları bitince çok yakışıklı ve rahat hissedecek.' },
    { id: 'dentist', title: 'Diş Hekimi Ziyareti', scenario: 'Ahmet diş hekimine gidecek. Diş koltuğuna oturup ağzını kocaman açacak. Hekim dişlerini parlatıp ona yıldız verecek.' },
    { id: 'playground', title: 'Parkta Sıra Beklemek', scenario: 'Ahmet parka gidecek. Salıncakta sallanmak için önce sıraya girecek, içinden 10a kadar sayacak ve sıra ona gelecek.' }
  ];

  const handleGenerateStory = (title: string, scenarioText: string) => {
    if (!scenarioText.trim()) return;
    setStoryLoading(true);
    setGeneratedStory(null);
    setTimeout(() => {
      setGeneratedStory({
        title,
        steps: [
          `1. Hazırlık: ${childName} yeni bir maceraya başlıyor: "${title}". Bu adımda sakin kalmak harika bir fikir!`,
          `2. Deneyim: ${scenarioText.replace(/Ahmet/g, childName)}`,
          `3. Başarı: İşte bu kadar! ${childName} bu durumu mükemmel yönetti ve harika bir iş çıkardı. Tebrikler! 🎉`
        ]
      });
      setStoryLoading(false);
    }, 900);
  };

  const speakStory = () => {
    if (!generatedStory) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = `${generatedStory.title}. ${generatedStory.steps.join(' ')}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // ── 2. DIGITAL AAC SOUNDBOARD STATES ──
  const [sentence, setSentence] = useState<Array<{ id: string; word: string; emoji: string }>>([]);

  const aacWords = [
    { word: 'Ben', emoji: '🙋‍♂️', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ring-indigo-200/50' },
    { word: 'Su', emoji: '💧', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 ring-sky-200/50' },
    { word: 'Yemek', emoji: '🍎', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-200/50' },
    { word: 'Park', emoji: '🛝', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200/50' },
    { word: 'Tuvalet', emoji: '🚾', color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 ring-rose-200/50' },
    { word: 'Oyuncak', emoji: '🧸', color: 'bg-violet-50 text-violet-700 hover:bg-violet-100 ring-violet-200/50' },
    { word: 'İstiyorum', emoji: '❤️', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 ring-emerald-300/50 font-bold' },
    { word: 'Sevdim', emoji: '👍', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100 ring-teal-200/50' },
    { word: 'İstemiyorum', emoji: '👎', color: 'bg-red-50 text-red-700 hover:bg-red-100 ring-red-200/50' },
  ];

  const handleWordClick = (word: string, emoji: string) => {
    // eslint-disable-next-line react-hooks/purity
    const newItem = { id: `${Date.now()}-${word}`, word, emoji };
    setSentence(prev => [...prev, newItem]);
    speakWord(word);
  };

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakSentence = () => {
    const text = sentence.map(item => item.word).join(' ');
    if (text) speakWord(text);
  };

  // ── 3. SENSORY BREATHING CALM STATES ──
  const [breathPhase, setBreathPhase] = useState<'al' | 'tut' | 'ver'>('al');
  const [breathCount, setBreathCount] = useState(4);

  useEffect(() => {
    if (activeTool !== 'calm') return;
    const interval = setInterval(() => {
      setBreathPhase(prev => {
        if (prev === 'al') {
          setBreathCount(4);
          return 'tut';
        }
        if (prev === 'tut') {
          setBreathCount(4);
          return 'ver';
        }
        setBreathCount(4);
        return 'al';
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTool]);

  useEffect(() => {
    if (activeTool !== 'calm') return;
    const timer = setInterval(() => {
      setBreathCount(c => (c > 1 ? c - 1 : 4));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTool]);

  // ── 4. TOKEN ECONOMY MOTIVATION STATES ──
  const [tokens, setTokens] = useState<number>(0);
  const [reward, setReward] = useState('Parka Gitmek 🛝');
  const [customRewardInput, setCustomRewardInput] = useState('');

  const addToken = () => {
    if (tokens < 5) {
      setTokens(prev => prev + 1);
      speakWord(`${tokens + 1}. yıldız kazanıldı!`);
    }
  };

  // ── 5. SPECIALIST & SCHOOL COLLAB STATE ──
  const [signedDocs, setSignedDocs] = useState<Set<string>>(new Set());

  const collabNotes = [
    { id: 'doc-1', author: 'Dr. Zeynep Kaya', role: 'Pediatrist / Çocuk Gelişimci', avatar: 'ZK', color: 'from-violet-500 to-indigo-600', text: 'Duyusal sakinleşme kutusu seansları sabah ve akşam 5er dakika olarak sürdürülmeli. Odaklanma seviyesi yükseliyor.', date: 'Dün, 16:30' },
    { id: 'doc-2', author: 'Ahmet Yılmaz', role: 'Özel Eğitim Öğretmeni', avatar: 'AY', color: 'from-sky-400 to-indigo-500', text: 'PECS kartlarında 3. aşamaya geçtik. Evde nesne eşleme ve seçim kartları tahtasını kullanmaya devam edelim.', date: '2 gün önce' }
  ];

  const handleSign = (id: string) => {
    setSignedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    speakWord('İmzalandı ve uzmana onay raporu gönderildi');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        
        {/* LEFT COLUMN: THE 5 INTERACTIVE TOOLS PANEL */}
        <div className="group rounded-[2.5rem] border border-slate-200/60 bg-white/70 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_20px_60px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-500 relative overflow-hidden">
          <div className="absolute -left-20 top-0 h-64 w-64 bg-indigo-400/10 rounded-full blur-[80px] pointer-events-none" />
          
          {/* Header & Sub navigation */}
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-indigo-500">Evde Kullanılabilir Araçlar</span>
                <h3 className="text-base font-extrabold text-slate-800 leading-none mt-1">Destek Araçları</h3>
              </div>
            </div>
            
            {/* Horizontal Submenu */}
            <div className="mt-5 flex flex-wrap gap-1.5 rounded-2xl bg-slate-50 p-1.5 border border-slate-100">
              {([
                ['story', 'Hikaye Oluşturucu', '📝'],
                ['aac', 'Ses Kartları', '🔊'],
                ['calm', 'Nefes Alıştırması', '🧘‍♂️'],
                ['token', 'Yıldız Sistemi', '⭐'],
                ['collab', 'Uzman Notları', '🤝']
              ] as const).map(([key, label, emoji]) => (
                <button
                  key={key}
                  onClick={() => setActiveTool(key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-300 cursor-pointer',
                    activeTool === key 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/40'
                  )}
                >
                  <span className="text-sm">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Tool Views */}
          <div className="mt-6 min-h-[300px]">
            
            {/* TOOL 1: AI SOCIAL STORY CREATOR */}
            {activeTool === 'story' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="mt-0.5 text-indigo-500 shrink-0" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800">Hikaye Oluşturucu</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-indigo-600/90 font-medium">
                        Çocuğunuz için kaygı yaratan durumlara (berbere gitme, doktora gitme vb.) hazırlık hikayesi oluşturun. Etkinlikten önce birlikte okuyun.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
                  {/* Left inputs */}
                  <div className="space-y-3.5 border-r border-slate-100 pr-0 sm:pr-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Çocuğun Adı</label>
                      <input 
                        type="text" 
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Örnek Şablonlar</label>
                      <div className="mt-2 space-y-1.5">
                        {storyTemplates.map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedTemplate(t.id);
                              setCustomScenario(t.scenario);
                              handleGenerateStory(t.title, t.scenario);
                            }}
                            className={cn(
                              'w-full rounded-xl border p-2 text-left text-xs font-bold transition-all duration-200 cursor-pointer block',
                              selectedTemplate === t.id 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            {t.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right result block */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Özel Senaryo / Durum Açıklaması</label>
                      <textarea
                        value={customScenario}
                        onChange={(e) => {
                          setCustomScenario(e.target.value);
                          setSelectedTemplate('');
                        }}
                        placeholder="Örn: Ahmet yarın okula gidecek ve yeni arkadaşlarıyla tanışacak..."
                        rows={3}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-medium text-slate-600 focus:border-indigo-400 focus:outline-none"
                      />
                      <button
                        onClick={() => handleGenerateStory('Kişiselleştirilmiş Hikaye', customScenario)}
                        disabled={!customScenario.trim()}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Hikaye Üret <ArrowRight size={13} />
                      </button>
                    </div>

                    {/* Result Story Box */}
                    {storyLoading && (
                      <div className="rounded-2xl border border-slate-100 p-5 space-y-3 animate-pulse">
                        <div className="h-4 bg-slate-100 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 rounded w-full" />
                        <div className="h-3 bg-slate-100 rounded w-5/6" />
                      </div>
                    )}

                    {generatedStory && !storyLoading && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-black text-slate-800">📖 {generatedStory.title}</h4>
                          <button
                            onClick={speakStory}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            <Volume2 size={12} /> Seslendir
                          </button>
                        </div>
                        <div className="mt-3 space-y-3">
                          {generatedStory.steps.map((step, idx) => (
                            <p key={idx} className="text-[11px] leading-relaxed text-slate-600 font-medium">
                              {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 2: DIGITAL AAC SOUNDBOARD */}
            {activeTool === 'aac' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/20 p-4">
                  <div className="flex items-start gap-3">
                    <Volume2 className="mt-0.5 text-sky-500 shrink-0" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-sky-800">Alternatif Sesli İletişim Panosu</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-sky-600/90 font-medium">
                        Çocuğunuz kartlara dokunarak isteklerini ifade edebilir. Tıkladığı kelimelerle cümle kurup Türkçe seslendirebilir.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sentence strip bar */}
                <div className="flex items-center justify-between min-h-[56px] rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {sentence.length === 0 ? (
                      <span className="text-[11px] text-slate-400 font-medium italic">Aşağıdaki kartlara basarak çocuğunuzla cümle kurun — her karta basınca sesli okunur.</span>
                    ) : (
                      sentence.map((item) => (
                        <span 
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700 shadow-sm"
                        >
                          <span>{item.emoji}</span> {item.word}
                        </span>
                      ))
                    )}
                  </div>
                  {sentence.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <button
                        onClick={speakSentence}
                        className="inline-flex items-center gap-1 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-600 shadow-sm transition-colors cursor-pointer"
                      >
                        🔊 Konuş
                      </button>
                      <button
                        onClick={() => setSentence([])}
                        className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        aria-label="Cümleyi temizle"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Soundboard grid */}
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                  {aacWords.map((item) => (
                    <button
                      key={item.word}
                      onClick={() => handleWordClick(item.word, item.emoji)}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-2xl p-4 shadow-sm ring-1 ring-inset ring-slate-100 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer text-center',
                        item.color
                      )}
                    >
                      <span className="text-2xl mb-1.5">{item.emoji}</span>
                      <span className="text-[11px] font-extrabold tracking-wide">{item.word}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TOOL 3: BREATHING CALMING SENSORY BOX */}
            {activeTool === 'calm' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-violet-100 bg-violet-50/20 p-4">
                  <div className="flex items-start gap-3">
                    <Heart className="mt-0.5 text-violet-500 shrink-0" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-violet-800">Nefes Alıştırması (4-4-4 Yöntemi)</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-violet-600/90 font-medium">
                        Çocuğunuz aşırı uyarılmış veya stresli hissettiğinde kullanın. Dairenin hareketini takip ederek birlikte nefes alın — her aşama 4 saniye sürer.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive Calming Breathe circle */}
                <div className="flex flex-col items-center justify-center py-6 rounded-2xl bg-gradient-to-b from-slate-50/60 to-white border border-slate-100">
                  <div className="relative flex h-40 w-40 items-center justify-center">
                    
                    {/* Pulsing visual circles */}
                    <div 
                      className={cn(
                        'absolute rounded-full transition-all ease-in-out',
                        breathPhase === 'al' && 'h-36 w-36 bg-indigo-400/20 duration-[4000ms] scale-100',
                        breathPhase === 'tut' && 'h-36 w-36 bg-violet-400/35 duration-[4000ms] scale-110',
                        breathPhase === 'ver' && 'h-36 w-36 bg-indigo-300/10 duration-[4000ms] scale-75'
                      )}
                    />
                    
                    <div 
                      className={cn(
                        'absolute rounded-full transition-all ease-in-out shadow-inner flex flex-col items-center justify-center text-center',
                        breathPhase === 'al' && 'h-24 w-24 bg-indigo-500/85 text-white duration-[4000ms] scale-105 shadow-indigo-300/40',
                        breathPhase === 'tut' && 'h-24 w-24 bg-violet-500/90 text-white duration-[4000ms] scale-110 shadow-violet-300/40',
                        breathPhase === 'ver' && 'h-24 w-24 bg-indigo-400/70 text-white duration-[4000ms] scale-90 shadow-slate-200/20'
                      )}
                    >
                      <span className="text-xs font-black uppercase tracking-wider">
                        {breathPhase === 'al' && 'Nefes Al'}
                        {breathPhase === 'tut' && 'Nefes Tut'}
                        {breathPhase === 'ver' && 'Nefes Ver'}
                      </span>
                      <span className="text-lg font-black mt-0.5">{breathCount}</span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs font-semibold text-slate-500">
                    {breathPhase === 'al' && 'Derin ve yavaşça nefes çekin...'}
                    {breathPhase === 'tut' && 'Nefesinizi tutarak dinlenin...'}
                    {breathPhase === 'ver' && 'Dudaklarınızı büzerek yavaşça üfleyin...'}
                  </p>
                </div>
              </div>
            )}

            {/* TOOL 4: TOKEN ECONOMY BOARD */}
            {activeTool === 'token' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/20 p-4">
                  <div className="flex items-start gap-3">
                    <Award className="mt-0.5 text-amber-500 shrink-0" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800">Dijital Jeton Panosu (Token Board)</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-600/90 font-medium">
                        Çocuğunuzla bir hedef seçin. Görevleri başardıkça yıldız ekleyin. 5 yıldıza ulaştığında hak ettiği ödülü kazansın!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[0.82fr_1.18fr] items-center">
                  {/* Reward setup */}
                  <div className="space-y-3.5 border-r border-slate-100 pr-0 sm:pr-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hedeflenen Ödül</label>
                      <input 
                        type="text" 
                        value={customRewardInput}
                        onChange={(e) => setCustomRewardInput(e.target.value)}
                        placeholder="Örn: Salıncağa binmek 🛝"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-400 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (customRewardInput.trim()) {
                            setReward(customRewardInput);
                            setCustomRewardInput('');
                            setTokens(0);
                            speakWord(`Ödül ayarlandı: ${customRewardInput}`);
                          }
                        }}
                        className="mt-2 w-full rounded-xl bg-slate-100 p-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Ödülü Tanımla
                      </button>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Aktif Ödül</p>
                      <p className="text-xs font-black text-indigo-600 mt-1">{reward}</p>
                    </div>
                  </div>

                  {/* Token stars container */}
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    
                    {tokens === 5 ? (
                      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm text-center flex flex-col items-center animate-scaleIn w-full">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-200 animate-bounce">
                          <Award size={24} />
                        </div>
                        <h4 className="text-xs font-black text-emerald-800 mt-3">Tebrikler! Jeton Kartı Doldu</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 font-bold">
                          Çocuğunuz bütün adımları başarıyla tamamladı ve <span className="text-indigo-600">{reward}</span> hakkı kazandı!
                        </p>
                        <button
                          onClick={() => setTokens(0)}
                          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <RefreshCw size={10} /> Panoyu Sıfırla
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 w-full">
                        <p className="text-xs font-extrabold text-slate-700">Başarı Yıldızlarını Toplayın ({tokens}/5)</p>
                        
                        {/* 5 Star Placeholders */}
                        <div className="flex justify-center gap-2">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <button
                              key={idx}
                              onClick={addToken}
                              disabled={idx > tokens}
                              className={cn(
                                'h-9 w-9 rounded-full flex items-center justify-center text-lg transition-all duration-300 transform',
                                idx < tokens 
                                  ? 'bg-amber-400 text-white shadow-md scale-110 shadow-amber-200/50' 
                                  : idx === tokens 
                                    ? 'bg-white border-2 border-dashed border-amber-300 hover:border-solid hover:bg-amber-50 cursor-pointer animate-pulse'
                                    : 'bg-slate-100 border-2 border-transparent text-slate-300 cursor-not-allowed'
                              )}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={addToken}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition-colors cursor-pointer"
                        >
                          ⭐ Yıldız Ekle
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 5: SPECIALIST COLLABORATION PORTAL */}
            {activeTool === 'collab' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-4">
                  <div className="flex items-start gap-3">
                    <UserCheck className="mt-0.5 text-indigo-500 shrink-0" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800">Terapist & Okul Ortak Çalışma Paneli</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-indigo-600/90 font-medium">
                        Çocuğunuzun öğretmenleri ve terapistleriyle ev-okul koordinasyonunu sağlayın. Raporları onaylayıp geri bildirim gönderin.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feed of specialist cards */}
                <div className="space-y-3.5">
                  {collabNotes.map((doc) => {
                    const isSigned = signedDocs.has(doc.id);
                    return (
                      <div 
                        key={doc.id}
                        className={cn(
                          'relative rounded-2xl bg-white p-4 border border-slate-100 shadow-[0_4px_15px_rgba(15,23,42,0.01)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.03)] transition-all duration-300',
                          isSigned && 'border-emerald-200 bg-emerald-50/10'
                        )}
                      >
                        {/* Profile line */}
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-white text-[11px] font-black bg-gradient-to-tr shadow-sm shadow-indigo-100', doc.color)}>
                              {doc.avatar}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{doc.author}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{doc.role}</p>
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold">{doc.date}</span>
                        </div>

                        {/* Remark details */}
                        <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600 font-medium">
                          "{doc.text}"
                        </p>

                        {/* Sign actions */}
                        <div className="mt-3.5 flex items-center justify-between border-t border-slate-50 pt-2.5">
                          <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                            <FileText size={11} /> {doc.date}
                          </span>
                          
                          {isSigned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 size={12} /> Okundu ve Onaylandı
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSign(doc.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 text-[10px] font-bold text-slate-600 transition-colors cursor-pointer"
                            >
                              ✍️ Okudum ve Onayladım
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* INTEGRATED SPECIALIST MARKETPLACE & LOCATION-BASED MAP FINDER WIDGET */}
                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📍</span>
                      <h4 className="text-xs font-extrabold text-slate-800">Çevrenizdeki Uzman Kurumları Keşfedin</h4>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Aktif Harita
                    </span>
                  </div>

                  {/* Institution List Carousel */}
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {/* Institution 1 */}
                    <div className="rounded-xl border border-slate-200/50 bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.01)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.03)] transition-all duration-200 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Vakıf / STK</span>
                        <span className="text-[10px] text-slate-400 font-bold">İstanbul</span>
                      </div>
                      <h5 className="text-[11px] font-bold text-slate-800 mt-2">Tohum Otizm Vakfı</h5>
                      <p className="text-[9px] text-slate-500 leading-normal mt-1 line-clamp-2">Erken çocukluk müdahale programları ve aile destek eğitimleri sunan öncü kuruluş.</p>
                      <a href="https://www.tohumotizm.org.tr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 mt-2.5">
                        İncele <ExternalLink size={10} />
                      </a>
                    </div>

                    {/* Institution 2 */}
                    <div className="rounded-xl border border-slate-200/50 bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.01)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.03)] transition-all duration-200 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Halk Sağlığı</span>
                        <span className="text-[10px] text-slate-400 font-bold">Ankara</span>
                      </div>
                      <h5 className="text-[11px] font-bold text-slate-800 mt-2">Hacettepe Üni. Ergoterapi</h5>
                      <p className="text-[9px] text-slate-500 leading-normal mt-1 line-clamp-2">Nörogelişimsel süreçler, duyu bütünleme terapileri ve okul öncesi ergoterapi merkezi.</p>
                      <a href="https://hastane.hacettepe.edu.tr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 mt-2.5">
                        İncele <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  {/* Actions to map / experts pages */}
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 flex-wrap">
                    <a 
                      href="/uzman-harita"
                      className="flex-1 text-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-2 px-3 shadow-sm shadow-indigo-200/50 transition-colors uppercase tracking-wider flex items-center justify-center gap-1"
                    >
                      🗺️ Konum Bazlı Haritayı Aç
                    </a>
                    <a 
                      href="/uzmanlar" 
                      className="flex-1 text-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] py-2 px-3 transition-colors uppercase tracking-wider flex items-center justify-center gap-1"
                    >
                      🔎 Uzman Listesini İncele
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: SENSORY PROFILE SLIDERS AND TRIGGERS */}
        <div className="group rounded-[2.5rem] border border-slate-200/60 bg-white/70 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_20px_60px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-500 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 h-64 w-64 bg-violet-400/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100">
                <Thermometer size={16} />
              </div>
              <div>
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Ölçüm Kartları</span>
                <h3 className="text-base font-extrabold text-slate-800 leading-none mt-1">Duyusal Profil Ayarları</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onSaveSensoryProfile}
              disabled={savingTreatment}
              className="text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer"
            >
              {savingTreatment ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>

          <div className="mt-5 space-y-5">
            {sensoryMetrics.map((metric) => (
              <div key={metric.label} className="group rounded-2xl bg-slate-50/50 p-3 border border-slate-100 hover:bg-slate-50 transition-colors duration-200">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-700">{metric.label}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-500 ring-1 ring-slate-200/20">{metric.value}</span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full transition-all duration-1000 ease-out', metric.color)} style={{ width: metric.width }} />
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500 font-medium">{metric.note}</p>
              </div>
            ))}

            {/* Slider form adjustment */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4">
              <p className="text-xs font-bold text-slate-800">Duyusal Hassasiyet Seviyeleri</p>
              <div className="mt-4 space-y-4">
                {([
                  ['sound', '🔊 Ses Hassasiyeti'],
                  ['touch', '🖐️ Dokunsal Hassasiyet'],
                  ['visual', '👁️ Görsel Hassasiyet'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-[0_4px_10px_rgba(15,23,42,0.01)]">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-extrabold text-slate-700">{label}</p>
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-700">%{sensoryProfile[key]}</span>
                    </div>
                    <input
                      type="range"
                      aria-label={label}
                      min={10}
                      max={100}
                      step={1}
                      value={sensoryProfile[key]}
                      disabled={savingTreatment}
                      onChange={(event) => onUpdateSensoryProfile(key, Number(event.target.value))}
                      className="w-full accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Triggers box */}
            <div className="rounded-2xl border border-l-4 border-amber-400 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2">
                <TriangleAlert size={16} className="text-amber-600" aria-hidden="true" />
                <h4 className="text-xs font-bold text-slate-800">Tetikleyici Günlüğü</h4>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-600 font-medium">{triggerSummary}</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
