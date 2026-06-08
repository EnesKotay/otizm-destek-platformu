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
      <div className="grid gap-4 sm:grid-cols-3">
        {weeklySummary.map((item, i) => {
          const meta = SUMMARY_META[i % SUMMARY_META.length];
          const Icon = meta.icon;
          return (
            <div key={item.title} className="group flex flex-col gap-3 rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                <Icon size={80} />
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3', meta.iconBg)}>
                  <Icon size={20} className={meta.iconColor} />
                </div>
                <div className="flex flex-col">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{item.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className={cn('text-2xl font-extrabold tracking-tight', meta.valueCls)}>{item.value}</p>
                  </div>
                </div>
              </div>
              <div className="mt-1 relative z-10">
                <p className="text-xs font-medium text-slate-500">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. PRIORITY GOAL STRIP ── */}
      {primaryGoal && (
        <div className="group rounded-[2rem] border border-slate-200/50 bg-gradient-to-br from-white via-white to-slate-50/80 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-500 relative overflow-hidden">
          {/* Abstract glowing shape behind goal */}
          <div className={cn(
            'absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[80px] opacity-20 transition-opacity duration-500 group-hover:opacity-40',
            primaryGoal.tone === 'sky' ? 'bg-sky-400' : 'bg-violet-400'
          )} />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50/80 text-indigo-600 shadow-inner border border-indigo-100/50 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[10deg]">
                <Target size={22} className="animate-[pulse_3s_ease-in-out_infinite]" />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  Öncelikli Hedef
                </span>
                <p className="mt-2 text-base font-bold text-slate-800 leading-snug truncate group-hover:text-indigo-900 transition-colors">
                  {primaryGoal.title}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">İlerleme</span>
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 drop-shadow-sm" />
                    {totalDone} adım tamamlandı
                  </span>
                </div>
                <span className={cn(
                  'rounded-2xl px-4 py-2 text-lg font-black shadow-sm ring-1 transition-transform duration-300 group-hover:scale-105',
                  primaryGoal.tone === 'sky' 
                    ? 'bg-sky-50 text-sky-600 ring-sky-100 shadow-sky-100/40' 
                    : 'bg-violet-50 text-violet-600 ring-violet-100 shadow-violet-100/40'
                )}>
                  %{primaryGoal.percent}
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-5 h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/50 shadow-inner">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)] relative overflow-hidden',
                primaryGoal.tone === 'sky' 
                  ? 'bg-gradient-to-r from-sky-400 via-sky-300 to-sky-500' 
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500'
              )}
              style={{ width: `${primaryGoal.percent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>
      )}

      {/* ── 4. MAIN TAB PANEL ── */}
      <div className="rounded-[2.5rem] border border-slate-200/60 bg-white/80 backdrop-blur-2xl shadow-[0_20px_60px_rgba(15,23,42,0.04)] overflow-hidden transition-all">
        {/* Tab bar + quick action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 bg-white/50 px-6 py-4">
          <TreatmentDetailTabs
            tabs={DETAIL_TABS}
            value={activeDetailTab}
            onChange={setActiveDetailTab}
            label="Tedavi detay bölümleri"
          />
          {/* "Hedef ekle" quick shortcut */}
          <button
            type="button"
            onClick={() => setActiveDetailTab('goals')}
            className="group hidden sm:inline-flex shrink-0 items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm"
          >
            <Plus size={16} className="transition-transform group-hover:rotate-90" />
            Yeni Hedef
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
