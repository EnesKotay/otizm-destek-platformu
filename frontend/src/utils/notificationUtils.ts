import { Calendar, Users, MessageSquare, ClipboardList, UserPlus, ShieldCheck, AlertTriangle, FileText, CalendarClock, AlertCircle, Info, MessageCircle, Bell, type LucideIcon } from 'lucide-react';

// ── Bildirim Kategorileri ─────────────────────────────
export type NotificationCategory = 'all' | 'appointments' | 'messages' | 'forum' | 'tasks' | 'social' | 'system';

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  all: 'Tümü',
  appointments: 'Randevular',
  messages: 'Mesajlar',
  forum: 'Forum',
  tasks: 'Görevler',
  social: 'Sosyal',
  system: 'Sistem',
};

// ── Tip → Kategori eşleştirmesi ────────────────────────
const TYPE_CATEGORY_MAP: Record<string, NotificationCategory> = {
  APPOINTMENT_REQUEST: 'appointments',
  APPOINTMENT_CONFIRMED: 'appointments',
  APPOINTMENT_CANCELLED: 'appointments',
  APPOINTMENT_RESCHEDULED: 'appointments',
  APPOINTMENT_COMPLETED: 'appointments',
  APPOINTMENT_REMINDER: 'appointments',
  APPOINTMENT_SOON: 'appointments',
  APPOINTMENT_RATED: 'appointments',
  SESSION_NOTES_ADDED: 'appointments',
  MEETING_LINK_ADDED: 'appointments',
  COMMENT: 'forum',
  BUDDY_REQUEST: 'social',
  BUDDY_ACCEPT: 'social',
  MEETING_INVITE: 'social',
  MEETING_UPDATE: 'social',
  GROUP_MEETING_SCHEDULED: 'social',
  GROUP_MEMBER_JOINED: 'social',
  TASK_ASSIGNED: 'tasks',
  TASK_COMPLETED: 'tasks',
  TASK_REVIEWED: 'tasks',
  TASK_OVERDUE: 'tasks',
  CONNECTION_AUTO_APPROVED: 'system',
  PATIENT_LINKED: 'system',
  CONNECTION_APPROVED: 'system',
  CONNECTION_REJECTED: 'system',
  CONNECTION_REVOKED: 'system',
  EXPERT_APPROVED: 'system',
  EXPERT_REJECTED: 'system',
  LICENSE_VERIFIED: 'system',
  MODERATION_WARNING: 'system',
  CONTENT_REMOVED: 'system',
  CLINICAL_SHARE: 'system',
  CALENDAR_REMINDER: 'appointments',
  LOCAL_REMINDER: 'tasks',
  CONSULTATION_REPLY: 'forum',
};

export function getNotificationCategory(type: string): NotificationCategory {
  return TYPE_CATEGORY_MAP[type] || 'system';
}

// ── Tip → İkon + Renk eşleştirmesi ──────────────────────
interface IconConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

const ICON_MAP: Record<string, IconConfig> = {
  APPOINTMENT_REQUEST: { icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  APPOINTMENT_CONFIRMED: { icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  APPOINTMENT_CANCELLED: { icon: Calendar, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  APPOINTMENT_RESCHEDULED: { icon: CalendarClock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  APPOINTMENT_COMPLETED: { icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  APPOINTMENT_REMINDER: { icon: Bell, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
  APPOINTMENT_SOON: { icon: CalendarClock, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
  APPOINTMENT_RATED: { icon: Calendar, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  SESSION_NOTES_ADDED: { icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  MEETING_LINK_ADDED: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
  COMMENT: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
  CONSULTATION_REPLY: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
  BUDDY_REQUEST: { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
  BUDDY_ACCEPT: { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
  MEETING_INVITE: { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
  MEETING_UPDATE: { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
  GROUP_MEETING_SCHEDULED: { icon: CalendarClock, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
  GROUP_MEMBER_JOINED: { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
  TASK_ASSIGNED: { icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
  TASK_COMPLETED: { icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  TASK_REVIEWED: { icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
  TASK_OVERDUE: { icon: ClipboardList, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  CONNECTION_AUTO_APPROVED: { icon: UserPlus, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  PATIENT_LINKED: { icon: UserPlus, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  CONNECTION_APPROVED: { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  CONNECTION_REJECTED: { icon: UserPlus, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  CONNECTION_REVOKED: { icon: UserPlus, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  EXPERT_APPROVED: { icon: ShieldCheck, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100' },
  EXPERT_REJECTED: { icon: ShieldCheck, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  LICENSE_VERIFIED: { icon: ShieldCheck, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100' },
  MODERATION_WARNING: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  CONTENT_REMOVED: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  CLINICAL_SHARE: { icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100' },
  CALENDAR_REMINDER: { icon: CalendarClock, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
  LOCAL_REMINDER: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
};

const DEFAULT_ICON: IconConfig = { icon: Info, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100' };

export function getNotificationIconConfig(type: string): IconConfig {
  return ICON_MAP[type] || DEFAULT_ICON;
}

// ── Tercih filtreleme ─────────────────────────────────
const TYPE_PREF_MAP: Record<string, string> = {
  COMMENT: 'notif_forum',
  CONSULTATION_REPLY: 'notif_forum',
  BUDDY_REQUEST: 'notif_matching',
  BUDDY_ACCEPT: 'notif_matching',
  MEETING_INVITE: 'notif_matching',
  MEETING_UPDATE: 'notif_matching',
  APPOINTMENT_REQUEST: 'notif_appointment_request',
  APPOINTMENT_CONFIRMED: 'notif_appt_confirm',
  APPOINTMENT_CANCELLED: 'notif_appt_confirm',
  APPOINTMENT_RESCHEDULED: 'notif_appt_confirm',
  APPOINTMENT_REMINDER: 'notif_calendar',
  APPOINTMENT_SOON: 'notif_calendar',
  CALENDAR_REMINDER: 'notif_calendar',
  TASK_ASSIGNED: 'notif_task_assigned',
  TASK_COMPLETED: 'notif_task_assigned',
  TASK_REVIEWED: 'notif_task_assigned',
  TASK_OVERDUE: 'notif_task_assigned',
  SESSION_NOTES_ADDED: 'notif_expert_note',
  PATIENT_LINKED: 'notif_patient_connection',
  CONNECTION_AUTO_APPROVED: 'notif_patient_connection',
  CONNECTION_APPROVED: 'notif_patient_connection',
  CONNECTION_REJECTED: 'notif_patient_connection',
  CONNECTION_REVOKED: 'notif_patient_connection',
};

export function shouldShowNotification(type: string): boolean {
  const prefKey = TYPE_PREF_MAP[type];
  if (!prefKey) return true; // Eşleşmeyen tipler her zaman gösterilir
  try {
    const stored = localStorage.getItem(prefKey);
    if (stored === null) return true; // Varsayılan: açık
    return stored === 'true';
  } catch {
    return true;
  }
}

// ── Bildirim sesi ────────────────────────────────────
let audioContext: AudioContext | null = null;

export function playNotificationSound(): void {
  try {
    const soundEnabled = localStorage.getItem('notif_sound') !== 'false';
    if (!soundEnabled) return;

    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const ctx = audioContext;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Ses çalamazsa sessizce devam et
  }
}
