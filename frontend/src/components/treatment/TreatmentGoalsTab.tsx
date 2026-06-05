import { useState } from 'react';
import { ArrowRight, Award, CalendarDays, Check, ChevronRight, ClipboardList, Loader2, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { milestoneService } from '@/services/milestoneService';
import { formatRelative } from '@/utils/date';
import { cn } from '@/utils/cn';
import { getMoodLabel, getStatusMeta } from '@/features/treatment/treatmentPlan';
import { toast } from '@/store/toastStore';
import type { AppointmentRecord, CalendarEvent, DevelopmentNote } from '@/types';
import type { EditableGoal, FocusKey, GoalGroup } from '@/features/treatment/types';

const MILESTONE_CATEGORIES = [
  { value: 'İletişim', label: 'İletişim' },
  { value: 'Sosyal', label: 'Sosyal' },
  { value: 'Duyusal', label: 'Duyusal' },
  { value: 'Davranış', label: 'Davranış' },
  { value: 'Motor', label: 'Motor' },
  { value: 'Eğitim', label: 'Eğitim' },
];

interface TreatmentGoalsTabProps {
  activeAppointments: AppointmentRecord[];
  childEvents: CalendarEvent[];
  customGoals: EditableGoal[];
  detailLoading: boolean;
  goalDraft: string;
  goalDraftFocus: FocusKey;
  mergedGoalGroups: GoalGroup[];
  recentNotes: DevelopmentNote[];
  savingTreatment: boolean;
  childId?: string;
  onAddGoal: () => void;
  onGoalDraftChange: (value: string) => void;
  onGoalDraftFocusChange: (value: FocusKey) => void;
  onDeleteGoal: (goalId: string) => void;
  onUpdateGoal: (goalId: string, title: string, focusKey: FocusKey) => Promise<boolean>;
  onToggleGoal: (goalId: string) => void;
}

export function TreatmentGoalsTab({
  activeAppointments,
  childEvents,
  customGoals,
  detailLoading,
  goalDraft,
  goalDraftFocus,
  mergedGoalGroups,
  recentNotes,
  savingTreatment,
  childId,
  onAddGoal,
  onDeleteGoal,
  onGoalDraftChange,
  onGoalDraftFocusChange,
  onUpdateGoal,
  onToggleGoal,
}: TreatmentGoalsTabProps) {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editFocus, setEditFocus] = useState<FocusKey>('communication');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneCategory, setMilestoneCategory] = useState('İletişim');
  const [savingMilestone, setSavingMilestone] = useState(false);

  const handleAddMilestone = async () => {
    if (!childId || !milestoneTitle.trim()) return;
    setSavingMilestone(true);
    try {
      await milestoneService.create({ childId, title: milestoneTitle.trim(), category: milestoneCategory });
      toast.success('Kilometre taşı kaydedildi 🎉');
      setMilestoneTitle('');
    } catch {
      toast.error('Kaydedilemedi, tekrar deneyin.');
    } finally {
      setSavingMilestone(false);
    }
  };

  const startEditing = (goal: EditableGoal) => {
    setEditingGoalId(goal.id);
    setEditDraft(goal.title);
    setEditFocus(goal.focusKey);
  };

  const saveEditing = async () => {
    if (!editingGoalId) return;
    const saved = await onUpdateGoal(editingGoalId, editDraft, editFocus);
    if (saved) {
      setEditingGoalId(null);
      setEditDraft('');
    }
  };

  return (
    <div className="space-y-6">

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Günlük Hedef Ekle</h3>
            <p className="mt-1 text-sm text-slate-500">Bugün çocuğunuza özel takip etmek istediğiniz küçük bir şey yazın. Örn: "2 kez göz teması kurdu", "Selam dedi".</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={goalDraftFocus}
              onChange={(event) => onGoalDraftFocusChange(event.target.value as FocusKey)}
              disabled={savingTreatment}
              aria-label="Hedef alanı"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
            >
              <option value="communication">İletişim</option>
              <option value="social">Sosyal</option>
              <option value="sensory">Duyusal</option>
            </select>
            {/* Fix 4: Enter tuşuyla hedef ekleme */}
            <input
              value={goalDraft}
              onChange={(event) => onGoalDraftChange(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && goalDraft.trim().length > 0 && !savingTreatment) {
                  onAddGoal();
                }
              }}
              disabled={savingTreatment}
              placeholder="Örn: 2 kez göz teması kurdu"
              className="min-w-[16rem] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-0 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
            <button
              type="button"
              onClick={onAddGoal}
              disabled={savingTreatment || goalDraft.trim().length === 0}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingTreatment ? 'Kaydediliyor...' : 'Hedef ekle'}
            </button>
          </div>
        </div>

        {customGoals.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Sizin eklediğiniz hedefler</p>
            <div className="grid gap-3 md:grid-cols-2">
              {customGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={cn(
                    'rounded-2xl border px-4 py-4 transition-colors',
                    goal.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}
                >
                  {editingGoalId === goal.id ? (
                    <div className="space-y-3">
                      <input
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        disabled={savingTreatment}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                      />
                      <select
                        value={editFocus}
                        onChange={(event) => setEditFocus(event.target.value as FocusKey)}
                        disabled={savingTreatment}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <option value="communication">İletişim</option>
                        <option value="social">Sosyal</option>
                        <option value="sensory">Duyusal</option>
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={saveEditing}
                          disabled={savingTreatment || editDraft.trim().length === 0}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGoalId(null)}
                          disabled={savingTreatment}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleGoal(goal.id)}
                        disabled={savingTreatment}
                        aria-pressed={goal.done}
                        className={cn(
                          'mt-0.5 h-4 w-4 rounded-full disabled:cursor-not-allowed disabled:opacity-60',
                          goal.done ? 'bg-emerald-500' : 'bg-slate-200'
                        )}
                        aria-label={`${goal.title} hedefini tamamlandı olarak işaretle`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{goal.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          {goal.focusKey === 'communication' ? 'İletişim' : goal.focusKey === 'social' ? 'Sosyal' : 'Duyusal'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(goal)}
                            disabled={savingTreatment}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteGoal(goal.id)}
                            disabled={savingTreatment}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Terapi Hedefleri — Alana Göre İlerleme</p>
        </div>

        {/* Fix 6: boş hedef grubu empty state */}
        {mergedGoalGroups.length === 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Target size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-600">Henüz terapi hedefi görünmüyor</p>
            <p className="mt-1 text-sm text-slate-400">
              Çocuğunuzun profiline terapi türü eklendiğinde (örn: ABA, dil terapisi) hedefler otomatik olarak burada listelenir.
              Şimdilik yukarıdaki alandan kendi hedeflerinizi ekleyebilirsiniz.
            </p>
          </div>
        )}

        {mergedGoalGroups.map((group) => (
          <div key={group.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            {/* Header with donut */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-slate-900">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-2xl',
                  group.tone === 'sky' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600'
                )}>
                  {group.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{group.title}</h3>
                  <p className="text-sm text-slate-400">
                    {group.items.filter((item) => item.status === 'done').length}/{group.items.length} tamamlandı
                  </p>
                </div>
              </div>
              {/* Donut progress */}
              <div className="relative h-12 w-12 shrink-0">
                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="18" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                  <circle
                    cx="24" cy="24" r="18" fill="none"
                    stroke={group.tone === 'sky' ? '#38bdf8' : '#a78bfa'}
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - group.percent / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <span className={cn(
                  'absolute inset-0 flex items-center justify-center text-[10px] font-bold',
                  group.tone === 'sky' ? 'text-sky-600' : 'text-violet-600'
                )}>
                  {group.percent}%
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {group.items.map((item) => {
                const meta = getStatusMeta(item.status);
                const isDone = item.status === 'done';
                return (
                  <div key={item.label} className="flex items-center gap-3 border-t border-slate-100 pt-2.5 first:border-t-0 first:pt-0">
                    {isDone ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <Check size={11} className="text-emerald-600" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', meta.dot)} />
                    )}
                    <p className={cn('text-sm font-medium flex-1', isDone ? 'text-emerald-700' : meta.text)}>
                      {item.label}
                    </p>
                    <span className={cn('text-xs shrink-0', isDone ? 'text-emerald-600 font-semibold' : 'text-slate-400')}>
                      {meta.suffix}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
              {group.summary}
            </div>
          </div>
        ))}
      </div>

      {/* Milestone quick-add */}
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/60 to-indigo-50/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-violet-600 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-900">Büyük Bir Başarı Kaydet 🏅</h3>
          <p className="ml-auto text-[11px] text-slate-400">Hatırlamak istediğiniz önemli bir an</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={milestoneCategory}
            onChange={e => setMilestoneCategory(e.target.value)}
            disabled={savingMilestone}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            {MILESTONE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            value={milestoneTitle}
            onChange={e => setMilestoneTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && milestoneTitle.trim() && !savingMilestone) handleAddMilestone(); }}
            disabled={savingMilestone}
            placeholder="Örn: İlk kez adını söyledi"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button
            type="button"
            onClick={handleAddMilestone}
            disabled={savingMilestone || !milestoneTitle.trim() || !childId}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {savingMilestone ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
            Kaydet
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ClipboardList size={24} className="text-primary-600" aria-hidden="true" />
            <h3 className="text-xl font-semibold text-slate-900">Son gözlem notları</h3>
          </div>
          <div className="mt-5 space-y-3">
            {detailLoading ? (
              <>
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </>
            ) : recentNotes.length > 0 ? (
              recentNotes.slice(0, 3).map((note) => (
                <div key={note.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                    <Badge variant="warning">{getMoodLabel(note.mood)}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {note.content || 'İçerik eklenmemiş gelişim notu.'}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
                    {formatRelative(note.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-500">
                Henüz bu çocuğa ait uzman veya ebeveyn notu yok.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarDays size={24} className="text-primary-600" aria-hidden="true" />
            <h3 className="text-xl font-semibold text-slate-900">Yaklaşan Randevu ve Etkinlikler</h3>
          </div>
          <div className="mt-5 space-y-3">
            {detailLoading ? (
              <>
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </>
            ) : activeAppointments.length > 0 || childEvents.length > 0 ? (
              [...activeAppointments.slice(0, 2), ...childEvents.slice(0, 2)].map((item, index) => {
                const isAppointment = 'expertName' in item;
                return (
                  <div key={isAppointment ? item.id : `${item.id}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {isAppointment ? item.expertName : item.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {isAppointment ? `${item.date} - ${item.time}` : item.startTime}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-500">
                Yakın tarihte planlanmış aktif seans veya etkinlik görünmüyor.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/randevular"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Randevular
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/takvim"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Takvime Git
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
