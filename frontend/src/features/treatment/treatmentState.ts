import {
  getDateKey,
  mergeGoalGroups,
} from './treatmentPlan';
import type {
  CustomStoryData,
  EditableGoal,
  FocusKey,
  GameReflection,
  GameSession,
  GoalGroup,
  GoalProgressSnapshot,
  SensoryProfileState,
  TherapyGame,
  TreatmentPageState,
} from './types';

export function createTreatmentState(params: {
  customGoals: EditableGoal[];
  sensoryProfile: SensoryProfileState;
  gameFeedback: Record<string, GameReflection>;
  gameSessions: GameSession[];
  goalProgressHistory: GoalProgressSnapshot[];
  templateGoalToggles?: Record<string, boolean>;
  completedPlanSteps?: string[];
  customStories?: CustomStoryData[];
}): TreatmentPageState {
  return {
    customGoals: params.customGoals,
    sensoryProfile: params.sensoryProfile,
    gameFeedback: params.gameFeedback,
    gameSessions: params.gameSessions,
    goalProgressHistory: params.goalProgressHistory,
    templateGoalToggles: params.templateGoalToggles || {},
    completedPlanSteps: params.completedPlanSteps || [],
    customStories: params.customStories || [],
  };
}

export function recordGoalProgressForDay(
  groups: GoalGroup[],
  history: GoalProgressSnapshot[],
  todayKey: string,
  recordedAt = new Date().toISOString(),
) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const done = groups.reduce((sum, group) => sum + group.items.filter((item) => item.status === 'done').length, 0);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return [
    ...history.filter((item) => getDateKey(item.recordedAt) !== todayKey),
    { recordedAt, percent },
  ];
}

export function getGameFeedbackKey(todayKey: string, gameId: string) {
  return `${todayKey}:${gameId}`;
}

export function getGameFeedbackForDay(
  gameFeedback: Record<string, GameReflection>,
  todayKey: string,
  gameId: string,
) {
  return gameFeedback[getGameFeedbackKey(todayKey, gameId)];
}

function removeGameFeedbackForDay(
  gameFeedback: Record<string, GameReflection>,
  todayKey: string,
  gameId: string,
) {
  const dailyKey = getGameFeedbackKey(todayKey, gameId);
  const { [dailyKey]: _daily, [gameId]: _legacy, ...rest } = gameFeedback;
  return rest;
}

export function toggleGameSessionForDay(params: {
  gameId: string;
  todayKey: string;
  gameSessions: GameSession[];
  gameFeedback: Record<string, GameReflection>;
  games: TherapyGame[];
}) {
  const isCompleted = params.gameSessions.some(
    (session) => session.gameId === params.gameId && getDateKey(session.completedAt) === params.todayKey
  );
  const game = params.games.find((item) => item.id === params.gameId);

  const gameFeedback: Record<string, GameReflection> = isCompleted
    ? removeGameFeedbackForDay(params.gameFeedback, params.todayKey, params.gameId)
    : params.gameFeedback;

  const gameSessions = isCompleted
    ? params.gameSessions.filter(
        (session) => !(session.gameId === params.gameId && getDateKey(session.completedAt) === params.todayKey)
      )
    : [
        ...params.gameSessions.filter(
          (session) => !(session.gameId === params.gameId && getDateKey(session.completedAt) === params.todayKey)
        ),
        {
          gameId: params.gameId,
          status: getGameFeedbackForDay(gameFeedback, params.todayKey, params.gameId) || 'assisted',
          focusKey: game?.key || 'communication' as FocusKey,
          linkedGoal: game?.linkedGoal || 'Genel hedef',
          completedAt: new Date().toISOString(),
        },
      ];

  return { gameFeedback, gameSessions };
}

export function saveGameFeedbackForDay(params: {
  gameId: string;
  status: GameReflection;
  todayKey: string;
  gameSessions: GameSession[];
  gameFeedback: Record<string, GameReflection>;
  games: TherapyGame[];
}) {
  const game = params.games.find((item) => item.id === params.gameId);
  const gameFeedback = {
    ...removeGameFeedbackForDay(params.gameFeedback, params.todayKey, params.gameId),
    [getGameFeedbackKey(params.todayKey, params.gameId)]: params.status,
  };
  const gameSessions = [
    ...params.gameSessions.filter(
      (session) => !(session.gameId === params.gameId && getDateKey(session.completedAt) === params.todayKey)
    ),
    {
      gameId: params.gameId,
      status: params.status,
      focusKey: game?.key || 'communication' as FocusKey,
      linkedGoal: game?.linkedGoal || 'Genel hedef',
      completedAt: new Date().toISOString(),
    },
  ];

  return { gameFeedback, gameSessions };
}

export function buildGoalAddResult(params: {
  title: string;
  focusKey: FocusKey;
  dueDate?: string;
  customGoals: EditableGoal[];
  goalGroups: GoalGroup[];
  goalProgressHistory: GoalProgressSnapshot[];
  todayKey: string;
  templateGoalToggles?: Record<string, boolean>;
}) {
  const nextGoals = [
    ...params.customGoals,
    {
      id: crypto.randomUUID(),
      title: params.title,
      focusKey: params.focusKey,
      done: false,
      ...(params.dueDate ? { dueDate: params.dueDate } : {}),
    },
  ];
  const nextHistory = recordGoalProgressForDay(
    mergeGoalGroups(params.goalGroups, nextGoals, params.templateGoalToggles),
    params.goalProgressHistory,
    params.todayKey,
  );

  return { customGoals: nextGoals, goalProgressHistory: nextHistory };
}

export function buildGoalToggleResult(params: {
  goalId: string;
  customGoals: EditableGoal[];
  goalGroups: GoalGroup[];
  goalProgressHistory: GoalProgressSnapshot[];
  todayKey: string;
  templateGoalToggles?: Record<string, boolean>;
}) {
  const customGoals = params.customGoals.map((goal) =>
    goal.id === params.goalId ? { ...goal, done: !goal.done } : goal
  );
  const goalProgressHistory = recordGoalProgressForDay(
    mergeGoalGroups(params.goalGroups, customGoals, params.templateGoalToggles),
    params.goalProgressHistory,
    params.todayKey,
  );

  return { customGoals, goalProgressHistory };
}

export function buildGoalUpdateResult(params: {
  goalId: string;
  title: string;
  focusKey: FocusKey;
  dueDate?: string;
  customGoals: EditableGoal[];
  goalGroups: GoalGroup[];
  goalProgressHistory: GoalProgressSnapshot[];
  todayKey: string;
  templateGoalToggles?: Record<string, boolean>;
}) {
  const customGoals = params.customGoals.map((goal) =>
    goal.id === params.goalId
      ? { ...goal, title: params.title, focusKey: params.focusKey, ...(params.dueDate !== undefined ? { dueDate: params.dueDate || undefined } : {}) }
      : goal
  );
  const goalProgressHistory = recordGoalProgressForDay(
    mergeGoalGroups(params.goalGroups, customGoals, params.templateGoalToggles),
    params.goalProgressHistory,
    params.todayKey,
  );

  return { customGoals, goalProgressHistory };
}

export function buildGoalDeleteResult(params: {
  goalId: string;
  customGoals: EditableGoal[];
  goalGroups: GoalGroup[];
  goalProgressHistory: GoalProgressSnapshot[];
  todayKey: string;
  templateGoalToggles?: Record<string, boolean>;
}) {
  const customGoals = params.customGoals.filter((goal) => goal.id !== params.goalId);
  const goalProgressHistory = recordGoalProgressForDay(
    mergeGoalGroups(params.goalGroups, customGoals, params.templateGoalToggles),
    params.goalProgressHistory,
    params.todayKey,
  );

  return { customGoals, goalProgressHistory };
}

export function buildTemplateGoalToggleResult(params: {
  goalLabel: string;
  templateGoalToggles: Record<string, boolean>;
  goalGroups: GoalGroup[];
  customGoals: EditableGoal[];
  goalProgressHistory: GoalProgressSnapshot[];
  todayKey: string;
}) {
  const current = params.templateGoalToggles[params.goalLabel] ?? false;
  const templateGoalToggles = { ...params.templateGoalToggles, [params.goalLabel]: !current };

  const goalProgressHistory = recordGoalProgressForDay(
    mergeGoalGroups(params.goalGroups, params.customGoals, templateGoalToggles),
    params.goalProgressHistory,
    params.todayKey,
  );

  return { templateGoalToggles, goalProgressHistory };
}

export function buildPlanStepToggleResult(params: {
  stepId: string;
  todayKey: string;
  completedPlanSteps: string[];
}) {
  const key = `${params.todayKey}:${params.stepId}`;
  const isCompleted = params.completedPlanSteps.includes(key);
  return {
    completedPlanSteps: isCompleted
      ? params.completedPlanSteps.filter((s) => s !== key)
      : [...params.completedPlanSteps, key],
  };
}
