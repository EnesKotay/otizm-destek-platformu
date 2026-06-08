import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trash2, Clock, ChevronDown, ChevronUp,
  CalendarDays, CheckCircle2, Circle, GripVertical, Printer,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { routineService, type RoutineDto } from '@/services/routineService';
import { toast } from '@/store/toastStore';

const ICON_OPTIONS = [
  { value: 'morning',   label: '🌅 Sabah' },
  { value: 'eat',       label: '🍽️ Yemek' },
  { value: 'brush',     label: '🪥 Diş Fırçalama' },
  { value: 'shower',    label: '🚿 Banyo' },
  { value: 'dress',     label: '👕 Giyinme' },
  { value: 'school',    label: '🎒 Okul' },
  { value: 'homework',  label: '📚 Ödev' },
  { value: 'play',      label: '🎮 Oyun' },
  { value: 'sleep',     label: '🌙 Uyku' },
  { value: 'medicine',  label: '💊 İlaç' },
  { value: 'walk',      label: '🚶 Yürüyüş' },
  { value: 'therapy',   label: '🧩 Terapi' },
];

function iconEmoji(name?: string) {
  return ICON_OPTIONS.find(o => o.value === name)?.label.split(' ')[0] ?? '•';
}

type CompletedMap = Record<string, Set<string>>;

const TODAY = new Date().toISOString().slice(0, 10);
const STORAGE_KEY = `routine_completed_${TODAY}`;

function loadCompletedFromStorage(): CompletedMap {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, string[]>;
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, new Set(v)]));
  } catch {
    return {};
  }
}

function saveCompletedToStorage(map: CompletedMap) {
  const serialized = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
}

export function RoutinesPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [routines, setRoutines]                 = useState<RoutineDto[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [expandedId, setExpandedId]             = useState<string | null>(null);
  const [completed, setCompleted]               = useState<CompletedMap>(loadCompletedFromStorage);
  const [isPrinting, setIsPrinting]             = useState(false);
  const [activePrintingRoutine, setActivePrintingRoutine] = useState<RoutineDto | null>(null);

  const handlePrintRoutine = (routine: RoutineDto) => {
    setActivePrintingRoutine(routine);
    setIsPrinting(true);
    setTimeout(() => { window.print(); setIsPrinting(false); }, 150);
  };

  // Create routine modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'routine' | 'item'; routineId: string; itemId?: string } | null>(null);
  const [showRoutineModal, setShowRoutineModal]   = useState(false);
  const [routineName, setRoutineName]             = useState('');
  const [routineDesc, setRoutineDesc]             = useState('');
  const [savingRoutine, setSavingRoutine]         = useState(false);

  // Add item modal
  const [addItemRoutineId, setAddItemRoutineId]   = useState<string | null>(null);
  const [itemTitle, setItemTitle]                 = useState('');
  const [itemTime, setItemTime]                   = useState('');
  const [itemIcon, setItemIcon]                   = useState('morning');
  const [itemDesc, setItemDesc]                   = useState('');
  const [savingItem, setSavingItem]               = useState(false);

  // Token economy & active tab state
  const [activeTab, setActiveTab] = useState<'routines' | 'rewards'>('routines');
  const [stars, setStars] = useState<number>(() => Number(localStorage.getItem('routine_stars') || '0'));
  const [, setActiveConfetti] = useState(false);





  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Note 1 (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);
      
      // Note 2 (E5)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.35);
      }, 90);
    } catch { /* ignore audio errors */ }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const playVictorySound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Arpeggio)
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }, idx * 100);
      });
    } catch { /* ignore audio errors */ }
  };

  /* ─── Veri yükleme ─────────────────────────────── */
  useEffect(() => {
    childService.getAll()
      .then(c => {
        setChildren(c);
        if (c.length && !selectedChild) setSelectedChild(c[0]);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoutines = useCallback((childId: string) => {
    setLoading(true);
    routineService.getByChild(childId)
      .then(data => setRoutines(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Rutinler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoutines(selectedChildId);
  }, [selectedChildId, loadRoutines]);

  /* ─── Rutin işlemleri ───────────────────────────── */
  const handleCreateRoutine = async () => {
    if (!routineName.trim()) return;
    setSavingRoutine(true);
    try {
      const created = await routineService.create({
        childId: selectedChildId,
        name: routineName.trim(),
        description: routineDesc.trim() || undefined,
      });
      if (created) {
        setRoutines(prev => [...prev, { ...created, items: [] }]);
        setExpandedId(String(created.id));
      }
      setShowRoutineModal(false);
      setRoutineName('');
      setRoutineDesc('');
      toast.success('Rutin oluşturuldu.');
    } catch {
      toast.error('Rutin kaydedilemedi.');
    }
    setSavingRoutine(false);
  };

  const handleDeleteRoutine = (id: string) => {
    setDeleteConfirm({ type: 'routine', routineId: id });
  };

  const doDeleteRoutine = async (id: string) => {
    try {
      await routineService.delete(id);
      setRoutines(prev => prev.filter(r => String(r.id) !== id));
      if (expandedId === id) setExpandedId(null);
      toast.success('Rutin silindi.');
    } catch {
      toast.error('Rutin silinemedi.');
    }
    setDeleteConfirm(null);
  };

  const openAddItem = (routineId: string) => {
    setAddItemRoutineId(routineId);
    setItemTitle('');
    setItemTime('');
    setItemIcon('morning');
    setItemDesc('');
  };

  const handleAddItem = async () => {
    if (!itemTitle.trim() || !addItemRoutineId) return;
    setSavingItem(true);
    try {
      const item = await routineService.addItem(addItemRoutineId, {
        title: itemTitle.trim(),
        description: itemDesc.trim() || undefined,
        scheduledTime: itemTime || undefined,
        iconName: itemIcon,
      });
      if (item) {
        setRoutines(prev => prev.map(r =>
          String(r.id) === addItemRoutineId
            ? { ...r, items: [...(r.items ?? []), item] }
            : r,
        ));
      }
      setAddItemRoutineId(null);
      toast.success('Adım eklendi.');
    } catch {
      toast.error('Adım kaydedilemedi.');
    }
    setSavingItem(false);
  };

  const handleDeleteItem = (routineId: string, itemId: string) => {
    setDeleteConfirm({ type: 'item', routineId, itemId });
  };

  const doDeleteItem = async (routineId: string, itemId: string) => {
    try {
      await routineService.deleteItem(routineId, itemId);
      setRoutines(prev => prev.map(r =>
        String(r.id) === routineId
          ? { ...r, items: (r.items ?? []).filter(it => String(it.id) !== itemId) }
          : r,
      ));
      toast.success('Adım silindi.');
    } catch {
      toast.error('Adım silinemedi.');
    }
    setDeleteConfirm(null);
  };

  const toggleCompleted = (routineId: string, itemId: string) => {
    let isDone = false;
    setCompleted(prev => {
      const set = new Set(prev[routineId] ?? []);
      if (set.has(itemId)) {
        set.delete(itemId);
        isDone = false;
      } else {
        set.add(itemId);
        isDone = true;
      }
      const next = { ...prev, [routineId]: set };
      saveCompletedToStorage(next);
      return next;
    });

    if (isDone) {
      playChime();
      setActiveConfetti(true);
      setTimeout(() => setActiveConfetti(false), 2000);
      setStars(prev => {
        const next = prev + 1;
        localStorage.setItem('routine_stars', String(next));
        return next;
      });
      toast.success('Harika! Bir adım daha tamamlandı ve +1 Yıldız ⭐ kazanıldı!');
    } else {
      setStars(prev => {
        const next = Math.max(0, prev - 1);
        localStorage.setItem('routine_stars', String(next));
        return next;
      });
    }
  };

  /* ─── Hesaplamalar ─────────────────────────────── */

  const completionRate = (routine: RoutineDto): number => {
    const total = routine.items?.length ?? 0;
    if (!total) return 0;
    const done  = routine.items!.filter(it => completed[String(routine.id)]?.has(String(it.id))).length;
    return Math.round((done / total) * 100);
  };

  /* ─── Render ───────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      <div className="print:hidden space-y-6">
        <PageOnboarding
          pageId="routines"
          title="Rutin Yönetimine Hoş Geldiniz"
        description="Çocuğunuzun günlük yaşantısını öngörülebilir hale getirecek görsel rutinler oluşturun."
        steps={[
          {
            icon: <Plus size={20} />,
            title: "Yeni Rutin Oluşturun",
            description: "Sabah, akşam veya yemek rutinleri gibi temel kategoriler ekleyin."
          },
          {
            icon: <GripVertical size={20} />,
            title: "Adımları Ekleyin",
            description: "Her bir rutine özel görselli adımlar ekleyerek süreci somutlaştırın."
          },
          {
            icon: <CheckCircle2 size={20} />,
            title: "Takip Edin",
            description: "Çocuğunuz her adımı tamamladığında işaretleyerek ilerlemeyi takip edin."
          }
        ]}
      />

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rutin Yönetimi</h1>
          <p className="text-gray-500 mt-1 text-sm">Görsel rutin kartları ve adım adım günlük planlar</p>
        </div>
        {selectedChildId && (
          <Button onClick={() => setShowRoutineModal(true)}>
            <Plus size={15} className="mr-1.5" /> Yeni Rutin
          </Button>
        )}
      </div>

      {/* Çocuk seçici */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button
              key={String(c.id)}
              onClick={() => setSelectedChild(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all cursor-pointer ${
                selectedChildId === String(c.id)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Tab ve Yıldız Cüzdanı Paneli */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
        <div className="flex gap-2 w-full sm:w-auto bg-slate-50 border border-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('routines')}
            className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'routines'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            📋 Görsel Rutinler
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'rewards'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            ⭐ Yıldız Tablosu
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-800 rounded-2xl shadow-sm">
          <span className="text-2xl animate-pulse">⭐</span>
          <div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Yıldız Cüzdanı</p>
            <p className="text-lg font-black text-white leading-tight mt-0.5">{stars} Yıldız</p>
          </div>
        </div>
      </div>

      {/* İçerik */}
      {!selectedChildId ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Çocuk profili bulunamadı"
          description="Önce Çocuklarım sayfasından profil ekleyin."
        />
      ) : loading ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Henüz rutin yok"
          description={`${selectedChild?.name ?? 'Çocuk'} için ilk rutini oluşturun.`}
          action={
            <Button onClick={() => setShowRoutineModal(true)}>
              <Plus size={14} className="mr-1" /> Rutin Oluştur
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {routines.map(routine => {
            const rid       = String(routine.id);
            const isExpanded = expandedId === rid;
            const items      = routine.items ?? [];
            const rate       = completionRate(routine);

            return (
              <Card key={rid} className="p-6">
                {/* Kart başlığı */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-3xl shadow-sm">
                    {items[0]?.iconName ? iconEmoji(items[0].iconName) : '📋'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-[19px] truncate tracking-tight">{routine.name}</p>
                        {routine.description && (
                          <p className="text-[14px] font-medium text-slate-500 mt-1 truncate">{routine.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[12px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{items.length} adım</span>
                          {items.length > 0 && (
                            <span className="text-[12px] font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">%{rate} tamamlandı</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {items.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            onClick={() => handlePrintRoutine(routine)}
                          >
                            <Printer size={14} className="mr-1.5" /> Yazdır
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => openAddItem(rid)}
                        >
                          <Plus size={14} className="mr-1.5" /> Adım Ekle
                        </Button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : rid)}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                          title={isExpanded ? 'Kapat' : 'Adımları göster'}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteRoutine(rid)}
                          className="p-2 border border-transparent rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                          title="Rutini sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* İlerleme çubuğu */}
                    {items.length > 0 && (
                      <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-800 rounded-full transition-all duration-500"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    )}

                    {/* Adımlar listesi */}
                    {isExpanded && (
                      <div className="mt-6 space-y-3">
                        {items.length === 0 ? (
                          <p className="text-sm font-medium text-slate-400 italic">
                            Henüz adım eklenmedi. "Adım Ekle" butonuna tıklayın.
                          </p>
                        ) : (
                          items.map((item, idx) => {
                            const iid     = String(item.id);
                            const isDone  = completed[rid]?.has(iid) ?? false;
                            return (
                              <div
                                key={iid}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                                  isDone
                                    ? 'bg-slate-50 border-slate-200 shadow-sm'
                                    : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                                }`}
                              >
                                <GripVertical size={16} className="text-slate-300 shrink-0 cursor-grab" />

                                <button
                                  onClick={() => toggleCompleted(rid, iid)}
                                  className="shrink-0 transition-colors cursor-pointer outline-none"
                                  title={isDone ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                                >
                                  {isDone
                                    ? <CheckCircle2 size={24} className="text-slate-800" />
                                    : <Circle size={24} className="text-slate-300 hover:text-slate-400" />
                                  }
                                </button>

                                <span className="text-2xl w-8 text-center shrink-0">
                                  {iconEmoji(item.iconName)}
                                </span>

                                <div className="flex-1 min-w-0 ml-1">
                                  <p className={`text-[15px] font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                    {idx + 1}. {item.title}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    {item.scheduledTime && (
                                      <p className="text-[12px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                        <Clock size={12} /> {item.scheduledTime}
                                      </p>
                                    )}
                                    {item.description && (
                                      <p className="text-[13px] font-medium text-slate-500">{item.description}</p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleDeleteItem(rid, iid)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors shrink-0"
                                  title="Adımı sil"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title={deleteConfirm?.type === 'routine' ? 'Rutini sil?' : 'Adımı sil?'}
        message={deleteConfirm?.type === 'routine' ? 'Bu rutin ve tüm adımları kalıcı olarak silinecek.' : 'Bu adım kalıcı olarak silinecek.'}
        confirmLabel="Evet, sil"
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === 'routine') doDeleteRoutine(deleteConfirm.routineId);
          else if (deleteConfirm.itemId) doDeleteItem(deleteConfirm.routineId, deleteConfirm.itemId);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Rutin oluşturma modalı */}
      <Modal isOpen={showRoutineModal} onClose={() => setShowRoutineModal(false)} title="Yeni Rutin Oluştur">
        <div className="space-y-4">
          <Input
            label="Rutin Adı *"
            value={routineName}
            onChange={e => setRoutineName(e.target.value)}
            placeholder="Örn: Sabah Rutini, Yatmadan Önce..."
            autoFocus
          />
          <Input
            label="Açıklama (isteğe bağlı)"
            value={routineDesc}
            onChange={e => setRoutineDesc(e.target.value)}
            placeholder="Kısa açıklama..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowRoutineModal(false); setRoutineName(''); setRoutineDesc(''); }}>
              İptal
            </Button>
            <Button
              onClick={handleCreateRoutine}
              loading={savingRoutine}
              disabled={!routineName.trim()}
            >
              Oluştur
            </Button>
          </div>
        </div>
      </Modal>

      {/* Adım ekleme modalı */}
      <Modal isOpen={!!addItemRoutineId} onClose={() => setAddItemRoutineId(null)} title="Yeni Adım Ekle">
        <div className="space-y-4">
          <Input
            label="Adım Adı *"
            value={itemTitle}
            onChange={e => setItemTitle(e.target.value)}
            placeholder="Örn: Diş fırçala, Pijama giy..."
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">İkon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setItemIcon(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-sm border-2 transition-all cursor-pointer ${
                    itemIcon === opt.value
                      ? 'border-indigo-500 bg-indigo-50 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Saat (isteğe bağlı)"
            type="time"
            value={itemTime}
            onChange={e => setItemTime(e.target.value)}
          />
          <Input
            label="Not (isteğe bağlı)"
            value={itemDesc}
            onChange={e => setItemDesc(e.target.value)}
            placeholder="Ek açıklama..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddItemRoutineId(null)}>İptal</Button>
            <Button onClick={handleAddItem} loading={savingItem} disabled={!itemTitle.trim()}>
              Ekle
            </Button>
          </div>
        </div>
      </Modal>
      </div>

      {/* Visual Routine Cards Print View */}
      {isPrinting && activePrintingRoutine && (
        <div className="hidden print:block p-6 bg-white text-black min-h-screen">
          <div className="text-center mb-8 border-b pb-4">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">🧩 {activePrintingRoutine.name} — Görsel Rutin Kartları</h1>
            <p className="text-sm text-slate-500 mt-1">Kartları kesikli çizgilerden keserek odasına asabilir veya lamine edip üzerine işaretleme yaptırabilirsiniz.</p>
          </div>

          <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
            {activePrintingRoutine.items?.map((item, idx) => (
              <div key={item.id} className="border-4 border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center justify-between text-center min-h-[220px] bg-white relative overflow-hidden shadow-xs hover:border-slate-400 transition-colors">
                {/* Scissor icon in corner */}
                <div className="absolute top-3 left-3 text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                  ✂️ KES
                </div>
                
                {/* Step badge */}
                <div className="absolute top-3 right-3 bg-indigo-100 text-indigo-700 text-xs font-black px-2.5 py-1 rounded-full">
                  ADIM {idx + 1}
                </div>

                {/* Big Emoji */}
                <div className="text-6xl my-4 select-none transform hover:scale-110 transition-transform">
                  {iconEmoji(item.iconName)}
                </div>

                {/* Info */}
                <div className="space-y-1 w-full">
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{item.title}</h3>
                  {item.scheduledTime && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold mt-1">
                      ⏰ {item.scheduledTime}
                    </span>
                  )}
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 max-w-[90%] mx-auto italic">{item.description}</p>
                  )}
                </div>

                {/* Dry erase checkbox placeholder */}
                <div className="mt-4 w-7 h-7 rounded-lg border-2 border-slate-300 flex items-center justify-center text-slate-300 font-bold select-none text-xs">
                  ✓
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-[10px] text-slate-400 border-t pt-4">
            <p>Otizm Destek Platformu • Bireysel Görsel Program Kartları</p>
          </div>
        </div>
      )}
    </div>
  );
}
