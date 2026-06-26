import { Check, Lightbulb, Quote, User, Award, TrendingUp, Brain, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { WeeklyProgressChart } from '@/components/treatment/WeeklyProgressChart';
import { formatRelative } from '@/utils/date';
import { getMoodLabel } from '@/features/treatment/treatmentPlan';
import type { DevelopmentNote } from '@/types';
import type { SmartSuggestion, TodayPlanStep } from '@/features/treatment/types';

const MOOD_META: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😰', label: 'Zorlanıyor', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  2: { emoji: '😟', label: 'Hassas', color: 'text-orange-600 bg-orange-50 border-orange-100' },
  3: { emoji: '😐', label: 'Dengeli', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  4: { emoji: '😊', label: 'İyi', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  5: { emoji: '😄', label: 'Çok iyi', color: 'text-teal-600 bg-teal-50 border-teal-100' },
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
        <div className="group rounded-[2.5rem] border border-slate-200/50 bg-white/70 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_20px_60px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-gradient-to-br from-indigo-50/50 to-emerald-50/50 rounded-full blur-[100px] opacity-50 pointer-events-none group-hover:opacity-80 transition-opacity duration-700" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50/60 px-2 py-0.5 rounded-md">
                BUGÜNÜN ADIMLAR
              </span>
              <h3 className="mt-2 text-lg font-extrabold text-slate-800 leading-snug">Bugün çocuğunuzla neler yapabilirsiniz?</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {streakDays >= 2 && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-3 py-1.5 text-[11px] font-black text-amber-700 shadow-sm transition-transform hover:scale-105">
                  <Flame size={12} className="text-amber-500 animate-pulse" />
                  {streakDays} GÜN SERİ
                </span>
              )}
              {doneCount > 0 && (
                <span className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-transform hover:scale-105">
                  {doneCount}/{totalCount} YAPILDI
                </span>
              )}
              <span className="inline-flex items-center rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm">
                {totalCount} ADIM
              </span>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100/70">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500 ease-out" 
                style={{ width: `${percentDone}%` }}
              />
            </div>
          )}

          <div className="relative mt-6 space-y-4">
            {totalCount > 1 && (
              <div className="absolute left-6 top-3 bottom-6 w-0.5 bg-slate-100" />
            )}

            {todayPlan.map((step) => {
              const isDone = todayCompletedPlanSteps.has(step.id);
              return (
                <div
                  key={step.id}
                  className={`relative pl-12 pr-4 py-3.5 rounded-2xl border border-transparent transition-all duration-300 hover:border-slate-100 hover:bg-slate-50/50 hover:shadow-sm ${isDone ? 'opacity-70 bg-slate-50/30' : 'bg-white'}`}
                >
                  <div className="absolute left-3.5 top-[18px] z-10 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onTogglePlanStep(step.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200 cursor-pointer focus:outline-none"
                      aria-label={isDone ? 'Tamamlandı, geri al' : `${step.title} adımını tamamla`}
                      aria-pressed={isDone}
                    >
                      {isDone ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200 transition-transform duration-200 scale-100">
                          <Check size={12} strokeWidth={4} className="text-white" />
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white hover:border-indigo-500 transition-colors">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 opacity-0 hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={`text-xs font-bold leading-snug ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {step.title}
                      </p>
                      <p className={`mt-1 text-[11px] leading-relaxed ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                        {step.detail}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {step.linkedGoal && (
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ring-1 ring-inset ${getBadgeStyle(step.linkedGoal)} transition-colors`}>
                            {step.linkedGoal}
                          </span>
                        )}
                        {step.linkedTool && (
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ring-1 ring-inset ${getBadgeStyle(step.linkedTool)} transition-colors`}>
                            {step.linkedTool}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-slate-100/80 px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200/40">
                      ⏱️ {step.duration}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {doneCount === totalCount && totalCount > 0 && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-md shadow-emerald-100/50 flex items-center gap-3 animate-pulse">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
                <Award size={20} className="animate-bounce" />
              </div>
              <div>
                <p className="text-sm font-black">🎉 Harika İş!</p>
                <p className="text-xs text-emerald-50/90 mt-0.5">Bugünün tüm tedavi adımlarını başarıyla tamamladınız.</p>
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
                <span className="text-2xl shrink-0">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">Bugünkü ruh hali: {meta.label}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">Plan bu duruma göre hazırlandı</p>
                </div>
                <Link to="/gunluk-takip" className="text-[10px] font-bold opacity-60 hover:opacity-100 shrink-0">Güncelle</Link>
              </div>
            );
          })()}

          <div className="group/sug rounded-[2rem] border border-indigo-100/50 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 p-6 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.1)] transition-all duration-500 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 bg-indigo-400/20 rounded-full blur-3xl group-hover/sug:bg-indigo-400/30 transition-colors duration-500" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-transform group-hover/sug:scale-110 group-hover/sug:rotate-6">
                <Lightbulb size={15} className="animate-pulse" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Bugün Dikkat Edilecekler</p>
            </div>
            <div className="mt-4 space-y-3">
              {smartSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="group relative rounded-2xl bg-white p-4 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.01)] hover:shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-md bg-indigo-500/80 group-hover:bg-indigo-500 transition-colors" />
                  <p className="text-xs font-bold text-slate-800 pr-1 group-hover:text-indigo-600 transition-colors">{suggestion.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{suggestion.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="group/note relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white/80 p-6 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.06)] transition-all duration-500">
            <div className="absolute -right-6 -top-6 text-slate-100 transition-transform duration-500 group-hover/note:scale-110 group-hover/note:rotate-12 group-hover/note:text-slate-200/80">
              <Quote size={100} strokeWidth={1} />
            </div>
            <p className="relative z-10 text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Son Not / Uzman Gözlemi</p>
            
            {latestNote ? (
              <div className="relative mt-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500 to-indigo-600 text-white font-extrabold text-xs shadow-sm shadow-indigo-100/30">
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
                <div className="relative mt-3 rounded-2xl bg-slate-50/80 p-3">
                  <p className="text-xs leading-relaxed text-slate-600 font-medium italic">
                    "{latestNote.content || 'Bu nota eklenmiş detay bulunmuyor.'}"
                  </p>
                  <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-slate-50/80" />
                </div>
                <p className="mt-3 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  ⏱️ {formatRelative(latestNote.createdAt)}
                </p>
              </div>
            ) : (
              <div className="relative mt-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-inner">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Platform Terapi Modülü</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Yapay Zeka Destekli Analiz</p>
                  </div>
                </div>
                <div className="relative mt-3 rounded-2xl bg-slate-50/60 p-3.5 border border-dashed border-slate-200">
                  <p className="text-xs leading-relaxed text-slate-500 font-medium italic">
                    "Henüz bu çocuk için uzman notu girilmedi. Bugünün günlük gelişim planı, çocuğunuzun terapi hedefleri ve durumuna göre otomatik olarak oluşturuldu."
                  </p>
                  <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-slate-50/60 border-t border-l border-dashed border-slate-200" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="group rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-7 backdrop-blur-2xl shadow-[0_20px_60px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">SON 7 GÜN</span>
              <h3 className="mt-1 text-base font-extrabold text-slate-800">Bu Hafta Ne Kadar Aktif Oldunuz?</h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/20" /> Oynanan oyun sayısı
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/20" /> Hedef tamamlanma %
              </span>
            </div>
          </div>
          <div className="mt-4">
            <WeeklyProgressChart items={weeklyProgress} recommendedGameCount={recommendedGameCount} />
          </div>
        </div>

        <div className="group rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-7 backdrop-blur-2xl shadow-[0_20px_60px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-500">
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">GELİŞİM ALANLARI</span>
          <h3 className="mt-1 text-base font-extrabold text-slate-800">Her Alanda Neredeyiz?</h3>
          
          <div className="mt-4 grid gap-3">
            {microProgress.map((item) => {
              const numericVal = parseInt(item.value.replace(/[^0-9]/g, '')) || 0;
              return (
                <div 
                  key={item.title} 
                  className="group rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50/50 to-white p-4 shadow-[0_4px_15px_rgba(15,23,42,0.01)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.03)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100/30">
                        <TrendingUp size={13} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 pr-1">{item.title}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100/50 shadow-sm shadow-emerald-100/10">
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500 font-medium">{item.detail}</p>
                  <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-slate-100/80">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000 ease-out shadow-sm"
                      style={{ width: `${numericVal}%` }}
                    />
                  </div>
                  {item.linkedGame && (
                    <div className="mt-3.5 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                      <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1.5 uppercase tracking-wider">
                        <span>🎮</span> Destekleyen Oyun: 
                        <span className="text-slate-600 font-bold normal-case underline decoration-indigo-200 underline-offset-4">{item.linkedGame}</span>
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
