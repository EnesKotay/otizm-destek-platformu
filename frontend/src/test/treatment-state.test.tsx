import { describe, expect, it } from 'vitest';
import { mergeGoalGroups } from '@/features/treatment/treatmentPlan';
import {
  getGameFeedbackForDay,
  saveGameFeedbackForDay,
  toggleGameSessionForDay,
} from '@/features/treatment/treatmentState';
import type { GoalGroup, TherapyGame } from '@/features/treatment/types';

const baseCommunicationGroup: GoalGroup = {
  key: 'communication',
  title: 'İletişim hedefleri',
  icon: null,
  percent: 0,
  items: [],
  templateItems: [],
  tone: 'sky',
  summary: 'İletişim hedefleri',
};

const requestCardsGame: TherapyGame = {
  id: 'request-cards',
  key: 'communication',
  title: 'İstek Kartları',
  skill: 'İletişim',
  approach: 'Seçim',
  benefit: 'İstek belirtmeyi destekler.',
  duration: '5 dk',
  instruction: 'İki seçenek sunun.',
  tip: 'Kısa tutun.',
  tone: 'sky',
  icon: null,
  linkedGoal: 'İletişim hedefleri',
  linkedTool: 'PECS',
};

describe('treatment goals', () => {
  it('keeps custom goals visible even when their focus group is not in the base plan', () => {
    const groups = mergeGoalGroups([baseCommunicationGroup], [
      {
        id: 'social-goal-1',
        title: 'Sırasını bekledi',
        focusKey: 'social',
        done: true,
      },
    ]);

    const socialGroup = groups.find((group) => group.key === 'social');

    expect(socialGroup).toBeDefined();
    expect(socialGroup?.items).toEqual([{ label: 'Sırasını bekledi', status: 'done' }]);
    expect(socialGroup?.percent).toBe(100);
  });
});

describe('treatment game feedback', () => {
  it('stores feedback per day and does not reuse legacy game-id feedback for a new day', () => {
    const saved = saveGameFeedbackForDay({
      gameId: 'request-cards',
      status: 'challenging',
      todayKey: '2026-06-26',
      gameSessions: [],
      gameFeedback: { 'request-cards': 'easy' },
      games: [requestCardsGame],
    });

    expect(saved.gameFeedback['request-cards']).toBeUndefined();
    expect(saved.gameFeedback['2026-06-26:request-cards']).toBe('challenging');
    expect(getGameFeedbackForDay(saved.gameFeedback, '2026-06-27', 'request-cards')).toBeUndefined();

    const toggledNextDay = toggleGameSessionForDay({
      gameId: 'request-cards',
      todayKey: '2026-06-27',
      gameSessions: [],
      gameFeedback: saved.gameFeedback,
      games: [requestCardsGame],
    });

    expect(toggledNextDay.gameSessions[0]?.status).toBe('assisted');
  });

  it('clears only the current day feedback when a game is unmarked', () => {
    const toggledOff = toggleGameSessionForDay({
      gameId: 'request-cards',
      todayKey: '2026-06-26',
      gameSessions: [
        {
          gameId: 'request-cards',
          status: 'challenging',
          focusKey: 'communication',
          linkedGoal: 'İletişim hedefleri',
          completedAt: '2026-06-26T09:00:00.000Z',
        },
      ],
      gameFeedback: {
        '2026-06-26:request-cards': 'challenging',
        '2026-06-25:request-cards': 'easy',
      },
      games: [requestCardsGame],
    });

    expect(toggledOff.gameSessions).toEqual([]);
    expect(toggledOff.gameFeedback['2026-06-26:request-cards']).toBeUndefined();
    expect(toggledOff.gameFeedback['2026-06-25:request-cards']).toBe('easy');
  });
});
