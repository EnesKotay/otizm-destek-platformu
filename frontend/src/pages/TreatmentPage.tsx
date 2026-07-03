import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, CalendarDays, FileText, Gamepad2, Sparkles, Target,
  TrendingUp, Plus, Users, ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import api from '@/services/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TreatmentDetailTabs } from '@/components/treatment/TreatmentDetailTabs';
import { TreatmentGamesTab } from '@/components/treatment/TreatmentGamesTab';
import { TreatmentGoalsTab } from '@/components/treatment/TreatmentGoalsTab';
import { TreatmentTodayTab } from '@/components/treatment/TreatmentTodayTab';
import { TreatmentToolsTab } from '@/components/treatment/TreatmentToolsTab';
import { useTreatmentPageData } from '@/features/treatment/useTreatmentPageData';
import { cn } from '@/utils/cn';
import type { FocusKey } from '@/features/treatment/types';
import { toast } from '@/store/toastStore';
type DetailTab = 'overview' | 'today' | 'goals' | 'games' | 'tools';

const SUMMARY_META = [
  { icon: Gamepad2,   iconBg: 'bg-sky-50',     iconColor: 'text-sky-600',     valueCls: 'text-sky-700'     },
  { icon: Target,     iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  valueCls: 'text-violet-700'  },
  { icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueCls: 'text-emerald-700' },
] as const;

const DETAIL_TABS = [
  { value: 'today' as const, label: 'Bugün ne yapacağım?', icon: <CalendarDays size={15} aria-hidden="true" /> },
  { value: 'goals' as const, label: 'Hedeflerim', icon: <Target size={15} aria-hidden="true" /> },
  { value: 'games' as const, label: 'Oyunlar', icon: <Gamepad2 size={15} aria-hidden="true" /> },
  { value: 'tools' as const, label: 'Araçlar', icon: <Sparkles size={15} aria-hidden="true" /> },
];

export function TreatmentPage() {
  return <TreatmentContent />;
}

function TreatmentContent() {
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('overview');
  const [activeGameFilter, setActiveGameFilter] = useState<'all' | FocusKey>('all');
  const [goalDraft, setGoalDraft] = useState('');
  const [goalDraftFocus, setGoalDraftFocus] = useState<FocusKey>('communication');
  const [goalDraftDueDate, setGoalDraftDueDate] = useState('');

  const treatment = useTreatmentPageData();
  const {
    activeAppointments, activeChild, actions, childEvents, children,
    customGoals, customStories, detailLoading, gameFeedback, gameSessions, latestNote,
    loading, mergedGoalGroups, microProgress, primaryGoal, recentNotes,
    savingTreatment, sensoryMetrics, sensoryProfile, showMilestoneBanner,
    streakDays, supportPlan, templateGoalToggles, todayCompletedGames,
    todayCompletedPlanSteps, todayMood, weeklyProgress, weeklySummary, user,
  } = treatment;

  const {
    activeProgramLabel, games: recommendedGames,
    smartSuggestions, stories: socialStories, todayPlan, toolCards, triggerSummary,
  } = supportPlan;

  const filteredGames = useMemo(
    () => activeGameFilter === 'all'
      ? recommendedGames
      : recommendedGames.filter((g) => g.key === activeGameFilter),
    [activeGameFilter, recommendedGames]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveGameFilter('all');
  }, [activeChild?.id]);

  const handleAddGoal = async () => {
    const saved = await actions.addCustomGoal(goalDraft, goalDraftFocus, goalDraftDueDate || undefined);
    if (saved) { setGoalDraft(''); setGoalDraftDueDate(''); }
  };

  const handleDownloadPdf = async () => {
    if (!activeChild) return;
    try {
      const response = await api.get(`/pdf/child/${activeChild.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `gelisim-raporu-${activeChild.name}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF raporu oluşturulamadı.');
    }
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('İnternet bağlantısı sağlandı. Çevrimdışı veriler eşitleniyor...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Bağlantı kesildi. Çevrimdışı çalışma modu aktif.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (user?.role && user.role !== 'PARENT') {
    return (
      <div className="py-12">
        <EmptyState
          icon={<Activity size={28} />}
          title="Bu alan ebeveyn paneline özeldir"
          description="Tedavi ve gelişim sayfası, çocuk bazlı takip akışını ebeveynler için sunar."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-[30rem] rounded-3xl" />
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="py-10">
        <EmptyState
          icon={<Activity size={28} />}
          title="Önce çocuğunuzu ekleyin"
          description="Çocuğunuzu ekledikten sonra buradan hedefler, oyunlar ve günlük çalışma planı görünecek."
          action={
            <Link
              to="/cocuklarim"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              Çocuk Profiline Git
              <ArrowRight size={16} />
            </Link>
          }
        />
      </div>
    );
  }

  const completedGuideCount = [
    todayPlan.length > 0,
    Boolean(primaryGoal),
    todayCompletedGames.length > 0,
    Boolean(sensoryProfile),
  ].filter(Boolean).length;
  const todayStepCount = todayPlan.length;
  const todayDoneCount = todayCompletedPlanSteps.size;
  const todayRemainingCount = Math.max(todayStepCount - todayDoneCount, 0);
  const totalGoalCount = mergedGoalGroups.reduce((acc, group) => acc + group.items.length, 0);
  const completedGoalCount = mergedGoalGroups.reduce((acc, group) => acc + group.items.filter((item) => item.status === 'done').length, 0);
  const activeSection = DETAIL_TABS.find(tab => tab.value === activeDetailTab);

  const sectionCards: Array<{
    tab: Exclude<DetailTab, 'overview'>;
    icon: typeof CalendarDays;
    eyebrow: string;
    title: string;
    description: string;
    stat: string;
    cta: string;
    tone: string;
    border: string;
  }> = [
    {
      tab: 'today',
      icon: CalendarDays,
      eyebrow: 'Önce burası',
      title: 'Bugünün planı',
      description: 'Sadece bugünkü kısa adımları görün. Bir adım tamamlamak yeterli.',
      stat: `${todayRemainingCount} kaldı`,
      cta: 'Planı aç',
      tone: 'bg-blue-50 text-blue-700 ring-blue-100',
      border: 'hover:border-blue-200 hover:bg-blue-50/30',
    },
    {
      tab: 'goals',
      icon: Target,
      eyebrow: 'Takip',
      title: 'Hedeflerim',
      description: 'Beceri alanlarını ve küçük hedefleri ayrı ayrı takip edin.',
      stat: `${completedGoalCount}/${totalGoalCount || 0} tamam`,
      cta: primaryGoal ? 'Hedefleri gör' : 'Hedef ekle',
      tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
      border: 'hover:border-indigo-200 hover:bg-indigo-50/30',
    },
    {
      tab: 'games',
      icon: Gamepad2,
      eyebrow: 'Uygulama',
      title: 'Kısa oyunlar',
      description: '5-10 dakikalık etkinlik seçin, sonra nasıl geçtiğini işaretleyin.',
      stat: `${todayCompletedGames.length}/${recommendedGames.length} bugün`,
      cta: 'Oyun seç',
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      border: 'hover:border-emerald-200 hover:bg-emerald-50/30',
    },
    {
      tab: 'tools',
      icon: Sparkles,
      eyebrow: 'Destek',
      title: 'Araçlar',
      description: 'Sosyal hikaye, sakinleşme, iletişim ve ödül araçlarını kullanın.',
      stat: `${toolCards.length || 5} araç`,
      cta: 'Araçları aç',
      tone: 'bg-purple-50 text-purple-700 ring-purple-100',
      border: 'hover:border-purple-200 hover:bg-purple-50/30',
    },
  ];

  return (
    <div className="space-y-6">
      {!isOnline && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-amber-700 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-xs font-black truncate">
              Çevrimdışı Çalışma Modu Aktif (Verileriniz yerel tarayıcı hafızasına güvenle kaydediliyor)
            </span>
          </div>
          <span className="shrink-0 text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
            PWA Aktif
          </span>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-indigo-600">Hedefler ve egzersizler</p>
            <h1 className="mt-2 max-w-3xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              Bugün sadece bir küçük adım seçin.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              {activeChild.name} için plan, hedef, oyun ve destek araçlarını ayrı bölümlerde düzenledik. Önce bugünün planına bakmanız yeterli.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileText size={16} />
              Rapor indir
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('goals')}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              <Plus size={16} />
              Hedef ekle
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-xs font-bold text-indigo-700">Önerilen başlangıç</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-black text-slate-950">Bugünün planı</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{todayRemainingCount} kısa adım kaldı</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailTab('today')}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <CalendarDays size={19} />
                Aç
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-bold text-slate-500">Sıradaki hedef</p>
            <p className="mt-2 truncate text-sm font-black text-slate-950">
              {primaryGoal ? primaryGoal.title : 'Henüz seçilmedi'}
            </p>
            <p className="mt-1 text-xs text-slate-500">{activeProgramLabel}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-bold text-slate-500">Bugün oyun</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">{todayCompletedGames.length}/{recommendedGames.length}</p>
            <p className="mt-1 text-xs text-slate-500">tamamlandı</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-bold text-slate-500">Kurulum</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{completedGuideCount}/4</p>
            <p className="mt-1 text-xs text-slate-500">temel alan hazır</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Bölümler</p>
              <h2 className="text-lg font-black text-slate-950">Neyi yapmak istiyorsunuz?</h2>
            </div>
            <p className="text-xs font-semibold text-slate-500">Her bölüm ayrı açılır, ekran kalabalıklaşmaz.</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            {sectionCards.map(({ tab, icon: Icon, eyebrow, title, description, stat, cta, tone, border }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveDetailTab(tab)}
                className={cn(
                  'group flex min-h-[10.5rem] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                  border
                )}
              >
                <span>
                  <span className="flex items-start justify-between gap-3">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1', tone)}>
                      <Icon size={18} />
                    </span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500 ring-1 ring-slate-100">
                      {eyebrow}
                    </span>
                  </span>
                  <span className="mt-3 block text-base font-black text-slate-950">{title}</span>
                  <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{description}</span>
                </span>
                <span className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-slate-500">{stat}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700">
                    {cta}
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            Bu alan evde takip desteğidir; tanı, ilaç veya acil müdahale kararı yerine geçmez.
          </p>
        </div>

        {children.length > 1 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
              <Users size={14} />
              Profil seç
            </div>
            <div className="flex flex-wrap gap-2">
              {children.map((child) => {
                const isActive = child.id === activeChild.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => actions.setSelectedChild(child)}
                    aria-pressed={isActive}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors',
                      isActive
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black',
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    )}>
                      {child.name.charAt(0).toUpperCase()}
                    </span>
                    {child.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {activeDetailTab === 'overview' && (
        <div className="grid gap-3 sm:grid-cols-3">
          {weeklySummary.map((item, i) => {
            const meta = SUMMARY_META[i % SUMMARY_META.length];
            const Icon = meta.icon;
            return (
              <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.iconBg)}>
                  <Icon size={18} className={meta.iconColor} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400">{item.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                    <p className={cn('text-xl font-black', meta.valueCls)}>{item.value}</p>
                    <p className="text-xs font-medium text-slate-500">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeDetailTab !== 'overview' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setActiveDetailTab('overview')}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                Bölümlere dön
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <FileText size={16} />
                Rapor indir
              </button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Hedefler ve egzersizler</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{activeSection?.label}</h2>
              </div>
              <TreatmentDetailTabs
                tabs={DETAIL_TABS}
                value={activeDetailTab}
                onChange={setActiveDetailTab}
                label="Tedavi detay bölümleri"
              />
            </div>
          </div>

          <div className="p-4 sm:p-5">
          {activeDetailTab === 'today' && (
            <TreatmentTodayTab
              todayPlan={todayPlan}
              smartSuggestions={smartSuggestions}
              latestNote={latestNote}
              weeklyProgress={weeklyProgress}
              recommendedGameCount={recommendedGames.length}
              microProgress={microProgress}
              childId={activeChild.id}
              streakDays={streakDays}
              todayMood={todayMood ?? null}
              todayCompletedPlanSteps={todayCompletedPlanSteps}
              onTogglePlanStep={actions.togglePlanStep}
            />
          )}

          {activeDetailTab === 'goals' && (
            <TreatmentGoalsTab
              activeAppointments={activeAppointments}
              childEvents={childEvents}
              customGoals={customGoals}
              detailLoading={detailLoading}
              goalDraft={goalDraft}
              goalDraftDueDate={goalDraftDueDate}
              goalDraftFocus={goalDraftFocus}
              mergedGoalGroups={mergedGoalGroups}
              recentNotes={recentNotes}
              savingTreatment={savingTreatment}
              templateGoalToggles={templateGoalToggles}
              childId={activeChild.id}
              onAddGoal={handleAddGoal}
              onDeleteGoal={actions.deleteCustomGoal}
              onGoalDraftChange={setGoalDraft}
              onGoalDraftDueDateChange={setGoalDraftDueDate}
              onGoalDraftFocusChange={setGoalDraftFocus}
              onUpdateGoal={actions.updateCustomGoal}
              onToggleGoal={actions.toggleCustomGoal}
              onToggleTemplateGoal={actions.toggleTemplateGoal}
            />
          )}

          {activeDetailTab === 'games' && (
            <TreatmentGamesTab
              activeGameFilter={activeGameFilter}
              allGames={recommendedGames}
              customStories={customStories}
              filteredGames={filteredGames}
              gameFeedback={gameFeedback}
              gameSessions={gameSessions}
              recommendedGameCount={recommendedGames.length}
              savingTreatment={savingTreatment}
              showMilestoneBanner={showMilestoneBanner}
              socialStories={socialStories}
              todayCompletedGames={todayCompletedGames}
              onAddCustomStory={actions.addCustomStory}
              onDeleteCustomStory={actions.deleteCustomStory}
              onFilterChange={setActiveGameFilter}
              onSaveGameFeedback={actions.saveGameFeedback}
              onToggleGameCompletion={actions.toggleGameCompletion}
            />
          )}

          {activeDetailTab === 'tools' && (
            <TreatmentToolsTab
              savingTreatment={savingTreatment}
              sensoryMetrics={sensoryMetrics}
              sensoryProfile={sensoryProfile}
              toolCards={toolCards}
              triggerSummary={triggerSummary}
              onSaveSensoryProfile={actions.saveSensoryProfile}
              onUpdateSensoryProfile={actions.updateSensoryProfile}
            />
          )}
          </div>
        </div>
      )}
    </div>
  );
}
