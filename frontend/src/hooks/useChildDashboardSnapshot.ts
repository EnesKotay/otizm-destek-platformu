import { useEffect, useState } from 'react';
import { noteService } from '@/services/noteService';
import { moodService } from '@/services/moodService';
import { medicationService } from '@/services/medicationService';
import { sensoryProfileService } from '@/services/sensoryProfileService';
import { emergencyCardService } from '@/services/emergencyCardService';
import { wellbeingService } from '@/services/wellbeingService';
import { behaviorJournalService } from '@/services/behaviorJournalService';
import { formatLocalDate } from '@/utils/date';
import type { DevelopmentNote, Medication, MoodEntry } from '@/types';

interface ChildDashboardSnapshot {
  childId: string;
  recentNotes: DevelopmentNote[];
  todayMood: MoodEntry | null;
  todayMeds: Medication[];
  hasSensoryProfile: boolean;
  hasEmergencyCard: boolean;
  hasWellbeingLog: boolean;
  hasBehaviorLog: boolean;
}

export function useChildDashboardSnapshot(childId: string | null, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<ChildDashboardSnapshot | null>(null);
  const [errorChildId, setErrorChildId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!enabled || !childId) return;
    let current = true;
    const today = formatLocalDate();

    Promise.all([
      noteService.getRecent(childId),
      moodService.getByChild(childId),
      medicationService.getByChild(childId),
      sensoryProfileService.get(childId),
      emergencyCardService.get(childId),
      wellbeingService.getAll(),
      behaviorJournalService.getByChild(childId),
    ]).then(([notes, moods, meds, sensory, emergency, wellbeing, behaviors]) => {
      if (!current) return;
      setErrorChildId(null);
      setSnapshot({
        childId,
        recentNotes: notes.slice(0, 3),
        todayMood: moods.find(entry => entry.entryDate === today) ?? null,
        todayMeds: meds.filter(med => med.isActive !== false),
        hasSensoryProfile: Boolean(sensory),
        hasEmergencyCard: Boolean(emergency),
        hasWellbeingLog: wellbeing.length > 0,
        hasBehaviorLog: behaviors.length > 0,
      });
    }).catch(() => {
      if (current) setErrorChildId(childId);
    });

    return () => { current = false; };
  }, [childId, enabled, retryCount]);

  return {
    snapshot: enabled && snapshot?.childId === childId ? snapshot : null,
    error: enabled && errorChildId === childId,
    retry: () => {
      setErrorChildId(null);
      setSnapshot(null);
      setRetryCount(value => value + 1);
    },
  };
}
