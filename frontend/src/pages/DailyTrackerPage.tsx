import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill, Smile, Moon, Plus, Check, Pencil, Trash2, ChevronDown, ChevronUp, Bell, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { medicationService } from '@/services/medicationService';
import { moodService } from '@/services/moodService';
import { sleepService } from '@/services/sleepService';
import { toast } from '@/store/toastStore';
import type { Medication, MoodEntry, SleepEntry } from '@/types';

const TODAY = new Date().toISOString().split('T')[0];

const COMMON_SIDE_EFFECTS = [
  'Uyku Hali',
  'İştahsızlık',
  'Huzursuzluk',
  'Hiperaktivite',
  'Bulantı / Kusma',
  'Baş Ağrısı',
  'Ağız Kuruluğu',
  'Kabızlık / İshal',
];

const MOOD_OPTIONS = [
  { level: 1, emoji: '😢', label: 'Çok Kötü', activeColor: 'border-rose-500 bg-rose-500 text-white shadow-rose-100 shadow-md scale-105', passiveColor: 'border-rose-100 bg-rose-50/50 hover:border-rose-300 text-rose-700 hover:bg-rose-50' },
  { level: 2, emoji: '😕', label: 'Kötü',    activeColor: 'border-orange-500 bg-orange-500 text-white shadow-orange-100 shadow-md scale-105', passiveColor: 'border-orange-100 bg-orange-50/50 hover:border-orange-300 text-orange-700 hover:bg-orange-50' },
  { level: 3, emoji: '😐', label: 'Orta',    activeColor: 'border-amber-500 bg-amber-500 text-white shadow-amber-100 shadow-md scale-105', passiveColor: 'border-amber-100 bg-amber-50/50 hover:border-amber-300 text-amber-700 hover:bg-amber-50' },
  { level: 4, emoji: '🙂', label: 'İyi',     activeColor: 'border-sky-500 bg-sky-500 text-white shadow-sky-100 shadow-md scale-105', passiveColor: 'border-sky-100 bg-sky-50/50 hover:border-sky-300 text-sky-700 hover:bg-sky-50' },
  { level: 5, emoji: '😄', label: 'Harika',  activeColor: 'border-emerald-500 bg-emerald-500 text-white shadow-emerald-100 shadow-md scale-105', passiveColor: 'border-emerald-100 bg-emerald-50/50 hover:border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
];

const MOOD_TRIGGERS = [
  'Uykusuzluk',
  'Duyusal Hassasiyet (Gürültü/Işık)',
  'Rutin Değişikliği',
  'Sosyal Kaygı',
  'Terapi Sonrası Yorgunluk',
  'İletişim Engeli (İfade Edememe)',
  'Açlık / Susuzluk',
  'Fiziksel Rahatsızlık',
  'Beklenmedik Geçişler'
];

const FREQUENCIES = [
  { value: 'DAILY',         label: 'Günde 1' },
  { value: 'TWICE_DAILY',   label: 'Günde 2' },
  { value: 'THREE_DAILY',   label: 'Günde 3' },
  { value: 'AS_NEEDED',     label: 'Gerektiğinde' },
  { value: 'WEEKLY',        label: 'Haftalık' },
];

const QUALITY_LABELS = ['', 'Çok Kötü', 'Kötü', 'Orta', 'İyi', 'Harika'];

// Format: "Weighted:true|Sensory:false|Melatonin:true|Disturbance:false|Notes:Asıl not metni..."
const serializeSleepNotes = (notesText: string, flags: { weightedBlanket: boolean, sensoryIssues: boolean, melatonin: boolean, noiseLightDisturbance: boolean }) => {
  return `Weighted:${flags.weightedBlanket}|Sensory:${flags.sensoryIssues}|Melatonin:${flags.melatonin}|Disturbance:${flags.noiseLightDisturbance}|Notes:${notesText}`;
};

const deserializeSleepNotes = (serialized = '') => {
  const defaultFlags = { weightedBlanket: false, sensoryIssues: false, melatonin: false, noiseLightDisturbance: false, notesText: '' };
  if (!serialized.startsWith('Weighted:')) {
    return { ...defaultFlags, notesText: serialized };
  }
  const parts = serialized.split('|');
  const flags: Record<string, string | boolean> = {};
  parts.forEach(p => {
    const idx = p.indexOf(':');
    if (idx !== -1) {
      const key = p.substring(0, idx);
      const val = p.substring(idx + 1);
      if (key === 'Notes') {
        flags.notesText = val;
      } else {
        const flagKey = key === 'Weighted' ? 'weightedBlanket' :
                        key === 'Sensory' ? 'sensoryIssues' :
                        key === 'Melatonin' ? 'melatonin' :
                        key === 'Disturbance' ? 'noiseLightDisturbance' : null;
        if (flagKey) {
          flags[flagKey] = val === 'true';
        }
      }
    }
  });
  return { ...defaultFlags, ...flags };
};

export function DailyTrackerPage() {
  return <DailyTrackerCore />;
}

function DailyTrackerCore() {
  const [tab, setTab] = useState<'medication' | 'mood' | 'sleep'>('mood');
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';

  const [deleteMedConfirm, setDeleteMedConfirm] = useState<string | null>(null);
  const [deleteMoodConfirm, setDeleteMoodConfirm] = useState<string | null>(null);
  const [deleteSleepConfirm, setDeleteSleepConfirm] = useState<string | null>(null);

  // Medication state
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [medForm, setMedForm] = useState({ name: '', dosage: '', unit: 'mg', frequency: 'DAILY', scheduledTimes: '', notes: '', currentStock: '', stockAlertThreshold: '' });
  const [savingMed, setSavingMed] = useState(false);
  const [expandedMed, setExpandedMed] = useState<string | null>(null);

  // Medication Dose Log Modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeLogMed, setActiveLogMed] = useState<Medication | null>(null);
  const [activeLogTime, setActiveLogTime] = useState('');
  const [logFormTaken, setLogFormTaken] = useState(true);
  const [logFormNotes, setLogFormNotes] = useState('');
  const [logFormSideEffects, setLogFormSideEffects] = useState<string[]>([]);
  const [savingLog, setSavingLog] = useState(false);

  // Mood state
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [moodLevel, setMoodLevel] = useState<number>(0);
  const [moodNotes, setMoodNotes] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [savingMood, setSavingMood] = useState(false);

  // Sleep state
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [todaySleep, setTodaySleep] = useState<SleepEntry | null>(null);
  const [sleepForm, setSleepForm] = useState({
    bedtime: '21:00',
    wakeTime: '07:00',
    quality: 3,
    nightWakings: 0,
    notes: '',
    weightedBlanket: false,
    sensoryIssues: false,
    melatonin: false,
    noiseLightDisturbance: false,
  });
  const [savingSleep, setSavingSleep] = useState(false);

  // Weekly Insights State
  const [weeklyInsights, setWeeklyInsights] = useState<{
    avgSleep: string;
    mostFrequentMood: { label: string; emoji: string } | null;
    topTrigger: string | null;
    completedDaysCount: number;
  }>({ avgSleep: '0s', mostFrequentMood: null, topTrigger: null, completedDaysCount: 0 });

  useEffect(() => {
    childService.getAll().then(c => { setChildren(c); if (c.length && !selectedChild) setSelectedChild(c[0]); }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate Weekly Insights
  useEffect(() => {
    let totalSleepMins = 0;
    let sleepCount = 0;
    sleepEntries.forEach(entry => {
      if (entry.durationMinutes) {
        totalSleepMins += entry.durationMinutes;
        sleepCount++;
      }
    });
    const avgSleepMins = sleepCount > 0 ? Math.round(totalSleepMins / sleepCount) : 0;
    const avgSleepStr = avgSleepMins > 0 
      ? `${Math.floor(avgSleepMins / 60)}s ${avgSleepMins % 60}dk`
      : 'Kayıt yok';

    const moodCounts: Record<number, number> = {};
    moodEntries.forEach(entry => {
      moodCounts[entry.moodLevel] = (moodCounts[entry.moodLevel] || 0) + 1;
    });
    let topMoodLevel = 0;
    let maxMoodCount = 0;
    Object.entries(moodCounts).forEach(([level, count]) => {
      if (count > maxMoodCount) {
        maxMoodCount = count;
        topMoodLevel = parseInt(level);
      }
    });
    const topMoodOption = MOOD_OPTIONS.find(o => o.level === topMoodLevel) || null;

    const triggerCounts: Record<string, number> = {};
    moodEntries.forEach(entry => {
      (entry.triggers || []).forEach(t => {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      });
    });
    let topTrigger = null;
    let maxTriggerCount = 0;
    Object.entries(triggerCounts).forEach(([trigger, count]) => {
      if (count > maxTriggerCount) {
        maxTriggerCount = count;
        topTrigger = trigger;
      }
    });

    const uniqueDays = new Set<string>();
    moodEntries.forEach(e => uniqueDays.add(e.entryDate));
    sleepEntries.forEach(e => uniqueDays.add(e.sleepDate));
    let completedDays = 0;
    uniqueDays.forEach(day => {
      const hasMood = moodEntries.some(e => e.entryDate === day);
      const hasSleep = sleepEntries.some(e => e.sleepDate === day);
      if (hasMood && hasSleep) completedDays++;
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeeklyInsights({
      avgSleep: avgSleepStr,
      mostFrequentMood: topMoodOption ? { label: topMoodOption.label, emoji: topMoodOption.emoji } : null,
      topTrigger,
      completedDaysCount: completedDays
    });
  }, [moodEntries, sleepEntries]);

  useEffect(() => {
    if (!selectedChildId) return;
    medicationService.getByChild(selectedChildId).then(setMedications).catch(() => {});
    moodService.getByChild(selectedChildId).then(entries => {
      setMoodEntries(entries);
      const today = entries.find(e => e.entryDate === TODAY) ?? null;
      setTodayMood(today);
      if (today) { setMoodLevel(today.moodLevel); setMoodNotes(today.notes ?? ''); setSelectedTriggers(today.triggers ?? []); }
      else { setMoodLevel(0); setMoodNotes(''); setSelectedTriggers([]); }
    }).catch(() => {});
    sleepService.getByChild(selectedChildId).then(entries => {
      setSleepEntries(entries);
      const today = entries.find(e => e.sleepDate === TODAY) ?? null;
      setTodaySleep(today);
      if (today) {
        const parsed = deserializeSleepNotes(today.notes ?? '');
        setSleepForm({
          bedtime: today.bedtime ?? '21:00',
          wakeTime: today.wakeTime ?? '07:00',
          quality: today.quality ?? 3,
          nightWakings: today.nightWakings,
          notes: parsed.notesText,
          weightedBlanket: parsed.weightedBlanket,
          sensoryIssues: parsed.sensoryIssues,
          melatonin: parsed.melatonin,
          noiseLightDisturbance: parsed.noiseLightDisturbance,
        });
      } else {
        setSleepForm({
          bedtime: '21:00',
          wakeTime: '07:00',
          quality: 3,
          nightWakings: 0,
          notes: '',
          weightedBlanket: false,
          sensoryIssues: false,
          melatonin: false,
          noiseLightDisturbance: false,
        });
      }
    }).catch(() => {});
  }, [selectedChildId]);

  // ── MED handlers ──
  const openAddMed = () => { setEditingMed(null); setMedForm({ name: '', dosage: '', unit: 'mg', frequency: 'DAILY', scheduledTimes: '', notes: '', currentStock: '', stockAlertThreshold: '' }); setShowMedModal(true); };
  const openEditMed = (m: Medication) => { setEditingMed(m); setMedForm({ name: m.name, dosage: m.dosage ?? '', unit: m.unit ?? 'mg', frequency: m.frequency ?? 'DAILY', scheduledTimes: (m.scheduledTimes ?? []).join(', '), notes: m.notes ?? '', currentStock: m.currentStock?.toString() ?? '', stockAlertThreshold: m.stockAlertThreshold?.toString() ?? '' }); setShowMedModal(true); };

  const saveMed = async () => {
    if (!medForm.name.trim()) return;
    setSavingMed(true);
    try {
      const payload = { childId: selectedChildId, name: medForm.name, dosage: medForm.dosage, unit: medForm.unit, frequency: medForm.frequency, scheduledTimes: medForm.scheduledTimes.split(',').map(s => s.trim()).filter(Boolean), notes: medForm.notes, isActive: true, currentStock: medForm.currentStock ? Number(medForm.currentStock) : undefined, stockAlertThreshold: medForm.stockAlertThreshold ? Number(medForm.stockAlertThreshold) : undefined };
      if (editingMed) {
        const updated = await medicationService.update(editingMed.id, payload);
        setMedications(prev => prev.map(m => m.id === updated.id ? updated : m));
        toast.success('İlaç güncellendi.');
      } else {
        const created = await medicationService.create(payload);
        setMedications(prev => [...prev, created]);
        toast.success('İlaç eklendi.');
      }
      setShowMedModal(false);
    } catch { toast.error('Kaydedilemedi.'); }
    setSavingMed(false);
  };

  const deleteMed = async (id: string) => {
    try { await medicationService.delete(id); setMedications(prev => prev.filter(m => m.id !== id)); toast.success('İlaç silindi.'); }
    catch { toast.error('Silinemedi.'); }
    setDeleteMedConfirm(null);
  };

  // İlaç hatırlatma — ilaç saatinden 5 dk önce tarayıcı bildirimi
  useEffect(() => {
    if (!medications.length) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    medications.forEach(med => {
      (med.scheduledTimes ?? []).forEach(timeStr => {
        if (!timeStr) return;
        const [h, m] = timeStr.split(':').map(Number);
        const target = new Date(todayStr);
        target.setHours(h, m, 0, 0);
        const alertAt = new Date(target.getTime() - 5 * 60 * 1000);
        const ms = alertAt.getTime() - now.getTime();
        if (ms > 0 && ms < 24 * 60 * 60 * 1000) {
          const log = med.todayLogs?.find(l => l.scheduledTime === timeStr);
          if (log?.taken) return;
          timers.push(setTimeout(() => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`💊 İlaç Zamanı`, {
                body: `${med.name} (${med.dosage ?? ''} ${med.unit ?? ''}) — ${timeStr}`,
                tag: `med-${med.id}-${timeStr}`,
              });
            } else {
              toast.error(`💊 ${med.name} için ilaç zamanı geliyor! (${timeStr})`);
            }
          }, ms));
        }
      });
    });

    return () => timers.forEach(clearTimeout);
  }, [medications]);

  const openLogModal = (med: Medication, time: string) => {
    const existingLog = med.todayLogs?.find(l => l.scheduledTime === time);
    setActiveLogMed(med);
    setActiveLogTime(time);
    setLogFormTaken(existingLog ? existingLog.taken : true);
    setLogFormNotes(existingLog?.notes ?? '');
    setLogFormSideEffects(existingLog?.sideEffects ?? []);
    setShowLogModal(false); // reset state first
    setShowLogModal(true);
  };

  const handleSaveLog = async () => {
    if (!activeLogMed) return;
    setSavingLog(true);
    try {
      const payload = {
        logDate: TODAY,
        scheduledTime: activeLogTime,
        taken: logFormTaken,
        notes: logFormNotes,
        sideEffects: logFormSideEffects,
      };
      const log = await medicationService.saveLog(activeLogMed.id, payload);
      setMedications(prev => prev.map(m => {
        if (m.id !== activeLogMed.id) return m;
        const logs = m.todayLogs ?? [];
        const existing = logs.findIndex(l => l.scheduledTime === activeLogTime);
        if (existing >= 0) return { ...m, todayLogs: logs.map((l, i) => i === existing ? log : l) };
        return { ...m, todayLogs: [...logs, log] };
      }));
      toast.success('Doz günlüğü başarıyla kaydedildi.');
      setShowLogModal(false);
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setSavingLog(false);
    }
  };

  // ── MOOD handlers ──
  const saveMood = async () => {
    if (!moodLevel) return;
    setSavingMood(true);
    try {
      const saved = await moodService.upsert({ childId: selectedChildId, moodLevel: moodLevel as MoodEntry['moodLevel'], notes: moodNotes, triggers: selectedTriggers, entryDate: TODAY });
      setTodayMood(saved);
      setMoodEntries(prev => { const idx = prev.findIndex(e => e.id === saved.id); return idx >= 0 ? prev.map((e, i) => i === idx ? saved : e) : [saved, ...prev]; });
      toast.success('Ruh hali kaydedildi.');
    } catch { toast.error('Kaydedilemedi.'); }
    setSavingMood(false);
  };

  const toggleTrigger = (t: string) => setSelectedTriggers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const deleteMood = async (id: string) => {
    try {
      await moodService.delete(id);
      const deletedEntry = moodEntries.find(e => e.id === id);
      setMoodEntries(prev => prev.filter(e => e.id !== id));
      if (todayMood?.id === id || deletedEntry?.entryDate === TODAY) {
        setTodayMood(null);
        setMoodLevel(0);
        setMoodNotes('');
        setSelectedTriggers([]);
      }
      toast.success('Ruh hali kaydı silindi.');
    } catch {
      toast.error('Silinemedi.');
    }
    setDeleteMoodConfirm(null);
  };

  // ── SLEEP handlers ──
  const saveSleep = async () => {
    setSavingSleep(true);
    try {
      const serializedNotes = serializeSleepNotes(sleepForm.notes, {
        weightedBlanket: sleepForm.weightedBlanket,
        sensoryIssues: sleepForm.sensoryIssues,
        melatonin: sleepForm.melatonin,
        noiseLightDisturbance: sleepForm.noiseLightDisturbance,
      });
      const saved = await sleepService.upsert({
        childId: selectedChildId,
        sleepDate: TODAY,
        bedtime: sleepForm.bedtime,
        wakeTime: sleepForm.wakeTime,
        quality: sleepForm.quality as SleepEntry['quality'],
        nightWakings: sleepForm.nightWakings,
        notes: serializedNotes,
      });
      setTodaySleep(saved);
      setSleepEntries(prev => { const idx = prev.findIndex(e => e.id === saved.id); return idx >= 0 ? prev.map((e, i) => i === idx ? saved : e) : [saved, ...prev]; });
      toast.success('Uyku kaydedildi.');
    } catch { toast.error('Kaydedilemedi.'); }
    setSavingSleep(false);
  };

  const deleteSleep = async (id: string) => {
    try {
      await sleepService.delete(id);
      const deletedEntry = sleepEntries.find(e => e.id === id);
      setSleepEntries(prev => prev.filter(e => e.id !== id));
      if (todaySleep?.id === id || deletedEntry?.sleepDate === TODAY) {
        setTodaySleep(null);
        setSleepForm({
          bedtime: '21:00',
          wakeTime: '07:00',
          quality: 3,
          nightWakings: 0,
          notes: '',
          weightedBlanket: false,
          sensoryIssues: false,
          melatonin: false,
          noiseLightDisturbance: false,
        });
      }
      toast.success('Uyku kaydı silindi.');
    } catch {
      toast.error('Silinemedi.');
    }
    setDeleteSleepConfirm(null);
  };

  const TABS = [
    { key: 'mood',       icon: Smile, label: 'Duygu' },
    { key: 'sleep',      icon: Moon,  label: 'Uyku' },
    { key: 'medication', icon: Pill,  label: 'İlaç' },
  ] as const;


  const takenCount   = medications.reduce((acc, med) => acc + (med.todayLogs?.filter(l => l.taken).length ?? 0), 0);
  const totalCount   = medications.reduce((acc, med) => acc + (med.scheduledTimes?.length || (med.scheduledTimes?.length === 0 ? 1 : 1)), 0);
  const allMedsDone  = totalCount > 0 && takenCount >= totalCount;
  const moodDone     = !!todayMood;
  const sleepDone    = !!todaySleep;
  const completedAll = (totalCount === 0 || allMedsDone) && moodDone && sleepDone;
  const dailySteps = [
    {
      key: 'mood',
      icon: Smile,
      title: 'Bugün nasıldı?',
      detail: moodDone ? 'Duygu kaydedildi' : 'Önce tek bir duygu seçin',
      done: moodDone,
    },
    {
      key: 'sleep',
      icon: Moon,
      title: 'Uyku nasıldı?',
      detail: sleepDone ? 'Uyku kaydedildi' : 'Dün geceyi kısaca girin',
      done: sleepDone,
    },
    {
      key: 'medication',
      icon: Pill,
      title: 'İlaç var mı?',
      detail: totalCount === 0 ? 'İlaç yoksa bu adımı geçebilirsiniz' : allMedsDone ? 'İlaçlar tamam' : `${takenCount}/${totalCount} işaretlendi`,
      done: allMedsDone || totalCount === 0,
    },
  ] as const;
  const dailyProgress = Math.round((dailySteps.filter((step) => step.done).length / dailySteps.length) * 100);
  const nextStep = dailySteps.find((step) => !step.done) ?? dailySteps[0];
  const NextStepIcon = nextStep.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      {/* Haftalık Özet / İçgörü Kartı */}
      {selectedChildId && (moodEntries.length > 0 || sleepEntries.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-slate-150 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Moon size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Haftalık Ortalama Uyku</p>
              <p className="text-sm font-bold text-slate-850 mt-0.5">{weeklyInsights.avgSleep}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-150 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Smile size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Haftanın Genel Hali</p>
              <p className="text-sm font-bold text-slate-850 mt-0.5">
                {weeklyInsights.mostFrequentMood 
                  ? `${weeklyInsights.mostFrequentMood.emoji} ${weeklyInsights.mostFrequentMood.label}` 
                  : 'Gözlem yok'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-150 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">En Sık Tetikleyici</p>
              <p className="text-sm font-bold text-slate-850 mt-0.5 truncate" title={weeklyInsights.topTrigger || 'Gözlem yok'}>
                {weeklyInsights.topTrigger || 'Gözlem yok'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-150 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Check size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tam Kayıtlı Günler</p>
              <p className="text-sm font-bold text-slate-850 mt-0.5">{weeklyInsights.completedDaysCount} gün eksiksiz</p>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-5 sm:p-6">
            <p className="text-sm font-semibold text-slate-500">Bugünün kaydı</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Bugün nasıldı?</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Hepsini doldurmak zorunda değilsiniz. Bir duygu seçmek bile bugünü anlamak için yeterli bir başlangıç.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setTab(nextStep.key)}>
                <NextStepIcon size={15} />
                {completedAll ? 'Kayıtları gözden geçir' : 'Sıradaki adımı aç'}
              </Button>
              <Link
                to="/kriz-rehberi"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100"
              >
                <AlertTriangle size={15} />
                Zor bir an
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Bugünün İlerlemesi</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{dailyProgress}%</p>
              </div>
              <button
                onClick={() => {
                  if (!('Notification' in window)) return;
                  if (Notification.permission === 'default') {
                    Notification.requestPermission().then(() => {
                      // Force re-render to update button state
                      setMedications(prev => [...prev]);
                    });
                  } else if (Notification.permission === 'granted') {
                    new Notification('✅ Bildirimler Aktif', {
                      body: 'İlaç hatırlatmaları açık. Her sabah bildirim alacaksınız.',
                      tag: 'notif-test',
                    });
                  }
                }}
                title={
                  !('Notification' in window) ? 'Tarayıcınız bildirimleri desteklemiyor' :
                  Notification.permission === 'granted' ? 'Bildirimler açık — test bildirimi gönder' :
                  Notification.permission === 'denied' ? 'Bildirimler kapatılmış — tarayıcı ayarlarından açın' :
                  'Sabah ilaç hatırlatması için bildirime izin ver'
                }
                className={`shrink-0 p-2 rounded-xl transition-colors cursor-pointer ${
                  !('Notification' in window) || Notification.permission === 'denied'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : Notification.permission === 'granted'
                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 animate-pulse'
                }`}
              >
                <Bell size={18} />
              </button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-slate-800 transition-all" style={{ width: `${dailyProgress}%` }} />
            </div>
            <div className="mt-4 grid gap-2">
              {dailySteps.map(({ key, icon: Icon, title, detail, done }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition-colors ${
                    tab === key ? 'bg-white text-slate-950 ring-slate-200 shadow-sm' : 'bg-white/70 text-slate-600 ring-slate-100 hover:bg-white'
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {done ? <Check size={17} /> : <Icon size={17} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{title}</span>
                    <span className="block truncate text-xs text-slate-500">{detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-extrabold">İlaç güvenliği</p>
          <p className="mt-1">
            İlaç hatırlatıcıları destek amaçlıdır. İlaç başlama, bırakma, doz değişikliği veya yan etki kararlarını yalnızca doktorunuzla birlikte verin.
          </p>
          <Link to="/tibbi-uyari" className="mt-2 inline-flex text-xs font-extrabold text-amber-950 underline">
            Tıbbi güvenlik uyarılarını oku
          </Link>
        </div>
      </div>

      {/* Çocuk Seçimi */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button key={c.id} onClick={() => setSelectedChild(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all cursor-pointer ${selectedChildId === c.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!selectedChildId ? (
        <EmptyState
          icon={<Pill size={28} />}
          title="Çocuk profili bulunamadı"
          description="Önce Çocuklarım sayfasından profil ekleyin. İlaç, ruh hali ve uyku takibi yapabilmek için en az bir çocuk profili gereklidir."
        />
      ) : (
        <>
          {/* Sekmeler */}
          <div className="flex gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            {TABS.map(t => {
              const done = dailySteps.find(s => s.key === t.key)?.done ?? false;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === t.key ? 'bg-white shadow-sm text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                  <t.icon size={16} /> {t.label}
                  {done && <Check size={13} className="text-emerald-500" />}
                </button>
              );
            })}
          </div>

          {/* ─── İLAÇ ─── */}
          {tab === 'medication' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-slate-500">{selectedChild?.name} — Bugünün İlaçları ({new Date().toLocaleDateString('tr-TR')})</p>
                <Button size="sm" onClick={openAddMed} className="bg-slate-800 hover:bg-slate-900"><Plus size={14} className="mr-1" />İlaç Ekle</Button>
              </div>

              {medications.length === 0 ? (
                <EmptyState icon={<Pill size={24} />} title="İlaç kaydı yok" description="Çocuğunuzun ilaçlarını buraya ekleyin." action={<Button size="sm" onClick={openAddMed}>İlaç Ekle</Button>} />
              ) : (
                medications.map(med => {
                  const times = med.scheduledTimes?.length ? med.scheduledTimes : [''];
                  const isExpanded = expandedMed === med.id;
                  return (
                    <Card key={med.id} className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                          <Pill size={20} className="text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900 text-lg">{med.name}</p>
                              <p className="text-[13px] font-medium text-slate-500 mt-0.5">{med.dosage} {med.unit} · {FREQUENCIES.find(f => f.value === med.frequency)?.label ?? med.frequency}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => openEditMed(med)} title="İlacı düzenle" className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"><Pencil size={16} /></button>
                              <button onClick={() => setDeleteMedConfirm(med.id)} title="İlacı sil" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"><Trash2 size={16} /></button>
                              <button onClick={() => setExpandedMed(isExpanded ? null : med.id)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Doz saatleri */}
                          <div className="flex gap-2 mt-4 flex-wrap">
                            {times.map(time => {
                              const log = med.todayLogs?.find(l => l.scheduledTime === time);
                              const taken = log?.taken ?? false;
                              const hasSideEffects = log?.sideEffects && log.sideEffects.length > 0;
                              return (
                                <button key={time} onClick={() => openLogModal(med, time)}
                                  title={taken ? 'Doz detayını düzenle' : 'Alındı/Yan etki bildir'}
                                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold border-2 transition-all cursor-pointer ${taken ? 'border-slate-800 bg-slate-800 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'}`}>
                                  {taken ? <Check size={14} /> : <div className="w-[14px] h-[14px] rounded-full border-2 border-slate-400" />}
                                  {time || 'Alındı'}
                                  {taken && hasSideEffects && <AlertTriangle size={12} className="text-amber-400 ml-1 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Stok uyarısı */}
                          {med.currentStock !== undefined && med.stockAlertThreshold !== undefined && med.currentStock <= med.stockAlertThreshold && (
                            <div className="flex items-center gap-2 mt-4 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl">
                              <Bell size={16} className="text-slate-700 shrink-0" />
                              <span className="text-[13px] text-slate-800 font-semibold">Stok azalıyor — {med.currentStock} {med.unit} kaldı</span>
                            </div>
                          )}
                          {med.currentStock !== undefined && med.currentStock > 0 && !(med.stockAlertThreshold !== undefined && med.currentStock <= med.stockAlertThreshold) && (
                            <p className="text-[13px] text-slate-500 mt-3 font-semibold">Stok: {med.currentStock} {med.unit}</p>
                          )}
                          {isExpanded && med.notes && <p className="text-[13px] text-slate-500 mt-3 italic leading-relaxed">{med.notes}</p>}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ─── RUH HALİ ─── */}
          {tab === 'mood' && (
            <div className="space-y-4">
              <Card className="p-6">
                <h2 className="font-bold text-slate-900 mb-5 text-lg">Bugün Nasıl Hissetti?</h2>
                <div className="flex gap-3 justify-between">
                  {MOOD_OPTIONS.map(opt => (
                    <button key={opt.level} onClick={() => setMoodLevel(opt.level)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer ${moodLevel === opt.level ? opt.activeColor : opt.passiveColor}`}>
                      <span className="text-3xl">{opt.emoji}</span>
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-1.5 mb-3 mt-6">
                    <p className="text-sm font-semibold text-slate-700">Tetikleyiciler (isteğe bağlı)</p>
                    <div className="group relative">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-150 text-[11px] font-extrabold text-slate-500 cursor-help hover:bg-slate-200 transition-colors">?</span>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl bg-slate-900 p-3.5 text-xs leading-relaxed text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md">
                        <p className="font-extrabold text-amber-400 mb-1">💡 Otizm ve Tetikleyiciler</p>
                        Duyusal taşkınlıklar, ani rutin değişiklikleri veya iletişim engelleri genellikle davranış değişikliklerine yol açar. Bunları kaydetmek, davranış örüntülerini analiz etmenize yardımcı olur.
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_TRIGGERS.map(t => (
                      <button key={t} onClick={() => toggleTrigger(t)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all cursor-pointer ${selectedTriggers.includes(t) ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea value={moodNotes} onChange={e => setMoodNotes(e.target.value)} placeholder="Notlar (isteğe bağlı)..." rows={2}
                  className="w-full mt-3 p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200" />

                <Button className="w-full mt-3" onClick={saveMood} loading={savingMood} disabled={!moodLevel}>
                  {todayMood ? 'Güncelle' : 'Kaydet'}
                </Button>
              </Card>

              {/* Son 7 gün (Ruh Hali) */}
              {moodEntries.slice(0, 7).length > 0 && (
                <Card className="p-5">
                  <p className="text-[15px] font-bold text-slate-900 mb-4">Son 7 Gün</p>
                  <div className="space-y-3">
                    {moodEntries.slice(0, 7).map(e => {
                      const opt = MOOD_OPTIONS.find(m => m.level === e.moodLevel);
                      return (
                        <div key={e.id} className="flex items-center gap-4 p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm">
                          <span className="text-3xl">{opt?.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[15px] font-bold text-slate-800">{opt?.label}</span>
                              <span className="text-[12px] font-semibold tracking-wide text-slate-400">{new Date(e.entryDate).toLocaleDateString('tr-TR')}</span>
                            </div>
                            {e.triggers && e.triggers.length > 0 && (
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {e.triggers.map(t => <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold">{t}</span>)}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setDeleteMoodConfirm(e.id)}
                            title="Ruh hali kaydını sil"
                            className="p-2.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ─── UYKU ─── */}
          {tab === 'sleep' && (
            <div className="space-y-4">
              <Card className="p-6">
                <h2 className="font-bold text-slate-900 mb-5 text-lg">
                  Dün Gece / Bu Sabah Uyku
                  <span className="ml-2 text-sm font-medium text-slate-400">
                    ({new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('tr-TR')} gece — {new Date().toLocaleDateString('tr-TR')} sabah)
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Yatış Saati</label>
                    <input type="time" value={sleepForm.bedtime} onChange={e => setSleepForm(f => ({ ...f, bedtime: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Uyanış Saati</label>
                    <input type="time" value={sleepForm.wakeTime} onChange={e => setSleepForm(f => ({ ...f, wakeTime: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Uyku Kalitesi</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(q => (
                      <button key={q} onClick={() => setSleepForm(f => ({ ...f, quality: q }))}
                        className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-all ${sleepForm.quality === q ? 'border-slate-800 bg-slate-800 text-white shadow-md' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'}`}>
                        {q}⭐
                      </button>
                    ))}
                  </div>
                  <p className="text-[13px] font-semibold text-slate-400 mt-2 text-center uppercase tracking-wider">{QUALITY_LABELS[sleepForm.quality]}</p>
                </div>

                <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-sm font-semibold text-slate-700 shrink-0">Gece uyanma sayısı:</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSleepForm(f => ({ ...f, nightWakings: Math.max(0, f.nightWakings - 1) }))} className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white text-slate-600 font-bold flex items-center justify-center cursor-pointer hover:border-slate-400 hover:text-slate-800 transition-colors">-</button>
                    <span className="text-[17px] font-bold w-6 text-center text-slate-800">{sleepForm.nightWakings}</span>
                    <button onClick={() => setSleepForm(f => ({ ...f, nightWakings: f.nightWakings + 1 }))} className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white text-slate-600 font-bold flex items-center justify-center cursor-pointer hover:border-slate-400 hover:text-slate-800 transition-colors">+</button>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Duyusal ve Çevresel Faktörler</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold select-none ${
                      sleepForm.weightedBlanket ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}>
                      <input type="checkbox" checked={sleepForm.weightedBlanket} onChange={e => setSleepForm(f => ({ ...f, weightedBlanket: e.target.checked }))} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      <span>🛏️ Ağır Battaniye Kullanıldı</span>
                    </label>

                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold select-none ${
                      sleepForm.sensoryIssues ? 'border-amber-500 bg-amber-50/50 text-amber-900' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}>
                      <input type="checkbox" checked={sleepForm.sensoryIssues} onChange={e => setSleepForm(f => ({ ...f, sensoryIssues: e.target.checked }))} className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4" />
                      <span>👕 Duyusal Hassasiyet (Pijama/Çarşaf)</span>
                    </label>

                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold select-none ${
                      sleepForm.melatonin ? 'border-purple-500 bg-purple-50/50 text-purple-900' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}>
                      <input type="checkbox" checked={sleepForm.melatonin} onChange={e => setSleepForm(f => ({ ...f, melatonin: e.target.checked }))} className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4" />
                      <span>💊 Melatonin Desteği Verildi</span>
                    </label>

                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold select-none ${
                      sleepForm.noiseLightDisturbance ? 'border-rose-500 bg-rose-50/50 text-rose-900' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}>
                      <input type="checkbox" checked={sleepForm.noiseLightDisturbance} onChange={e => setSleepForm(f => ({ ...f, noiseLightDisturbance: e.target.checked }))} className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4" />
                      <span>🔊 Çevresel Gürültü / Işık Rahatsızlığı</span>
                    </label>
                  </div>
                </div>

                <textarea value={sleepForm.notes} onChange={e => setSleepForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notlar (isteğe bağlı)..." rows={2}
                  className="w-full mt-6 p-4 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium resize-none focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />

                <Button className="w-full mt-5 h-12 text-[15px] font-bold bg-slate-800 hover:bg-slate-900" onClick={saveSleep} loading={savingSleep}>
                  {todaySleep ? 'Güncelle' : 'Kaydet'}
                </Button>
              </Card>

              {/* Son uyku kayıtları */}
              {sleepEntries.slice(0, 7).length > 0 && (
                <Card className="p-5">
                  <p className="text-[15px] font-bold text-slate-900 mb-4">Son 7 Gün</p>
                  <div className="space-y-3">
                    {sleepEntries.slice(0, 7).map(e => {
                      const hours = e.durationMinutes ? Math.floor(e.durationMinutes / 60) : null;
                      const mins = e.durationMinutes ? e.durationMinutes % 60 : null;
                      return (
                        <div key={e.id} className="flex items-center gap-4 p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                            <Moon size={18} className="text-slate-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[15px] font-bold text-slate-800">
                                {e.bedtime ?? '?'} → {e.wakeTime ?? '?'}
                                {hours !== null && <span className="text-[13px] font-medium text-slate-400 ml-2">({hours}s {mins}dk)</span>}
                              </span>
                              <span className="text-[12px] font-semibold tracking-wide text-slate-400">{new Date(e.sleepDate).toLocaleDateString('tr-TR')}</span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                              {e.quality && <span className="text-xs">{'⭐'.repeat(e.quality)}</span>}
                              {e.nightWakings > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{e.nightWakings}x uyandı</span>}
                              {(() => {
                                const parsed = deserializeSleepNotes(e.notes ?? '');
                                return (
                                  <>
                                    {parsed.weightedBlanket && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">🛏️ Ağır Battaniye</span>}
                                    {parsed.sensoryIssues && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">👕 Duyusal</span>}
                                    {parsed.melatonin && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">💊 Melatonin</span>}
                                    {parsed.noiseLightDisturbance && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">🔊 Gürültü/Işık</span>}
                                  </>
                                );
                              })()}
                            </div>
                            {(() => {
                              const parsed = deserializeSleepNotes(e.notes ?? '');
                              return parsed.notesText ? <p className="text-[13px] text-slate-500 mt-2 italic leading-relaxed">{parsed.notesText}</p> : null;
                            })()}
                          </div>
                          <button
                            onClick={() => setDeleteSleepConfirm(e.id)}
                            title="Uyku kaydını sil"
                            className="p-2.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={!!deleteMedConfirm}
        title="İlacı sil?"
        message="Bu ilaç ve bugünkü kayıtları kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => deleteMedConfirm && deleteMed(deleteMedConfirm)}
        onCancel={() => setDeleteMedConfirm(null)}
      />

      <ConfirmModal
        isOpen={!!deleteMoodConfirm}
        title="Ruh hali kaydını sil?"
        message="Bu ruh hali kaydı kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => deleteMoodConfirm && deleteMood(deleteMoodConfirm)}
        onCancel={() => setDeleteMoodConfirm(null)}
      />

      <ConfirmModal
        isOpen={!!deleteSleepConfirm}
        title="Uyku kaydını sil?"
        message="Bu uyku kaydı kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => deleteSleepConfirm && deleteSleep(deleteSleepConfirm)}
        onCancel={() => setDeleteSleepConfirm(null)}
      />

      {/* İlaç Modal */}
      <Modal isOpen={showMedModal} onClose={() => setShowMedModal(false)} title={editingMed ? 'İlacı Düzenle' : 'Yeni İlaç Ekle'}>
        <div className="space-y-3">
          <Input label="İlaç / Takviye Adı *" value={medForm.name} onChange={e => setMedForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Risperidon, Omega-3" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Doz" value={medForm.dosage} onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))} placeholder="0.5" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
              <select value={medForm.unit} onChange={e => setMedForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                {['mg', 'ml', 'damla', 'tablet', 'kapsül', 'IU', 'mcg'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sıklık</label>
            <select value={medForm.frequency} onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <Input label="Saat(ler) (virgülle ayırın)" value={medForm.scheduledTimes} onChange={e => setMedForm(f => ({ ...f, scheduledTimes: e.target.value }))} placeholder="08:00, 12:00, 20:00" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mevcut Stok (tablet/ml)" type="number" value={medForm.currentStock} onChange={e => setMedForm(f => ({ ...f, currentStock: e.target.value }))} placeholder="30" />
            <Input label="Uyarı Eşiği" type="number" value={medForm.stockAlertThreshold} onChange={e => setMedForm(f => ({ ...f, stockAlertThreshold: e.target.value }))} placeholder="7" />
          </div>
          <TextArea label="Notlar" value={medForm.notes} onChange={e => setMedForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Özel talimatlar, yan etkiler..." />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowMedModal(false)} className="flex-1">İptal</Button>
            <Button onClick={saveMed} loading={savingMed} className="flex-1">Kaydet</Button>
          </div>
        </div>
      </Modal>

      {/* İlaç Dozu Günlüğü ve Yan Etki Modalı */}
      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Doz Günlüğü ve Yan Etki Takibi">
        <div className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">İlaç Bilgisi</p>
            <p className="text-base font-black text-slate-850 mt-1">{activeLogMed?.name}</p>
            <p className="text-xs font-bold text-slate-500 mt-0.5">Doz: {activeLogMed?.dosage} {activeLogMed?.unit} · Planlanan Saat: {activeLogTime || 'Yok'}</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer py-1.5">
              <input type="checkbox" checked={logFormTaken} onChange={e => setLogFormTaken(e.target.checked)}
                className="w-4 h-4 text-slate-800 border-slate-300 rounded focus:ring-slate-500" />
              <span className="text-sm font-bold text-slate-800">İlaç Alındı Olarak İşaretle</span>
            </label>
          </div>

          {logFormTaken && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="block text-sm font-extrabold text-slate-800">Gözlemlenen Yan Etkiler</label>
              <p className="text-xs font-medium text-slate-500">Bugün bu doz sonrasında çocukta gözlemlediğiniz yan etkileri seçin:</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {COMMON_SIDE_EFFECTS.map(se => {
                  const isChecked = logFormSideEffects.includes(se);
                  return (
                    <label key={se} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold select-none ${
                      isChecked ? 'border-slate-800 bg-slate-100 text-slate-800' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}>
                      <input type="checkbox" checked={isChecked} onChange={() => setLogFormSideEffects(prev => prev.includes(se) ? prev.filter(x => x !== se) : [...prev, se])} className="sr-only" />
                      <span>{se}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-1">Gözlem Notları</label>
            <TextArea value={logFormNotes} onChange={e => setLogFormNotes(e.target.value)} placeholder="Doktorunuza iletmek istediğiniz özel bir gözlem veya not var mı?" rows={3} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowLogModal(false)} className="flex-1 font-bold">İptal</Button>
            <Button onClick={handleSaveLog} loading={savingLog} className="flex-1 font-bold">Kaydet</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
