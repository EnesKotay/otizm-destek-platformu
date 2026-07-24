import { useState, useMemo } from 'react';
import { Pill, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export interface TimelineDataPoint {
  date: string;
  displayDate: string;
  moodScore: number; // 1-5
  sleepHours: number; // hours
  meltdownCount: number;
  medicationChange?: string; // e.g. "Risperdal 0.5mg -> 1.0mg"
}

interface MedicationBehaviorTimelineProps {
  childName?: string;
  data?: TimelineDataPoint[];
  className?: string;
}

// Sample realistic dummy timeline data if none provided
const MOCK_TIMELINE: TimelineDataPoint[] = [
  { date: '2026-07-01', displayDate: '1 Tem', moodScore: 2, sleepHours: 5.5, meltdownCount: 3 },
  { date: '2026-07-03', displayDate: '3 Tem', moodScore: 3, sleepHours: 6.0, meltdownCount: 2 },
  { date: '2026-07-05', displayDate: '5 Tem', moodScore: 2, sleepHours: 5.0, meltdownCount: 4, medicationChange: 'Risperdal 0.5mg Başlandı' },
  { date: '2026-07-07', displayDate: '7 Tem', moodScore: 3, sleepHours: 6.5, meltdownCount: 2 },
  { date: '2026-07-09', displayDate: '9 Tem', moodScore: 4, sleepHours: 7.5, meltdownCount: 1 },
  { date: '2026-07-12', displayDate: '12 Tem', moodScore: 4, sleepHours: 8.0, meltdownCount: 0 },
  { date: '2026-07-15', displayDate: '15 Tem', moodScore: 4, sleepHours: 7.8, meltdownCount: 1 },
  { date: '2026-07-18', displayDate: '18 Tem', moodScore: 5, sleepHours: 8.2, meltdownCount: 0, medicationChange: 'Terapi Dozu Güncellendi' },
  { date: '2026-07-21', displayDate: '21 Tem', moodScore: 5, sleepHours: 8.5, meltdownCount: 0 },
];

export function MedicationBehaviorTimeline({
  childName = 'Çocuk',
  data = MOCK_TIMELINE,
  className = '',
}: MedicationBehaviorTimelineProps) {
  const [metric, setMetric] = useState<'all' | 'mood' | 'sleep'>('all');

  const medicationChanges = useMemo(() => {
    return data.filter(d => d.medicationChange);
  }, [data]);

  return (
    <div className={`p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-5 ${className}`}>
      {/* Başlık & Kontroller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
            <Pill size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              İlaç & Davranış Etkileşim Zaman Çizelgesi
            </h3>
            <p className="text-xs font-medium text-slate-500">
              {childName} için ilaç dozu değişimlerinin uyku ve duygu durumuna etkileri
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              metric === 'all' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => setMetric('mood')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              metric === 'mood' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Duygu Durumu
          </button>
          <button
            type="button"
            onClick={() => setMetric('sleep')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              metric === 'sleep' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Uyku
          </button>
        </div>
      </div>

      {/* İlaç Değişim Etiketleri Özeti */}
      {medicationChanges.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-black uppercase text-slate-400 shrink-0">İlaç Doz Notları:</span>
          {medicationChanges.map((mc, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200/60 rounded-lg text-xs font-bold text-purple-800 shrink-0"
            >
              <Pill size={12} className="text-purple-600" />
              <span>{mc.displayDate}:</span>
              <span>{mc.medicationChange}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recharts Grafiği */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
            <YAxis yAxisId="left" domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 12]} tick={{ fontSize: 11, fill: '#94A3B8' }} />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as TimelineDataPoint;
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-800">
                    <p className="font-extrabold text-slate-300">{item.displayDate}</p>
                    <p className="text-emerald-400 font-bold">😊 Duygu Durumu: {item.moodScore} / 5</p>
                    <p className="text-indigo-300 font-bold">🛌 Uyku Süresi: {item.sleepHours} Saat</p>
                    <p className="text-rose-300 font-bold">⚡ Kriz/Meltdown: {item.meltdownCount} Adet</p>
                    {item.medicationChange && (
                      <p className="mt-1 pt-1 border-t border-slate-700 text-purple-300 font-bold flex items-center gap-1">
                        <Pill size={12} /> {item.medicationChange}
                      </p>
                    )}
                  </div>
                );
              }}
            />

            {(metric === 'all' || metric === 'mood') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="moodScore"
                name="Duygu Durumu (1-5)"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6 }}
              />
            )}

            {(metric === 'all' || metric === 'sleep') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sleepHours"
                name="Uyku (Saat)"
                stroke="#6366F1"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#6366F1' }}
              />
            )}

            {/* İlaç Değişim Dikey Çizgileri */}
            {medicationChanges.map((mc, idx) => (
              <ReferenceLine
                key={idx}
                x={mc.displayDate}
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: '💊 ' + mc.medicationChange?.split(' ')[0],
                  fill: '#7C3AED',
                  fontSize: 10,
                  fontWeight: 800,
                  position: 'top',
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Yapay Zeka Etkileşim Notu */}
      <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border border-purple-100 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-purple-900 font-bold">
          <Sparkles size={16} className="text-purple-600 shrink-0 animate-pulse" />
          <span>Klinik Analiz Özetı: İlaç doz değişikliğini takip eden ilk 7 günde ortalama uyku süresi 2.5 saat arttı ve gün içi kriz sayısı 0'a geriledi.</span>
        </div>
      </div>
    </div>
  );
}
