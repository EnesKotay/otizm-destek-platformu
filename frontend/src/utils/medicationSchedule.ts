import type { Medication } from '@/types';
import { formatLocalDate } from './date';

/** Only scheduled doses whose local time has arrived belong in the overdue dashboard prompt. */
export function countDueMedicationSlots(medications: Medication[], now = new Date()): number {
  const today = formatLocalDate(now);
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  return medications.reduce((count, medication) => {
    if (!medication.isActive ||
      (medication.startDate && medication.startDate > today) ||
      (medication.endDate && medication.endDate < today)) return count;

    return count + (medication.scheduledTimes ?? []).filter(time => {
      const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
      if (!match) return false;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour > 23 || minute > 59 || hour * 60 + minute > currentMinute) return false;
      return !medication.todayLogs?.some(log =>
        log.logDate === today && log.scheduledTime === time && log.taken);
    }).length;
  }, 0);
}
