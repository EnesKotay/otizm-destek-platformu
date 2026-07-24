import { useCallback, useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, Moon, Smile, BookOpen, Award, Baby, Calendar, ClipboardList, Printer,
  Download, Lightbulb, Activity, Target, ArrowRight, AlertCircle, Brain, Zap, BarChart2, Copy, Check, Info,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell,
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
import { aiInsightsService, type AnalysisType } from '@/services/aiInsightsService';
import { behaviorJournalService } from '@/services/behaviorJournalService';
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

function safeParseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(' ', 'T');
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDate(dateStr: string) {
  const d = safeParseDate(dateStr);
  return d ? `${d.getDate()}/${d.getMonth() + 1}` : '';
}

function safeLocaleDateString(dateVal: unknown, options?: Intl.DateTimeFormatOptions): string {
  const d = safeParseDate(dateVal);
  if (!d) return 'Henüz yok';
  try {
    return d.toLocaleDateString('tr-TR', options);
  } catch {
    return 'Henüz yok';
  }
}

function latestDateLabel(values: Array<string | undefined>) {
  const valid = values
    .filter((v): v is string => Boolean(v))
    .map(v => ({ raw: v, d: safeParseDate(v) }))
    .filter((item): item is { raw: string; d: Date } => item.d !== null)
    .sort((a, b) => b.d.getTime() - a.d.getTime());

  return valid.length > 0 ? safeLocaleDateString(valid[0].raw) : 'Henüz yok';
}

function StatCard({ icon: Icon, label, value, color, tone }: {
  icon: ElementType; label: string; value: string | number; color: string; tone: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm min-h-[116px] flex items-center gap-3 ${tone}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {Icon ? <Icon size={20} className="text-white" /> : null}
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
        {Icon ? <Icon size={16} className={iconClass} /> : null}
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
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-400 font-medium">{detail}</span>
      </div>
      <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

const ANALYSIS_TYPES: { type: AnalysisType; label: string; icon: ElementType; desc: string }[] = [
  { type: 'GENERAL', label: 'Genel', icon: Brain, desc: 'Korelasyon analizi' },
  { type: 'BEHAVIORAL', label: 'Davranış', icon: Zap, desc: 'ABC örüntüleri' },
  { type: 'PROGRESS', label: 'İlerleme', icon: TrendingUp, desc: 'Gelişim raporu' },
  { type: 'WEEKLY', label: 'Haftalık', icon: BarChart2, desc: '7 günlük özet' },
];

const ABC_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#14b8a6', '#8b5cf6', '#ec4899'];

function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    if (!line.trim()) { nodes.push(<div key={key++} className="h-1" />); continue; }
    const boldOnly = line.startsWith('**') && line.endsWith('**') && line.indexOf('**', 2) === line.length - 2;
    if (boldOnly) {
      nodes.push(<p key={key++} className="font-bold text-indigo-900 mt-3 mb-1">{line.slice(2, -2)}</p>);
    } else if (line.match(/^[-•]\s/)) {
      nodes.push(<li key={key++} className="text-sm leading-6 text-gray-800 ml-4 list-disc">{line.replace(/^[-•]\s/, '')}</li>);
    } else if (line.match(/^\d+\.\s/)) {
      nodes.push(<li key={key++} className="text-sm leading-6 text-gray-800 ml-4 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>);
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      nodes.push(
        <p key={key++} className="text-sm leading-6 text-gray-800">
          {parts.map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p)}
        </p>,
      );
    }
  }
  return <>{nodes}</>;
}

interface ChildAnalyticsProps { child: Child; rangeDays: number; compact?: boolean }

const MOCK_MOOD_DATA = [
  { entryDate: new Date(Date.now() - 6 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), moodLevel: 3, notes: '' },
  { entryDate: new Date(Date.now() - 5 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), moodLevel: 4, notes: '' },
  { entryDate: new Date(Date.now() - 4 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), moodLevel: 4, notes: '' },
  { entryDate: new Date(Date.now() - 3 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), moodLevel: 3, notes: '' },
  { entryDate: new Date(Date.now() - 2 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), moodLevel: 5, notes: '' },
  { entryDate: new Date(Date.now() - 1 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), moodLevel: 5, notes: '' },
  { entryDate: new Date().toISOString().slice(0, 10), moodLevel: 4, notes: '' },
];

const MOCK_SLEEP_DATA = [
  { sleepDate: new Date(Date.now() - 6 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), durationMinutes: 480, quality: 3, notes: '' },
  { sleepDate: new Date(Date.now() - 5 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), durationMinutes: 510, quality: 4, notes: '' },
  { sleepDate: new Date(Date.now() - 4 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), durationMinutes: 420, quality: 3, notes: '' },
  { sleepDate: new Date(Date.now() - 3 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), durationMinutes: 540, quality: 4, notes: '' },
  { sleepDate: new Date(Date.now() - 2 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), durationMinutes: 600, quality: 5, notes: '' },
  { sleepDate: new Date(Date.now() - 1 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), durationMinutes: 570, quality: 5, notes: '' },
  { sleepDate: new Date().toISOString().slice(0, 10), durationMinutes: 520, quality: 4, notes: '' },
];

const MOCK_MILESTONES = [
  { category: 'Sosyal Beceri', achievedDate: new Date(Date.now() - 30 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), title: 'Göz teması' },
  { category: 'Sosyal Beceri', achievedDate: new Date(Date.now() - 20 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), title: 'Sosyal oyun' },
  { category: 'Dil Gelişimi', achievedDate: new Date(Date.now() - 15 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), title: 'İki kelimelik cümle' },
  { category: 'Duyusal', achievedDate: new Date(Date.now() - 5 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), title: 'Duyusal mola rutinini uygulama' },
  { category: 'Motor Gelişim', achievedDate: new Date(Date.now() - 1 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), title: 'Denge oyununda 3 saniye durma' },
];

const MOCK_NOTES_FOR_ANALYTICS = [
  { noteDate: new Date(Date.now() - 3 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), createdAt: new Date(Date.now() - 3 * 24 * 60 * 65 * 1000).toISOString() },
  { noteDate: new Date(Date.now() - 1 * 24 * 60 * 65 * 1000).toISOString().slice(0, 10), createdAt: new Date(Date.now() - 1 * 24 * 60 * 65 * 1000).toISOString() },
];

function ChildAnalytics({ child, rangeDays, compact = false }: ChildAnalyticsProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('GENERAL');
  const [copied, setCopied] = useState(false);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const { from, to } = dateRangeOf(rangeDays);

  const [demoMode, setDemoMode] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'daily' | 'development' | 'clinical'>('daily');

  const { data: moodData = [] } = useQuery({
    queryKey: ['mood-range', child.id, from, to],
    queryFn: () => moodService.getRange(child.id, from, to).then(res => Array.isArray(res) ? res : []).catch(() => []),
  });

  const { data: sleepData = [] } = useQuery({
    queryKey: ['sleep-range', child.id, from, to],
    queryFn: () => sleepService.getRange(child.id, from, to).then(res => Array.isArray(res) ? res : []).catch(() => []),
  });

  const { data: notesPage } = useQuery({
    queryKey: ['notes', child.id],
    queryFn: () => noteService.getByChild(child.id, 0, 200).catch(() => null),
  });
  const notes = Array.isArray(notesPage?.content) ? notesPage.content : [];

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', child.id],
    queryFn: () => milestoneService.getByChild(child.id).then(res => Array.isArray(res) ? res : []).catch(() => []),
  });

  useEffect(() => {
    if (Array.isArray(moodData) && moodData.length > 0 || Array.isArray(sleepData) && sleepData.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDemoMode(false);
    }
  }, [moodData, sleepData]);

  const safeMoodData = Array.isArray(moodData) ? moodData : [];
  const safeSleepData = Array.isArray(sleepData) ? sleepData : [];
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const safeNotes = Array.isArray(notes) ? notes : [];

  const effectiveMoodData = demoMode ? MOCK_MOOD_DATA : safeMoodData;
  const effectiveSleepData = demoMode ? MOCK_SLEEP_DATA : safeSleepData;
  const effectiveMilestones = demoMode ? MOCK_MILESTONES : safeMilestones;
  const effectiveNotes = demoMode ? MOCK_NOTES_FOR_ANALYTICS : safeNotes;

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-analytics', child.id],
    queryFn: () => appointmentService.getAll()
      .then(data => Array.isArray(data) ? data.filter(a => a?.childId === child.id) : [])
      .catch(() => []),
  });

  const { data: screeningResults = [] } = useQuery({
    queryKey: ['screenings-analytics', child.id],
    queryFn: () => screeningService.getByChild(child.id).then(res => Array.isArray(res) ? res : []).catch(() => []),
  });

  const { data: abcEntries = [] } = useQuery({
    queryKey: ['abc-analytics', child.id],
    queryFn: () => behaviorJournalService.getByChild(child.id).then(res => Array.isArray(res) ? res : []).catch(() => []),
  });

  const handleAiAnalysis = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setAiAnalysis('');
    setAiStreaming(true);
    setAiLoading(false);
    const es = aiInsightsService.streamInsights(
      child.id,
      analysisType,
      (chunk) => setAiAnalysis(prev => (prev ?? '') + chunk),
      () => { setAiStreaming(false); setAnalysisTimestamp(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })); },
      () => {
        setAiStreaming(false);
        aiInsightsService.getInsights(child.id, analysisType)
          .then(text => { setAiAnalysis(text); setAnalysisTimestamp(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })); })
          .catch(() => setAiAnalysis('Analiz alınamadı. Lütfen tekrar deneyin.'));
      },
    );
    esRef.current = es;
  }, [child.id, analysisType]);

  useEffect(() => () => { esRef.current?.close(); }, []);

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
    .sort((a, b) => (safeParseDate(a.createdAt)?.getTime() ?? 0) - (safeParseDate(b.createdAt)?.getTime() ?? 0))
    .slice(-6)
    .map(s => ({
      tarih: safeLocaleDateString(s.createdAt, { month: 'short', day: 'numeric' }),
      skor: s.score,
    }));

  const abcCategoryData = Object.entries(
    abcEntries.reduce<Record<string, { count: number; totalIntensity: number }>>((acc, e) => {
      const cat = e.category || 'Diğer';
      if (!acc[cat]) acc[cat] = { count: 0, totalIntensity: 0 };
      acc[cat].count++;
      acc[cat].totalIntensity += e.intensity;
      return acc;
    }, {}),
  )
    .map(([kategori, d]) => ({ kategori, adet: d.count, yogunluk: Math.round((d.totalIntensity / d.count) * 10) / 10 }))
    .sort((a, b) => b.adet - a.adet)
    .slice(0, 8);

  const avgMood = effectiveMoodData.length
    ? (effectiveMoodData.reduce((s, m) => s + m.moodLevel, 0) / effectiveMoodData.length).toFixed(1)
    : '—';

  const avgSleep = effectiveSleepData.length
    ? Math.round(effectiveSleepData.reduce((s, e) => s + (e.durationMinutes || 0), 0) / effectiveSleepData.length)
    : 0;

  const avgSleepHours = avgSleep ? `${Math.floor(avgSleep / 60)}s ${avgSleep % 60}dk` : '—';

  const moodChartData = effectiveMoodData.map(e => ({
    date: formatDate(e.entryDate),
    ruhHali: e.moodLevel,
  }));

  const sleepChartData = effectiveSleepData.map(e => ({
    date: formatDate(e.sleepDate),
    süre: e.durationMinutes ? Math.round(e.durationMinutes / 60 * 10) / 10 : 0,
    kalite: e.quality || 0,
  }));

  const milestonesByCategory = effectiveMilestones.reduce<Record<string, number>>((acc, m) => {
    const cat = m.category || 'Diğer';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const radarData = Object.entries(milestonesByCategory).map(([name, value]) => ({ name, value }));

  const milestonesByMonth = effectiveMilestones.reduce<Record<string, number>>((acc, m) => {
    const month = m.achievedDate?.slice(0, 7) || '';
    if (month) acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const milestoneTimelineData = Object.entries(milestonesByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      ay: safeLocaleDateString(month ? month + '-01' : '', { month: 'short', year: '2-digit' }),
      taş: count,
    }));

  const notesByMonth = effectiveNotes.reduce<Record<string, number>>((acc, n) => {
    const dateStr = n.noteDate || n.createdAt;
    const month = typeof dateStr === 'string' ? dateStr.slice(0, 7) : '';
    if (month) acc[month] = (acc[month] || 0) + 1;
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
  const activityScore = Math.min((effectiveNotes.length + effectiveMilestones.length + completedAppointments + screeningResults.length) / 8, 1) * 100;
  const dataTypesWithRecords = [
    effectiveMoodData.length > 0,
    effectiveSleepData.length > 0,
    effectiveNotes.length > 0,
    effectiveMilestones.length > 0,
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
    !effectiveMoodData.length && { to: '/gunluk-takip', icon: Smile, label: 'Ruh hali kaydı ekle', detail: 'Duygu trendi için günlük kayıt girin.' },
    !effectiveSleepData.length && { to: '/gunluk-takip', icon: Moon, label: 'Uyku kaydı ekle', detail: 'Uyku grafiğini düzenli veriyle güçlendirin.' },
    !effectiveNotes.length && { to: '/notlar', icon: BookOpen, label: 'Gelişim notu yaz', detail: 'Gözlemleri kısa notlarla biriktirin.' },
    !effectiveMilestones.length && { to: '/tedavi', icon: Award, label: 'Kilometre taşı ekle', detail: 'Yeni becerileri gelişim akışına bağlayın.' },
    !screeningResults.length && { to: '/cocuklarim?view=screening', icon: ClipboardList, label: 'Tarama başlat', detail: 'Dönemsel değerlendirme verisi oluşturun.' },
  ].filter(Boolean).slice(0, 3) as Array<{ to: string; icon: ElementType; label: string; detail: string }>;
  const latestMoodDate = latestDateLabel(effectiveMoodData.map(e => e.entryDate));
  const latestSleepDate = latestDateLabel(effectiveSleepData.map(e => e.sleepDate));
  const latestNoteDate = latestDateLabel(effectiveNotes.map(n => n.noteDate || n?.createdAt));

  // CSV veri
  const csvRows = [
    ...effectiveMoodData.map(m => ({ tür: 'Ruh Hali', tarih: m.entryDate, değer: m.moodLevel, not: m.notes ?? '' })),
    ...effectiveSleepData.map(s => ({ tür: 'Uyku', tarih: s.sleepDate, değer: s.durationMinutes ? `${Math.floor(s.durationMinutes/60)}s ${s.durationMinutes%60}dk` : '', not: s.notes ?? '' })),
    ...effectiveMilestones.map(ms => ({ tür: 'Milestone', tarih: ms.achievedDate, değer: ms.title, not: ms.category ?? '' })),
  ];
  // eslint-disable-next-line react-hooks/immutability
  (window as unknown as Record<string, unknown>).__analyticsData = csvRows;

  return (
    <div className="space-y-5">
      {demoMode && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 mt-0.5 shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Şu an örnek (demo) verileri görüntülüyorsunuz.</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Kendi günlük takipleriniz girildiğinde bu veriler gizlenecektir.</p>
            </div>
          </div>
          <button
            onClick={() => setDemoMode(false)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-150 rounded-xl px-4 py-2 hover:shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Demo Modunu Kapat
          </button>
        </div>
      )}

      {!compact && (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {/* Takip Özeti */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Genel Durum</p>
                  <h2 className="mt-1 text-lg font-bold text-gray-950">Takip Özeti</h2>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${scoreMeta.className}`}>
                  {scoreMeta.label}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-5">
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={scoreMeta.color}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * wellbeingScore) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-gray-950 leading-none">{wellbeingScore}</span>
                    <span className="text-[9px] font-bold text-gray-400 mt-0.5">/100</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900">Son {rangeDays} gün</p>
                  <p
                    className="mt-1 flex items-start gap-1 text-[11px] leading-relaxed text-gray-500"
                    title="Puan; ruh hali, uyku, aktivite kayıtları ve doldurulan veri alanı sayısına göre hesaplanır."
                  >
                    <span>Ruh hali, uyku ve aktivite kayıtlarından hesaplandı.</span>
                    <Info size={11} className="mt-0.5 shrink-0 text-gray-300" />
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-100">{rangeDays} günlük görünüm</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-gray-100/70 pt-4">
              {[
                { label: 'Ruh Hali', value: latestMoodDate, dotColor: 'bg-yellow-500' },
                { label: 'Uyku', value: latestSleepDate, dotColor: 'bg-indigo-500' },
                { label: 'Notlar', value: latestNoteDate, dotColor: 'bg-primary-500' },
              ].map(item => (
                <div key={item.label} className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor}`} />
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{item.label}</p>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-gray-700 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Takip Kalitesi */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[260px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-950">Takip kalitesi</p>
                <p className="text-xs text-gray-400">{dataTypesWithRecords}/6 veri alanı dolu</p>
              </div>
            </div>
            <div className="space-y-4 my-auto">
              <ProgressMetric label="Ruh hali" value={moodScore} detail={Number.isFinite(avgMoodNumber) ? `${avgMood}/5` : 'Veri yok'} color="bg-yellow-500" />
              <ProgressMetric label="Uyku" value={sleepScore} detail={avgSleep ? `${avgSleepHours} (hedef 8-10 sa)` : 'Veri yok'} color="bg-indigo-500" />
              <ProgressMetric label="Aktivite" value={activityScore} detail={`${notes.length + milestones.length + completedAppointments + screeningResults.length}/8 kayıt`} color="bg-emerald-500" />
            </div>
          </div>

          {/* Sıradaki İyi Adım */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[260px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <Target size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-950">Sıradaki iyi adım</p>
                <p className="text-xs text-gray-400">Eksik alanları tamamlayın</p>
              </div>
            </div>
            {actionItems.length > 0 ? (
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                {actionItems.map(item => {
                  const ActionIcon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="group flex items-center gap-3 rounded-xl bg-gray-50/50 border border-gray-100/50 px-3 py-2 hover:bg-primary-50/50 hover:border-primary-100 transition-all duration-150"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white text-gray-500 flex items-center justify-center group-hover:text-primary-600 shrink-0 border border-gray-100/60 shadow-sm">
                        {ActionIcon ? <ActionIcon size={15} /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800">{item.label}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.detail}</p>
                      </div>
                      <ArrowRight size={14} className="ml-auto text-gray-350 group-hover:text-primary-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50/50 border border-emerald-100/50 px-4 py-4 my-auto">
                <p className="text-xs font-bold text-emerald-800">Veri kapsamı iyi görünüyor.</p>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">Düzeni koruyarak haftalık karşılaştırmaları takip edebilirsiniz.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Analiz Paneli */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 border border-indigo-100/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-indigo-100/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <Brain size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-indigo-900">Yapay Zeka Analisti</h3>
                <p className="text-xs text-indigo-400">Gemini ile güçlendirilmiş gelişim analizi</p>
              </div>
            </div>
            {analysisTimestamp && (
              <span className="text-xs text-indigo-500 bg-white border border-indigo-100/80 rounded-full px-2.5 py-1 font-semibold">
                Son analiz: {analysisTimestamp}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
            {/* Left Controls & Insights */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-indigo-900/60 uppercase tracking-wider mb-2">Analiz Türü</p>
                <div className="grid grid-cols-2 gap-2">
                  {ANALYSIS_TYPES.map(opt => {
                    const Icon = opt.icon;
                    const active = analysisType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        onClick={() => { setAnalysisType(opt.type); setAiAnalysis(null); }}
                        className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          active
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                            : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/30'
                        }`}
                      >
                        {Icon ? <Icon size={14} className={active ? 'text-white' : 'text-indigo-500'} /> : null}
                        <span className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-800'}`}>{opt.label}</span>
                        <span className={`text-[9px] leading-tight ${active ? 'text-indigo-200' : 'text-gray-400'}`}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleAiAnalysis}
                disabled={aiStreaming || aiLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-all duration-150 shadow-md shadow-indigo-600/10 cursor-pointer active:scale-[0.98]"
              >
                {(aiStreaming || aiLoading) ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analiz ediliyor…
                  </>
                ) : (
                  <>
                    <Lightbulb size={15} />
                    {ANALYSIS_TYPES.find(t => t.type === analysisType)?.label} Analizini Başlat
                  </>
                )}
              </button>

              {/* Hızlı içgörüler */}
              {insights.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-indigo-900/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lightbulb size={13} className="text-indigo-500" /> Otomatik Tespitler
                  </p>
                  <ul className="space-y-1.5">
                    {insights.map((ins, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-xl bg-white/60 border border-white/40 p-2.5 text-[11px] leading-normal text-indigo-950 font-medium">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Results Pane */}
            <div className="lg:col-span-7 flex flex-col">
              {aiAnalysis !== null ? (
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm flex flex-col flex-1 min-h-[250px]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <span className="text-xs font-bold text-indigo-600">
                      {ANALYSIS_TYPES.find(t => t.type === analysisType)?.label} Sonucu
                    </span>
                    {aiAnalysis && !aiStreaming && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiAnalysis).then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          });
                        }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {copied ? 'Kopyalandı' : 'Kopyala'}
                      </button>
                    )}
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto max-h-[350px] leading-relaxed text-xs text-slate-700">
                    {renderMarkdown(aiAnalysis)}
                    {aiStreaming && (
                      <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center p-8 text-center flex-1 min-h-[220px] bg-white/20">
                  <Brain className="text-indigo-300 mb-3 animate-pulse-slow" size={32} />
                  <p className="text-sm font-semibold text-indigo-900">Analiz Raporu Hazır Değil</p>
                  <p className="text-xs text-indigo-400 mt-1 max-w-sm">Sol taraftan analiz türünü seçip "Analizi Başlat" butonuna tıklayarak akıllı çıkarımları görebilirsiniz.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Smile} label={`Ort. Ruh Hali (${rangeDays}g)`} value={avgMood} color="bg-yellow-500" tone="hover:border-yellow-100" />
        <StatCard icon={Moon} label={`Ort. Uyku (${rangeDays}g)`} value={avgSleepHours} color="bg-indigo-500" tone="hover:border-indigo-100" />
        <StatCard icon={Award} label="Kilometre Taşı" value={effectiveMilestones.length} color="bg-emerald-500" tone="hover:border-emerald-100" />
        <StatCard icon={BookOpen} label="Gelişim Notu" value={effectiveNotes.length} color="bg-primary-500" tone="hover:border-primary-100" />
        <StatCard icon={Calendar} label="Tamamlanan Randevu" value={completedAppointments} color="bg-teal-500" tone="hover:border-teal-100" />
        <StatCard icon={ClipboardList} label="Tarama Sayısı" value={screeningResults.length} color="bg-rose-500" tone="hover:border-rose-100" />
      </div>

      {/* Grafik Sekmeleri */}
      <div className="border-b border-gray-200/50 pb-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'daily', label: 'Günlük Gözlemler', desc: 'Ruh hali, uyku ve davranışlar', icon: Activity, activeBg: 'from-blue-500 to-indigo-650 shadow-blue-105' },
            { id: 'development', label: 'Gelişim & Başarılar', desc: 'Kilometre taşları ve notlar', icon: Award, activeBg: 'from-emerald-500 to-teal-600 shadow-emerald-105' },
            { id: 'clinical', label: 'Klinik ve Taramalar', desc: 'Randevular ve test skorları', icon: ClipboardList, activeBg: 'from-rose-500 to-rose-600 shadow-rose-105' },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeChartTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveChartTab(tab.id as 'daily' | 'development' | 'clinical')}
                className={`relative flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                  active
                    ? `bg-gradient-to-r ${tab.activeBg} border-transparent text-white shadow-lg`
                    : 'bg-white dark:bg-gray-900 border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50 text-slate-650 dark:text-slate-400'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100/70 dark:bg-gray-800 text-slate-500'
                }`}>
                  {Icon ? <Icon size={18} strokeWidth={active ? 2.2 : 1.8} /> : null}
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold leading-tight ${active ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                    {tab.label}
                  </div>
                  <div className={`text-[10px] leading-snug mt-0.5 font-semibold ${active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grafikler Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {activeChartTab === 'daily' && (
          <>
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
                  <div className="flex flex-col items-center gap-1.5">
                    <span>Henüz ruh hali verisi yok</span>
                    <button
                      type="button"
                      onClick={() => setDemoMode(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Örnek Grafik Verisini Göster
                    </button>
                  </div>
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
                  <div className="flex flex-col items-center gap-1.5">
                    <span>Henüz uyku verisi yok</span>
                    <button
                      type="button"
                      onClick={() => setDemoMode(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Örnek Grafik Verisini Göster
                    </button>
                  </div>
                </EmptyChart>
              )}
            </ChartCard>

            {/* ABC Davranış Kategorileri */}
            <ChartCard icon={Zap} iconClass="text-amber-500" title="Davranış Kategorileri (Sıklık & Yoğunluk)" className="xl:col-span-2">
              {abcCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={abcCategoryData} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="kategori" type="category" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'adet' ? `${value} kayıt` : `${value}/5 ort. yoğunluk`,
                        name === 'adet' ? 'Sıklık' : 'Yoğunluk',
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="adet" name="adet" radius={[0, 4, 4, 0]}>
                      {abcCategoryData.map((_, i) => (
                        <Cell key={i} fill={ABC_COLORS[i % ABC_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart>Davranış günlüğünde henüz kayıt yok</EmptyChart>
              )}
            </ChartCard>
          </>
        )}

        {activeChartTab === 'development' && (
          <>
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
            <ChartCard icon={BookOpen} iconClass="text-primary-500" title="Not Aktivitesi (Aylık)" className="xl:col-span-2">
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

            {/* milestone list */}
            {milestones.length > 0 && (
              <ChartCard icon={Award} iconClass="text-emerald-500" title="Son Kilometre Taşları" className="xl:col-span-2 min-h-0">
                <div className="space-y-2">
                  {milestones.slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-55 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.title}</p>
                        {m.category && <span className="text-xs text-gray-400">{m.category}</span>}
                      </div>
                      <span className="text-xs text-gray-400">
                        {safeLocaleDateString(m.achievedDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </>
        )}

        {activeChartTab === 'clinical' && (
          <>
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
          </>
        )}
      </div>
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

  const { data: rawChildren = [], isLoading } = useQuery({
    queryKey: ['children', user?.id],
    queryFn: () => childService.getAll().then(res => Array.isArray(res) ? res : []).catch(() => []),
    enabled: !!user,
  });

  const children = useMemo(() => Array.isArray(rawChildren) ? rawChildren : [], [rawChildren]);

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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold leading-tight text-gray-950">Nasıl İlerliyoruz?</h1>
              {activeChild && !compareMode && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 text-xs font-bold ring-1 ring-primary-100/50 dark:ring-primary-900/30">
                  <Baby size={12} className="text-primary-500" />
                  <span>{activeChild.name}</span>
                  {activeChild.diagnosisInfo && !activeChild.diagnosisInfo.startsWith('enc:v1:') && (
                    <span className="text-[10px] opacity-75 font-semibold leading-none border-l border-primary-200 dark:border-primary-800 pl-1.5 ml-0.5">
                      {activeChild.diagnosisInfo}
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Çocuğunuzun zaman içinde nasıl geliştiğini buradan görebilirsiniz.</p>
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
                    {(child.name || 'Ç').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-800">{child.name || 'İsimsiz Çocuk'}</p>
                    {child.diagnosisInfo && !child.diagnosisInfo.startsWith('enc:v1:') && <p className="text-xs text-primary-500">{child.diagnosisInfo}</p>}
                  </div>
                </div>
                <ChildAnalytics child={child} rangeDays={rangeDays} compact />
              </div>
            ))}
          </div>
        </div>
      ) : activeChild ? (
        <ChildAnalytics child={activeChild} rangeDays={rangeDays} />
      ) : null}
    </div>
  );
}
