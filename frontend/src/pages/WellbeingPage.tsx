import { useEffect, useState, useMemo } from 'react';
import { Heart, TrendingUp, TrendingDown, AlertCircle, CheckCircle, ChevronRight, Info, Download, ChevronLeft, Smile } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { toast } from '@/store/toastStore';
import { wellbeingService } from '@/services/wellbeingService';
import type { WellbeingEntry } from '@/types';

const QUESTIONS = [
  { id: 1, text: 'Bu hafta kendinizi fiziksel olarak nasıl hissettiniz?', low: 'Çok yorgun', high: 'Enerjik' },
  { id: 2, text: 'Çocuğunuzun bakımı sizi duygusal olarak ne kadar yordu?', low: 'Bunaltıcı', high: 'Yönetilebilir' },
  { id: 3, text: 'Bu hafta kendinize ne kadar zaman ayırabildiniiz?', low: 'Hiç yok', high: 'Yeterli' },
  { id: 4, text: 'Sosyal destek bu hafta ne kadar yeterliydi?', low: 'Çok yetersiz', high: 'Güçlü destek' },
  { id: 5, text: 'Geleceğe dair umudunuzu ne kadar hissediyorsunuz?', low: 'Çok umutsuz', high: 'Umutlu' },
];

const SCORE_CONFIG = [
  { min: 0,  max: 20, label: 'Kriz Bölgesi',        color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       barColor: '#ef4444', emoji: '😔', message: 'Lütfen bir uzmana veya güvendiğiniz birine başvurun.' },
  { min: 21, max: 40, label: 'Dikkat Gerektiriyor',  color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', barColor: '#f97316', emoji: '😟', message: 'Tükenmişlik belirtileri var. Dinlenmek için zaman ayırın.' },
  { min: 41, max: 60, label: 'Orta',                 color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', barColor: '#eab308', emoji: '😐', message: 'Ufak adımlarla kendinize daha çok alan açın.' },
  { min: 61, max: 80, label: 'İyi',                  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',    barColor: '#3b82f6', emoji: '🙂', message: 'Genel olarak iyi gidiyorsunuz. Sürdürülebilirliğe dikkat edin.' },
  { min: 81, max: 100, label: 'Harika',              color: 'text-green-600',  bg: 'bg-green-50 border-green-200',  barColor: '#22c55e', emoji: '😊', message: 'Harika! Kendinize iyi bakıyorsunuz, bunu sürdürün.' },
];

const RESOURCES = [
  { title: 'Otizm Ailelerine Ücretsiz Psikolojik Destek', desc: 'Bazı STK\'lar aile danışmanlığı sunmaktadır.', type: 'destek' },
  { title: 'Aile Tükenmişliğini Anlamak', desc: 'Otizm ailelerinde tükenmişlik neden yaygın ve nasıl yönetilir.', type: 'makale' },
  { title: 'Mindfulness Egzersizleri (5 dk)', desc: 'Günlük kısa nefes ve farkındalık egzersizleri.', type: 'egzersiz' },
  { title: 'Aile Destek Grupları', desc: 'Benzer ailelerle bağlantı kurun, yalnız olmadığınızı hatırlayın.', type: 'topluluk' },
  { title: 'Respite Care (Geçici Bakım)', desc: 'Kısa süreli profesyonel bakım desteğiyle dinlenme imkânı.', type: 'hizmet' },
  { title: 'ALO 182 Sosyal Destek Hattı', desc: 'Acil sosyal destek ve rehberlik için devlet hattı.', type: 'acil' },
];

const SELF_CARE_TIPS = [
  '💤 Yeterli uyku için kişisel bir rutin oluşturun.',
  '🧘 Günde 5 dakika bile olsa kendinize zaman ayırın.',
  '📞 Güvendiğiniz birini arayın, duygularınızı paylaşın.',
  '🚶 Kısa bir yürüyüş stres hormonlarını azaltır.',
  '📝 Günlük tutmak duygularınızı organize etmenize yardımcı olur.',
  '🎵 Sevdiğiniz müziği dinleyin.',
  '🤝 "Hayır" demeyi öğrenin; her şeyi taşımak zorunda değilsiniz.',
  '🏥 Kendi sağlığınızı ihmal etmeyin.',
];

const Q_LABELS = ['Fiziksel', 'Duygusal', 'Zaman', 'Destek', 'Umut'];
const TYPE_COLORS: Record<string, string> = {
  destek: 'bg-purple-100 text-purple-700',
  makale: 'bg-blue-100 text-blue-700',
  egzersiz: 'bg-green-100 text-green-700',
  topluluk: 'bg-orange-100 text-orange-700',
  hizmet: 'bg-teal-100 text-teal-700',
  acil: 'bg-red-100 text-red-700',
};

function getScoreConfig(score: number) {
  return SCORE_CONFIG.find(c => score >= c.min && score <= c.max) ?? SCORE_CONFIG[2];
}

const TODAY = new Date().toISOString().split('T')[0];

function exportCsv(entries: WellbeingEntry[]) {
  if (!entries.length) return;
  const header = 'Tarih,Puan,Fiziksel,Duygusal,Zaman,Destek,Umut,Notlar';
  const rows = entries.map(e =>
    [e.date, e.score, ...e.answers, `"${(e.notes || '').replace(/"/g, '""')}"`].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `refah-${TODAY}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// 1-10 arası mobil dostu rating — 2 satır 5 buton
function RatingButtons({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      {[[1,2,3,4,5],[6,7,8,9,10]].map((row, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-5 gap-2">
          {row.map(val => {
            const isSelected = value === val;
            const colorClass = isSelected
              ? val >= 7 ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200'
                : val >= 4 ? 'bg-yellow-400 border-yellow-400 text-white shadow-md shadow-yellow-200'
                : 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200'
              : 'border-gray-200 text-gray-500 bg-white hover:border-gray-400 hover:bg-gray-50';
            return (
              <button
                key={val}
                type="button"
                onClick={() => onChange(val)}
                className={`h-12 rounded-xl text-sm font-bold transition-all border-2 active:scale-95 ${colorClass}`}
              >
                {val}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function WellbeingPage() {
  const [entries, setEntries] = useState<WellbeingEntry[]>([]);
  const [mode, setMode] = useState<'dashboard' | 'checkin'>('dashboard');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([5, 5, 5, 5, 5]);
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingEntries(true);
    wellbeingService.getAll()
      .then(data => {
        if (!cancelled) setEntries(data.sort((a, b) => b.date.localeCompare(a.date)));
      })
      .catch(() => toast.error('Refah kayıtları yüklenemedi.'))
      .finally(() => { if (!cancelled) setIsLoadingEntries(false); });
    return () => { cancelled = true; };
  }, []);

  const hasCheckedInToday = entries.some(e => e.date === TODAY);
  const latestEntry = entries[0];
  const latestScore = latestEntry?.score ?? null;
  const latestConfig = latestScore !== null ? getScoreConfig(latestScore) : null;

  const trend = useMemo(() => {
    if (entries.length < 2) return null;
    return entries[0].score - entries[1].score;
  }, [entries]);

  const weeklyAvg = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];
    const recent = entries.filter(e => e.date >= weekAgo);
    if (!recent.length) return null;
    return Math.round(recent.reduce((s, e) => s + e.score, 0) / recent.length);
  }, [entries]);

  const chartData = useMemo(() =>
    entries.slice(0, 12).reverse().map(e => ({
      date: e.date.slice(5),
      puan: e.score,
      color: getScoreConfig(e.score).barColor,
    })),
    [entries]
  );

  const qAvgs = useMemo(() => {
    if (!latestEntry) return [];
    return QUESTIONS.map((_, i) => ({
      label: Q_LABELS[i],
      value: latestEntry.answers[i] ?? 0,
    }));
  }, [latestEntry]);

  const startCheckin = () => {
    setAnswers([5, 5, 5, 5, 5]);
    setNotes('');
    setCurrentStep(0);
    setMode('checkin');
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    const score = Math.round((answers.reduce((s, a) => s + a, 0) / (answers.length * 10)) * 100);
    setIsSaving(true);
    try {
      const saved = await wellbeingService.upsert({ date: TODAY, answers, score, notes });
      const updated = [saved, ...entries.filter(e => e.date !== saved.date)]
        .sort((a, b) => b.date.localeCompare(a.date));
      setEntries(updated);
      setMode('dashboard');
      const cfg = getScoreConfig(saved.score);
      toast.success(`Check-in tamamlandı! Puan: ${saved.score}/100 — ${cfg.label} ${cfg.emoji}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Check-in kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewScore = Math.round((answers.reduce((s, a) => s + a, 0) / (answers.length * 10)) * 100);

  // ─── CHECK-IN MODE — step by step on mobile ─────────────────
  if (mode === 'checkin') {
    const isLastStep = currentStep === QUESTIONS.length; // last step = notes
    const isNotesStep = currentStep === QUESTIONS.length;
    const q = !isNotesStep ? QUESTIONS[currentStep] : null;
    const progress = ((currentStep + 1) / (QUESTIONS.length + 1)) * 100;

    return (
      <div className="flex flex-col min-h-[calc(100vh-8rem)] pb-24">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => currentStep > 0 ? setCurrentStep(s => s - 1) : setMode('dashboard')}
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 active:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium mb-1">
              {isNotesStep ? 'Notlar' : `Soru ${currentStep + 1} / ${QUESTIONS.length}`}
            </p>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Tahmini</p>
            <p className="text-sm font-black text-indigo-600">{previewScore}</p>
          </div>
        </div>

        {/* Question step */}
        {q && (
          <div className="flex-1 flex flex-col">
            <div className="bg-indigo-50 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {currentStep + 1}
                </span>
                <span className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Soru</span>
              </div>
              <p className="font-semibold text-gray-900 text-[15px] leading-snug">{q.text}</p>
            </div>

            <div className="flex-1 space-y-4">
              {/* Current answer display */}
              <div className="text-center py-2">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl font-black mx-auto mb-1 ${
                  answers[currentStep] >= 7 ? 'bg-green-50 text-green-600' :
                  answers[currentStep] >= 4 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                }`}>
                  {answers[currentStep]}
                </div>
                <p className="text-xs text-gray-400">seçilen değer</p>
              </div>

              <RatingButtons
                value={answers[currentStep]}
                onChange={val => setAnswers(prev => prev.map((a, i) => i === currentStep ? val : a))}
              />

              <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>😔 {q.low}</span>
                <span>{q.high} 😊</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(s => s + 1)}
              className="w-full mt-6 bg-indigo-600 text-white font-bold py-4 rounded-2xl text-base active:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              {currentStep < QUESTIONS.length - 1 ? 'Sonraki Soru' : 'Son Adım'}
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Notes + submit step */}
        {isLastStep && (
          <div className="flex-1 flex flex-col">
            <div className="bg-indigo-50 rounded-2xl p-4 mb-5">
              <p className="text-sm font-semibold text-indigo-700 mb-0.5">Son adım</p>
              <p className="text-xs text-indigo-500">Bu hafta için notlarınızı ekleyebilirsiniz (opsiyonel).</p>
            </div>

            {/* Score preview */}
            <div className={`rounded-2xl p-4 mb-5 border-2 ${getScoreConfig(previewScore).bg}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getScoreConfig(previewScore).emoji}</span>
                <div>
                  <p className={`text-2xl font-black ${getScoreConfig(previewScore).color}`}>{previewScore}<span className="text-sm font-normal">/100</span></p>
                  <p className={`text-sm font-semibold ${getScoreConfig(previewScore).color}`}>{getScoreConfig(previewScore).label}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${previewScore}%`, backgroundColor: getScoreConfig(previewScore).barColor }} />
              </div>
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Bu hafta ne zorladı? Ne iyi gitti? (opsiyonel)"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none mb-5 flex-1"
            />

            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl text-base active:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Heart size={18} fill="white" />
              {isSaving ? 'Kaydediliyor...' : 'Check-in Tamamla'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── DASHBOARD MODE ─────────────────────────────────────────
  return (
    <div className="space-y-4 pb-24">
      <PageOnboarding
        pageId="wellbeing"
        title="Ebeveyn Refah Takibine Hoş Geldiniz"
        description="Otizm ebeveynliği yorucu olabilir. Kendi tükenmişlik durumunuzu takip edin ve destek alın."
        steps={[
          { icon: <Heart size={20} />, title: "Haftalık Check-in", description: "Her hafta 5 kısa soruyu yanıtlayarak stres ve refah seviyenizi ölçün." },
          { icon: <TrendingUp size={20} />, title: "İlerleme Grafiği", description: "Zaman içindeki duygusal durumunuzu grafikte izleyin." },
          { icon: <Info size={20} />, title: "Kaynaklar", description: "Psikolojik destek hatlarına ve faydalı makalelere tek tıkla ulaşın." }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Ebeveyn Refah Takibi</h1>
          <p className="text-gray-500 text-sm mt-0.5 hidden sm:block">Kendinize nasıl baktığınızı haftalık olarak takip edin</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {entries.length > 0 && (
            <button
              onClick={() => exportCsv(entries)}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              title="CSV İndir"
            >
              <Download size={16} />
            </button>
          )}
          {!hasCheckedInToday && (
            <button
              onClick={startCheckin}
              className="flex items-center gap-1.5 bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm active:bg-indigo-700 transition-colors"
            >
              <Heart size={14} fill="white" />
              <span className="hidden sm:inline">Haftalık </span>Check-in
            </button>
          )}
        </div>
      </div>

      {isLoadingEntries && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm text-gray-500">
          Refah kayıtları yükleniyor...
        </div>
      )}

      {/* Current score card */}
      {latestConfig && latestScore !== null ? (
        <div className={`rounded-2xl border-2 p-4 ${latestConfig.bg}`}>
          {/* Score row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{latestConfig.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-4xl font-black ${latestConfig.color}`}>{latestScore}</span>
                  <span className="text-gray-400 text-sm">/100</span>
                </div>
                <span className={`text-sm font-bold ${latestConfig.color}`}>{latestConfig.label}</span>
              </div>
            </div>
            <div className="text-right">
              {trend !== null && (
                <p className={`text-sm font-bold flex items-center gap-1 justify-end ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : null}
                  {trend > 0 ? `+${trend}` : trend}
                </p>
              )}
              {weeklyAvg !== null && (
                <p className="text-xs text-gray-500 mt-0.5">Haftalık ort: <strong>{weeklyAvg}</strong></p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(latestEntry.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>

          {/* Message */}
          <p className={`text-xs font-medium ${latestConfig.color} mb-3`}>{latestConfig.message}</p>

          {/* Question breakdown bars */}
          {qAvgs.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {qAvgs.map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${value * 10}%`, backgroundColor: value >= 7 ? '#22c55e' : value >= 4 ? '#eab308' : '#ef4444' }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-500 text-center leading-tight">{label}</span>
                  <span className="text-[10px] font-bold text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 text-center">
          <p className="text-5xl mb-3">💙</p>
          <h2 className="font-bold text-gray-900 mb-1">Kendinize nasıl bakıyorsunuz?</h2>
          <p className="text-gray-500 text-sm mb-4">5 kısa soruyla haftalık refah durumunuzu takip edin.</p>
          <button
            onClick={startCheckin}
            className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl text-sm active:bg-indigo-700 transition-colors inline-flex items-center gap-2"
          >
            <Heart size={15} fill="white" />İlk Check-in'i Yap
          </button>
        </div>
      )}

      {hasCheckedInToday && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2.5">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">Bugünkü check-in tamamlandı. Haftaya görüşürüz! 💙</p>
        </div>
      )}

      {/* Trend chart */}
      {chartData.length > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">İlerleme Trendi</h3>
            <span className="text-xs text-gray-400">{entries.length} check-in</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 9 }} width={28} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [`${v}/100`, 'Refah Puanı']}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Line
                type="monotone"
                dataKey="puan"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={(props) => {
                  const cfg = getScoreConfig(props.payload.puan);
                  return <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill={cfg.barColor} stroke="white" strokeWidth={2} />;
                }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Low score resource alert */}
      {latestScore !== null && latestScore <= 60 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <p className="text-sm font-semibold text-rose-800">Size Özel Kaynaklar</p>
          </div>
          <div className="space-y-2">
            {RESOURCES.filter(r => ['destek', 'acil', 'egzersiz'].includes(r.type)).map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/70">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${TYPE_COLORS[r.type]}`}>{r.type}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Self-care tips — horizontal scroll on mobile */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <Heart size={15} className="text-pink-500" />Ebeveyn Bakımı İpuçları
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
          {SELF_CARE_TIPS.map((tip, i) => (
            <div key={i} className="bg-pink-50 rounded-2xl p-3.5 text-sm text-gray-700 shrink-0 w-56 snap-start">
              {tip}
            </div>
          ))}
        </div>
      </div>

      {/* All resources */}
      <Card className="p-4">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <Info size={15} className="text-blue-500" />Destek Kaynakları
        </h3>
        <div className="space-y-2">
          {RESOURCES.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${TYPE_COLORS[r.type]}`}>{r.type}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* History */}
      {entries.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 active:text-indigo-700 w-full py-2 cursor-pointer"
          >
            <Smile size={15} />
            Geçmiş Check-in'ler ({entries.length})
            <ChevronRight size={14} className={`ml-auto transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </button>
          {showHistory && (
            <div className="space-y-2 mt-2">
              {entries.map(e => {
                const cfg = getScoreConfig(e.score);
                return (
                  <div key={e.id} className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bg}`}>
                    <div className="text-center shrink-0 w-10">
                      <p className={`text-lg font-black leading-none ${cfg.color}`}>{e.score}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{cfg.label}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {new Date(e.date + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      {e.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{e.notes}</p>}
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {e.answers.map((a, i) => (
                        <div key={i} className="w-2 rounded-full" style={{
                          height: `${(a / 10) * 24 + 4}px`,
                          backgroundColor: a >= 7 ? '#22c55e' : a >= 4 ? '#eab308' : '#ef4444',
                        }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
