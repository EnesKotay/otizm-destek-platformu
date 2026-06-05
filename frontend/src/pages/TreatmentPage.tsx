import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, CalendarDays, Gamepad2, Sparkles, Target,
  TrendingUp, CheckCircle2, Plus,
} from 'lucide-react';
import api from '@/services/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TreatmentDetailTabs } from '@/components/treatment/TreatmentDetailTabs';
import { TreatmentGamesTab } from '@/components/treatment/TreatmentGamesTab';
import { TreatmentGoalsTab } from '@/components/treatment/TreatmentGoalsTab';
import { TreatmentHero } from '@/components/treatment/TreatmentHero';
import { TreatmentOnboarding } from '@/components/treatment/TreatmentOnboarding';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
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
  { value: 'today' as const, label: 'Bugün',                 icon: <CalendarDays size={15} aria-hidden="true" /> },
  { value: 'goals' as const, label: 'Hedefler',              icon: <Target       size={15} aria-hidden="true" /> },
  { value: 'games' as const, label: 'Etkinlikler',           icon: <Gamepad2     size={15} aria-hidden="true" /> },
  { value: 'tools' as const, label: 'Destek Araçları',       icon: <Sparkles     size={15} aria-hidden="true" /> },
];

export function TreatmentPage() {
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('today');
  const [activeGameFilter, setActiveGameFilter] = useState<'all' | FocusKey>('all');
  const [goalDraft, setGoalDraft] = useState('');
  const [goalDraftFocus, setGoalDraftFocus] = useState<FocusKey>('communication');

  const treatment = useTreatmentPageData();
  const {
    activeAppointments, activeChild, actions, childEvents, children,
    customGoals, detailLoading, gameFeedback, gameSessions, latestNote,
    loading, mergedGoalGroups, microProgress, primaryGoal, recentNotes,
    savingTreatment, sensoryMetrics, sensoryProfile, showMilestoneBanner,
    streakDays, supportPlan, todayCompletedGames, todayMood,
    weeklyProgress, weeklySummary, user,
  } = treatment;

  const {
    activeProgramLabel, focusAreas, games: recommendedGames,
    smartSuggestions, stories: socialStories, todayPlan, toolCards, triggerSummary,
  } = supportPlan;

  const filteredGames = useMemo(
    () => activeGameFilter === 'all'
      ? recommendedGames
      : recommendedGames.filter((g) => g.key === activeGameFilter),
    [activeGameFilter, recommendedGames]
  );

  // Fix 5: çocuk değişince oyun filtresini sıfırla
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveGameFilter('all');
  }, [activeChild?.id]);

  const handleAddGoal = async () => {
    const saved = await actions.addCustomGoal(goalDraft, goalDraftFocus);
    if (saved) setGoalDraft('');
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

  // ── Auth guard ──
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

  // ── Loading skeleton ──
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

  // ── Empty state ──
  if (!activeChild) {
    return (
      <div className="py-10">
        <EmptyState
          icon={<Activity size={28} />}
          title="Tedavi planı için önce çocuk profili ekleyin"
          description="Bu ekran, seçili çocuğun hedeflerini, oyunlarını ve destek planını bir arada gösterir."
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

  return (
    <div className="space-y-5">
      <PageOnboarding
        pageId="treatment-development"
        title="Tedavi ve Gelişim Takibine Hoş Geldiniz"
        description="Çocuğunuzun özel eğitim hedeflerini, terapilerini ve oyun bazlı gelişimini tek bir merkezden yönetin."
        steps={[
          {
            icon: <Target size={20} />,
            title: "Hedeflerinizi Takip Edin",
            description: "Uzmanların önerdiği gelişim hedeflerini görün veya kendi hedeflerinizi ekleyin."
          },
          {
            icon: <Gamepad2 size={20} />,
            title: "Oyunla Eğitim",
            description: "Gelişim alanlarına özel önerilen tedavi oyunlarını keşfedin."
          },
          {
            icon: <Sparkles size={20} />,
            title: "Destekleyici Araçlar",
            description: "Duyusal profil ayarlarına, sosyal öykülere ve diğer destek araçlarına kolayca ulaşın."
          }
        ]}
      />

      {/* PWA Çevrimdışı Çalışma Modu Bildirimi */}
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

      {/* ── 1. HERO ── */}
      <TreatmentHero
        childName={activeChild.name}
        focusAreas={focusAreas}
        activeProgramLabel={activeProgramLabel}
        onDownloadPdf={handleDownloadPdf}
        childrenList={children}
        activeChildId={activeChild.id}
        onSelectChild={actions.setSelectedChild}
        onAddGoalClick={() => setActiveDetailTab('goals')}
      />

      {/* ── 1.5. ONBOARDING BANNER ── */}
      <TreatmentOnboarding
        onNavigateToTab={(tab) => setActiveDetailTab(tab)}
        hasData={totalDone > 0 || gameSessions.length > 0}
      />

      {/* ── 2. STAT CARDS — 3 column mini grid ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {weeklySummary.map((item, i) => {
          const meta = SUMMARY_META[i % SUMMARY_META.length];
          const Icon = meta.icon;
          return (
            <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.iconBg)}>
                <Icon size={18} className={meta.iconColor} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.title}</p>
                <p className={cn('text-xl font-bold', meta.valueCls)}>{item.value}</p>
                <p className="text-xs text-slate-400 leading-none mt-0.5">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. PRIORITY GOAL STRIP ── */}
      {primaryGoal && (
        <div className="rounded-[24px] border border-slate-200/50 bg-gradient-to-r from-white/95 to-slate-50/95 backdrop-blur-md p-5 shadow-[0_8px_30px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100/30">
                <Target size={18} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                  Öncelikli Hedef
                </span>
                <p className="mt-1 text-sm font-bold text-slate-800 leading-snug truncate">
                  {primaryGoal.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-500">İlerleme Oranı</span>
                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                  {totalDone} adım tamamlandı
                </span>
              </div>
              <span className={cn(
                'rounded-2xl px-3 py-1.5 text-sm font-black shadow-sm ring-1',
                primaryGoal.tone === 'sky' 
                  ? 'bg-sky-50 text-sky-600 ring-sky-100 shadow-sky-100/40' 
                  : 'bg-violet-50 text-violet-600 ring-violet-100 shadow-violet-100/40'
              )}>
                %{primaryGoal.percent}
              </span>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100/80 ring-1 ring-slate-200/20">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000 ease-out shadow-sm',
                primaryGoal.tone === 'sky' 
                  ? 'bg-gradient-to-r from-sky-400 to-sky-500 shadow-sky-400/20' 
                  : 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-indigo-500/20'
              )}
              style={{ width: `${primaryGoal.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* ── 4. MAIN TAB PANEL ── */}
      <div className="rounded-[28px] border border-slate-200/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Tab bar + quick action */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-3">
          <TreatmentDetailTabs
            tabs={DETAIL_TABS}
            value={activeDetailTab}
            onChange={setActiveDetailTab}
            label="Tedavi detay bölümleri"
          />
          {/* "Hedef ekle" quick shortcut — goes to goals tab, not bep-generator */}
          <button
            type="button"
            onClick={() => setActiveDetailTab('goals')}
            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={13} />
            Hedef ekle
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5">
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
            />
          )}

          {activeDetailTab === 'goals' && (
            <TreatmentGoalsTab
              activeAppointments={activeAppointments}
              childEvents={childEvents}
              customGoals={customGoals}
              detailLoading={detailLoading}
              goalDraft={goalDraft}
              goalDraftFocus={goalDraftFocus}
              mergedGoalGroups={mergedGoalGroups}
              recentNotes={recentNotes}
              savingTreatment={savingTreatment}
              childId={activeChild.id}
              onAddGoal={handleAddGoal}
              onDeleteGoal={actions.deleteCustomGoal}
              onGoalDraftChange={setGoalDraft}
              onGoalDraftFocusChange={setGoalDraftFocus}
              onUpdateGoal={actions.updateCustomGoal}
              onToggleGoal={actions.toggleCustomGoal}
            />
          )}

          {activeDetailTab === 'games' && (
            <TreatmentGamesTab
              activeGameFilter={activeGameFilter}
              allGames={recommendedGames}
              filteredGames={filteredGames}
              gameFeedback={gameFeedback}
              gameSessions={gameSessions}
              recommendedGameCount={recommendedGames.length}
              savingTreatment={savingTreatment}
              showMilestoneBanner={showMilestoneBanner}
              socialStories={socialStories}
              todayCompletedGames={todayCompletedGames}
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
