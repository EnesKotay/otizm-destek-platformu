import type { ReactNode } from 'react';

export type GoalStatus = 'done' | 'active' | 'upcoming';
export type FocusKey = 'communication' | 'social' | 'sensory' | 'motor' | 'behavior' | 'education';
export type GameReflection = 'easy' | 'assisted' | 'independent' | 'challenging';

export interface GoalItem {
  label: string;
  status: GoalStatus;
}

export interface FocusArea {
  key: FocusKey;
  label: string;
  reason: string;
}

export interface GoalGroup {
  key: FocusKey;
  title: string;
  icon: ReactNode;
  percent: number;
  items: GoalItem[];
  templateItems: GoalItem[];
  tone: 'sky' | 'violet';
  summary: string;
}

export interface ToolCard {
  key: FocusKey;
  title: string;
  description: string;
  badges: string[];
  tone: 'sky' | 'violet';
  linkedGoal: string;
}

export interface SensoryMetric {
  label: string;
  value: string;
  width: string;
  color: string;
  note: string;
}

export interface TherapyGame {
  id: string;
  key: FocusKey;
  title: string;
  skill: string;
  approach: string;
  benefit: string;
  duration: string;
  instruction: string;
  tip: string;
  tone: 'sky' | 'emerald' | 'amber';
  icon: ReactNode;
  linkedGoal: string;
  linkedTool: string;
}

export interface StoryCard {
  key: FocusKey;
  title: string;
  meta: string;
  icon: string;
  linkedGoal: string;
}

export interface TodayPlanStep {
  id: string;
  title: string;
  detail: string;
  duration: string;
  linkedGoal: string;
  linkedTool: string;
}

export interface SmartSuggestion {
  id: string;
  title: string;
  detail: string;
}

export interface SupportPlan {
  focusAreas: FocusArea[];
  goalGroups: GoalGroup[];
  toolCards: ToolCard[];
  sensoryMetrics: SensoryMetric[];
  stories: StoryCard[];
  games: TherapyGame[];
  todayPlan: TodayPlanStep[];
  smartSuggestions: SmartSuggestion[];
  triggerSummary: string;
  activeProgramLabel: string;
}

export interface EditableGoal {
  id: string;
  title: string;
  focusKey: FocusKey;
  done: boolean;
  dueDate?: string;
}

export interface SensoryProfileState {
  sound: number;
  touch: number;
  visual: number;
}

export interface GameSession {
  gameId: string;
  status: GameReflection;
  focusKey: FocusKey;
  linkedGoal: string;
  completedAt: string;
}

export interface GoalProgressSnapshot {
  recordedAt: string;
  percent: number;
}

export interface CustomStoryData {
  id: string;
  title: string;
  icon: string;
  linkedGoal: string;
}

export interface TreatmentPageState {
  customGoals: EditableGoal[];
  sensoryProfile: SensoryProfileState;
  gameFeedback: Record<string, GameReflection>;
  gameSessions: GameSession[];
  goalProgressHistory: GoalProgressSnapshot[];
  templateGoalToggles: Record<string, boolean>;
  completedPlanSteps: string[];
  customStories: CustomStoryData[];
}
