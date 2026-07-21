import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon, Clock, CheckCircle, ChevronLeft, ChevronRight,
  GraduationCap, Sun, Check, Loader2, AlertCircle, Search, X,
  Video, MapPin, CheckCircle2, XCircle, Users, TrendingUp, Lock, Unlock, Coffee, Sunset,
  Trash2, Pencil, Star, Copy, ClipboardCheck, BookOpen, Repeat, FileText, PlusCircle, NotebookPen,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { appointmentService, type AppointmentHistoryEntry } from '@/services/appointmentService';
import { expertService } from '@/services/expertService';
import { childService } from '@/services/childService';
import { patientNoteService, type PatientNote } from '@/services/patientNoteService';
import type { AppointmentRecord, ExpertAvailability, User, Child } from '@/types';

const DAYS = [
  { key: 1, label: 'Pazartesi' }, { key: 2, label: 'Salı' }, { key: 3, label: 'Çarşamba' },
  { key: 4, label: 'Perşembe' }, { key: 5, label: 'Cuma' }, { key: 6, label: 'Cumartesi' }, { key: 7, label: 'Pazar' },
];

function generateTimeSlots(startTime: string, endTime: string, duration = 50): string[] {
  if (!startTime || !endTime) return [];
  const slots: string[] = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let total = sh * 60 + sm;
  const end = eh * 60 + em;
  while (total + duration <= end) {
    slots.push(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
    total += 30;
  }
  return slots;
}

function jsDateToIsoDow(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateInputValue(value?: string): string {
  if (!value) return toDateInputValue(new Date());
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const trDate = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (trDate) return `${trDate[3]}-${trDate[2]}-${trDate[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? toDateInputValue(new Date()) : toDateInputValue(parsed);
}

function isBlockedSlotForDate(blockedSlots: string[] | undefined, date: string, time: string): boolean {
  const slots = blockedSlots ?? [];
  return slots.includes(time) || slots.includes(`${date}|${time}`);
}

function normalizeTR(str: string): string {
  return str.toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}

type ApptFilterStatus = 'ALL' | 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
type CalendarView = 'month' | 'week';

const APPOINTMENT_TYPE_OPTIONS = [
  { value: 'FACE_TO_FACE' as const, label: 'Yüz Yüze', icon: MapPin, helper: 'Klinik veya kurumda görüşme' },
  { value: 'ONLINE' as const, label: 'Online', icon: Video, helper: 'Görüntülü görüşme linki oluşturulur' },
];

const DURATION_OPTIONS = [30, 50, 90];

export function AppointmentPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpert = user?.role === 'EXPERT';
  const requestedExpertId = useMemo(() => searchParams.get('expert') ?? '', [searchParams]);

  const [activeTab, setActiveTab] = useState<'appointments' | 'schedule' | 'patients'>('appointments');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(new Date()));
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // cancel/complete confirm
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<AppointmentRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // edit (notes + type + meeting link)
  const [editTarget, setEditTarget] = useState<AppointmentRecord | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editType, setEditType] = useState<'FACE_TO_FACE' | 'ONLINE'>('FACE_TO_FACE');
  const [editMeetingLink, setEditMeetingLink] = useState('');

  // appointment search
  const [apptSearch, setApptSearch] = useState('');

  const [availability, setAvailability] = useState<ExpertAvailability[]>(
    DAYS.map(d => ({ dayOfWeek: d.key, enabled: false, startTime: '09:00', endTime: '18:00', blockedSlots: [] }))
  );
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [experts, setExperts] = useState<User[]>([]);
  const [children, setChildren] = useState<Child[]>([]);

  const [bookExpertId, setBookExpertId] = useState('');
  const [bookChildId, setBookChildId] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookDuration, setBookDuration] = useState(50);
  const [bookNotes, setBookNotes] = useState('');
  const [bookType, setBookType] = useState<'FACE_TO_FACE' | 'ONLINE'>('FACE_TO_FACE');
  const [bookRecurrenceWeeks, setBookRecurrenceWeeks] = useState(0);
  const [selectedExpertProfile, setSelectedExpertProfile] = useState<User | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [bookingCalendarMonth, setBookingCalendarMonth] = useState(() => new Date());

  const [expertAvailability, setExpertAvailability] = useState<ExpertAvailability[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ApptFilterStatus>('ALL');
  const [detailAppointment, setDetailAppointment] = useState<AppointmentRecord | null>(null);
  const [apptHistory, setApptHistory] = useState<AppointmentHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleDuration, setRescheduleDuration] = useState(50);
  const [rescheduleAvailability, setRescheduleAvailability] = useState<ExpertAvailability[]>([]);
  const [rescheduleBookedTimes, setRescheduleBookedTimes] = useState<string[]>([]);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [sessionNotesTarget, setSessionNotesTarget] = useState<AppointmentRecord | null>(null);
  const [sessionNotesText, setSessionNotesText] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // rating
  const [ratingTarget, setRatingTarget] = useState<AppointmentRecord | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  // patients panel (expert)

  const [patients, setPatients] = useState<Record<string, unknown>[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // patient notes
  const [notesPatient, setNotesPatient] = useState<Record<string, unknown> | null>(null);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('GENERAL');
  const [newNoteDate, setNewNoteDate] = useState(toDateInputValue(new Date()));
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // dirty schedule
  const [scheduleIsDirty, setScheduleIsDirty] = useState(false);

  const didFetchKey = useRef('');

  const openPatientPage = useCallback((patient: Record<string, unknown>) => {
    const childId = typeof patient.childId === 'string' ? patient.childId : '';
    navigate(childId ? `/danisanlarim?childId=${encodeURIComponent(childId)}` : '/danisanlarim');
  }, [navigate]);

  useEffect(() => {
    const fetchKey = `${isExpert}-${requestedExpertId}`;
    if (didFetchKey.current === fetchKey) return;
    didFetchKey.current = fetchKey;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [appts, avail] = await Promise.all([
          appointmentService.getAll(),
          isExpert ? appointmentService.getAvailability() : Promise.resolve([])
        ]);
        setAppointments(appts || []);
        if (isExpert && avail?.length > 0) {
          setAvailability(DAYS.map(d => avail.find(a => a.dayOfWeek === d.key) ?? { dayOfWeek: d.key, enabled: false, startTime: '09:00', endTime: '18:00', blockedSlots: [] }));
        }
        if (!isExpert) {
          const [exps, chs] = await Promise.all([expertService.getAll(), childService.getAll()]);
          setExperts(exps || []);
          setChildren(chs || []);
          const preferredExpertId = requestedExpertId && exps?.some(e => e.id === requestedExpertId)
            ? requestedExpertId
            : exps?.[0]?.id;
          if (preferredExpertId) {
            setBookExpertId(preferredExpertId);
            if (preferredExpertId === requestedExpertId) setShowBookModal(true);
          }
          if (chs?.length) setBookChildId(chs[0].id);
        }
      } catch { toast.error('Veriler yüklenirken bir hata oluştu.'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [isExpert, requestedExpertId]);

  const loadAvailableSlots = useCallback(async (expertId: string, date: string, duration?: number) => {
    if (!expertId || !date) return;
    try {
      setLoadingSlots(true);
      const [avail, booked] = await Promise.all([
        appointmentService.getExpertAvailability(expertId),
        appointmentService.getExpertBookedTimes(expertId, date, duration)
      ]);
       
      setExpertAvailability(avail || []);
       
      setBookedTimes(booked || []);
       
      setBookTime('');
    } catch { toast.error('Uzmanın müsait saatleri yüklenemedi.'); }
    finally { setLoadingSlots(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isExpert && bookExpertId && selectedDate) loadAvailableSlots(bookExpertId, selectedDate, bookDuration);
  }, [bookExpertId, selectedDate, bookDuration, isExpert, loadAvailableSlots]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!bookExpertId) { setSelectedExpertProfile(null); return; }
    const fromList = experts.find(e => e.id === bookExpertId);
     
    if (fromList) { setSelectedExpertProfile(fromList); return; }
    expertService.getOne(bookExpertId).then(data => setSelectedExpertProfile(data.expert)).catch(() => {});
  }, [bookExpertId, experts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookingCalendarMonth(new Date(selectedDate + 'T12:00:00'));
  }, [selectedDate]);

  useEffect(() => {
    if (!rescheduleTarget || !rescheduleDate) return;
    let cancelled = false;

    const loadRescheduleSlots = async () => {
      try {
        setRescheduleLoadingSlots(true);
        const [avail, booked] = await Promise.all([
          appointmentService.getExpertAvailability(rescheduleTarget.expertId),
          appointmentService.getExpertBookedTimes(rescheduleTarget.expertId, rescheduleDate, rescheduleDuration),
        ]);
        if (cancelled) return;
        setRescheduleAvailability(avail || []);
        setRescheduleBookedTimes(booked || []);
        if (rescheduleTime) {
          const isoDow = jsDateToIsoDow(new Date(rescheduleDate + 'T00:00:00'));
          const dayAvail = (avail || []).find(a => a.dayOfWeek === isoDow);
          const startTime = dayAvail?.startTime?.slice(0, 5);
          const endTime = dayAvail?.endTime?.slice(0, 5);
          const isInsideWorkHours = dayAvail?.enabled && dayAvail.startTime && dayAvail.endTime
            && startTime && endTime
            && rescheduleTime >= startTime
            && rescheduleTime <= endTime;
          const isBookedByAnother = (booked || []).includes(rescheduleTime)
            && !(rescheduleDate === normalizeDateInputValue(rescheduleTarget.date) && rescheduleTime === rescheduleTarget.time.slice(0, 5));

          const nowMinutes = rescheduleDate === toDateInputValue(new Date()) ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
          const [h, m] = rescheduleTime.split(':').map(Number);
          const isPastTime = nowMinutes >= 0 && (h * 60 + m <= nowMinutes);
          const isOriginal = rescheduleDate === normalizeDateInputValue(rescheduleTarget.date) && rescheduleTime === rescheduleTarget.time.slice(0, 5);

          if (!isInsideWorkHours || isBookedByAnother || (isPastTime && !isOriginal)) setRescheduleTime('');
        }
      } catch (error: unknown) {
        if (!cancelled) toast.error((error as { message?: string })?.message || 'Müsait saatler yüklenemedi.');
      } finally {
        if (!cancelled) setRescheduleLoadingSlots(false);
      }
    };

    loadRescheduleSlots();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleTarget?.id, rescheduleDate, rescheduleDuration]);

  const todayStr = toDateInputValue(new Date());

  const availableSlots = useMemo(() => {
    if (!selectedDate || !expertAvailability.length) return [];
    const isoDow = jsDateToIsoDow(new Date(selectedDate + 'T00:00:00'));
    const dayAvail = expertAvailability.find(a => a.dayOfWeek === isoDow);
    if (!dayAvail?.enabled || !dayAvail.startTime || !dayAvail.endTime) return [];
    const now = new Date();
    const nowMinutes = selectedDate === todayStr ? now.getHours() * 60 + now.getMinutes() : -1;
    return generateTimeSlots(dayAvail.startTime, dayAvail.endTime, bookDuration)
      .filter(slotTime => {
        const isBlocked = isBlockedSlotForDate(dayAvail.blockedSlots, selectedDate, slotTime);
        if (isBlocked || bookedTimes.includes(slotTime)) return false;
        if (nowMinutes >= 0) {
          const [h, m] = slotTime.split(':').map(Number);
          if (h * 60 + m <= nowMinutes) return false;
        }
        return true;
      });
  }, [selectedDate, expertAvailability, bookedTimes, bookDuration, todayStr]);

  const expertWorksOnSelectedDay = useMemo(() => {
    if (!selectedDate || !expertAvailability.length) return null;
    const isoDow = jsDateToIsoDow(new Date(selectedDate + 'T00:00:00'));
    return expertAvailability.find(a => a.dayOfWeek === isoDow)?.enabled ?? false;
  }, [selectedDate, expertAvailability]);

  const rescheduleSlots = useMemo(() => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleAvailability.length) return [];
    const isoDow = jsDateToIsoDow(new Date(rescheduleDate + 'T00:00:00'));
    const dayAvail = rescheduleAvailability.find(a => a.dayOfWeek === isoDow);
    if (!dayAvail?.enabled || !dayAvail.startTime || !dayAvail.endTime) return [];

    const originalDate = normalizeDateInputValue(rescheduleTarget.date);
    const originalTime = rescheduleTarget.time.slice(0, 5);
    const now = new Date();
    const nowMinutes = rescheduleDate === todayStr ? now.getHours() * 60 + now.getMinutes() : -1;

    return generateTimeSlots(dayAvail.startTime, dayAvail.endTime, rescheduleDuration)
      .filter(slot => {
        if (rescheduleDate === originalDate && slot === originalTime) return true;
        
        const isBlocked = isBlockedSlotForDate(dayAvail.blockedSlots, rescheduleDate, slot);
        if (isBlocked) return false;
        
        if (rescheduleBookedTimes.includes(slot)) return false;
        
        if (nowMinutes < 0) return true;
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > nowMinutes;
      });
  }, [rescheduleTarget, rescheduleDate, rescheduleAvailability, rescheduleBookedTimes, rescheduleDuration, todayStr]);

  const rescheduleExpertWorksOnDay = useMemo(() => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleAvailability.length) return null;
    const isoDow = jsDateToIsoDow(new Date(rescheduleDate + 'T00:00:00'));
    return rescheduleAvailability.find(a => a.dayOfWeek === isoDow)?.enabled ?? false;
  }, [rescheduleTarget, rescheduleDate, rescheduleAvailability]);

  // İstatistikler
  const stats = useMemo(() => {
    const todayStr = toDateInputValue(new Date());
    const weekStart = new Date();
    const dayOfWeek = jsDateToIsoDow(weekStart);
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
    const weekStr = toDateInputValue(weekStart);
    const monthStr = todayStr.slice(0, 7);
    return {
      today:     appointments.filter(a => a.date === todayStr && a.status !== 'CANCELLED' && a.status !== 'BLOCKED').length,
      week:      appointments.filter(a => a.date >= weekStr && a.status !== 'CANCELLED' && a.status !== 'BLOCKED').length,
      month:     appointments.filter(a => a.date.startsWith(monthStr) && a.status !== 'CANCELLED' && a.status !== 'BLOCKED').length,
      pending:   appointments.filter(a => a.status === 'PENDING').length,
      completed: appointments.filter(a => a.status === 'COMPLETED').length,
      cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
    };
  }, [appointments]);

  // Sıradaki randevu
  const nextAppointment = useMemo(() => {
    const todayStr = toDateInputValue(new Date());
    return [...appointments]
      .filter(a => a.date >= todayStr && a.status !== 'CANCELLED' && a.status !== 'BLOCKED')
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0] ?? null;
  }, [appointments]);

  const filteredAllAppointments = useMemo(() => {
    let list = appointments
      .filter(a => a.status !== 'BLOCKED')
      .sort((a, b) =>
        new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()
      );
    if (filterStatus !== 'ALL') list = list.filter(a => a.status === filterStatus);
    if (apptSearch.trim()) {
      const q = normalizeTR(apptSearch);
      list = list.filter(a =>
        normalizeTR(a.parentName).includes(q) ||
        normalizeTR(a.childName ?? '').includes(q) ||
        normalizeTR(a.expertName ?? '').includes(q)
      );
    }
    return list;
  }, [appointments, filterStatus, apptSearch]);

  const selectedDateForDisplay = new Date(selectedDate + 'T12:00:00');
  const selectedDateWeekday = selectedDateForDisplay.toLocaleDateString('tr-TR', { weekday: 'long' });
  const bookingCalendarYear = bookingCalendarMonth.getFullYear();
  const bookingCalendarMonthIndex = bookingCalendarMonth.getMonth();
  const bookingCalendarTitle = bookingCalendarMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const bookingCalendarFirstDay = (new Date(bookingCalendarYear, bookingCalendarMonthIndex, 1).getDay() + 6) % 7;
  const bookingCalendarDaysInMonth = new Date(bookingCalendarYear, bookingCalendarMonthIndex + 1, 0).getDate();
  const bookingCalendarCells = Array.from({ length: bookingCalendarFirstDay + bookingCalendarDaysInMonth }, (_, index) => {
    if (index < bookingCalendarFirstDay) return null;
    const day = index - bookingCalendarFirstDay + 1;
    const date = new Date(bookingCalendarYear, bookingCalendarMonthIndex, day);
    return { day, dateStr: toDateInputValue(date) };
  });
  const isBookingCalendarAtCurrentMonth = bookingCalendarYear === new Date().getFullYear() && bookingCalendarMonthIndex === new Date().getMonth();
  const quickDateOptions = Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const dateStr = toDateInputValue(date);
    return {
      dateStr,
      label: index === 0 ? 'Bugün' : index === 1 ? 'Yarın' : date.toLocaleDateString('tr-TR', { weekday: 'short' }),
      day: date.toLocaleDateString('tr-TR', { day: '2-digit' }),
    };
  });
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const selectedDateObj = new Date(selectedDate + 'T12:00:00');
  const weekStartDate = new Date(selectedDateObj);
  weekStartDate.setDate(selectedDateObj.getDate() - jsDateToIsoDow(selectedDateObj) + 1);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + index);
    const dateStr = date.toISOString().split('T')[0];
    return { date, dateStr, label: DAYS[index].label };
  });
  const weekHours = Array.from({ length: 11 }, (_, index) => `${String(8 + index).padStart(2, '0')}:00`);

  // Actions
  const handleConfirm = async (id: string) => {
    try {
      await appointmentService.confirm(id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CONFIRMED' } : a));
      setDetailAppointment(prev => prev?.id === id ? { ...prev, status: 'CONFIRMED' } : prev);
      toast.success('Randevu onaylandı!');
    } catch { toast.error('Onaylama başarısız.'); }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await appointmentService.cancel(id, cancelReason);
      setAppointments(prev => prev.map(a => a.id === id ? updated : a));
      setDetailAppointment(prev => prev?.id === id ? updated : prev);
      toast.success('Randevu iptal edildi.');
    } catch { toast.error('İptal başarısız.'); }
    setCancelId(null);
    setCancelReason('');
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await appointmentService.complete(id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'COMPLETED' } : a));
      setDetailAppointment(prev => prev?.id === id ? { ...prev, status: 'COMPLETED' } : prev);
      toast.success('Randevu tamamlandı olarak işaretlendi!');
    } catch { toast.error('İşaretleme başarısız.'); }
    setCompletingId(null);
  };

  const openReschedule = (appt: AppointmentRecord) => {
    setRescheduleTarget(appt);
    setRescheduleDate(normalizeDateInputValue(appt.date));
    setRescheduleTime(appt.time.slice(0, 5));
    setRescheduleDuration(appt.duration || 50);
    setRescheduleAvailability([]);
    setRescheduleBookedTimes([]);
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    if (rescheduleExpertWorksOnDay === false) {
      toast.error('Uzman seçilen gün çalışmıyor.');
      return;
    }
    if (rescheduleSlots.length > 0 && !rescheduleSlots.includes(rescheduleTime)) {
      toast.error('Lütfen listeden müsait bir saat seçin.');
      return;
    }
    try {
      const normalizedDate = normalizeDateInputValue(rescheduleDate);
      const updated = await appointmentService.reschedule(rescheduleTarget.id, {
        date: normalizedDate,
        time: rescheduleTime,
        duration: rescheduleDuration,
      });
      setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      setDetailAppointment(prev => prev?.id === updated.id ? updated : prev);
      setRescheduleTarget(null);
      toast.success('Randevu başarıyla yeniden planlandı.');
    } catch (error: unknown) {
      const msg = (error as Error)?.message;
      toast.error(msg && msg !== 'Network Error' ? msg : 'Yeniden planlama başarısız. Lütfen tekrar deneyin.');
    }
  };

  const openSessionNotes = (appt: AppointmentRecord) => {
    setSessionNotesTarget(appt);
    setSessionNotesText(appt.sessionNotes ?? '');
  };

  const handleSessionNotes = async () => {
    if (!sessionNotesTarget || !sessionNotesText.trim()) return;
    try {
      const updated = await appointmentService.updateSessionNotes(sessionNotesTarget.id, sessionNotesText.trim());
      setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      setSessionNotesTarget(null);
      toast.success('Seans notu kaydedildi.');
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'Seans notu kaydedilemedi.');
    }
  };

  const openEdit = (appt: AppointmentRecord) => {
    setEditTarget(appt);
    setEditNotes(appt.notes ?? '');
    setEditType((appt.type as 'FACE_TO_FACE' | 'ONLINE') ?? 'FACE_TO_FACE');
    setEditMeetingLink(appt.meetingLink ?? '');
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    try {
      const payload: { notes?: string; type?: string; meetingLink?: string } = {
        notes: editNotes,
        type: editType,
      };
      if (isExpert && editType === 'ONLINE') {
        payload.meetingLink = editMeetingLink;
      }
      const updated = await appointmentService.update(editTarget.id, payload);
      setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      setDetailAppointment(prev => prev?.id === updated.id ? updated : prev);
      setEditTarget(null);
      toast.success('Randevu güncellendi.');
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'Güncelleme başarısız.');
    }
  };

  const handleDelete = async (appt: AppointmentRecord) => {
    // Modal ile onay al (window.confirm yerine)
    setDeleteTarget(appt);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await appointmentService.delete(deleteTarget.id);
      setAppointments(prev => prev.filter(a => a.id !== deleteTarget.id));
      if (detailAppointment?.id === deleteTarget.id) setDetailAppointment(null);
      toast.success('Randevu silindi.');
      setDeleteTarget(null);
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'Silme başarısız.');
    } finally {
      setDeletingId(null);
    }
  };

  const saveAvailability = async () => {
    setSavingSchedule(true);
    try {
      await appointmentService.saveAvailability(availability);
      setScheduleIsDirty(false);
      toast.success('Çalışma saatleri güncellendi!');
    } catch { toast.error('Kaydedilemedi.'); }
    finally { setSavingSchedule(false); }
  };

  const handleRate = async () => {
    if (!ratingTarget || ratingValue === 0) return;
    setRatingLoading(true);
    try {
      const updated = await appointmentService.rate(ratingTarget.id, ratingValue, ratingComment);
      setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      setDetailAppointment(prev => prev?.id === updated.id ? updated : prev);
      toast.success('Değerlendirmeniz kaydedildi. Teşekkürler!');
      setRatingTarget(null);
      setRatingValue(0);
      setRatingComment('');
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'Değerlendirme kaydedilemedi.');
    } finally {
      setRatingLoading(false);
    }
  };

  const loadPatients = async () => {
    if (!isExpert) return;
    setLoadingPatients(true);
    try {
      const data = await appointmentService.getPatients();
      setPatients(data);
    } catch { toast.error('Danışan listesi yüklenemedi.'); }
    finally { setLoadingPatients(false); }
  };

  const handleOpenDetail = async (appt: AppointmentRecord) => {
    setDetailAppointment(appt);
    setApptHistory([]);
    setLoadingHistory(true);
    try {
      const history = await appointmentService.getHistory(appt.id);
      setApptHistory(history);
    } catch { /* history is optional — don't toast */ }
    finally { setLoadingHistory(false); }
  };

  const openPatientNotes = async (patient: Record<string, unknown>) => {
    setNotesPatient(patient);
    setLoadingNotes(true);
    setPatientNotes([]);
    try {
      const notes = await patientNoteService.getNotes(String(patient.parentId));
      setPatientNotes(notes);
    } catch { toast.error('Notlar yüklenemedi.'); }
    finally { setLoadingNotes(false); }
  };

  const handleSaveNote = async () => {
    if (!notesPatient || !newNoteContent.trim()) return;
    setSavingNote(true);
    try {
      const note = await patientNoteService.createNote({
        parentId: String(notesPatient.parentId),
        childId: notesPatient.childId ? String(notesPatient.childId) : undefined,
        content: newNoteContent.trim(),
        category: newNoteCategory,
        noteDate: newNoteDate,
      });
      setPatientNotes(prev => [note, ...prev]);
      setNewNoteContent('');
      setNewNoteDate(toDateInputValue(new Date()));
      toast.success('Not kaydedildi.');
    } catch { toast.error('Not kaydedilemedi.'); }
    finally { setSavingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      await patientNoteService.deleteNote(noteId);
      setPatientNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Not silindi.');
    } catch { toast.error('Not silinemedi.'); }
    finally { setDeletingNoteId(null); }
  };

  const handleBook = async () => {
    if (!bookExpertId || !bookChildId) { toast.error('Lütfen uzman ve çocuk seçin.'); return; }
    if (!bookTime) { toast.error('Lütfen bir saat seçin.'); return; }
    setBookingLoading(true);
    try {
      const newAppt = await appointmentService.create({ expertId: bookExpertId, childId: bookChildId, date: selectedDate, time: bookTime, duration: bookDuration, type: bookType, notes: bookNotes, recurrenceWeeks: bookRecurrenceWeeks > 1 ? bookRecurrenceWeeks : undefined });
      setAppointments(prev => [...prev, newAppt]);
      setShowBookModal(false);
      setDatePickerOpen(false);
      setBookTime(''); setBookNotes(''); setBookRecurrenceWeeks(0);
      toast.success(bookRecurrenceWeeks > 1 ? `${bookRecurrenceWeeks} haftalık seri oluşturuldu!` : 'Randevu talebi oluşturuldu!');
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'Randevu oluşturulamadı.');
    } finally { setBookingLoading(false); }
  };

  const handleCancelGroup = async (groupId: string) => {
    try {
      await appointmentService.cancelGroup(groupId);
      const group = await appointmentService.getGroup(groupId);
      setAppointments(prev => prev.map(a => {
        const updated = group.find(g => g.id === a.id);
        return updated ?? a;
      }));
      toast.success('Tekrarlayan seans serisi iptal edildi.');
    } catch { toast.error('Seri iptal edilemedi.'); }
  };

  const toggleSlot = (dayKey: number, slot: string) => {
    setAvailability(prev => prev.map(a => {
      if (a.dayOfWeek !== dayKey) return a;
      const blocked = a.blockedSlots ?? [];
      return { ...a, blockedSlots: blocked.includes(slot) ? blocked.filter(s => s !== slot) : [...blocked, slot] };
    }));
  };

  const [blockingActionLoading, setBlockingActionLoading] = useState<string | null>(null);

  const refreshAvailability = async () => {
    const avail = await appointmentService.getAvailability();
    if (avail?.length > 0) {
      setAvailability(DAYS.map(d => avail.find((a: ExpertAvailability) => a.dayOfWeek === d.key) ?? { dayOfWeek: d.key, enabled: false, startTime: '09:00', endTime: '18:00', blockedSlots: [] }));
    }
  };

  const handleBlockSlot = async (time: string) => {
    setBlockingActionLoading(time);
    const dateKey = `${selectedDate}|${time}`;
    const dow = jsDateToIsoDow(new Date(selectedDate + 'T00:00:00'));
    // Optimistic: anında kapalı göster
    setAvailability(prev => prev.map(a => {
      if (a.dayOfWeek !== dow) return a;
      const blocked = a.blockedSlots ?? [];
      return blocked.includes(dateKey) ? a : { ...a, blockedSlots: [...blocked, dateKey] };
    }));
    let ok = false;
    try {
      await appointmentService.blockSlot(selectedDate, time);
      ok = true;
      toast.success('Saat kapatıldı.');
    } catch {
      toast.error('Saat kapatılamadı.');
      // Rollback
      setAvailability(prev => prev.map(a => {
        if (a.dayOfWeek !== dow) return a;
        return { ...a, blockedSlots: (a.blockedSlots ?? []).filter(s => s !== dateKey) };
      }));
    } finally {
      setBlockingActionLoading(null);
    }
    // Refresh başarılıysa — catch'ten ayrı, rollback tetiklemez
    if (ok) refreshAvailability().catch(() => {});
  };

  const handleUnblockSlot = async (time: string) => {
    setBlockingActionLoading(time);
    const dateKey = `${selectedDate}|${time}`;
    const dow = jsDateToIsoDow(new Date(selectedDate + 'T00:00:00'));
    // Optimistic: anında açık göster (hem date-specific hem weekly block'u kaldır)
    setAvailability(prev => prev.map(a => {
      if (a.dayOfWeek !== dow) return a;
      return { ...a, blockedSlots: (a.blockedSlots ?? []).filter(s => s !== dateKey && s !== time) };
    }));
    let ok = false;
    try {
      await appointmentService.unblockSlot(selectedDate, time);
      ok = true;
      toast.success('Saat açıldı.');
    } catch {
      toast.error('Saat açılamadı.');
      // Rollback
      setAvailability(prev => prev.map(a => {
        if (a.dayOfWeek !== dow) return a;
        const blocked = a.blockedSlots ?? [];
        return blocked.includes(dateKey) ? a : { ...a, blockedSlots: [...blocked, dateKey] };
      }));
    } finally {
      setBlockingActionLoading(null);
    }
    // Refresh başarılıysa — catch'ten ayrı
    if (ok) refreshAvailability().catch(() => {});
  };

  const selectedIsoDow = useMemo(() => {
    if (!selectedDate) return 1;
    return jsDateToIsoDow(new Date(selectedDate + 'T00:00:00'));
  }, [selectedDate]);

  const dayAvailability = useMemo(() => {
    return availability.find(a => a.dayOfWeek === selectedIsoDow);
  }, [availability, selectedIsoDow]);

  const parseTimeToMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const timesOverlap = (startA: string, durationA: number, startB: string, durationB: number): boolean => {
    const aMin = parseTimeToMinutes(startA);
    const bMin = parseTimeToMinutes(startB);
    return aMin < bMin + durationB && aMin + durationA > bMin;
  };

  const dayAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === selectedDate && a.status !== 'CANCELLED' && a.status !== 'BLOCKED')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  // BLOCKED status randevular ayrı tutulur — timeline'da blocked slot gibi gösterilecek
  const dayBlockedAppts = useMemo(() => {
    return appointments
      .filter(a => a.date === selectedDate && a.status === 'BLOCKED')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const selectedDayAppointments = dayAppointments;

  const timelineSlots = useMemo(() => {
    if (!isExpert || !dayAvailability?.enabled || !dayAvailability.startTime || !dayAvailability.endTime) {
      return [];
    }
    const slots = generateTimeSlots(dayAvailability.startTime, dayAvailability.endTime, 50);
    return slots.map(slotTime => {
      const exactAppt = dayAppointments.find(a => a.time.slice(0, 5) === slotTime);
      const overlappingAppt = dayAppointments.find(a =>
        a.time.slice(0, 5) !== slotTime && timesOverlap(slotTime, 50, a.time.slice(0, 5), a.duration || 50)
      );
      const isWeeklyBlocked = dayAvailability.blockedSlots?.includes(slotTime);
      const isDateBlocked = dayAvailability.blockedSlots?.includes(`${selectedDate}|${slotTime}`);
      // BLOCKED status randevu da blocked slot sayılır
      const isBlockedByAppt = dayBlockedAppts.some(a => a.time.slice(0, 5) === slotTime);
      const isBlocked = isWeeklyBlocked || isDateBlocked || isBlockedByAppt;
      return {
        time: slotTime,
        exactAppt,
        overlappingAppt,
        isBlocked,
        isWeeklyBlocked: isWeeklyBlocked || isBlockedByAppt, // BLOCKED randevu da "haftalık" gibi göster
        isBlockedByAppt,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpert, dayAvailability, dayAppointments, dayBlockedAppts, selectedDate]);

  const filterLabels: Record<ApptFilterStatus, string> = {
    ALL: `Tümü (${appointments.filter(a => a.status !== 'BLOCKED').length})`,
    CONFIRMED: `Onaylı (${appointments.filter(a => a.status === 'CONFIRMED').length})`,
    PENDING: `Bekleyen (${stats.pending})`,
    COMPLETED: `Tamamlanan (${stats.completed})`,
    CANCELLED: `İptal (${appointments.filter(a => a.status === 'CANCELLED').length})`,
  };

  return (
    <div className="space-y-6 mx-auto pb-12">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl shadow-indigo-200">
        <div className="absolute top-0 right-0 p-6 opacity-10"><CalendarIcon size={120} /></div>
        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
              <Sun size={18} className="text-amber-300" />
            </div>
            <span className="font-semibold tracking-wider text-indigo-100 text-xs uppercase">Randevu Merkezi</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-3 leading-tight">
            {isExpert ? 'Takviminizi Yönetin' : 'Randevularınızı Planlayın'}
          </h1>

          {/* İstatistik kartları */}
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              {[
                { label: 'Bugün', value: stats.today, icon: CalendarIcon },
                { label: 'Bu Hafta', value: stats.week, icon: TrendingUp },
                { label: 'Bu Ay', value: stats.month, icon: CalendarIcon },
                { label: 'Bekleyen Onay', value: stats.pending, icon: Clock },
                { label: 'Tamamlanan', value: stats.completed, icon: CheckCircle2 },
                { label: 'İptal Edilen', value: stats.cancelled, icon: XCircle },
              ].map(s => {
                const StatIcon = s.icon;
                return (
                  <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-3 flex items-center gap-3">
                    <StatIcon size={18} className="text-indigo-200 shrink-0" />
                    <div>
                      <p className="text-2xl font-black">{s.value}</p>
                      <p className="text-indigo-200 text-[11px] font-medium leading-tight">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sıradaki randevu */}
          {!loading && nextAppointment && (
            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3">
              <Clock size={16} className="text-amber-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-indigo-200 font-medium">Sıradaki Randevu</p>
                <p className="text-sm font-bold text-white truncate">
                  {isExpert ? nextAppointment.parentName : nextAppointment.expertName}
                  {' · '}{nextAppointment.date === todayStr ? 'Bugün' : new Date(nextAppointment.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  {' '}{nextAppointment.time}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${nextAppointment.type === 'ONLINE' ? 'bg-blue-500/30 text-blue-100' : 'bg-emerald-500/30 text-emerald-100'}`}>
                <span className="inline-flex items-center gap-1">
                  {nextAppointment.type === 'ONLINE' ? <Video size={12} /> : <MapPin size={12} />}
                  {nextAppointment.type === 'ONLINE' ? 'Online' : 'Yüz Yüze'}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {isExpert && (
        <div className="flex p-1.5 bg-gray-100 rounded-2xl w-fit">
          {[
            ['appointments', 'Randevu Takvimi'],
            ['patients', 'Danışanlarım'],
            ['schedule', 'Çalışma Saatlerim']
          ].map(([key, label]) => (
            <button key={key} onClick={() => {
                setActiveTab(key as typeof activeTab);
                if (key === 'patients' && patients.length === 0) loadPatients();
              }}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
              {key === 'appointments' && stats.pending > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pending}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'appointments' ? (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Takvim */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="rounded-[24px] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="text-indigo-500" size={18} />
                  {calendarView === 'month'
                    ? currentMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
                    : `${weekDays[0].date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - ${weekDays[6].date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {(['month', 'week'] as CalendarView[]).map(view => (
                      <button key={view} onClick={() => setCalendarView(view)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold ${calendarView === view ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}>
                        {view === 'month' ? 'Aylık' : 'Haftalık'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => calendarView === 'month'
                      ? setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))
                      : setSelectedDate(d => { const nd = new Date(d + 'T12:00:00'); nd.setDate(nd.getDate() - 7); return nd.toISOString().split('T')[0]; })}
                      className="p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer text-gray-600"><ChevronLeft size={16} /></button>
                    <button onClick={() => calendarView === 'month'
                      ? setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))
                      : setSelectedDate(d => { const nd = new Date(d + 'T12:00:00'); nd.setDate(nd.getDate() + 7); return nd.toISOString().split('T')[0]; })}
                      className="p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer text-gray-600"><ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>
              {calendarView === 'month' ? (
                <>
                  <div className="grid grid-cols-7 mb-2">
                    {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => (
                      <div key={d} className="text-center text-[10px] text-gray-400 font-bold uppercase">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const isToday = dateStr === todayStr;
                      const appts = appointments.filter(a => a.date === dateStr && a.status !== 'CANCELLED');
                      const hasPending = appts.some(a => a.status === 'PENDING');
                      const isSelected = selectedDate === dateStr;
                      return (
                        <button key={dayNum} onClick={() => setSelectedDate(dateStr)}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative
                            ${isSelected ? 'bg-indigo-600 text-white shadow-md scale-105'
                              : isToday ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200'
                              : 'hover:bg-gray-100 text-gray-700'}`}>
                          {dayNum}
                          {appts.length > 0 && !isSelected && (
                            <div className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${hasPending ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[520px] grid grid-cols-[52px_repeat(7,1fr)] gap-1">
                    <div />
                    {weekDays.map(day => (
                      <button key={day.dateStr} onClick={() => setSelectedDate(day.dateStr)}
                        className={`rounded-lg py-2 text-center ${selectedDate === day.dateStr ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                        <p className="text-[10px] font-bold">{day.label.slice(0, 2)}</p>
                        <p className="text-xs font-black">{day.date.getDate()}</p>
                      </button>
                    ))}
                    {weekHours.map(hour => (
                      <div key={hour} className="contents">
                        <div className="text-[10px] text-gray-400 font-bold py-2">{hour}</div>
                        {weekDays.map(day => {
                          const items = appointments.filter(a => a.date === day.dateStr && a.time.slice(0, 2) === hour.slice(0, 2) && a.status !== 'CANCELLED');
                          return (
                            <button key={`${day.dateStr}-${hour}`} onClick={() => setSelectedDate(day.dateStr)}
                              className={`min-h-9 rounded-lg border text-[10px] font-bold ${items.length ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-300'}`}>
                              {items.length ? items.length : ''}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Günün randevuları özeti */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[20px] p-4 text-white shadow-lg">
              <p className="text-emerald-100 font-medium text-xs mb-1">
                {selectedDate === todayStr ? 'Bugün' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
              </p>
              <p className="text-3xl font-black">{selectedDayAppointments.length}</p>
              <p className="text-emerald-100 text-xs mt-0.5">randevu</p>
            </div>

            {/* Ebeveyn için randevu al */}
            {!isExpert && (
              <Button className="w-full rounded-2xl shadow-lg shadow-indigo-200" onClick={() => setShowBookModal(true)}>
                <CalendarIcon size={16} className="mr-2" /> Yeni Randevu Al
              </Button>
            )}
          </div>

          {/* Randevu listesi */}
          <div className="lg:col-span-8 space-y-6">
            {/* Bekleyen talepler (uzman için) */}
            {isExpert && stats.pending > 0 && (
              <div>
                <h2 className="text-lg font-extrabold text-amber-600 mb-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  Bekleyen Randevu Talepleri ({stats.pending})
                </h2>
                <div className="space-y-3">
                  {appointments.filter(a => a.status === 'PENDING').map(appt => (
                    <div key={appt.id} className="relative bg-amber-50 border border-amber-200 rounded-[20px] p-4 shadow-sm">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-[20px]" />
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ml-2">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-white text-amber-700 flex flex-col items-center justify-center shrink-0 border border-amber-100 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(appt.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                            <span className="text-lg font-black leading-none mt-0.5">{appt.time.slice(0, 5)}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900">{appt.parentName}</h3>
                              <Badge variant="warning">Yeni Talep</Badge>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${appt.type === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {appt.type === 'ONLINE' ? <Video size={11} /> : <MapPin size={11} />}
                                {appt.type === 'ONLINE' ? 'Online' : 'Yüz Yüze'}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm flex items-center gap-1.5">
                              <GraduationCap size={14} className="text-amber-500" /> {appt.childName}
                            </p>
                            {appt.notes && (
                              <p className="mt-2 text-sm text-gray-700 bg-white p-2.5 rounded-xl border border-amber-100 italic">"{appt.notes}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => setCancelId(appt.id)} className="border-red-200 text-red-600 hover:bg-red-50">
                            <XCircle size={14} className="mr-1" /> Reddet
                          </Button>
                          <Button size="sm" onClick={() => handleConfirm(appt.id)} className="bg-emerald-500 hover:bg-emerald-600">
                            <CheckCircle size={14} className="mr-1" /> Onayla
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seçilen gün */}
            <div>
              {/* Başlık + özet + toplu aksiyon */}
              {(() => {
                const booked  = timelineSlots.filter(s => s.exactAppt).length;
                const blocked = timelineSlots.filter(s => !s.exactAppt && !s.overlappingAppt && s.isBlocked).length;
                const free    = timelineSlots.filter(s => !s.exactAppt && !s.overlappingAppt && !s.isBlocked).length;
                const total   = booked + blocked + free;
                const utilPct = total > 0 ? Math.round((booked / total) * 100) : 0;
                return (
                  <div className="mb-4 rounded-[24px] border border-slate-100 bg-white px-5 pt-4 pb-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                          <CalendarIcon size={19} />
                        </span>
                        <div>
                          <h2 className="text-lg font-black text-slate-900">
                            {selectedDate === todayStr ? 'Bugün' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} Programı
                          </h2>
                          <p className="mt-0.5 text-[11px] font-semibold capitalize text-slate-400">
                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {isExpert && dayAvailability?.enabled && timelineSlots.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {booked > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{booked} randevu</span>}
                          {blocked > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-black text-red-600">{blocked} kapalı</span>}
                          {free > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{free} açık</span>}
                        </div>
                      )}
                    </div>
                    {/* Doluluk barı + toplu aksiyon */}
                    {isExpert && dayAvailability?.enabled && timelineSlots.length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                            <span>Doluluk</span>
                            <span>%{utilPct}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${utilPct}%` }} />
                          </div>
                        </div>
                        {free > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const freeSlots = timelineSlots.filter(s => !s.exactAppt && !s.overlappingAppt && !s.isBlocked);
                              for (const s of freeSlots) { await handleBlockSlot(s.time); }
                            }}
                            className="shrink-0 text-[11px] font-black text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Lock size={11} /> Hepsini Kapat
                          </button>
                        )}
                        {blocked > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const blockedSlotTimes = timelineSlots.filter(s => !s.exactAppt && !s.overlappingAppt && s.isBlocked);
                              for (const s of blockedSlotTimes) { await handleUnblockSlot(s.time); }
                            }}
                            className="shrink-0 text-[11px] font-black text-slate-500 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 bg-white hover:bg-emerald-50 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Unlock size={11} /> Hepsini Aç
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {isExpert ? (
                !dayAvailability?.enabled ? (
                  <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[20px]">
                    <CalendarIcon size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Bu gün çalışma planınızda kapalı.</p>
                    <p className="text-xs text-gray-400 mt-1">"Çalışma Saatlerim" sekmesinden bu günü etkinleştirebilirsiniz.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-lg shadow-slate-100">
                    {timelineSlots.map((slot, idx) => {
                      const hour = parseInt(slot.time.split(':')[0], 10);
                      const periodLabel = hour < 12 ? 'Sabah' : hour < 17 ? 'Öğleden Sonra' : 'Akşam';
                      const periodIcon = hour < 12 ? <Sun size={11} /> : hour < 17 ? <Coffee size={11} /> : <Sunset size={11} />;
                      const prevHour = idx > 0 ? parseInt(timelineSlots[idx - 1].time.split(':')[0], 10) : -1;
                      const prevPeriod = prevHour < 12 ? 'Sabah' : prevHour < 17 ? 'Öğleden Sonra' : 'Akşam';
                      const showPeriodHeader = idx === 0 || periodLabel !== prevPeriod;

                      const isLoading = blockingActionLoading === slot.time;

                      return (
                        <div key={slot.time}>
                          {/* Zaman grubu başlığı */}
                          {showPeriodHeader && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                              <span className="text-slate-400">{periodIcon}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{periodLabel}</span>
                            </div>
                          )}

                          {/* Randevusu olan slot */}
                          {slot.exactAppt && (
                            <div className="flex gap-0 items-stretch border-b border-slate-100 last:border-b-0">
                              <div className="w-1 shrink-0 bg-indigo-400 rounded-l" />
                              <div className="flex gap-3 items-start px-4 py-3 flex-1">
                                <span className="text-xs font-bold text-slate-400 w-10 shrink-0 pt-1">{slot.time}</span>
                                <div className="flex-1 min-w-0">
                                  <AppointmentCard
                                    appt={slot.exactAppt}
                                    isExpert={isExpert}
                                    completingId={completingId}
                                    onConfirm={handleConfirm}
                                    onCancel={id => setCancelId(id)}
                                    onComplete={handleComplete}
                                    onDetails={handleOpenDetail}
                                    onReschedule={openReschedule}
                                    onSessionNotes={openSessionNotes}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onRate={appt => { setRatingTarget(appt); setRatingValue(0); setRatingComment(''); }}
                                    onCancelGroup={handleCancelGroup}
                                    deletingId={deletingId}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Devam eden randevu — kompakt */}
                          {!slot.exactAppt && slot.overlappingAppt && (
                            <div className="flex items-center gap-0 border-b border-slate-50 last:border-b-0">
                              <div className="w-1 shrink-0 bg-indigo-100 rounded-l" />
                              <div className="flex items-center gap-2 px-5 py-1.5 flex-1">
                                <span className="text-[10px] font-bold text-slate-300 w-10 shrink-0">{slot.time}</span>
                                <div className="w-3 h-0.5 bg-indigo-200 shrink-0 rounded-full" />
                                <span className="text-[10px] text-slate-300 italic">{slot.overlappingAppt.time.slice(0, 5)} seansı devam ediyor</span>
                              </div>
                            </div>
                          )}

                          {/* Kapalı slot */}
                          {!slot.exactAppt && !slot.overlappingAppt && slot.isBlocked && (
                            <div className="flex items-center gap-0 border-b border-slate-100 last:border-b-0 group">
                              <div className="w-1 shrink-0 bg-rose-300 rounded-l" />
                              <div className="flex items-center gap-3 px-5 py-3 flex-1">
                                <span className="text-xs font-bold text-slate-400 w-10 shrink-0">{slot.time}</span>
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-500">
                                  <Lock size={13} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-rose-700">Kapalı</p>
                                  <p className="text-[10px] text-slate-400">
                                    {slot.isBlockedByAppt ? 'Sistem tarafından kapatıldı' : slot.isWeeklyBlocked ? 'Haftalık plandan kapalı' : 'Bugüne özel kapatıldı'}
                                  </p>
                                </div>
                                {!slot.isBlockedByAppt && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnblockSlot(slot.time)}
                                    disabled={isLoading}
                                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer shrink-0 transition-colors"
                                  >
                                    {isLoading ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
                                    Aç
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Açık slot */}
                          {!slot.exactAppt && !slot.overlappingAppt && !slot.isBlocked && (
                            <div className="flex items-center gap-0 border-b border-slate-100 last:border-b-0 group hover:bg-slate-50/50 transition-colors">
                              <div className="w-1 shrink-0 bg-emerald-200 rounded-l" />
                              <div className="flex items-center gap-3 px-5 py-3 flex-1">
                                <span className="text-xs font-bold text-slate-400 w-10 shrink-0">{slot.time}</span>
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                  <CheckCircle2 size={13} />
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-emerald-700">Açık</p>
                                  <p className="text-[10px] text-slate-400">Randevu alınabilir</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleBlockSlot(slot.time)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 cursor-pointer shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  {isLoading ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />}
                                  Kapat
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                selectedDayAppointments.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[20px]">
                    <CalendarIcon size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Bu tarih için randevu yok.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayAppointments.map(appt => (
                      <AppointmentCard
                        key={appt.id}
                        appt={appt}
                        isExpert={isExpert}
                        completingId={completingId}
                        onConfirm={handleConfirm}
                        onCancel={id => setCancelId(id)}
                        onComplete={handleComplete}
                        onDetails={handleOpenDetail}
                        onReschedule={openReschedule}
                        onSessionNotes={openSessionNotes}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onRate={appt => { setRatingTarget(appt); setRatingValue(0); setRatingComment(''); }}
                        deletingId={deletingId}
                      />
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Tüm randevular */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Tüm Randevularım</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Geçmiş, gelecek ve tüm durumlar</p>
                </div>
              </div>

              {/* Arama + filtre */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={apptSearch}
                    onChange={e => setApptSearch(e.target.value)}
                    placeholder="İsim veya danışan ara..."
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {apptSearch && (
                    <button onClick={() => setApptSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer">
                      <X size={13} className="text-gray-400" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
                  {(['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'] as ApptFilterStatus[]).map(f => (
                    <button key={f} onClick={() => setFilterStatus(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterStatus === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredAllAppointments.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-[20px]">
                    <CalendarIcon size={28} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {apptSearch ? `"${apptSearch}" için sonuç yok.` : 'Gösterilecek randevu yok.'}
                    </p>
                  </div>
                ) : (
                  filteredAllAppointments.map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      isExpert={isExpert}
                      completingId={completingId}
                      compact
                      onConfirm={handleConfirm}
                      onCancel={id => setCancelId(id)}
                      onComplete={handleComplete}
                      onDetails={handleOpenDetail}
                      onReschedule={openReschedule}
                      onSessionNotes={openSessionNotes}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onRate={appt => { setRatingTarget(appt); setRatingValue(0); setRatingComment(''); }}
                      deletingId={deletingId}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'patients' ? (
        /* Danışanlarım Paneli */
        <div className="bg-white border border-gray-100 shadow-sm rounded-[24px] p-6">
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h2 className="text-2xl font-extrabold text-gray-900">Danışanlarım</h2>
            <p className="text-gray-500 mt-1 text-sm">Bugüne kadar randevu aldığınız danışanların özeti.</p>
          </div>
          {loadingPatients ? (
            <div className="py-12 flex justify-center"><Loader2 size={32} className="animate-spin text-indigo-600" /></div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Henüz bir danışan kaydınız bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {patients.map((p, i) => {
                const childNameStr = String(p.childName && p.childName !== '-' ? p.childName : p.parentName);
                const parentNameStr = String(p.parentName);
                const initial = childNameStr.charAt(0).toUpperCase();
                const hasRating = p.avgRating != null && !isNaN(Number(p.avgRating)) && Number(p.avgRating) > 0;

                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`${childNameStr} danışan sayfasını aç`}
                    onClick={() => openPatientPage(p)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPatientPage(p);
                      }
                    }}
                    className="group relative bg-white border border-slate-200 rounded-[20px] p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    {/* Decorative accent */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 flex items-center justify-center font-black text-2xl shadow-inner border border-indigo-100/50 shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-slate-900 truncate text-base">{childNameStr}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <Users size={12} className="text-indigo-400 shrink-0" />
                          <span className="truncate">Ebeveyn: <span className="font-medium text-slate-700">{parentNameStr}</span></span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Toplam</p>
                        <p className="font-black text-slate-800 flex items-center gap-1.5">
                          <CalendarIcon size={14} className="text-slate-400" />
                          {Number(p.totalAppointments)}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <p className="text-[10px] uppercase font-bold text-emerald-600/70 mb-1">Tamamlanan</p>
                        <p className="font-black text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          {Number(p.completedAppointments)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Son Görüşme</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          {p.lastAppointmentDate ? new Date(String(p.lastAppointmentDate)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Değerlendirme</p>
                        {hasRating ? (
                          <p className="text-sm font-black text-amber-500 flex items-center justify-end gap-1 mt-0.5">
                            <Star size={14} className="fill-amber-500" />
                            {Number(p.avgRating).toFixed(1)}
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-slate-400 mt-0.5 italic">Henüz yok</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={e => { e.stopPropagation(); openPatientNotes(p); }}
                      className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl py-2 transition-colors border border-indigo-100"
                    >
                      <NotebookPen size={13} /> Klinik Notlar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Çalışma Saatlerim */
        <div className="bg-white border border-gray-100 shadow-sm rounded-[24px] p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Müsaitlik Planı</h2>
              <p className="text-gray-500 mt-1 text-sm">Hangi günlerde ve saat aralıklarında randevu kabul edeceğinizi ayarlayın.</p>
            </div>
            <div className="flex items-center gap-3">
              {scheduleIsDirty && (
                <span className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse flex items-center gap-1.5">
                  <AlertCircle size={14} /> Kaydedilmemiş Değişiklikler
                </span>
              )}
              <Button onClick={() => {
                saveAvailability();
                setScheduleIsDirty(false);
              }} loading={savingSchedule} disabled={!scheduleIsDirty} className="rounded-xl px-6 shadow-lg shadow-indigo-200">
                <Check size={16} className="mr-2" /> Değişiklikleri Kaydet
              </Button>
            </div>
          </div>
          <div className="grid gap-3">
            {availability.map(day => {
              const dayName = DAYS.find(d => d.key === day.dayOfWeek)?.label;
              const daySlots = day.enabled && day.startTime && day.endTime
                ? generateTimeSlots(day.startTime, day.endTime)
                : [];
              return (
                <div key={day.dayOfWeek} className={`flex flex-col xl:flex-row xl:items-center gap-4 p-4 rounded-2xl border transition-all ${day.enabled ? 'bg-white border-indigo-100 shadow-sm' : 'bg-gray-50 border-transparent opacity-60'}`}>
                  <label className="flex items-center gap-3 w-36 cursor-pointer shrink-0">
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${day.enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${day.enabled ? 'left-6' : 'left-1'}`} />
                    </div>
                    <input type="checkbox" className="hidden" checked={day.enabled}
                      onChange={e => {
                        setAvailability(prev => prev.map(a => a.dayOfWeek === day.dayOfWeek ? { ...a, enabled: e.target.checked } : a));
                        setScheduleIsDirty(true);
                      }} />
                    <span className={`font-extrabold ${day.enabled ? 'text-slate-900' : 'text-slate-400'}`}>{dayName}</span>
                  </label>
                  {day.enabled ? (
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 flex-1">
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-[14px] border border-slate-200 shadow-inner">
                        <Clock size={16} className="text-indigo-500" />
                        <input type="time" value={day.startTime ?? '09:00'} onChange={e => {
                          setAvailability(prev => prev.map(a => a.dayOfWeek === day.dayOfWeek ? { ...a, startTime: e.target.value } : a));
                          setScheduleIsDirty(true);
                        }} className="bg-transparent font-bold text-slate-700 outline-none w-[75px] text-sm focus:text-indigo-600 transition-colors" />
                        <span className="text-slate-300 font-black">–</span>
                        <input type="time" value={day.endTime ?? '18:00'} onChange={e => {
                          setAvailability(prev => prev.map(a => a.dayOfWeek === day.dayOfWeek ? { ...a, endTime: e.target.value } : a));
                          setScheduleIsDirty(true);
                        }} className="bg-transparent font-bold text-slate-700 outline-none w-[75px] text-sm focus:text-indigo-600 transition-colors" />
                      </div>
                      <div className="flex flex-wrap gap-2 flex-1">
                        {daySlots.map(slot => {
                          const isBlocked = day.blockedSlots?.includes(slot);
                          return (
                            <button key={slot} onClick={() => { toggleSlot(day.dayOfWeek, slot); setScheduleIsDirty(true); }}
                              className={`group relative overflow-hidden flex items-center justify-center min-w-[72px] h-9 rounded-xl font-bold text-[13px] transition-all cursor-pointer shadow-sm ${
                                isBlocked 
                                  ? 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                              }`}
                              title={isBlocked ? 'Saati Aç' : 'Saati Kapat (Mola)'}>
                              {isBlocked && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 backdrop-blur-[1px] text-slate-400 opacity-100 group-hover:opacity-0 transition-opacity"><Lock size={14} /></div>}
                              <span className={isBlocked ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}>{slot}</span>
                            </button>
                          );
                        })}
                        {daySlots.length === 0 && (
                          <p className="text-xs text-gray-400 italic">Saat aralığı ayarlayın</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Bu gün randevu kabul edilmiyor.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Randevu Al Modal */}
      <Modal
        isOpen={showBookModal}
        onClose={() => { setShowBookModal(false); setDatePickerOpen(false); }}
        title="Yeni Randevu Talep Et"
        className="max-w-3xl rounded-[28px]"
      >
        <div className="space-y-6 pt-1">
          {(!experts.length || !children.length) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {!children.length
                ? 'Randevu oluşturmak için önce çocuk profili eklemelisiniz.'
                : 'Randevu oluşturmak için uygun uzman bulunamadı.'}
            </div>
          )}

          <div className="grid gap-5 rounded-[28px] border border-slate-100 bg-slate-50/50 p-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5 ml-1">Uzman</label>
              <div className="relative">
                <select className="h-[56px] w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white pl-12 pr-10 text-sm font-bold text-slate-900 shadow-sm outline-none transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 cursor-pointer"
                  value={bookExpertId} onChange={e => setBookExpertId(e.target.value)}>
                  <option value="">Seçim yapınız...</option>
                  {experts.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.expertTitle || 'Uzman'})</option>)}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
                  <GraduationCap size={20} />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5 ml-1">Çocuğunuz</label>
              <div className="relative">
                <select className="h-[56px] w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white pl-12 pr-10 text-sm font-bold text-slate-900 shadow-sm outline-none transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 cursor-pointer"
                  value={bookChildId} onChange={e => setBookChildId(e.target.value)}>
                  <option value="">Seçim yapınız...</option>
                  {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
                  <Users size={20} />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Uzman Profil Kartı */}
          {selectedExpertProfile && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 p-4 flex items-start gap-4">
              {selectedExpertProfile.profileImageUrl ? (
                <img src={selectedExpertProfile.profileImageUrl} alt={selectedExpertProfile.fullName} className="w-14 h-14 rounded-2xl object-cover shrink-0 border-2 border-white shadow" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-black shrink-0 border-2 border-white shadow">
                  {selectedExpertProfile.fullName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-extrabold text-gray-900">{selectedExpertProfile.fullName}</p>
                  {selectedExpertProfile.verified && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> Onaylı
                    </span>
                  )}
                </div>
                <p className="text-sm text-indigo-600 font-semibold">{selectedExpertProfile.expertTitle}</p>
                {selectedExpertProfile.city && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {selectedExpertProfile.city}{selectedExpertProfile.institution ? ` · ${selectedExpertProfile.institution}` : ''}</p>}
                {selectedExpertProfile.avgRating != null && Number(selectedExpertProfile.avgRating) > 0 && (
                  <p className="text-xs text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                    <Star size={11} className="fill-amber-500 text-amber-500" /> {Number(selectedExpertProfile.avgRating).toFixed(1)}
                    {selectedExpertProfile.reviewCount != null && <span className="text-gray-400 font-normal">({selectedExpertProfile.reviewCount} değerlendirme)</span>}
                  </p>
                )}
                {selectedExpertProfile.specializations?.length ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedExpertProfile.specializations.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] bg-white border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                ) : null}
                {selectedExpertProfile.bio && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{selectedExpertProfile.bio}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_15rem]">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Seans Türü</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {APPOINTMENT_TYPE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button key={opt.value} type="button" onClick={() => setBookType(opt.value)}
                      className={`flex min-h-20 items-center gap-3 rounded-3xl border px-4 py-3 text-left transition-all cursor-pointer ${bookType === opt.value ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/50'}`}>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${bookType === opt.value ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Icon size={19} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black">{opt.label}</span>
                        <span className={`mt-0.5 block text-xs leading-snug ${bookType === opt.value ? 'text-indigo-100' : 'text-slate-400'}`}>{opt.helper}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Süre</label>
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                {DURATION_OPTIONS.map(duration => (
                  <button key={duration} type="button" onClick={() => { setBookDuration(duration); setBookTime(''); }}
                    className={`h-12 rounded-2xl border text-sm font-black transition-all ${bookDuration === duration ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/50'}`}>
                    {duration} dk
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tarih ve Saat</label>
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-1">
              <div className="grid gap-1 lg:grid-cols-[minmax(0,18rem)_1fr]">

                {/* Sol — Tarih seçici */}
                <div className="rounded-[22px] bg-white p-4 shadow-sm space-y-3">
                  {/* Seçili tarih kartı */}
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(open => !open)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${datePickerOpen ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-100 hover:border-indigo-200 bg-slate-50/60'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 mb-1">Seçili Tarih</p>
                        <p className="text-xl font-black text-slate-900 leading-tight">
                          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-sm font-semibold text-slate-400 capitalize mt-0.5">{selectedDateWeekday}</p>
                      </div>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${datePickerOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        <CalendarIcon size={18} />
                      </span>
                    </div>
                  </button>

                  {/* Takvim */}
                  {datePickerOpen && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={isBookingCalendarAtCurrentMonth}
                          onClick={() => setBookingCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Önceki ay"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <p className="text-sm font-black capitalize text-slate-800">{bookingCalendarTitle}</p>
                        <button
                          type="button"
                          onClick={() => setBookingCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                          aria-label="Sonraki ay"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-extrabold uppercase text-slate-400">
                        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <span key={d} className="py-1">{d}</span>)}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {bookingCalendarCells.map((cell, i) => {
                          if (!cell) return <span key={`e-${i}`} className="h-9" />;
                          const isSelected = cell.dateStr === selectedDate;
                          const isPast = cell.dateStr < todayStr;
                          const isToday = cell.dateStr === todayStr;
                          return (
                            <button
                              key={cell.dateStr}
                              type="button"
                              disabled={isPast}
                              onClick={() => { setSelectedDate(cell.dateStr); setBookTime(''); setDatePickerOpen(false); }}
                              className={`h-9 w-full rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : isPast ? 'cursor-not-allowed text-slate-200' : isToday ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 font-black' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                            >
                              {cell.day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hızlı tarih butonları */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {quickDateOptions.map(option => (
                      <button
                        key={option.dateStr}
                        type="button"
                        onClick={() => { setSelectedDate(option.dateStr); setBookTime(''); setDatePickerOpen(false); }}
                        className={`rounded-2xl border py-2.5 text-center transition-all ${selectedDate === option.dateStr ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600'}`}
                      >
                        <span className="block text-[9px] font-extrabold uppercase tracking-wider leading-tight">{option.label}</span>
                        <span className="mt-0.5 block text-base font-black">{option.day}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sağ — Saat seçici */}
                <div className="rounded-[22px] bg-white p-4 shadow-sm flex flex-col">
                  {/* Başlık */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Clock size={15} />
                      </span>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Müsait Saatler</p>
                        <p className="text-[11px] font-medium text-slate-400">{bookDuration} dakikalık seanslar</p>
                      </div>
                    </div>
                    {bookTime && (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white">
                        <Check size={10} strokeWidth={3.5} />
                        {bookTime}
                      </span>
                    )}
                  </div>

                  {/* İçerik */}
                  <div className="flex-1">
                    {loadingSlots ? (
                      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 text-slate-400">
                        <Loader2 size={18} className="animate-spin text-indigo-500" />
                        <span className="text-xs font-semibold">Yükleniyor...</span>
                      </div>
                    ) : !bookExpertId ? (
                      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 text-slate-400">
                        <AlertCircle size={18} />
                        <span className="text-xs font-semibold text-center">Uzman seçildiğinde<br />müsait saatler görünür</span>
                      </div>
                    ) : expertWorksOnSelectedDay === false ? (
                      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-center transition-all hover:bg-slate-100/60">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-200">
                          <CalendarIcon size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-600">Uzman bu gün çalışmıyor</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">Lütfen farklı bir gün deneyin</p>
                        </div>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-center transition-all hover:bg-slate-100/60">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-200">
                          <Coffee size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-600">Tüm saatler dolu</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">Lütfen farklı bir tarih seçin</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-3 pr-0.5">
                        {[
                          { key: 'sabah',    label: 'Sabah',           dotColor: 'bg-amber-400',  slots: availableSlots.filter(t => parseInt(t.split(':')[0]) < 12) },
                          { key: 'ogleden',  label: 'Öğleden Sonra',  dotColor: 'bg-sky-400',    slots: availableSlots.filter(t => { const h = parseInt(t.split(':')[0]); return h >= 12 && h < 17; }) },
                          { key: 'aksam',    label: 'Akşam',           dotColor: 'bg-indigo-400', slots: availableSlots.filter(t => parseInt(t.split(':')[0]) >= 17) },
                        ].filter(g => g.slots.length > 0).map(group => (
                          <div key={group.key}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${group.dotColor}`} />
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{group.label}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                              {group.slots.map(time => (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => setBookTime(time)}
                                  className={`h-11 rounded-xl border text-sm font-bold transition-all cursor-pointer ${bookTime === time ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'}`}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Tekrarlayan Seans */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Repeat size={16} className="text-indigo-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Tekrarlayan Seans</p>
                  <p className="text-[11px] text-slate-400">Aynı gün/saat her hafta otomatik oluşturulur</p>
                </div>
              </div>
              <div className="flex gap-1.5 items-center">
                {[0, 4, 8, 12].map(w => (
                  <button key={w} type="button" onClick={() => setBookRecurrenceWeeks(w)}
                    className={`h-8 px-3 rounded-xl text-xs font-black border transition-all ${bookRecurrenceWeeks === w ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'}`}>
                    {w === 0 ? 'Tek' : `${w}h`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Uzmana Not (Opsiyonel)</label>
            <textarea rows={2} placeholder="Görüşme nedenini kısaca özetleyin (isteğe bağlı)..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all resize-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              value={bookNotes} onChange={e => setBookNotes(e.target.value)} />
          </div>

          {/* Özet kartı — tüm seçimler tamamlandığında göster */}
          {bookExpertId && bookChildId && bookTime && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/40 px-5 py-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 mb-3">Randevu Özeti</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-xs text-slate-400">Uzman</span><p className="font-semibold text-slate-800 truncate">{experts.find(e => e.id === bookExpertId)?.fullName ?? '—'}</p></div>
                <div><span className="text-xs text-slate-400">Çocuk</span><p className="font-semibold text-slate-800">{children.find(c => c.id === bookChildId)?.name ?? '—'}</p></div>
                <div><span className="text-xs text-slate-400">Tarih & Saat</span><p className="font-semibold text-slate-800">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · {bookTime}</p></div>
                <div><span className="text-xs text-slate-400">Tür & Süre</span><p className="font-semibold text-slate-800">{bookType === 'ONLINE' ? 'Online' : 'Yüz Yüze'} · {bookDuration} dk</p></div>
              </div>
            </div>
          )}

          <Button className="h-14 w-full rounded-2xl text-base font-black shadow-xl shadow-indigo-200" onClick={handleBook}
            loading={bookingLoading} disabled={!bookExpertId || !bookChildId || !bookTime || expertWorksOnSelectedDay === false || bookingLoading}>
            {bookTime ? '✓ Randevu Talep Et' : 'Önce saat seçin'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!detailAppointment} onClose={() => { setDetailAppointment(null); setApptHistory([]); }} title="Randevu Detayı">
        {detailAppointment && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Tarih" value={`${detailAppointment.date} ${detailAppointment.time}`} />
              <Info label="Süre" value={`${detailAppointment.duration || 50} dk`} />
              <Info label="Uzman" value={detailAppointment.expertName} />
              <Info label="Danışan" value={detailAppointment.childName || '-'} />
              <Info label="Durum" value={detailAppointment.status} />
              <Info label="Tür" value={detailAppointment.type === 'ONLINE' ? 'Online' : 'Yüz Yüze'} />
            </div>
            {detailAppointment.notes && <Info label="Randevu Notu" value={detailAppointment.notes} />}
            {detailAppointment.cancellationReason && <Info label="İptal Gerekçesi" value={detailAppointment.cancellationReason} />}
            {detailAppointment.sessionNotes && <Info label="Seans Notu" value={detailAppointment.sessionNotes} />}
            {detailAppointment.rating && <Info label="Değerlendirme Puanı" value={`${detailAppointment.rating} / 5`} />}
            {detailAppointment.ratingComment && <Info label="Değerlendirme Yorumu" value={detailAppointment.ratingComment} />}
            {detailAppointment.meetingLink && (
              <a href={detailAppointment.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 font-bold">
                <Video size={14} /> Görüşmeye Katıl
              </a>
            )}

            {/* Durum Geçmişi */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-3 flex items-center gap-1.5">
                <BookOpen size={11} /> Durum Geçmişi
              </p>
              {loadingHistory ? (
                <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-indigo-400" /></div>
              ) : apptHistory.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Henüz durum değişikliği kaydı yok.</p>
              ) : (
                <div className="relative pl-4 space-y-3">
                  <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gray-200" />
                  {apptHistory.map((h, idx) => {
                    const statusColors: Record<string, string> = {
                      PENDING: 'bg-amber-400', CONFIRMED: 'bg-emerald-500',
                      COMPLETED: 'bg-blue-500', CANCELLED: 'bg-red-400',
                    };
                    const dotColor = statusColors[h.newStatus] ?? 'bg-gray-400';
                    const statusLabels: Record<string, string> = {
                      PENDING: 'Onay Bekliyor', CONFIRMED: 'Onaylandı',
                      COMPLETED: 'Tamamlandı', CANCELLED: 'İptal Edildi',
                    };
                    return (
                      <div key={idx} className="relative flex gap-3 items-start">
                        <div className={`absolute -left-2.5 mt-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-800">{statusLabels[h.newStatus] ?? h.newStatus}</span>
                            {h.oldStatus && (
                              <span className="text-[10px] text-gray-400">({statusLabels[h.oldStatus] ?? h.oldStatus} → {statusLabels[h.newStatus] ?? h.newStatus})</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {h.changedByName} · {new Date(h.changedAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {h.note && <p className="text-xs text-gray-500 mt-1 italic">{h.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Randevuyu Düzenle">
        <div className="space-y-4">
          {isExpert && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Görüşme Türü</label>
              <div className="grid grid-cols-2 gap-3">
                {APPOINTMENT_TYPE_OPTIONS.map(type => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => { setEditType(type.value); if (type.value === 'FACE_TO_FACE') setEditMeetingLink(''); }}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${editType === type.value ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
                    >
                      <TypeIcon size={24} className={editType === type.value ? 'text-indigo-600' : 'text-gray-400'} />
                      <span className="font-bold mt-2 text-sm">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {isExpert && editType === 'ONLINE' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                <Video size={13} className="inline mr-1 text-blue-500" />
                Toplantı Linki
              </label>
              <input
                type="url"
                value={editMeetingLink}
                onChange={e => setEditMeetingLink(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="https://meet.google.com/... veya Zoom linki..."
              />
              <p className="text-[11px] text-gray-400 mt-1">Ebeveyne bildirim gönderilir.</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Randevu Notu</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm min-h-24"
              placeholder="Notunuz..."
            />
          </div>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleEdit}>
            Kaydet
          </Button>
        </div>
      </Modal>


      <Modal isOpen={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)} title="Randevuyu Yeniden Planla">
        <div className="space-y-5">
          {rescheduleTarget && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Mevcut Randevu</p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {rescheduleTarget.expertName} · {new Date(normalizeDateInputValue(rescheduleTarget.date) + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} {rescheduleTarget.time.slice(0, 5)}
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Yeni Tarih</label>
            <input type="date" min={todayStr} value={rescheduleDate} onChange={e => { setRescheduleDate(e.target.value); setRescheduleTime(''); }}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
          </div>

          <div className="flex gap-2">
            {[30, 50, 90].map(duration => (
              <button key={duration} type="button" onClick={() => { setRescheduleDuration(duration); setRescheduleTime(''); }}
                className={`h-11 flex-1 rounded-2xl border text-sm font-black transition-all ${rescheduleDuration === duration ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50'}`}>
                {duration} dk
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Müsait Saatler</p>
                <p className="text-xs font-semibold text-slate-400">Uzmanın çalışma planına göre listelenir</p>
              </div>
              {rescheduleTime && (
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{rescheduleTime}</span>
              )}
            </div>

            {rescheduleLoadingSlots ? (
              <div className="flex min-h-28 items-center justify-center gap-2 rounded-2xl bg-white text-indigo-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-bold">Saatler yükleniyor...</span>
              </div>
            ) : rescheduleExpertWorksOnDay === false ? (
              <div className="flex min-h-28 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-center text-amber-700">
                <AlertCircle size={16} />
                <span className="text-sm font-bold">Uzman bu gün çalışmıyor.</span>
              </div>
            ) : rescheduleSlots.length === 0 ? (
              <div className="flex min-h-28 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-center text-red-600">
                <AlertCircle size={16} />
                <span className="text-sm font-bold">Bu tarih için müsait saat yok.</span>
              </div>
            ) : (
              <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                {rescheduleSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setRescheduleTime(slot)}
                    className={`h-11 rounded-2xl border text-sm font-black transition-all ${rescheduleTime === slot ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button className="w-full" onClick={handleReschedule} disabled={!rescheduleDate || !rescheduleTime}>
            Yeniden Planla
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!sessionNotesTarget} onClose={() => setSessionNotesTarget(null)} title="Seans Notu">
        <div className="space-y-4">
          <textarea value={sessionNotesText} onChange={e => setSessionNotesText(e.target.value)}
            className="w-full min-h-36 border border-gray-200 rounded-xl px-4 py-3 text-sm"
            placeholder="Seans gözlemleri, öneriler ve takip notları..." />
          <Button className="w-full" onClick={handleSessionNotes} disabled={!sessionNotesText.trim()}>
            Notu Kaydet
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!cancelId} onClose={() => { setCancelId(null); setCancelReason(''); }} title="Randevuyu İptal Et">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">İsterseniz karşı tarafa iletilecek kısa bir gerekçe yazın.</p>
          <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
            className="w-full min-h-28 border border-gray-200 rounded-xl px-4 py-3 text-sm"
            placeholder="İptal gerekçesi..." />
          <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => cancelId && handleCancel(cancelId)}>
            Evet, İptal Et
          </Button>
        </div>
      </Modal>

      {/* Silme Onay Modalı */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Randevuyu Sil"
        className="max-w-md rounded-[24px]"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-red-50 border border-red-100 rounded-2xl p-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">
                {deleteTarget && (isExpert ? deleteTarget.parentName : deleteTarget.expertName)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {deleteTarget && `${new Date(deleteTarget.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} — ${deleteTarget.time.slice(0, 5)}`}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Bu randevu <span className="font-bold text-red-600">kalıcı olarak silinecek</span>. Bu işlem geri alınamaz.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Vazgeç
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              loading={!!deletingId}
              onClick={confirmDelete}
            >
              <Trash2 size={14} className="mr-1.5" /> Evet, Sil
            </Button>
          </div>
        </div>
      </Modal>

      {/* Değerlendirme Modalı (Ebeveyn) */}
      <Modal
        isOpen={!!ratingTarget}
        onClose={() => { setRatingTarget(null); setRatingValue(0); setRatingComment(''); }}
        title="Randevuyu Değerlendir"
        className="max-w-md rounded-[24px]"
      >
        {ratingTarget && (
          <div className="space-y-5">
            <div className="text-center bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-sm font-bold text-gray-700">{ratingTarget.expertName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(ratingTarget.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihli seans
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2 text-center">Puanınız</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className="transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      size={36}
                      className={star <= ratingValue ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                    />
                  </button>
                ))}
              </div>
              {ratingValue > 0 && (
                <p className="text-center text-xs text-amber-600 font-bold mt-1">
                  {['', 'Çok Kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'][ratingValue]}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Yorum (İsteğe Bağlı)</label>
              <textarea
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                placeholder="Seans hakkında görüşlerinizi paylaşın..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600"
              disabled={ratingValue === 0}
              loading={ratingLoading}
              onClick={handleRate}
            >
              <Star size={14} className="mr-1.5" /> Değerlendirmeyi Gönder
            </Button>
          </div>
        )}
      </Modal>

      {/* Klinik Notlar Modalı */}
      <Modal
        isOpen={!!notesPatient}
        onClose={() => { setNotesPatient(null); setPatientNotes([]); setNewNoteContent(''); }}
        title="Klinik Notlar"
        className="max-w-2xl rounded-[24px]"
      >
        {notesPatient && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg shrink-0">
                {String(notesPatient.childName && notesPatient.childName !== '-' ? notesPatient.childName : notesPatient.parentName).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-indigo-900 text-sm">
                  {String(notesPatient.childName && notesPatient.childName !== '-' ? notesPatient.childName : notesPatient.parentName)}
                </p>
                <p className="text-xs text-indigo-600">Ebeveyn: {String(notesPatient.parentName)}</p>
              </div>
            </div>

            {/* Yeni not formu */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle size={12} /> Yeni Not Ekle
              </p>
              <div className="flex gap-3">
                <select
                  value={newNoteCategory}
                  onChange={e => setNewNoteCategory(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  <option value="GENERAL">Genel</option>
                  <option value="BEHAVIORAL">Davranışsal</option>
                  <option value="PROGRESS">İlerleme</option>
                  <option value="CONCERN">Endişe</option>
                  <option value="GOAL">Hedef</option>
                </select>
                <input
                  type="date"
                  value={newNoteDate}
                  onChange={e => setNewNoteDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                />
              </div>
              <textarea
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                placeholder="Not içeriği..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
              />
              <Button
                onClick={handleSaveNote}
                loading={savingNote}
                disabled={!newNoteContent.trim()}
                className="w-full rounded-xl"
              >
                <FileText size={14} className="mr-1.5" /> Notu Kaydet
              </Button>
            </div>

            {/* Notlar listesi */}
            {loadingNotes ? (
              <div className="py-6 flex justify-center"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
            ) : patientNotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Bu danışan için henüz not bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {patientNotes.map(note => {
                  const categoryLabels: Record<string, { label: string; color: string }> = {
                    GENERAL:    { label: 'Genel',        color: 'bg-gray-100 text-gray-600' },
                    BEHAVIORAL: { label: 'Davranışsal',  color: 'bg-orange-100 text-orange-600' },
                    PROGRESS:   { label: 'İlerleme',     color: 'bg-emerald-100 text-emerald-700' },
                    CONCERN:    { label: 'Endişe',       color: 'bg-red-100 text-red-600' },
                    GOAL:       { label: 'Hedef',        color: 'bg-indigo-100 text-indigo-700' },
                  };
                  const cat = categoryLabels[note.category] ?? { label: note.category, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={note.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${cat.color}`}>{cat.label}</span>
                          <span className="text-[10px] text-gray-400">{new Date(note.noteDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deletingNoteId === note.id}
                          className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Notu sil"
                        >
                          {deletingNoteId === note.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}


function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
      <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
      <p className="mt-1 text-gray-800 font-semibold whitespace-pre-wrap">{value || '-'}</p>
    </div>
  );
}

// Paylaşılan randevu kartı bileşeni
interface ApptCardProps {
  appt: AppointmentRecord;
  isExpert: boolean;
  completingId: string | null;
  deletingId: string | null;
  compact?: boolean;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  onDetails: (appt: AppointmentRecord) => void;
  onReschedule: (appt: AppointmentRecord) => void;
  onSessionNotes: (appt: AppointmentRecord) => void;
  onEdit: (appt: AppointmentRecord) => void;
  onDelete: (appt: AppointmentRecord) => void;
  onRate?: (appt: AppointmentRecord) => void;
  onCancelGroup?: (groupId: string) => void;
}

function AppointmentCard({ appt, isExpert, completingId, deletingId, compact = false, onConfirm, onCancel, onComplete, onDetails, onReschedule, onSessionNotes, onEdit, onDelete, onRate, onCancelGroup }: ApptCardProps) {
  const statusMeta = {
    PENDING:   { badge: <Badge variant="warning">Onay Bekliyor</Badge>, border: 'border-amber-100', accent: 'bg-amber-400' },
    CONFIRMED: { badge: <Badge variant="success">Onaylandı</Badge>,     border: 'border-emerald-100', accent: 'bg-emerald-400' },
    COMPLETED: { badge: <Badge variant="info">Tamamlandı</Badge>,       border: 'border-blue-100', accent: 'bg-blue-400' },
    CANCELLED: { badge: <Badge variant="danger">İptal Edildi</Badge>,   border: 'border-red-100', accent: 'bg-red-300' },
    BLOCKED:   { badge: <Badge variant="danger">Kapalı</Badge>,         border: 'border-red-100', accent: 'bg-red-300' },
  }[appt.status] ?? { badge: <Badge>{appt.status}</Badge>, border: 'border-gray-100', accent: 'bg-gray-300' };

  const copyMeetingLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (appt.meetingLink) {
      navigator.clipboard.writeText(appt.meetingLink).then(() => {}).catch(() => {});
    }
  };

  return (
    <div onClick={() => onDetails(appt)} className={`group relative bg-white border ${statusMeta.border} hover:border-indigo-200 shadow-sm hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer overflow-hidden`}>
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 h-full w-1 ${statusMeta.accent} rounded-l-2xl`} />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ml-1 w-full">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Tarih/saat kutusu */}
          <div className="w-14 h-16 rounded-xl bg-indigo-50 flex flex-col items-center justify-center shrink-0 border border-indigo-100 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase leading-none">{new Date(appt.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
            <span className="text-base font-black text-indigo-700 leading-none mt-1">{appt.time.slice(0, 5)}</span>
            <span className="text-[10px] font-semibold text-gray-400 leading-none mt-1">{appt.duration}dk</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h4 className={`font-extrabold text-gray-900 truncate max-w-full ${compact ? 'text-sm' : 'text-base'}`}>
                {isExpert ? appt.parentName : appt.expertName}
              </h4>
              {statusMeta.badge}
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${appt.type === 'ONLINE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                {appt.type === 'ONLINE' ? <Video size={11} /> : <MapPin size={11} />}
                {appt.type === 'ONLINE' ? 'Online' : 'Yüz Yüze'}
              </span>
              {/* Rating stars (parent side, completed) */}
              {!isExpert && appt.status === 'COMPLETED' && appt.rating && (
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={10} className={i < appt.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                </span>
              )}
              {/* Session notes badge */}
              {appt.sessionNotes && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold flex items-center gap-1">
                  <BookOpen size={9} /> Not
                </span>
              )}
              {/* Recurring badge */}
              {appt.recurringGroupId && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 font-semibold flex items-center gap-1">
                  <Repeat size={9} /> {appt.recurrenceIndex ? `${appt.recurrenceIndex}. seans` : 'Seri'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
              <Users size={12} className="text-gray-400" />
              {isExpert ? appt.childName : appt.expertTitle}
            </p>

            {/* İptal gerekçesi */}
            {appt.status === 'CANCELLED' && appt.cancellationReason && (
              <p className="mt-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 italic">
                <span className="font-bold not-italic">Gerekçe: </span>{appt.cancellationReason}
              </p>
            )}

            {/* Meeting link — online onaylı randevularda */}
            {appt.type === 'ONLINE' && appt.meetingLink && appt.status === 'CONFIRMED' && (
              <div className="mt-1.5 flex items-center gap-2">
                <a href={appt.meetingLink} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                  <Video size={11} /> Görüşmeye Katıl
                </a>
                <button type="button" onClick={copyMeetingLink}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                  title="Linki Kopyala">
                  <Copy size={11} />
                </button>
              </div>
            )}

            {!compact && appt.notes && (
              <p className="mt-1.5 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 italic">"{appt.notes}"</p>
            )}
          </div>
        </div>

        {/* Aksiyonlar */}
        <div className="flex gap-2 shrink-0 flex-wrap items-center md:justify-end mt-3 md:mt-0" onClick={e => e.stopPropagation()}>
          {isExpert && (
            <>
              {appt.status === 'PENDING' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onCancel(appt.id)} className="border-red-200 text-red-600 hover:bg-red-50 text-xs">
                    Reddet
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onReschedule(appt)} className="text-xs">
                    Yeniden Planla
                  </Button>
                  <Button size="sm" onClick={() => onConfirm(appt.id)} className="bg-emerald-500 hover:bg-emerald-600 text-xs">
                    Onayla
                  </Button>
                </>
              )}
              {appt.status === 'CONFIRMED' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onCancel(appt.id)} className="border-red-200 text-red-600 hover:bg-red-50 text-xs">
                    İptal Et
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onEdit(appt)} className="text-xs">
                    <Pencil size={12} className="mr-1" /> Düzenle
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onReschedule(appt)} className="text-xs">
                    Yeniden Planla
                  </Button>
                  <Button size="sm" onClick={() => onComplete(appt.id)} loading={completingId === appt.id}
                    className="bg-indigo-600 hover:bg-indigo-700 text-xs">
                    <CheckCircle2 size={13} className="mr-1" /> Tamamlandı
                  </Button>
                </>
              )}
              {appt.status === 'COMPLETED' && (
                <>
                  <Button size="sm" onClick={() => onSessionNotes(appt)} className="bg-blue-600 hover:bg-blue-700 text-xs">
                    <ClipboardCheck size={12} className="mr-1" /> Seans Notu
                  </Button>
                </>
              )}
            </>
          )}
          {!isExpert && (
            <>
              {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onEdit(appt)} className="text-xs">
                    <Pencil size={12} className="mr-1" /> Düzenle
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onReschedule(appt)} className="text-xs">
                    Yeniden Planla
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onCancel(appt.id)} className="border-red-200 text-red-600 hover:bg-red-50 text-xs">
                    İptal Et
                  </Button>
                </>
              )}
              {appt.status === 'COMPLETED' && !appt.rating && onRate && (
                <Button size="sm" onClick={() => onRate(appt)} className="bg-amber-500 hover:bg-amber-600 text-xs">
                  <Star size={12} className="mr-1" /> Değerlendir
                </Button>
              )}
            </>
          )}
          {/* Seriyi iptal et */}
          {appt.recurringGroupId && onCancelGroup && (appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
            <button
              type="button"
              onClick={() => onCancelGroup(appt.recurringGroupId!)}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-violet-200 text-violet-600 hover:bg-violet-50 transition-all"
              title="Tüm Seriyi İptal Et"
            >
              <Repeat size={12} /> Seriyi İptal Et
            </button>
          )}
          {/* Sil — tüm statüsler için */}
          <button
            type="button"
            onClick={() => onDelete(appt)}
            disabled={deletingId === appt.id}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-40"
            title="Randevuyu Sil"
          >
            {deletingId === appt.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
