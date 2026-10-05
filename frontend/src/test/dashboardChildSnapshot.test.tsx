import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChildDashboardSnapshot } from '@/hooks/useChildDashboardSnapshot';
import { noteService } from '@/services/noteService';
import { moodService } from '@/services/moodService';
import { medicationService } from '@/services/medicationService';
import { sensoryProfileService } from '@/services/sensoryProfileService';
import { emergencyCardService } from '@/services/emergencyCardService';
import { wellbeingService } from '@/services/wellbeingService';
import { behaviorJournalService } from '@/services/behaviorJournalService';
import type { DevelopmentNote } from '@/types';

vi.mock('@/services/noteService', () => ({ noteService: { getRecent: vi.fn() } }));
vi.mock('@/services/moodService', () => ({ moodService: { getByChild: vi.fn() } }));
vi.mock('@/services/medicationService', () => ({ medicationService: { getByChild: vi.fn() } }));
vi.mock('@/services/sensoryProfileService', () => ({ sensoryProfileService: { get: vi.fn() } }));
vi.mock('@/services/emergencyCardService', () => ({ emergencyCardService: { get: vi.fn() } }));
vi.mock('@/services/wellbeingService', () => ({ wellbeingService: { getAll: vi.fn() } }));
vi.mock('@/services/behaviorJournalService', () => ({ behaviorJournalService: { getByChild: vi.fn() } }));

describe('child dashboard data', () => {
  function renderSnapshot(initialChildId: string) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    let latest: ReturnType<typeof useChildDashboardSnapshot>;
    function Probe({ childId }: { childId: string }) {
      latest = useChildDashboardSnapshot(childId, true);
      return null;
    }
    return {
      render: async (childId = initialChildId) => {
        await act(async () => { root.render(<Probe childId={childId} />); });
      },
      current: () => latest!,
      cleanup: async () => {
        await act(async () => { root.unmount(); });
        container.remove();
      },
    };
  }

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(noteService.getRecent).mockResolvedValue([]);
    vi.mocked(moodService.getByChild).mockResolvedValue([]);
    vi.mocked(medicationService.getByChild).mockResolvedValue([]);
    vi.mocked(sensoryProfileService.get).mockResolvedValue(null);
    vi.mocked(emergencyCardService.get).mockResolvedValue(null);
    vi.mocked(wellbeingService.getAll).mockResolvedValue([]);
    vi.mocked(behaviorJournalService.getByChild).mockResolvedValue([]);
  });

  it('ignores a late response from the previously selected child', async () => {
    let finishFirst!: (notes: DevelopmentNote[]) => void;
    const firstRequest = new Promise<DevelopmentNote[]>(resolve => { finishFirst = resolve; });
    vi.mocked(noteService.getRecent).mockImplementation(childId =>
      childId === 'first' ? firstRequest : Promise.resolve([]));

    const view = renderSnapshot('first');
    await view.render();
    await view.render('second');
    expect(view.current().snapshot?.childId).toBe('second');
    await act(async () => { finishFirst([]); });
    expect(view.current().snapshot?.childId).toBe('second');
    await view.cleanup();
  });

  it('shows an error instead of an empty record when loading fails, then retries', async () => {
    vi.mocked(noteService.getRecent)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([]);
    const view = renderSnapshot('child');
    await view.render();
    expect(view.current().error).toBe(true);
    expect(view.current().snapshot).toBeNull();

    await act(async () => { view.current().retry(); });
    expect(view.current().snapshot?.childId).toBe('child');
    expect(view.current().error).toBe(false);
    await view.cleanup();
  });
});
