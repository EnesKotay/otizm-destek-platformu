import { useEffect, useMemo, useRef, useState } from 'react';
import { appointmentService } from '@/services/appointmentService';
import { calendarService } from '@/services/calendarService';
import { childService } from '@/services/childService';
import { moodService } from '@/services/moodService';
import { noteService } from '@/services/noteService';
import { treatmentStateService } from '@/services/treatmentStateService';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { toast } from '@/store/toastStore';
import type { AppointmentRecord, CalendarEvent, Child, DevelopmentNote } from '@/types';
import {
  DEFAULT_SENSORY_PROFILE,
  buildEditableSensoryMetrics,
  buildSupportPlan,
  getDateKey,
  mergeGoalGroups,
  splitTherapies,
} from './treatmentPlan';
import {
  buildGoalAddResult,
  buildGoalDeleteResult,
  buildGoalToggleResult,
  buildGoalUpdateResult,
  buildPlanStepToggleResult,
  buildTemplateGoalToggleResult,
  createTreatmentState,
  getGameFeedbackForDay,
  saveGameFeedbackForDay,
  toggleGameSessionForDay,
} from './treatmentState';
import type {
  CustomStoryData,
  EditableGoal,
  FocusKey,
  GameReflection,
  GameSession,
  GoalProgressSnapshot,
  SensoryProfileState,
  TreatmentPageState,
} from './types';

const SESSION_RETENTION_DAYS = 90;

function pruneOldSessions(sessions: GameSession[]): GameSession[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SESSION_RETENTION_DAYS);
  return sessions.filter(s => new Date(s.completedAt) >= cutoff);
}

function applyTreatmentState(
  nextState: TreatmentPageState,
  setters: {
    setCustomGoals: (value: EditableGoal[]) => void;
    setSensoryProfile: (value: SensoryProfileState) => void;
    setGameFeedback: (value: Record<string, GameReflection>) => void;
    setGameSessions: (value: GameSession[]) => void;
    setGoalProgressHistory: (value: GoalProgressSnapshot[]) => void;
    setTemplateGoalToggles: (value: Record<string, boolean>) => void;
    setCompletedPlanSteps: (value: string[]) => void;
    setCustomStories: (value: CustomStoryData[]) => void;
  },
) {
  setters.setCustomGoals(nextState.customGoals);
  setters.setSensoryProfile(nextState.sensoryProfile);
  setters.setGameFeedback(nextState.gameFeedback);
  setters.setGameSessions(nextState.gameSessions);
  setters.setGoalProgressHistory(nextState.goalProgressHistory);
  setters.setTemplateGoalToggles(nextState.templateGoalToggles);
  setters.setCompletedPlanSteps(nextState.completedPlanSteps);
  setters.setCustomStories(nextState.customStories);
}

function createEmptyTreatmentState(): TreatmentPageState {
  return {
    customGoals: [],
    sensoryProfile: DEFAULT_SENSORY_PROFILE,
    gameFeedback: {},
    gameSessions: [],
    goalProgressHistory: [],
    templateGoalToggles: {},
    completedPlanSteps: [],
    customStories: [],
  };
}

export function useTreatmentPageData() {
  const { user } = useAuthStore();
  const { children, selectedChild, setChildren, setSelectedChild } = useChildStore();
  const selectedChildIdRef = useRef<string | null>(selectedChild?.id || null);

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [childEvents, setChildEvents] = useState<CalendarEvent[]>([]);
  const [recentNotes, setRecentNotes] = useState<DevelopmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [gameFeedback, setGameFeedback] = useState<Record<string, GameReflection>>({});
  const [customGoals, setCustomGoals] = useState<EditableGoal[]>([]);
  const [sensoryProfile, setSensoryProfile] = useState<SensoryProfileState>(DEFAULT_SENSORY_PROFILE);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [goalProgressHistory, setGoalProgressHistory] = useState<GoalProgressSnapshot[]>([]);
  const [templateGoalToggles, setTemplateGoalToggles] = useState<Record<string, boolean>>({});
  const [completedPlanSteps, setCompletedPlanSteps] = useState<string[]>([]);
  const [customStories, setCustomStories] = useState<CustomStoryData[]>([]);
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [todayMood, setTodayMood] = useState<{ moodLevel: number } | null | undefined>(undefined);

  const activeChild = (selectedChild && children.some((child) => child.id === selectedChild.id))
    ? selectedChild
    : children[0] || null;
  const activeChildId = activeChild?.id;
  const therapyItems = useMemo(() => splitTherapies(activeChild?.therapies), [activeChild?.therapies]);

  const childAppointments = useMemo(() => {
    if (!activeChild) return [];
    return [...appointments]
      .filter((appointment) => appointment.childId === activeChild.id)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [activeChild, appointments]);

  const activeAppointments = useMemo(
    () => childAppointments.filter(
      (appointment) => appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED'
    ),
    [childAppointments]
  );
  const todayKey = getDateKey(new Date());

  const supportPlan = useMemo(
    () => buildSupportPlan(therapyItems, recentNotes, activeAppointments, childEvents),
    [therapyItems, recentNotes, activeAppointments, childEvents]
  );
  const mergedGoalGroups = useMemo(
    () => mergeGoalGroups(supportPlan.goalGroups, customGoals, templateGoalToggles),
    [supportPlan.goalGroups, customGoals, templateGoalToggles]
  );
  const sensoryMetrics = useMemo(() => buildEditableSensoryMetrics(sensoryProfile), [sensoryProfile]);
  const latestNote = recentNotes[0] || null;
  const primaryGoal = mergedGoalGroups[0] || null;
  const totalGoalCount = mergedGoalGroups.reduce((sum, group) => sum + group.items.length, 0);
  const completedGoalCount = mergedGoalGroups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.status === 'done').length,
    0
  );
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weeklyCompletedGameCount = Array.from(
    new Set(
      gameSessions
        .filter((session) => new Date(session.completedAt) >= sevenDaysAgo)
        .map((session) => `${getDateKey(session.completedAt)}:${session.gameId}`)
    )
  ).length;
  const weeklySummary = [
    {
      title: 'Bu hafta oyun',
      value: `${weeklyCompletedGameCount}`,
      detail: weeklyCompletedGameCount > 0 ? 'Bu hafta tekrar edilen mini egzersiz sayısı' : 'Bugün ilk oyunu planlayabilirsiniz',
    },
    {
      title: 'Tamamlanan hedef',
      value: totalGoalCount > 0 ? `${completedGoalCount}/${totalGoalCount}` : '—',
      detail: totalGoalCount > 0 ? 'Tüm aktif beceri alanlarındaki toplam ilerleme' : 'Hedefler sekmesinden hedef ekleyebilirsiniz',
    },
    {
      title: 'Yaklaşan Seans',
      value: `${activeAppointments.length + childEvents.length}`,
      detail: activeAppointments.length + childEvents.length > 0 ? 'Planlanmış randevu veya etkinlik' : 'Henüz randevu planlanmamış',
    },
  ];
  const streakDays = useMemo(() => {
    const activeDays = new Set<string>();
    gameSessions.forEach(s => activeDays.add(getDateKey(s.completedAt)));
    goalProgressHistory.forEach(s => activeDays.add(getDateKey(s.recordedAt)));
    const today = getDateKey(new Date());
    const startFrom = activeDays.has(today) ? 0 : 1;
    let count = 0;
    for (let i = startFrom; i <= 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (activeDays.has(getDateKey(d))) {
        count++;
      } else if (i > startFrom) {
        break;
      }
    }
    return count;
  }, [gameSessions, goalProgressHistory]);

  const microProgress = mergedGoalGroups.map((group) => ({
    title: group.title,
    value: `%${group.percent}`,
    detail: group.summary,
    linkedGame: supportPlan.games.find((game) => game.key === group.key)?.title || 'Günlük tekrar',
  }));

  const todayCompletedGames = useMemo(
    () => Array.from(
      new Set(gameSessions.filter((session) => getDateKey(session.completedAt) === todayKey).map((session) => session.gameId))
    ),
    [gameSessions, todayKey]
  );

  const todayGameFeedback = useMemo(() => supportPlan.games.reduce<Record<string, GameReflection>>((acc, game) => {
    const status = getGameFeedbackForDay(gameFeedback, todayKey, game.id);
    if (status) acc[game.id] = status;
    return acc;
  }, {}), [gameFeedback, supportPlan.games, todayKey]);

  const showMilestoneBanner = supportPlan.games.length > 0 && todayCompletedGames.length >= supportPlan.games.length;

  const weeklyProgress = useMemo(() => {
    const labels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = getDateKey(date);
      const daySessions = gameSessions.filter((session) => getDateKey(session.completedAt) === key);
      const dayGoals = goalProgressHistory.filter((item) => getDateKey(item.recordedAt) === key);
      return {
        key,
        label: labels[date.getDay()],
        gameCount: Array.from(new Set(daySessions.map((item) => item.gameId))).length,
        goalPercent: dayGoals.length > 0
          ? dayGoals[dayGoals.length - 1].percent
          : key === todayKey
            ? Math.round((completedGoalCount / Math.max(totalGoalCount, 1)) * 100)
            : 0,
      };
    });
  }, [completedGoalCount, gameSessions, goalProgressHistory, todayKey, totalGoalCount]);

  const todayCompletedPlanSteps = useMemo(
    () => new Set(completedPlanSteps.filter(s => s.startsWith(todayKey + ':')).map(s => s.slice(todayKey.length + 1))),
    [completedPlanSteps, todayKey]
  );

  const currentTreatmentState = () => createTreatmentState({
    customGoals,
    sensoryProfile,
    gameFeedback,
    gameSessions,
    goalProgressHistory,
    templateGoalToggles,
    completedPlanSteps,
    customStories,
  });

  const stateSetters = { setCustomGoals, setSensoryProfile, setGameFeedback, setGameSessions, setGoalProgressHistory, setTemplateGoalToggles, setCompletedPlanSteps, setCustomStories };

  useEffect(() => {
    selectedChildIdRef.current = selectedChild?.id || null;
  }, [selectedChild?.id]);

  useEffect(() => {
    if (user?.role !== 'PARENT') return;

    const controller = new AbortController();

    const loadBaseData = async () => {
      setLoading(true);
      try {
        const [childrenData, appointmentData] = await Promise.all([
          childService.getAll(),
          appointmentService.getAll(),
        ]);

        if (controller.signal.aborted) return;

        setChildren(childrenData);
        setAppointments(appointmentData);

        const selectedChildId = selectedChildIdRef.current;
        if (childrenData.length === 0) {
          setSelectedChild(null);
        } else if (!selectedChildId || !childrenData.some((child) => child.id === selectedChildId)) {
          setSelectedChild(childrenData[0]);
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        toast.error('Tedavi paneli verileri yüklenemedi.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadBaseData();
    return () => controller.abort();
  }, [setChildren, setSelectedChild, user?.role]);

  useEffect(() => {
    if (!activeChildId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChildEvents([]);
      setRecentNotes([]);
      setDetailLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadChildDetails = async () => {
      setDetailLoading(true);
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const [eventsData, notesData, moodData] = await Promise.all([
          calendarService.getByChild(activeChildId),
          noteService.getRecent(activeChildId),
          moodService.getByChild(activeChildId).catch(() => []),
        ]);
        if (controller.signal.aborted) return;
        setChildEvents(eventsData);
        setRecentNotes(notesData);
        const todayEntry = (moodData as Array<{ entryDate: string; moodLevel: number }>)
          .find(e => e.entryDate === todayStr);
        setTodayMood(todayEntry ?? null);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setChildEvents([]);
        setRecentNotes([]);
        toast.error('Seçili çocuk için tedavi detayları yüklenemedi.');
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    };

    loadChildDetails();
    return () => controller.abort();
  }, [activeChildId]);

  useEffect(() => {
    if (!activeChildId) {
      applyTreatmentState(createEmptyTreatmentState(), stateSetters);
      return;
    }

    let cancelled = false;
    applyTreatmentState(createEmptyTreatmentState(), stateSetters);

    treatmentStateService.get(activeChildId)
      .then(state => {
        if (!cancelled) applyTreatmentState(state, stateSetters);
      })
      .catch(() => {
        if (!cancelled) applyTreatmentState(createEmptyTreatmentState(), stateSetters);
      });

    return () => {
      cancelled = true;
    };
  }, [activeChildId]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistTreatmentState = async (
    nextState: TreatmentPageState,
    rollbackState: TreatmentPageState,
    successMessage?: string,
  ) => {
    if (!activeChildId) return false;

    try {
      setSavingTreatment(true);
      const prunedSessions = pruneOldSessions(nextState.gameSessions);
      const stateToSave = { ...nextState, gameSessions: prunedSessions };
      await treatmentStateService.save(activeChildId, stateToSave);
      if (prunedSessions.length !== nextState.gameSessions.length) {
        setGameSessions(prunedSessions);
      }
      if (successMessage) toast.success(successMessage);
      return true;
    } catch {
      applyTreatmentState(rollbackState, stateSetters);
      toast.error('Tedavi verileri kaydedilemedi, değişiklik geri alındı.');
      return false;
    } finally {
      setSavingTreatment(false);
    }
  };

  const toggleGameCompletion = async (gameId: string) => {
    if (savingTreatment) return;
    const rollbackState = currentTreatmentState();
    const next = toggleGameSessionForDay({ gameId, todayKey, gameSessions, gameFeedback, games: supportPlan.games });
    const nextState = createTreatmentState({ ...rollbackState, gameFeedback: next.gameFeedback, gameSessions: next.gameSessions });
    setGameFeedback(next.gameFeedback);
    setGameSessions(next.gameSessions);
    await persistTreatmentState(nextState, rollbackState);
  };

  const saveGameFeedback = async (gameId: string, status: GameReflection) => {
    if (savingTreatment) return;
    const rollbackState = currentTreatmentState();
    const next = saveGameFeedbackForDay({ gameId, status, todayKey, gameSessions, gameFeedback, games: supportPlan.games });
    const nextState = createTreatmentState({ ...rollbackState, gameFeedback: next.gameFeedback, gameSessions: next.gameSessions });
    setGameFeedback(next.gameFeedback);
    setGameSessions(next.gameSessions);
    await persistTreatmentState(nextState, rollbackState, 'Oyun geri bildirimi kaydedildi.');
  };

  const addCustomGoal = async (title: string, focusKey: FocusKey, dueDate?: string) => {
    if (savingTreatment) return false;
    const trimmed = title.trim();
    if (!trimmed) return false;
    const rollbackState = currentTreatmentState();
    const next = buildGoalAddResult({ title: trimmed, focusKey, dueDate, customGoals, goalGroups: supportPlan.goalGroups, goalProgressHistory, todayKey, templateGoalToggles });
    const nextState = createTreatmentState({ ...rollbackState, customGoals: next.customGoals, goalProgressHistory: next.goalProgressHistory });
    setCustomGoals(next.customGoals);
    setGoalProgressHistory(next.goalProgressHistory);
    return persistTreatmentState(nextState, rollbackState, 'Yeni hedef eklendi.');
  };

  const toggleCustomGoal = async (goalId: string) => {
    if (savingTreatment) return;
    const rollbackState = currentTreatmentState();
    const next = buildGoalToggleResult({ goalId, customGoals, goalGroups: supportPlan.goalGroups, goalProgressHistory, todayKey, templateGoalToggles });
    const nextState = createTreatmentState({ ...rollbackState, customGoals: next.customGoals, goalProgressHistory: next.goalProgressHistory });
    setCustomGoals(next.customGoals);
    setGoalProgressHistory(next.goalProgressHistory);
    await persistTreatmentState(nextState, rollbackState, 'Hedef güncellendi.');
  };

  const updateCustomGoal = async (goalId: string, title: string, focusKey: FocusKey, dueDate?: string) => {
    if (savingTreatment) return false;
    const trimmed = title.trim();
    if (!trimmed) return false;
    const rollbackState = currentTreatmentState();
    const next = buildGoalUpdateResult({ goalId, title: trimmed, focusKey, dueDate, customGoals, goalGroups: supportPlan.goalGroups, goalProgressHistory, todayKey, templateGoalToggles });
    const nextState = createTreatmentState({ ...rollbackState, customGoals: next.customGoals, goalProgressHistory: next.goalProgressHistory });
    setCustomGoals(next.customGoals);
    setGoalProgressHistory(next.goalProgressHistory);
    return persistTreatmentState(nextState, rollbackState, 'Hedef düzenlendi.');
  };

  const deleteCustomGoal = async (goalId: string) => {
    if (savingTreatment) return;
    const rollbackState = currentTreatmentState();
    const next = buildGoalDeleteResult({ goalId, customGoals, goalGroups: supportPlan.goalGroups, goalProgressHistory, todayKey, templateGoalToggles });
    const nextState = createTreatmentState({ ...rollbackState, customGoals: next.customGoals, goalProgressHistory: next.goalProgressHistory });
    setCustomGoals(next.customGoals);
    setGoalProgressHistory(next.goalProgressHistory);
    await persistTreatmentState(nextState, rollbackState, 'Hedef silindi.');
  };

  const toggleTemplateGoal = async (goalLabel: string) => {
    if (savingTreatment) return;
    const rollbackState = currentTreatmentState();
    const next = buildTemplateGoalToggleResult({ goalLabel, templateGoalToggles, goalGroups: supportPlan.goalGroups, customGoals, goalProgressHistory, todayKey });
    const nextState = createTreatmentState({ ...rollbackState, templateGoalToggles: next.templateGoalToggles, goalProgressHistory: next.goalProgressHistory });
    setTemplateGoalToggles(next.templateGoalToggles);
    setGoalProgressHistory(next.goalProgressHistory);
    await persistTreatmentState(nextState, rollbackState, 'Hedef güncellendi.');
  };

  const togglePlanStep = async (stepId: string) => {
    if (savingTreatment) return;
    const rollbackState = currentTreatmentState();
    const next = buildPlanStepToggleResult({ stepId, todayKey, completedPlanSteps });
    const nextState = createTreatmentState({ ...rollbackState, completedPlanSteps: next.completedPlanSteps });
    setCompletedPlanSteps(next.completedPlanSteps);
    await persistTreatmentState(nextState, rollbackState);
  };

  const addCustomStory = async (story: Omit<CustomStoryData, 'id'>) => {
    if (savingTreatment) return false;
    const rollbackState = currentTreatmentState();
    const newStory: CustomStoryData = { ...story, id: crypto.randomUUID() };
    const nextCustomStories = [...customStories, newStory];
    const nextState = createTreatmentState({ ...rollbackState, customStories: nextCustomStories });
    setCustomStories(nextCustomStories);
    return persistTreatmentState(nextState, rollbackState, 'Sosyal hikâye eklendi.');
  };

  const deleteCustomStory = async (storyId: string) => {
    if (savingTreatment) return;
    const rollbackState = currentTreatmentState();
    const nextCustomStories = customStories.filter(s => s.id !== storyId);
    const nextState = createTreatmentState({ ...rollbackState, customStories: nextCustomStories });
    setCustomStories(nextCustomStories);
    await persistTreatmentState(nextState, rollbackState, 'Hikâye silindi.');
  };

  const saveSensoryProfile = async () => {
    if (savingTreatment) return;
    const rollbackState = currentTreatmentState();
    const nextState = createTreatmentState({ ...rollbackState, sensoryProfile });
    await persistTreatmentState(nextState, rollbackState, 'Duyusal profil güncellendi.');
  };

  const updateSensoryProfile = (key: keyof SensoryProfileState, value: number) => {
    setSensoryProfile((prev) => ({ ...prev, [key]: value }));
  };

  const selectChild = (child: Child | null) => setSelectedChild(child);

  return {
    activeAppointments,
    activeChild,
    childEvents,
    children,
    completedGoalCount,
    customGoals,
    customStories,
    detailLoading,
    gameFeedback,
    gameSessions,
    latestNote,
    loading,
    mergedGoalGroups,
    microProgress,
    primaryGoal,
    recentNotes,
    savingTreatment,
    sensoryMetrics,
    sensoryProfile,
    showMilestoneBanner,
    streakDays,
    supportPlan,
    templateGoalToggles,
    todayCompletedGames,
    todayCompletedPlanSteps,
    todayGameFeedback,
    todayMood,
    totalGoalCount,
    weeklyProgress,
    weeklySummary,
    actions: {
      addCustomGoal,
      addCustomStory,
      deleteCustomGoal,
      deleteCustomStory,
      saveGameFeedback,
      saveSensoryProfile,
      setSelectedChild: selectChild,
      toggleCustomGoal,
      toggleGameCompletion,
      togglePlanStep,
      toggleTemplateGoal,
      updateCustomGoal,
      updateSensoryProfile,
    },
    user,
  };
}
