import { Check, Lightbulb, User, TrendingUp, Brain, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { WeeklyProgressChart } from '@/components/treatment/WeeklyProgressChart';
import { formatRelative } from '@/utils/date';
import { getMoodLabel } from '@/features/treatment/treatmentPlan';
import type { DevelopmentNote } from '@/types';
import type { SmartSuggestion, TodayPlanStep } from '@/features/treatment/types';

const MOOD_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Zorlanıyor', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  2: { label: 'Hassas', color: 'text-orange-600 bg-orange-50 border-orange-100' },
  3: { label: 'Dengeli', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  4: { label: 'İyi', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  5: { label: 'Çok iyi', color: 'text-teal-600 bg-teal-50 border-teal-100' },
};

interface TreatmentTodayTabProps {
  todayPlan: TodayPlanStep[];
  smartSuggestions: SmartSuggestion[];
  latestNote: DevelopmentNote | null;
  weeklyProgress: Array<{
    key: string;
    label: string;
    gameCount: number;
    goalPercent: number;
  }>;
  recommendedGameCount: number;
  microProgress: Array<{
    title: string;
    value: string;
    detail: string;
    linkedGame?: string;
  }>;
  childId?: string;
  streakDays?: number;
  todayMood?: { moodLevel: number } | null;
  todayCompletedPlanSteps: Set<string>;
  onTogglePlanStep: (stepId: string) => void;
}

export function TreatmentTodayTab({
  todayPlan,
  smartSuggestions,
  latestNote,
  weeklyProgress,
  recommendedGameCount,
  microProgress,
  streakDays = 0,
  todayMood,
  todayCompletedPlanSteps,
  onTogglePlanStep,
}: TreatmentTodayTabProps) {
  const doneCount = todayPlan.filter(step => todayCompletedPlanSteps.has(step.id)).length;
  const totalCount = todayPlan.length;
  const percentDone = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const getBadgeStyle = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('duyusal') || lower.includes('sensory')) {
      return 'bg-amber-50 text-amber-700 ring-amber-600/10 hover:bg-amber-100/75';
    }
    if (lower.includes('iletişim') || lower.includes('hedef') || lower.includes('goal') || lower.includes('pecs') || lower.includes('aac')) {
      return 'bg-indigo-50 text-indigo-700 ring-indigo-600/10 hover:bg-indigo-100/75';
    }
    if (lower.includes('sosyal') || lower.includes('social') || lower.includes('oyun') || lower.includes('game') || lower.includes('hikaye') || lower.includes('story')) {
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 hover:bg-emerald-100/75';
    }
    return 'bg-slate-50 text-slate-600 ring-slate-500/10 hover:bg-slate-100/75';
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h3 className="text-xl font-black leading-tight text-slate-950">Bugünün kısa planı</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Bir madde seçin, uygulayın, sonra tamamlandı olarak işaretleyin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {streakDays >= 2 && (
                <span className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  {streakDays} GÜN SERİ
                </span>
              )}
              {doneCount > 0 && (
                <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  {doneCount}/{totalCount} YAPILDI
                </span>
              )}
              <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                {totalCount} ADIM
              </span>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100/70">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out" 
                style={{ width: `${percentDone}%` }}
              />
            </div>
          )}

          <div className="mt-5 space-y-3">
            {totalCount === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-800">Bugün için plan bulunamadı.</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Hedef eklediğinizde burada kısa günlük adımlar görünecek.
                </p>
              </div>
            )}

            {todayPlan.map((step) => {
              const isDone = todayCompletedPlanSteps.has(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onTogglePlanStep(step.id)}
                  aria-pressed={isDone}
                  className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors ${isDone ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                      isDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check size={16} strokeWidth={4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-black leading-5 ${isDone ? 'text-emerald-900 line-through decoration-emerald-700/50' : 'text-slate-900'}`}>
                      {step.title}
                    </span>
                    <span className={`mt-1 block text-sm leading-6 ${isDone ? 'text-emerald-800/70' : 'text-slate-600'}`}>
                      {step.detail}
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        <Clock3 size={13} />
                        {step.duration}
                      </span>
                      {step.linkedGoal && (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getBadgeStyle(step.linkedGoal)}`}>
                          {step.linkedGoal}
                        </span>
                      )}
                      {step.linkedTool && (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getBadgeStyle(step.linkedTool)}`}>
                          {step.linkedTool}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="sr-only">
                    {isDone ? 'Tamamlandı, geri almak için tıklayın' : 'Tamamlandı olarak işaretlemek için tıklayın'}
                  </span>
                </button>
              );
            })}
          </div>

          {doneCount === totalCount && totalCount > 0 && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Check size={20} strokeWidth={4} />
              </div>
              <div>
                <p className="text-sm font-black">Bugünün planı tamamlandı.</p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-700">Bugünlük bu kadar yeterli.</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {todayMood === null && (
            <Link
              to="/gunluk-takip"
              className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 hover:bg-blue-50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Brain size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-800">Bugünkü ruh halini kaydet</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Plan, çocuğun durumuna göre otomatik uyarlanır</p>
              </div>
              <span className="text-[10px] font-bold text-blue-500 bg-white border border-blue-100 px-2 py-0.5 rounded-full shrink-0">
                Kaydet →
              </span>
            </Link>
          )}
          {todayMood != null && (() => {
            const meta = MOOD_META[todayMood.moodLevel] ?? MOOD_META[3];
            return (
              <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${meta.color}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70">
                  <Brain size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">Bugünkü ruh hali: {meta.label}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">Plan bu duruma göre hazırlandı</p>
                </div>
                <Link to="/gunluk-takip" className="text-[10px] font-bold opacity-60 hover:opacity-100 shrink-0">Güncelle</Link>
              </div>
            );
          })()}

          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Lightbulb size={16} />
              </div>
              <p className="text-sm font-black text-indigo-950">Bugün dikkat edilecekler</p>
            </div>
            <div className="mt-4 space-y-3">
              {smartSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-2xl border border-indigo-100 bg-white p-4">
                  <p className="text-sm font-bold text-slate-900">{suggestion.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{suggestion.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-900">Son not</p>
            
            {latestNote ? (
              <div className="mt-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-extrabold text-white">
                    {latestNote.authorName ? latestNote.authorName.split(' ').map((n: string) => n[0]).join('') : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-800">{latestNote.authorName || 'Uzman Terapist'}</p>
                      <Badge variant="warning" className="px-1.5 py-0.5 text-[9px] font-bold">{getMoodLabel(latestNote.mood)}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">{latestNote.title || 'Çocuk Gelişim Uzmanı'}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <p className="text-sm font-medium leading-6 text-slate-600">
                    {latestNote.content || 'Bu nota eklenmiş detay bulunmuyor.'}
                  </p>
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-400">
                  <Clock3 size={13} />
                  {formatRelative(latestNote.createdAt)}
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Platform Terapi Modülü</p>
                    <p className="text-[10px] font-semibold text-slate-400">Otomatik günlük plan</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-sm font-medium leading-6 text-slate-500">
                    Henüz uzman notu yok. Bugünün planı, çocuğunuzun kayıtlarına göre hazırlandı.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Haftalık özet</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Bu bölüm sadece genel durumu gösterir.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Oyun
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Hedef
              </span>
            </div>
          </div>
          <div className="mt-4">
            <WeeklyProgressChart items={weeklyProgress} recommendedGameCount={recommendedGameCount} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-black text-slate-900">Gelişim alanları</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Ayrıntıya gerek olduğunda buraya bakabilirsiniz.</p>
          
          <div className="mt-4 grid gap-3">
            {microProgress.map((item) => {
              const numericVal = parseInt(item.value.replace(/[^0-9]/g, '')) || 0;
              return (
                <div 
                  key={item.title} 
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100/30">
                        <TrendingUp size={13} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 pr-1">{item.title}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500 font-medium">{item.detail}</p>
                  <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-slate-100/80">
                    <div 
                      className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                      style={{ width: `${numericVal}%` }}
                    />
                  </div>
                  {item.linkedGame && (
                    <div className="mt-3.5 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                        Destekleyen oyun:
                        <span className="font-bold text-slate-700">{item.linkedGame}</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
