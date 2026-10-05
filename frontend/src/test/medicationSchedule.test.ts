import { describe, expect, it } from 'vitest';
import { countDueMedicationSlots } from '@/utils/medicationSchedule';
import type { Medication } from '@/types';

function medication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1', childId: 'child-1', name: 'İlaç', isActive: true,
    createdAt: '2026-10-01T00:00:00', scheduledTimes: ['08:00', '20:00'],
    ...overrides,
  };
}

describe('dashboard medication prompt', () => {
  const now = new Date(2026, 9, 5, 12, 30);

  it('counts only unrecorded doses whose time has arrived', () => {
    expect(countDueMedicationSlots([medication()], now)).toBe(1);
    expect(countDueMedicationSlots([medication({
      todayLogs: [{ id: 'log-1', medicationId: 'med-1', childId: 'child-1',
        logDate: '2026-10-05', scheduledTime: '08:00', taken: true }],
    })], now)).toBe(0);
  });

  it('ignores inactive and not-yet-started medicines and yesterday’s dose log', () => {
    expect(countDueMedicationSlots([
      medication({ isActive: false }),
      medication({ startDate: '2026-10-06' }),
      medication({ endDate: '2026-10-04' }),
    ], now)).toBe(0);
    expect(countDueMedicationSlots([medication({
      todayLogs: [{ id: 'log-1', medicationId: 'med-1', childId: 'child-1',
        logDate: '2026-10-04', scheduledTime: '08:00', taken: true }],
    })], now)).toBe(1);
  });
});
