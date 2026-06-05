import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill, Smile, Moon, Plus, Check, X, Pencil, Trash2, ChevronDown, ChevronUp, Bell, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { medicationService } from '@/services/medicationService';
import { moodService } from '@/services/moodService';
import { sleepService } from '@/services/sleepService';
import { toast } from '@/store/toastStore';
import type { Medication, MoodEntry, SleepEntry } from '@/types';

const TODAY = new Date().toISOString().split('T')[0];

const MOOD_OPTIONS = [
  { level: 1, emoji: '😢', label: 'Çok Kötü', color: 'border-slate-800 bg-slate-800 text-white' },
  { level: 2, emoji: '😕', label: 'Kötü',    color: 'border-slate-800 bg-slate-800 text-white' },
  { level: 3, emoji: '😐', label: 'Orta',    color: 'border-slate-800 bg-slate-800 text-white' },
  { level: 4, emoji: '🙂', label: 'İyi',     color: 'border-slate-800 bg-slate-800 text-white' },
  { level: 5, emoji: '😄', label: 'Harika',  color: 'border-slate-800 bg-slate-800 text-white' },
];

const MOOD_TRIGGERS = ['Uyku', 'Gürültü', 'Rutin değişikliği', 'Sosyal ortam', 'Terapi', 'Yemek', 'Ev etkinliği', 'Hastalık'];

const FREQUENCIES = [
  { value: 'DAILY',         label: 'Günde 1' },
  { value: 'TWICE_DAILY',   label: 'Günde 2' },
  { value: 'THREE_DAILY',   label: 'Günde 3' },
  { value: 'AS_NEEDED',     label: 'Gerektiğinde' },
  { value: 'WEEKLY',        label: 'Haftalık' },
];

const QUALITY_LABELS = ['', 'Çok Kötü', 'Kötü', 'Orta', 'İyi', 'Harika'];

export function DailyTrackerPage() {
  const [tab, setTab] = useState<'medication' | 'mood' | 'sleep'>('medication');
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
  const [sleepForm, setSleepForm] = useState({ bedtime: '21:00', wakeTime: '07:00', quality: 3, nightWakings: 0, notes: '' });
  const [savingSleep, setSavingSleep] = useState(false);

  useEffect(() => {
    childService.getAll().then(c => { setChildren(c); if (c.length && !selectedChild) setSelectedChild(c[0]); }).catch(() => {});
  }, []);

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
      if (today) setSleepForm({ bedtime: today.bedtime ?? '21:00', wakeTime: today.wakeTime ?? '07:00', quality: today.quality ?? 3, nightWakings: today.nightWakings, notes: today.notes ?? '' });
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

  const toggleMedLog = async (medId: string, time: string) => {
    try {
      const log = await medicationService.toggle(medId, TODAY, time);
      setMedications(prev => prev.map(m => {
        if (m.id !== medId) return m;
        const logs = m.todayLogs ?? [];
        const existing = logs.findIndex(l => l.scheduledTime === time);
        if (existing >= 0) return { ...m, todayLogs: logs.map((l, i) => i === existing ? { ...l, taken: log.taken } : l) };
        return { ...m, todayLogs: [...logs, log] };
      }));
    } catch { toast.error('İşlem başarısız.'); }
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
      const saved = await sleepService.upsert({ childId: selectedChildId, sleepDate: TODAY, ...sleepForm, quality: sleepForm.quality as SleepEntry['quality'] });
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
        setSleepForm({ bedtime: '21:00', wakeTime: '07:00', quality: 3, nightWakings: 0, notes: '' });
      }
      toast.success('Uyku kaydı silindi.');
    } catch {
      toast.error('Silinemedi.');
    }
    setDeleteSleepConfirm(null);
  };

  const TABS = [
    { key: 'medication', icon: Pill,  label: 'İlaçlar' },
    { key: 'mood',       icon: Smile, label: 'Ruh Hali' },
    { key: 'sleep',      icon: Moon,  label: 'Uyku' },
  ] as const;


  const takenCount   = medications.reduce((acc, med) => acc + (med.todayLogs?.filter(l => l.taken).length ?? 0), 0);
  const totalCount   = medications.reduce((acc, med) => acc + (med.scheduledTimes?.length || (med.scheduledTimes?.length === 0 ? 1 : 1)), 0);
  const allMedsDone  = totalCount > 0 && takenCount >= totalCount;
  const moodDone     = !!todayMood;
  const sleepDone    = !!todaySleep;
  const completedAll = allMedsDone && moodDone && sleepDone;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      <PageOnboarding
        pageId="daily-tracker"
        title="Günlük Takip Sayfasına Hoş Geldiniz"
        description="Çocuğunuzun günlük ilaç, ruh hali ve uyku kayıtlarını buradan yönetebilirsiniz."
        steps={[
          {
            icon: <Pill size={20} />,
            title: "İlaç Takibi",
            description: "Günlük ilaç dozlarını kaydedin ve zamanı geldiğinde bildirim alın."
          },
          {
            icon: <Smile size={20} />,
            title: "Ruh Hali",
            description: "Çocuğunuzun günlük ruh halini ve olası tetikleyicileri not edin."
          },
          {
            icon: <Moon size={20} />,
            title: "Uyku Düzeni",
            description: "Uyku kalitesini ve gece uyanmalarını kaydederek desenleri keşfedin."
          }
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Günlük Takip</h1>
          <p className="text-gray-500 mt-1">İlaç, ruh hali ve uyku takibi</p>
        </div>
        <button
          onClick={() => {
            if ('Notification' in window && Notification.permission === 'default') {
              Notification.requestPermission();
            }
          }}
          title="İlaç hatırlatmalarına izin ver"
          className="shrink-0 p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
        >
          <Bell size={18} />
        </button>
      </div>

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
          {/* Günlük özet şeridi */}
          <div className={`rounded-xl border p-4 flex items-center gap-4 flex-wrap shadow-sm ${completedAll ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${completedAll ? 'text-slate-800' : 'text-slate-800'}`}>
                {completedAll ? '🎉 Bugün tamamlandı!' : '📋 Bugünün özeti'}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap ml-auto">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold border uppercase tracking-wider ${
                allMedsDone ? 'bg-slate-800 text-white border-slate-800' :
                takenCount > 0 ? 'bg-slate-100 text-slate-700 border-slate-300' :
                'bg-white text-slate-500 border-slate-200'
              }`}>
                <Pill size={12} />
                {totalCount === 0 ? 'İlaç yok' : `${takenCount}/${totalCount} ilaç`}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold border uppercase tracking-wider ${
                moodDone ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
              }`}>
                <Smile size={12} />
                {moodDone ? `Ruh hali: ${MOOD_OPTIONS.find(o => o.level === todayMood?.moodLevel)?.label ?? 'Kaydedildi'}` : 'Ruh hali bekleniyor'}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold border uppercase tracking-wider ${
                sleepDone ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
              }`}>
                <Moon size={12} />
                {sleepDone
                  ? todaySleep?.durationMinutes
                    ? `Uyku: ${Math.floor(todaySleep.durationMinutes / 60)}s ${todaySleep.durationMinutes % 60}dk`
                    : 'Uyku kaydedildi'
                  : 'Uyku bekleniyor'}
              </div>
            </div>
          </div>

          {/* Sekmeler */}
          <div className="flex gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === t.key ? 'bg-white shadow-sm text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
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
                              return (
                                <button key={time} onClick={() => toggleMedLog(med.id, time)}
                                  title={taken ? 'Alındı işaretini kaldır' : 'Alındı olarak işaretle'}
                                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold border-2 transition-all cursor-pointer ${taken ? 'border-slate-800 bg-slate-800 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'}`}>
                                  {taken ? <Check size={14} /> : <div className="w-[14px] h-[14px] rounded-full border-2 border-slate-400" />}
                                  {time || 'Alındı'}
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
                      className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all cursor-pointer ${moodLevel === opt.level ? opt.color : 'border-slate-100 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                      <span className="text-3xl">{opt.emoji}</span>
                      <span className={`text-xs font-semibold ${moodLevel === opt.level ? 'text-white' : 'text-slate-500'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3 mt-6">Tetikleyiciler (isteğe bağlı)</p>
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
                            <div className="flex items-center gap-2.5 mt-1.5">
                              {e.quality && <span className="text-xs">{'⭐'.repeat(e.quality)}</span>}
                              {e.nightWakings > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{e.nightWakings}x uyandı</span>}
                            </div>
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
    </div>
  );
}
