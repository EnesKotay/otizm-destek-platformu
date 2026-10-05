import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

/** Calendar dates for the user's local day; ISO UTC dates can be a day behind. */
export function formatLocalDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateStr: string) {
  return format(parseISO(dateStr), 'd MMMM yyyy', { locale: tr });
}

export function formatDateTime(dateStr: string) {
  return format(parseISO(dateStr), 'd MMMM yyyy HH:mm', { locale: tr });
}

export function formatRelative(dateStr: string) {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: tr });
}

export function formatTime(dateStr: string) {
  return format(parseISO(dateStr), 'HH:mm', { locale: tr });
}
