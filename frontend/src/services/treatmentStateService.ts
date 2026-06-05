import api from './api';
import type { TreatmentPageState } from '@/features/treatment/types';
import { DEFAULT_SENSORY_PROFILE } from '@/features/treatment/treatmentPlan';

interface TreatmentStateDto {
  gameFeedback: Record<string, string>;
  customGoals: Array<Record<string, unknown>>;
  sensoryProfile: Record<string, unknown>;
  gameSessions: Array<Record<string, unknown>>;
  goalProgressHistory: Array<Record<string, unknown>>;
}

function fromDto(dto: TreatmentStateDto): TreatmentPageState {
  return {
    gameFeedback: (dto.gameFeedback ?? {}) as TreatmentPageState['gameFeedback'],
    customGoals: (dto.customGoals ?? []) as unknown as TreatmentPageState['customGoals'],
    sensoryProfile: {
      sound: Number((dto.sensoryProfile?.sound) ?? DEFAULT_SENSORY_PROFILE.sound),
      touch: Number((dto.sensoryProfile?.touch) ?? DEFAULT_SENSORY_PROFILE.touch),
      visual: Number((dto.sensoryProfile?.visual) ?? DEFAULT_SENSORY_PROFILE.visual),
    },
    gameSessions: (dto.gameSessions ?? []) as unknown as TreatmentPageState['gameSessions'],
    goalProgressHistory: (dto.goalProgressHistory ?? []) as unknown as TreatmentPageState['goalProgressHistory'],
  };
}

export const treatmentStateService = {
  async get(childId: string): Promise<TreatmentPageState> {
    const { data } = await api.get<TreatmentStateDto>(`/treatment-state/${childId}`);
    return fromDto(data);
  },

  async save(childId: string, state: TreatmentPageState): Promise<void> {
    await api.put(`/treatment-state/${childId}`, state);
  },
};
