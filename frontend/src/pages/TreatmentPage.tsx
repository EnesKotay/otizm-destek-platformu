import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, CalendarDays, FileText, Gamepad2, Sparkles, Target,
  TrendingUp, CheckCircle2, Plus, Users, HelpCircle,
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
type DetailTab = 'today' | 'goals' | 'games' | 'tools';

const SUMMARY_META = [
  { icon: Gamepad2,   iconBg: 'bg-sky-50',     iconColor: 'text-sky-600',     valueCls: 'text-sky-700'     },
  { icon: Target,     iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  valueCls: 'text-violet-700'  },
  { icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueCls: 'text-emerald-700' },
] as const;

const DETAIL_TABS = [
  { value: 'today' as const, label: 'Bugün',    icon: <CalendarDays size={15} aria-hidden="true" /> },
  { value: 'goals' as const, label: 'Hedefler', icon: <Target       size={15} aria-hidden="true" /> },
  { value: 'games' as const, label: 'Oyunlar',  icon: <Gamepad2     size={15} aria-hidden="true" /> },
  { value: 'tools' as const, label: 'Araçlar',  icon: <Sparkles     size={15} aria-hidden="true" /> },
];

export function TreatmentPage() {
  return <TreatmentContent />;
}

function TreatmentContent() {
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('today');
  const [activeGameFilter, setActiveGameFilter] = useState<'all' | FocusKey>('all');
  const [goalDraft, setGoalDraft] = useState('');
  const [goalDraftFocus, setGoalDraftFocus] = useState<FocusKey>('communication');
  const [goalDraftDueDate, setGoalDraftDueDate] = useState('');
  const [showIntro, setShowIntro] = useState(() => {
    const stored = localStorage.getItem('treatment_intro_visible');
    return stored === null ? true : stored === 'true';
  });

  const toggleIntro = () => {
    setShowIntro(prev => {
      const next = !prev;
      localStorage.setItem('treatment_intro_visible', String(next));
      return next;
    });
  };

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

  const totalDone = mergedGoalGroups.reduce(
    (acc, g) => acc + g.items.filter((i) => i.status === 'done').length, 0
  );
  const startGuideSteps: Array<{
    tab: DetailTab;
    icon: typeof CalendarDays;
    title: string;
    description: string;
    action: string;
    tone: string;
  }> = [
    {
      tab: 'today',
      icon: CalendarDays,
      title: 'Bugünün planını kontrol et',
      description: 'Önce çocuğunuzla bugün yapabileceğiniz kısa adımları görün.',
      action: 'Bugün planına git',
      tone: 'bg-blue-50 text-blue-700 ring-blue-100',
    },
    {
      tab: 'goals',
      icon: Target,
      title: 'Küçük bir hedef seç',
      description: primaryGoal ? 'Sıradaki hedefe bakın ve ilerlemeyi işaretleyin.' : 'Takip etmek istediğiniz ilk küçük beceriyi ekleyin.',
      action: primaryGoal ? 'Hedefleri aç' : 'Hedef ekle',
      tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    },
    {
      tab: 'games',
      icon: Gamepad2,
      title: '5 dakikalık oyun deneyin',
      description: 'Kısa etkinliği uygulayın, sonra kolay mı zor mu geçtiğini seçin.',
      action: 'Oyunlara git',
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
  ];

  return (
    <div className="space-y-5">
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-indigo-600">Hedefler ve egzersizler</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Bugün ne yapabiliriz?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {activeChild.name} için belirlenmiş hedefler, kısa oyunlar ve çalışmalar burada. Tek bir küçük adımla başlayabilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleIntro}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <HelpCircle size={16} />
              {showIntro ? 'Kılavuzu Gizle' : 'Kılavuzu Göster'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileText size={16} />
              Rapor
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('goals')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              <Plus size={16} />
              Hedef Ekle
            </button>
          </div>
        </div>

        {showIntro && (
          <>
            <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-950">Nereden başlayacaksınız?</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Hepsini bir anda yapmanız gerekmiyor. Bir tane seçin, başlayın; her kutucuk sizi doğru yere götürür.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
                  Önerilen sıra
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {startGuideSteps.map(({ tab, icon: Icon, title, description, action, tone }, index) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setActiveDetailTab(tab)}
                    className="group flex min-h-[10rem] flex-col justify-between rounded-2xl border border-white bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}>
                          <Icon size={18} />
                        </span>
                        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-400 ring-1 ring-slate-100">
                          {index + 1}
                        </span>
                      </div>
                      <h3 className="mt-4 text-sm font-black text-slate-950">{title}</h3>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-indigo-700">
                      {action}
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
                        <Target size={13} />
                        Sıradaki hedef
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-indigo-100">
                        {activeProgramLabel}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-black text-slate-950">
                      {primaryGoal ? primaryGoal.title : 'İlk küçük hedefi belirleyin'}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {primaryGoal
                        ? `${totalDone} adım tamamlandı. Bugün yalnızca kısa bir tekrar veya not yeterli.`
                        : 'Hedef ekleyince oyunlar ve takip adımları daha anlaşılır hale gelir.'}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-center ring-1 ring-indigo-100">
                    <p className="text-[11px] font-bold uppercase text-slate-400">İlerleme</p>
                    <p className="mt-1 text-2xl font-black text-indigo-700">%{primaryGoal?.percent ?? 0}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-indigo-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${primaryGoal?.percent ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Bugünkü kontrol listesi</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Bu üç şey tamamlanınca sayfa anlam kazanır.</p>
                  </div>
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { done: todayPlan.length > 0, text: 'Bugünün planını görüntüle' },
                    { done: Boolean(primaryGoal), text: 'En az bir hedef belirle' },
                    { done: todayCompletedGames.length > 0, text: 'Bir oyunu tamamla veya geri bildirim ver' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-300 ring-1 ring-slate-200'
                      }`}>
                        <CheckCircle2 size={13} />
                      </span>
                      <span className={`text-xs font-bold ${item.done ? 'text-slate-800' : 'text-slate-500'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

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

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <TreatmentDetailTabs
            tabs={DETAIL_TABS}
            value={activeDetailTab}
            onChange={setActiveDetailTab}
            label="Tedavi detay bölümleri"
          />
          <button
            type="button"
            onClick={() => setActiveDetailTab('goals')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            <Plus size={16} />
            Yeni Hedef
          </button>
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
    </div>
  );
}
