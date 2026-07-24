import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity, ArrowRight, CalendarDays, FileText, Gamepad2, Sparkles, Target,
  ChevronLeft,
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

export function TreatmentPage() {
  return <TreatmentContent />;
}

function TreatmentContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeDetailTab: DetailTab = (rawTab && ['overview', 'today', 'goals', 'games', 'tools'].includes(rawTab))
    ? (rawTab as DetailTab)
    : 'overview';

  const setActiveDetailTab = (tab: DetailTab) => {
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const [activeGameFilter, setActiveGameFilter] = useState<'all' | FocusKey>('all');
  const [goalDraft, setGoalDraft] = useState('');
  const [goalDraftFocus, setGoalDraftFocus] = useState<FocusKey>('communication');
  const [goalDraftDueDate, setGoalDraftDueDate] = useState('');

  const treatment = useTreatmentPageData();
  const {
    activeAppointments, activeChild, actions, childEvents, children,
    customGoals, customStories, detailLoading, gameFeedback, gameSessions, latestNote,
    loading, mergedGoalGroups, microProgress, recentNotes,
    savingTreatment, sensoryMetrics, sensoryProfile, showMilestoneBanner,
    streakDays, supportPlan, templateGoalToggles, todayCompletedGames,
    todayCompletedPlanSteps, todayMood, weeklyProgress, user,
  } = treatment;

  const {
    games: recommendedGames,
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

  const todayStepCount = todayPlan.length;
  const todayDoneCount = todayCompletedPlanSteps.size;
  const todayRemainingCount = Math.max(todayStepCount - todayDoneCount, 0);
  const totalGoalCount = mergedGoalGroups.reduce((acc, group) => acc + group.items.length, 0);
  const completedGoalCount = mergedGoalGroups.reduce((acc, group) => acc + group.items.filter((item) => item.status === 'done').length, 0);
  const detailTabs = [
    { value: 'today' as const, label: 'Bugünün Planı', icon: <CalendarDays size={15} aria-hidden="true" />, count: `${todayRemainingCount} kaldı`, badgeColor: 'bg-blue-50 text-blue-700' },
    { value: 'goals' as const, label: 'Gelişim Hedefleri', icon: <Target size={15} aria-hidden="true" />, count: `${completedGoalCount}/${totalGoalCount || 0}`, badgeColor: 'bg-indigo-50 text-indigo-700' },
    { value: 'games' as const, label: 'Ev Egzersizleri & Oyunlar', icon: <Gamepad2 size={15} aria-hidden="true" />, count: `${todayCompletedGames.length}/${recommendedGames.length}`, badgeColor: 'bg-emerald-50 text-emerald-700' },
    { value: 'tools' as const, label: 'Destek Araçları', icon: <Sparkles size={15} aria-hidden="true" />, count: toolCards.length || 5, badgeColor: 'bg-purple-50 text-purple-700' },
  ];
  const activeSection = detailTabs.find(tab => tab.value === activeDetailTab);

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

      {/* ── Sakin ve Göz Yormayan Karşılations Başlığı ── */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
              🌿 Sakin & Kolay Takip Paneli
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              {activeChild.name} İçin Bugün Ne Yapmak İstiyorsunuz?
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600 max-w-2xl leading-relaxed">
              Karmaşık menüler yok! Lütfen aşağıdan ne yapmak istediğinizi belirten <strong className="text-slate-900 font-bold">büyük kutulardan birine dokunun</strong>.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
            >
              <FileText size={15} />
              Raporu İndir
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 Sakin ve Belirgin Dokunma Kutusu (Sensory-Friendly Pastel) ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* 1. Bugünkü Plan */}
        <button
          type="button"
          onClick={() => setActiveDetailTab('today')}
          className="group relative flex flex-col justify-between rounded-3xl bg-white p-6 text-slate-900 border-2 border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer text-left shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <CalendarDays size={24} />
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 ring-1 ring-blue-100">
                {todayRemainingCount} İş Kaldı
              </span>
            </div>
            <h2 className="mt-5 text-lg font-extrabold text-slate-950">1. Bugünün Planı</h2>
            <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed">
              Bugün yapacağınız 1-2 küçük işe bakın ve tamamlayınca kutucuğa basın.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
            <span>DOKUNUN VE AÇIN</span>
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 font-extrabold px-3 py-1.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
              Planı Aç <ArrowRight size={14} />
            </span>
          </div>
        </button>

        {/* 2. Ev Oyunları */}
        <button
          type="button"
          onClick={() => setActiveDetailTab('games')}
          className="group relative flex flex-col justify-between rounded-3xl bg-white p-6 text-slate-900 border-2 border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer text-left shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <Gamepad2 size={24} />
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100">
                {todayCompletedGames.length}/{recommendedGames.length} Tamamlandı
              </span>
            </div>
            <h2 className="mt-5 text-lg font-extrabold text-slate-950">2. Ev Oyunları & Egzersiz</h2>
            <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed">
              Evde 5 dakikada oynanabilecek eğlenceli çocuk oyunlarını seçin.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
            <span>DOKUNUN VE AÇIN</span>
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              Oyun Seç <ArrowRight size={14} />
            </span>
          </div>
        </button>

        {/* 3. Hedeflerim */}
        <button
          type="button"
          onClick={() => setActiveDetailTab('goals')}
          className="group relative flex flex-col justify-between rounded-3xl bg-white p-6 text-slate-900 border-2 border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer text-left shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Target size={24} />
              </span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 ring-1 ring-indigo-100">
                {completedGoalCount}/{totalGoalCount || 0} Hedef
              </span>
            </div>
            <h2 className="mt-5 text-lg font-extrabold text-slate-950">3. Gelişim Hedefleri</h2>
            <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed">
              Konuşma, sosyalleşme ve beceri hedeflerini görün veya yeni hedef ekleyin.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
            <span>DOKUNUN VE AÇIN</span>
            <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1.5 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
              Hedefleri Gör <ArrowRight size={14} />
            </span>
          </div>
        </button>

        {/* 4. Sakinleşme & Araçlar */}
        <button
          type="button"
          onClick={() => setActiveDetailTab('tools')}
          className="group relative flex flex-col justify-between rounded-3xl bg-white p-6 text-slate-900 border-2 border-slate-200/90 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer text-left shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <Sparkles size={24} />
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700 ring-1 ring-amber-100">
                {toolCards.length || 5} Yardımcı
              </span>
            </div>
            <h2 className="mt-5 text-lg font-extrabold text-slate-950">4. Yardımcı Araçlar</h2>
            <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed">
              Sakinleşme kartları, hikayeler ve ödül tablolarını kullanın.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
            <span>DOKUNUN VE AÇIN</span>
            <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 font-extrabold px-3 py-1.5 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
              Araçları Aç <ArrowRight size={14} />
            </span>
          </div>
        </button>
      </div>

      {children.length > 1 && (
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 shrink-0">Çocuk Seçin:</span>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => {
              const isActive = child.id === activeChild.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => actions.setSelectedChild(child)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    isActive ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {child.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeDetailTab !== 'overview' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setActiveDetailTab('overview')}
                className="inline-flex w-fit items-center gap-2 rounded-xl border-2 border-primary-200 bg-primary-50 px-4 py-2.5 text-xs font-black text-primary-800 transition-all hover:bg-primary-100 cursor-pointer shadow-xs"
              >
                <ChevronLeft size={18} />
                ← Tüm Bölümleri Gör (Ana Menüye Dön)
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
                tabs={detailTabs}
                value={activeDetailTab}
                onChange={setActiveDetailTab}
                label="Hedef ve Egzersiz Detay Bölümleri"
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
