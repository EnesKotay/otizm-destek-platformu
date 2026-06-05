import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, Moon, Smile, BookOpen, Award, Baby, Calendar, ClipboardList, Printer, Download, Lightbulb, Activity, Target, ArrowRight, AlertCircle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { moodService } from '@/services/moodService';
import { sleepService } from '@/services/sleepService';
import { noteService } from '@/services/noteService';
import { milestoneService } from '@/services/milestoneService';
import { appointmentService } from '@/services/appointmentService';
import { screeningService } from '@/services/screeningService';
import { aiInsightsService } from '@/services/aiInsightsService';
import type { Child } from '@/types';

const MOOD_EMOJI: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

function dateRangeOf(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function latestDateLabel(values: Array<string | undefined>) {
  const latest = values
    .filter(Boolean)
    .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0];

  return latest ? new Date(latest).toLocaleDateString('tr-TR') : 'Henüz yok';
}

function StatCard({ icon: Icon, label, value, color, tone }: {
  icon: ElementType; label: string; value: string | number; color: string; tone: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm min-h-[116px] flex items-center gap-3 ${tone}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight text-gray-950 break-words">{value}</p>
        <p className="text-xs leading-5 text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({ icon: Icon, title, iconClass, children, className = '' }: {
  icon: ElementType; title: string; iconClass: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 min-h-[292px] ${className}`}>
      <h3 className="text-sm font-semibold text-gray-800 mb-5 flex items-center gap-2">
        <Icon size={16} className={iconClass} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyChart({ children, height = 'h-[220px]' }: { children: ReactNode; height?: string }) {
  return (
    <div className={`${height} flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 text-center px-4`}>
      <AlertCircle size={18} className="text-gray-300" />
      <p className="text-sm text-gray-400">{children}</p>
    </div>
  );
}

function ProgressMetric({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="text-gray-400">{detail}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

interface ChildAnalyticsProps { child: Child; rangeDays: number; compact?: boolean }

function ChildAnalytics({ child, rangeDays, compact = false }: ChildAnalyticsProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { from, to } = dateRangeOf(rangeDays);

  const { data: moodData = [] } = useQuery({
    queryKey: ['mood-range', child.id, from, to],
    queryFn: () => moodService.getRange(child.id, from, to),
  });

  const { data: sleepData = [] } = useQuery({
    queryKey: ['sleep-range', child.id, from, to],
    queryFn: () => sleepService.getRange(child.id, from, to),
  });

  const { data: notesPage } = useQuery({
    queryKey: ['notes', child.id],
    queryFn: () => noteService.getByChild(child.id, 0, 200),
  });
  const notes = notesPage?.content ?? [];

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', child.id],
    queryFn: () => milestoneService.getByChild(child.id),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-analytics', child.id],
    queryFn: () => appointmentService.getAll().then(data => data.filter(a => a.childId === child.id)),
  });

  const { data: screeningResults = [] } = useQuery({
    queryKey: ['screenings-analytics', child.id],
    queryFn: () => screeningService.getByChild(child.id).catch(() => []),
  });

  const completedAppointments = appointments.filter(a => a.status === 'COMPLETED').length;
  const pendingAppointments = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length;

  const appointmentsByMonth = appointments.reduce<Record<string, number>>((acc, a) => {
    const month = a.date?.slice(0, 7) || '';
    if (month) acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const appointmentChartData = Object.entries(appointmentsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ ay: month.slice(5) + '/' + month.slice(2, 4), randevu: count }));

  const screeningChartData = [...screeningResults]
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .slice(-6)
    .map(s => ({
      tarih: new Date(s.createdAt || 0).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
      skor: s.score,
    }));

  const avgMood = moodData.length
    ? (moodData.reduce((s, m) => s + m.moodLevel, 0) / moodData.length).toFixed(1)
    : '—';

  const avgSleep = sleepData.length
    ? Math.round(sleepData.reduce((s, e) => s + (e.durationMinutes || 0), 0) / sleepData.length)
    : 0;

  const avgSleepHours = avgSleep ? `${Math.floor(avgSleep / 60)}s ${avgSleep % 60}dk` : '—';

  const moodChartData = moodData.map(e => ({
    date: formatDate(e.entryDate),
    ruhHali: e.moodLevel,
  }));

  const sleepChartData = sleepData.map(e => ({
    date: formatDate(e.sleepDate),
    süre: e.durationMinutes ? Math.round(e.durationMinutes / 60 * 10) / 10 : 0,
    kalite: e.quality || 0,
  }));

  const milestonesByCategory = milestones.reduce<Record<string, number>>((acc, m) => {
    const cat = m.category || 'Diğer';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const radarData = Object.entries(milestonesByCategory).map(([name, value]) => ({ name, value }));

  const milestonesByMonth = milestones.reduce<Record<string, number>>((acc, m) => {
    const month = m.achievedDate?.slice(0, 7) || '';
    if (month) acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const milestoneTimelineData = Object.entries(milestonesByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      ay: new Date(month + '-01').toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
      taş: count,
    }));

  const notesByMonth = notes.reduce<Record<string, number>>((acc, n) => {
    const month = n.noteDate?.slice(0, 7) || n.createdAt.slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const notesChartData = Object.entries(notesByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ ay: month.slice(5) + '/' + month.slice(2, 4), not: count }));

  // Insights
  const insights: string[] = [];
  if (moodData.length >= 3) {
    const num = parseFloat(avgMood as string);
    if (!isNaN(num)) {
      if (num >= 4) insights.push(`Son ${rangeDays} günde ortalama ruh hali ${avgMood}/5 ile oldukça yüksek.`);
      else if (num < 3) insights.push(`Son ${rangeDays} günde ortalama ruh hali ${avgMood}/5 — bazı güçlükler olabilir.`);
    }
  }
  if (avgSleep > 0) {
    const hours = Math.floor(avgSleep / 60);
    if (hours < 8) insights.push(`Ortalama uyku süresi ${avgSleepHours} — yeterli dinlenme için 8-10 saat önerilir.`);
    else insights.push(`Uyku düzeni iyi: ortalama ${avgSleepHours}.`);
  }
  if (milestones.length > 0) {
    const topCat = Object.entries(milestonesByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topCat) insights.push(`En fazla kilometre taşı "${topCat[0]}" alanında (${topCat[1]} adet).`);
  }
  if (completedAppointments > 0) {
    insights.push(`${completedAppointments} randevu tamamlandı${pendingAppointments > 0 ? `, ${pendingAppointments} aktif randevu devam ediyor` : ''}.`);
  }

  const avgMoodNumber = Number(avgMood);
  const moodScore = Number.isFinite(avgMoodNumber) ? (avgMoodNumber / 5) * 100 : 0;
  const sleepScore = avgSleep ? Math.min(avgSleep / 600, 1) * 100 : 0;
  const activityScore = Math.min((notes.length + milestones.length + completedAppointments + screeningResults.length) / 8, 1) * 100;
  const dataTypesWithRecords = [
    moodData.length > 0,
    sleepData.length > 0,
    notes.length > 0,
    milestones.length > 0,
    appointments.length > 0,
    screeningResults.length > 0,
  ].filter(Boolean).length;
  const dataCoverageScore = Math.round((dataTypesWithRecords / 6) * 100);
  const wellbeingScore = Math.round((moodScore * 0.3) + (sleepScore * 0.3) + (activityScore * 0.2) + (dataCoverageScore * 0.2));
  const scoreMeta = wellbeingScore >= 75
    ? { label: 'Güçlü takip', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', color: '#10b981' }
    : wellbeingScore >= 45
      ? { label: 'Takip gelişiyor', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', color: '#6366f1' }
      : { label: 'Veri bekleniyor', className: 'bg-amber-50 text-amber-700 border-amber-200', color: '#f59e0b' };

  const actionItems = [
    !moodData.length && { to: '/gunluk-takip', icon: Smile, label: 'Ruh hali kaydı ekle', detail: 'Duygu trendi için günlük kayıt girin.' },
    !sleepData.length && { to: '/gunluk-takip', icon: Moon, label: 'Uyku kaydı ekle', detail: 'Uyku grafiğini düzenli veriyle güçlendirin.' },
    !notes.length && { to: '/notlar', icon: BookOpen, label: 'Gelişim notu yaz', detail: 'Gözlemleri kısa notlarla biriktirin.' },
    !milestones.length && { to: '/tedavi', icon: Award, label: 'Kilometre taşı ekle', detail: 'Yeni becerileri gelişim akışına bağlayın.' },
    !screeningResults.length && { to: '/tarama', icon: ClipboardList, label: 'Tarama başlat', detail: 'Dönemsel değerlendirme verisi oluşturun.' },
  ].filter(Boolean).slice(0, 3) as Array<{ to: string; icon: ElementType; label: string; detail: string }>;
  const latestMoodDate = latestDateLabel(moodData.map(e => e.entryDate));
  const latestSleepDate = latestDateLabel(sleepData.map(e => e.sleepDate));
  const latestNoteDate = latestDateLabel(notes.map(n => n.noteDate || n.createdAt));

  // CSV veri
  const csvRows = [
    ...moodData.map(m => ({ tür: 'Ruh Hali', tarih: m.entryDate, değer: m.moodLevel, not: m.notes ?? '' })),
    ...sleepData.map(s => ({ tür: 'Uyku', tarih: s.sleepDate, değer: s.durationMinutes ? `${Math.floor(s.durationMinutes/60)}s ${s.durationMinutes%60}dk` : '', not: s.notes ?? '' })),
    ...milestones.map(ms => ({ tür: 'Milestone', tarih: ms.achievedDate, değer: ms.title, not: ms.category ?? '' })),
  ];
  (window as unknown as Record<string, unknown>).__analyticsData = csvRows;

  return (
    <div className="space-y-5">
      {!compact && (
        <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr_1fr]">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Genel durum</p>
                <h2 className="mt-1 text-lg font-bold text-gray-950">Takip özeti</h2>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap ${scoreMeta.className}`}>
                {scoreMeta.label}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-5">
              <div
                className="w-24 h-24 rounded-full p-2 shrink-0"
                style={{ background: `conic-gradient(${scoreMeta.color} ${wellbeingScore * 3.6}deg, #eef2f7 0deg)` }}
              >
                <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                  <span className="text-2xl font-bold text-gray-950">{wellbeingScore}</span>
                  <span className="text-[11px] font-medium text-gray-400">/100</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Son {rangeDays} gün</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">Kayıt yoğunluğu ve temel göstergelerden hesaplandı.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">{dataTypesWithRecords}/6 alan aktif</span>
                  <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">{rangeDays} günlük görünüm</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: 'Ruh hali', value: latestMoodDate },
                { label: 'Uyku', value: latestSleepDate },
                { label: 'Not', value: latestNoteDate },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-gray-50 px-3 py-2 min-w-0">
                  <p className="text-[11px] font-medium text-gray-400 truncate">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold leading-tight text-gray-800 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-950">Takip kalitesi</p>
                <p className="text-xs text-gray-400">{dataTypesWithRecords}/6 veri alanı dolu</p>
              </div>
            </div>
            <div className="space-y-5">
              <ProgressMetric label="Ruh hali" value={moodScore} detail={Number.isFinite(avgMoodNumber) ? `${avgMood}/5` : 'Veri yok'} color="bg-yellow-500" />
              <ProgressMetric label="Uyku" value={sleepScore} detail={avgSleepHours} color="bg-indigo-500" />
              <ProgressMetric label="Aktivite" value={activityScore} detail={`${notes.length + milestones.length + completedAppointments + screeningResults.length} kayıt`} color="bg-emerald-500" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Target size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-950">Sıradaki iyi adım</p>
                <p className="text-xs text-gray-400">Eksik alanları tamamlayın</p>
              </div>
            </div>
            {actionItems.length > 0 ? (
              <div className="space-y-2">
                {actionItems.map(item => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="group flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3 hover:bg-primary-50/70 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white text-gray-500 flex items-center justify-center group-hover:text-primary-600 shrink-0">
                      <item.icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400 truncate">{item.detail}</p>
                    </div>
                    <ArrowRight size={15} className="ml-auto text-gray-300 group-hover:text-primary-500 shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 px-3 py-3">
                <p className="text-sm font-semibold text-emerald-800">Veri kapsamı iyi görünüyor.</p>
                <p className="mt-1 text-xs leading-5 text-emerald-700">Düzeni koruyarak haftalık karşılaştırmaları takip edebilirsiniz.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insights panel */}
      <div className="bg-gradient-to-r from-indigo-50 via-white to-sky-50 border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Lightbulb size={16} />
            </div>
            <p className="text-sm font-semibold text-indigo-900">Otomatik İçgörüler</p>
            <span className="text-xs font-medium text-indigo-600 bg-white/80 border border-indigo-100 rounded-full px-2.5 py-1">Son {rangeDays} gün</span>
          </div>
          <button
            onClick={() => {
              setAiLoading(true);
              aiInsightsService.getInsights(child.id)
                .then(setAiAnalysis)
                .finally(() => setAiLoading(false));
            }}
            disabled={aiLoading}
            className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {aiLoading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lightbulb size={14} />}
            Yapay Zeka Analizi İste
          </button>
        </div>

        {aiAnalysis && (
          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm whitespace-pre-wrap text-sm text-indigo-900">
            {aiAnalysis}
          </div>
        )}

        {insights.length > 0 && (
          <ul className="grid gap-2 md:grid-cols-2">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-white/70 border border-white px-3 py-2 text-sm leading-6 text-indigo-950">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                {ins}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard icon={Smile} label={`Ort. Ruh Hali (${rangeDays}g)`} value={avgMood} color="bg-yellow-500" tone="hover:border-yellow-100" />
        <StatCard icon={Moon} label={`Ort. Uyku (${rangeDays}g)`} value={avgSleepHours} color="bg-indigo-500" tone="hover:border-indigo-100" />
        <StatCard icon={Award} label="Kilometre Taşı" value={milestones.length} color="bg-emerald-500" tone="hover:border-emerald-100" />
        <StatCard icon={BookOpen} label="Gelişim Notu" value={notes.length} color="bg-primary-500" tone="hover:border-primary-100" />
        <StatCard icon={Calendar} label="Tamamlanan Randevu" value={completedAppointments} color="bg-teal-500" tone="hover:border-teal-100" />
        <StatCard icon={ClipboardList} label="Tarama Sayısı" value={screeningResults.length} color="bg-rose-500" tone="hover:border-rose-100" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* mood chart */}
        <ChartCard icon={Smile} iconClass="text-yellow-500" title={`Ruh Hali Trendi (Son ${rangeDays} Gün)`}>
          {moodChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={moodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }}
                  tickFormatter={v => MOOD_EMOJI[v] || String(v)} />
                <Tooltip
                  formatter={(value) => {
                    const v = Number(value ?? 0);
                    return [`${MOOD_EMOJI[v]} ${v}/5`, 'Ruh Hali'];
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="ruhHali" stroke="#eab308" strokeWidth={2}
                  dot={{ fill: '#eab308', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>
              Henüz ruh hali verisi yok
            </EmptyChart>
          )}
        </ChartCard>

        {/* sleep chart */}
        <ChartCard icon={Moon} iconClass="text-indigo-500" title={`Uyku Düzeni (Son ${rangeDays} Gün)`}>
          {sleepChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sleepChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) => {
                    const v = Number(value ?? 0);
                    return [
                      name === 'süre' ? `${v} saat` : `${v}/5 ★`,
                      name === 'süre' ? 'Süre' : 'Kalite',
                    ];
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="süre" fill="#818cf8" radius={[4, 4, 0, 0]} name="süre" />
                <Bar dataKey="kalite" fill="#6ee7b7" radius={[4, 4, 0, 0]} name="kalite" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>
              Henüz uyku verisi yok
            </EmptyChart>
          )}
        </ChartCard>

        {/* milestones radar */}
        <ChartCard icon={Award} iconClass="text-emerald-500" title="Kilometre Taşları (Kategoriye Göre)">
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#f3f4f6" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="Kilometre Taşı" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Henüz kilometre taşı yok</EmptyChart>
          )}
        </ChartCard>

        {/* milestone timeline */}
        <ChartCard icon={Award} iconClass="text-emerald-500" title="Kilometre Taşı Zaman Çizgisi">
          {milestoneTimelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={milestoneTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="ay" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [Number(value ?? 0), 'Kilometre Taşı']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="taş" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Henüz kilometre taşı kaydedilmemiş</EmptyChart>
          )}
        </ChartCard>

        {/* notes bar */}
        <ChartCard icon={BookOpen} iconClass="text-primary-500" title="Not Aktivitesi (Aylık)">
          {notesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={notesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="ay" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [Number(value ?? 0), 'Not']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="not" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Henüz not girilmemiş</EmptyChart>
          )}
        </ChartCard>

        {/* appointment + screening */}
        <ChartCard icon={Calendar} iconClass="text-teal-500" title="Aylık Randevu Aktivitesi">
          {appointmentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={appointmentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="ay" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [Number(value ?? 0), 'Randevu']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="randevu" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Henüz randevu verisi yok</EmptyChart>
          )}
          {appointments.length > 0 && (
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                {completedAppointments} tamamlandı
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                {pendingAppointments} aktif
              </span>
            </div>
          )}
        </ChartCard>

        <ChartCard icon={ClipboardList} iconClass="text-rose-500" title="Tarama Skoru Trendi">
          {screeningChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={screeningChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="tarih" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)}/20`, 'Skor']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="skor" stroke="#f43f5e" strokeWidth={2}
                  dot={{ fill: '#f43f5e', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Henüz tarama verisi yok</EmptyChart>
          )}
        </ChartCard>
      </div>

      {/* milestone list */}
      {milestones.length > 0 && (
        <ChartCard icon={Award} iconClass="text-emerald-500" title="Son Kilometre Taşları" className="min-h-0">
          <div className="space-y-2">
            {milestones.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.title}</p>
                  {m.category && <span className="text-xs text-gray-400">{m.category}</span>}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(m.achievedDate).toLocaleDateString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: '7G', days: 7 },
  { label: '14G', days: 14 },
  { label: '30G', days: 30 },
  { label: '90G', days: 90 },
];

export function AnalyticsPage() {
  const { user } = useAuthStore();
  const { selectedChild: globalChild, setSelectedChild: setGlobalChild } = useChildStore();
  const [compareMode, setCompareMode] = useState(false);
  const [rangeDays, setRangeDays] = useState(30);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['children', user?.id],
    queryFn: () => childService.getAll(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!globalChild && children.length) setGlobalChild(children[0]);
  }, [children, globalChild, setGlobalChild]);

  const activeChild = globalChild ?? children[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <Baby size={48} className="text-gray-300" />
        <p className="text-gray-500">Henüz çocuk profili eklenmemiş.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-200 shrink-0">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-gray-950">Gelişim Paneli</h1>
            <p className="text-sm text-gray-500 mt-1">Ruh hali, uyku, not, randevu ve tarama verileri tek ekranda.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* Date range selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${rangeDays === opt.days ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {children.length > 1 && !compareMode && (
            <select
              value={activeChild?.id || ''}
              onChange={e => { const c = children.find(ch => ch.id === e.target.value); if (c) setGlobalChild(c); }}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {children.length > 1 && (
            <button
              onClick={() => setCompareMode(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer print:hidden shadow-sm ${compareMode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Users size={15} /> {compareMode ? 'Tek Görünüm' : 'Karşılaştır'}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer print:hidden shadow-sm"
            title="PDF / Yazdır"
          >
            <Printer size={15} /> PDF
          </button>
          {activeChild && (
            <button
              onClick={() => {
                const rows = (window as unknown as Record<string, unknown[]>).__analyticsData as Record<string, unknown>[] | undefined;
                exportCsv(rows ?? [], `gelisim-${activeChild.name}-${new Date().toISOString().slice(0,10)}.csv`);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer print:hidden shadow-sm"
              title="CSV olarak indir"
            >
              <Download size={15} /> CSV
            </button>
          )}
        </div>
      </div>

      {compareMode ? (
        <div className="space-y-8">
          <div className={`grid gap-5 ${children.length === 2 ? 'xl:grid-cols-2' : children.length >= 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
            {children.map(child => (
              <div key={child.id} className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-2xl border border-primary-100">
                  <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-800">{child.name}</p>
                    {child.diagnosisInfo && <p className="text-xs text-primary-500">{child.diagnosisInfo}</p>}
                  </div>
                </div>
                <ChildAnalytics child={child} rangeDays={rangeDays} compact />
              </div>
            ))}
          </div>
        </div>
      ) : activeChild ? (
        <>
          <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-2xl border border-primary-100">
            <div className="w-9 h-9 rounded-xl bg-white border border-primary-100 flex items-center justify-center shrink-0">
              <Baby size={17} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Aktif profil</p>
              <p className="text-sm font-semibold text-primary-800 truncate">{activeChild.name}</p>
            </div>
            {activeChild.diagnosisInfo && (
              <span className="text-xs text-primary-600 bg-white/80 border border-primary-100 rounded-full px-2.5 py-1">{activeChild.diagnosisInfo}</span>
            )}
          </div>
          <ChildAnalytics child={activeChild} rangeDays={rangeDays} />
        </>
      ) : null}
    </div>
  );
}
