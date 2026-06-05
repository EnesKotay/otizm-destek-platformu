import { useEffect, useState, useMemo } from 'react';
import { Plus, Star, Target, Trophy, Trash2, Pencil, CheckCircle, XCircle, Flame } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { goalService } from '@/services/goalService';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';

export interface Goal {
  id: string;
  childId: string;
  title: string;
  description: string;
  category: string;
  targetCount: number;
  tokenColor: string;
  tokenEmoji: string;
  rewardTitle: string;
  rewardDescription: string;
  active: boolean;
  entries: GoalEntry[];
  createdAt: string;
}

export interface GoalEntry {
  id: string;
  date: string;
  achieved: boolean;
  note?: string;
}

const GOAL_CATEGORIES = [
  'İletişim', 'Sosyal Beceri', 'Öz Bakım', 'Akademik', 'Davranış', 'Motor Beceri', 'Duyusal', 'Rutin', 'Diğer',
];

const TOKEN_COLORS = [
  { color: '#6366f1', label: 'Mor' }, { color: '#f59e0b', label: 'Sarı' },
  { color: '#10b981', label: 'Yeşil' }, { color: '#ef4444', label: 'Kırmızı' },
  { color: '#3b82f6', label: 'Mavi' }, { color: '#f97316', label: 'Turuncu' },
  { color: '#ec4899', label: 'Pembe' }, { color: '#14b8a6', label: 'Teal' },
];

const TOKEN_EMOJIS = ['⭐', '🌟', '💫', '🏆', '🎯', '❤️', '🦋', '🌈', '🎉', '🦄', '🐾', '🍎'];

function parseEntries(raw: string | GoalEntry[]): GoalEntry[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw as string); } catch { return []; }
}

const TODAY = new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  title: '', description: '', category: 'İletişim',
  targetCount: 10, tokenColor: '#6366f1', tokenEmoji: '⭐',
  rewardTitle: '', rewardDescription: '',
};

function calcStreak(entries: GoalEntry[]): number {
  const achievedDays = new Set(entries.filter(e => e.achieved).map(e => e.date));
  let streak = 0;
  const date = new Date(TODAY);
  while (true) {
    const d = date.toISOString().split('T')[0];
    if (!achievedDays.has(d)) break;
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function MiniHeatmap({ entries, color }: { entries: GoalEntry[]; color: string }) {
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - (27 - i));
    const dateStr = d.toISOString().split('T')[0];
    const achieved = entries.filter(e => e.date === dateStr && e.achieved).length;
    return { date: dateStr, achieved };
  });
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-1">Son 4 hafta</p>
      <div className="flex flex-wrap gap-0.5">
        {days.map(({ date, achieved }) => (
          <div
            key={date}
            className="w-3.5 h-3.5 rounded-sm transition-colors"
            style={{ backgroundColor: achieved > 0 ? color : '#f3f4f6' }}
            title={`${date}: ${achieved} token`}
          />
        ))}
      </div>
    </div>
  );
}

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#f97316'];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${5 + (i * 2.3) % 90}%`,
    delay: `${(i * 0.07) % 0.8}s`,
    duration: `${0.9 + (i % 5) * 0.15}s`,
    size: 5 + (i % 4) * 3,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

function TokenBoard({ goal }: { goal: Goal }) {
  const achieved = goal.entries.filter(e => e.achieved).length;
  const pct = Math.min(100, Math.round((achieved / goal.targetCount) * 100));
  const tokens = Array.from({ length: goal.targetCount }, (_, i) => i < achieved);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tokens.map((filled, i) => (
          <div key={i} className="relative">
            <span
              className={`text-xl leading-none transition-all duration-300 ${filled ? 'scale-110' : ''}`}
              style={{ opacity: filled ? 1 : 0.15, display: 'inline-block' }}
            >
              {goal.tokenEmoji}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: goal.tokenColor }} />
        </div>
        <span className="text-xs font-bold text-gray-600 shrink-0">{achieved}/{goal.targetCount}</span>
      </div>
    </div>
  );
}

export function GoalTokenPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [logGoalId, setLogGoalId] = useState<string | null>(null);
  const [logNote, setLogNote] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!children.length) childService.getAll().then(setChildren).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChild && children.length) setSelectedChild(children[0]);
  }, [children, selectedChild, setSelectedChild]);

  useEffect(() => {
    if (!selectedChildId) return;
    goalService.getAll(selectedChildId).then(data =>
      setGoals(data.map(g => ({ ...g, entries: parseEntries(g.entries) })))
    ).catch(() => {});
  }, [selectedChildId]);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3200);
  };

  const openAdd = () => { setEditingGoal(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit = (g: Goal) => {
    setEditingGoal(g);
    setForm({ title: g.title, description: g.description, category: g.category, targetCount: g.targetCount, tokenColor: g.tokenColor, tokenEmoji: g.tokenEmoji, rewardTitle: g.rewardTitle, rewardDescription: g.rewardDescription });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.rewardTitle.trim()) { toast.error('Hedef adı ve ödül zorunlu.'); return; }
    try {
      if (editingGoal) {
        const updated = await goalService.update(editingGoal.id, form);
        setGoals(prev => prev.map(g => g.id === editingGoal.id ? { ...updated, entries: parseEntries(updated.entries) } : g));
        toast.success('Hedef güncellendi.');
      } else {
        const created = await goalService.create(selectedChildId, form);
        setGoals(prev => [{ ...created, entries: [] }, ...prev]);
        toast.success('Hedef eklendi! 🎯');
      }
      setShowModal(false);
    } catch { toast.error('İşlem başarısız.'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await goalService.delete(id);
      setGoals(prev => prev.filter(g => g.id !== id));
      setDeleteId(null);
      toast.success('Hedef silindi.');
    } catch { toast.error('Silinemedi.'); }
  };

  const logEntry = async (goalId: string, achieved: boolean) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const entry: GoalEntry = { id: crypto.randomUUID(), date: TODAY, achieved, note: logNote || undefined };
    const newEntries = [...goal.entries, entry];
    const achievedCount = newEntries.filter(e => e.achieved).length;
    const isComplete = achievedCount >= goal.targetCount;
    try {
      const updated = await goalService.update(goalId, { entries: JSON.stringify(newEntries), active: !isComplete });
      setGoals(prev => prev.map(g => g.id === goalId ? { ...updated, entries: newEntries } : g));
      setLogGoalId(null); setLogNote('');
      if (achieved) {
        if (isComplete) {
          triggerConfetti();
          toast.success(`🏆 Tebrikler! "${goal.title}" hedefi tamamlandı! Ödül: ${goal.rewardTitle}`);
        } else {
          toast.success(`${goal.tokenEmoji} Token kazanıldı!`);
        }
      }
    } catch { toast.error('Kaydedilemedi.'); }
  };

  const activeGoals = goals.filter(g => g.active);
  const completedGoals = goals.filter(g => !g.active);
  const displayGoals = activeTab === 'active' ? activeGoals : completedGoals;

  const stats = useMemo(() => {
    const totalTokens = goals.reduce((s, g) => s + g.entries.filter(e => e.achieved).length, 0);
    const completedCount = completedGoals.length;
    const todayTokens = goals.reduce((s, g) => s + g.entries.filter(e => e.achieved && e.date === TODAY).length, 0);
    const bestStreak = goals.reduce((max, g) => Math.max(max, calcStreak(g.entries)), 0);
    return { totalTokens, completedCount, todayTokens, bestStreak };
  }, [goals]);

  return (
    <div className="space-y-6">
      <Confetti show={showConfetti} />

      <PageOnboarding
        pageId="goal-token"
        title="Hedef & Token Ekonomisine Hoş Geldiniz"
        description="Çocuğunuzun terapötik hedeflerini görselleştirin ve olumlu davranışları ödüllendirin."
        steps={[
          { icon: <Target size={20} />, title: "Hedef Belirleyin", description: "Sosyal, iletişim veya akademik alanlarda ulaşılabilir küçük hedefler ekleyin." },
          { icon: <Star size={20} />, title: "Token Kazandırın", description: "Çocuğunuz hedef davranışı her gösterdiğinde bir token (yıldız, rozet) verin." },
          { icon: <Trophy size={20} />, title: "Ödüllendirin", description: "Hedeflenen token sayısına ulaşıldığında belirlediğiniz büyük ödülü verin." }
        ]}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hedef & Token Ekonomisi</h1>
          <p className="text-gray-500 mt-1">Terapötik hedefler ve ödül sistemi</p>
        </div>
        <Button onClick={openAdd}><Plus size={15} className="mr-1" />Hedef Ekle</Button>
      </div>

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
        <EmptyState icon={<Target size={28} />} title="Çocuk profili bulunamadı" description="Önce Çocuklarım sayfasından profil ekleyin." />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-5 text-center bg-white border border-slate-200 shadow-sm">
              <p className="text-3xl font-black text-slate-800">{stats.todayTokens}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Bugün kazanılan</p>
            </Card>
            <Card className="p-5 text-center bg-white border border-slate-200 shadow-sm">
              <p className="text-3xl font-black text-slate-800">{stats.totalTokens}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Toplam token</p>
            </Card>
            <Card className="p-5 text-center bg-white border border-slate-200 shadow-sm">
              <p className="text-3xl font-black text-slate-800">{stats.completedCount}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Tamamlanan hedef</p>
            </Card>
            <Card className="p-5 text-center bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-center gap-1">
                <Flame size={20} className="text-slate-800" />
                <p className="text-3xl font-black text-slate-800">{stats.bestStreak}</p>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">En uzun seri (gün)</p>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {(['active', 'completed'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {tab === 'active' ? `Aktif (${activeGoals.length})` : `Tamamlanan (${completedGoals.length})`}
              </button>
            ))}
          </div>

          {displayGoals.length === 0 ? (
            <EmptyState icon={<Target size={28} />}
              title={activeTab === 'active' ? 'Aktif hedef yok' : 'Henüz tamamlanan hedef yok'}
              description={activeTab === 'active' ? 'İlk terapötik hedefinizi ekleyin.' : 'Hedefler tamamlandıkça burada görünür.'}
              action={activeTab === 'active' ? <Button onClick={openAdd}><Plus size={14} className="mr-1" />Hedef Ekle</Button> : undefined} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {displayGoals.map(goal => {
                const isComplete = !goal.active;
                const todayLogged = goal.entries.some(e => e.date === TODAY);
                const streak = calcStreak(goal.entries);

                return (
                  <Card key={goal.id} className={`p-6 space-y-5 shadow-sm border border-slate-200 bg-white ${isComplete ? 'opacity-75' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-2xl">
                          {goal.tokenEmoji}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">{goal.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-[13px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200">{goal.category}</span>
                            {streak > 0 && (
                              <span className="flex items-center gap-1 text-[12px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                <Flame size={12} />{streak} gün seri
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(goal)} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 cursor-pointer transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(goal.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </div>

                    {goal.description && <p className="text-[15px] font-medium text-slate-600 leading-relaxed">{goal.description}</p>}

                    <TokenBoard goal={goal} />

                    {/* Mini heatmap */}
                    {goal.entries.length > 0 && (
                      <div className="pt-2">
                        <MiniHeatmap entries={goal.entries} color={goal.tokenColor} />
                      </div>
                    )}

                    {/* Reward */}
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-200">
                      <Trophy size={20} className="text-slate-800 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">{isComplete ? '🏆 ÖDÜL KAZANILDI!' : 'Ödül:'} {goal.rewardTitle}</p>
                        {goal.rewardDescription && <p className="text-[13px] font-medium text-slate-500 mt-0.5 truncate">{goal.rewardDescription}</p>}
                      </div>
                    </div>

                    {!isComplete && (
                      <div className="pt-2">
                        {logGoalId === goal.id ? (
                          <div className="space-y-3">
                            <input value={logNote} onChange={e => setLogNote(e.target.value)}
                              placeholder="Not (opsiyonel)..."
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-[15px] font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />
                            <div className="flex gap-2">
                              <button onClick={() => logEntry(goal.id, true)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold text-[15px] flex items-center justify-center gap-1.5 hover:bg-slate-900 cursor-pointer transition-colors shadow-sm">
                                <CheckCircle size={16} />Başardı ✓
                              </button>
                              <button onClick={() => logEntry(goal.id, false)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-[15px] flex items-center justify-center gap-1.5 hover:bg-slate-200 cursor-pointer transition-colors">
                                <XCircle size={16} />Başaramadı
                              </button>
                              <button onClick={() => setLogGoalId(null)}
                                className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-[15px] hover:bg-slate-50 cursor-pointer transition-colors">İptal</button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" className="w-full h-12 text-[15px] font-bold bg-slate-800 hover:bg-slate-900" onClick={() => { setLogGoalId(goal.id); setLogNote(''); }}>
                            <Star size={16} className="mr-2" />
                            {todayLogged ? 'Bugün tekrar kaydet' : 'Bugünkü durumu kaydet'}
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingGoal ? 'Hedefi Düzenle' : 'Yeni Hedef'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Adı *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Örn: Teşekkür ederim demek"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Hedefin detayları..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                {GOAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token Hedefi</label>
              <input type="number" min={1} max={50} value={form.targetCount} onChange={e => setForm(f => ({ ...f, targetCount: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Token Emojisi</label>
            <div className="flex flex-wrap gap-2">
              {TOKEN_EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setForm(f => ({ ...f, tokenEmoji: e }))}
                  className={`text-xl p-2 rounded-xl border-2 cursor-pointer transition-all ${form.tokenEmoji === e ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-300'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Token Rengi</label>
            <div className="flex flex-wrap gap-2">
              {TOKEN_COLORS.map(tc => (
                <button key={tc.color} type="button" onClick={() => setForm(f => ({ ...f, tokenColor: tc.color }))}
                  className={`w-8 h-8 rounded-full border-4 cursor-pointer transition-all ${form.tokenColor === tc.color ? 'border-gray-800 scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                  style={{ backgroundColor: tc.color }} title={tc.label} />
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-700 flex items-center gap-2"><Trophy size={15} />Ödül Tanımı</p>
            <input value={form.rewardTitle} onChange={e => setForm(f => ({ ...f, rewardTitle: e.target.value }))}
              placeholder="Ödül adı * (Örn: Parka gidiyoruz!)"
              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
            <input value={form.rewardDescription} onChange={e => setForm(f => ({ ...f, rewardDescription: e.target.value }))}
              placeholder="Ödül açıklaması..."
              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">İptal</Button>
            <Button onClick={handleSave} className="flex-1">Kaydet</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} title="Hedefi sil?" message="Tüm token geçmişiyle birlikte silinecek."
        confirmLabel="Evet, sil" variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
