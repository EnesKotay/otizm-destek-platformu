import { useEffect, useRef, useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Baby, BarChart2, Bell, Brain, Calendar, CalendarCheck, CheckCircle, ClipboardList, Clock, FileText, GraduationCap, Heart, MessageCircle, Pill, Search, Settings, ShieldCheck, Sparkles, Target, Timer, TrendingUp, UserPlus, Users, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { GuideTooltip } from '@/components/ui/GuideTooltip';
import { WeeklyTopicWidget } from '@/components/WeeklyTopicWidget';
import { InteractiveOnboardingTour } from '@/components/InteractiveOnboardingTour';
import { SupportSearchBox } from '@/components/community/SupportSearchBox';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { calendarService } from '@/services/calendarService';
import { appointmentService } from '@/services/appointmentService';
import { patientService } from '@/services/patientService';
import { noteService } from '@/services/noteService';
import { messagingService } from '@/services/messagingService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useChildDashboardSnapshot } from '@/hooks/useChildDashboardSnapshot';
import { toast } from '@/store/toastStore';
import { formatDateTime, formatLocalDate } from '@/utils/date';
import { countDueMedicationSlots } from '@/utils/medicationSchedule';
import type { AdminStats, AppointmentRecord, CalendarEvent, ExpertStats, ExpertTask, PatientSummary, Report, ExpertConnectionRequest } from '@/types';
import type { UserRole } from '@/config/roleAccess';

// Fix: parse gerçek adı — "Dr. Kemal Aydın" → "Kemal"
const HONORIFICS = new Set(['Dr.', 'Prof.', 'Av.', 'Doç.', 'Op.', 'Uzm.', 'Yrd.', 'Fzt.']);



function getFirstName(fullName?: string): string {
  if (!fullName) return '';
  const parts = fullName.split(' ').filter(Boolean);
  const name = parts.find(p => !HONORIFICS.has(p)) || parts[0] || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Fix: UTC yerine yerel tarih karşılaştırması
const getLocalDateString = formatLocalDate;



function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}



function getProfileCompleteness(u?: { fullName?: string; bio?: string; expertTitle?: string; profileImageUrl?: string; institution?: string } | null): number {
  if (!u) return 0;
  const checks = [!!u.fullName, !!u.bio, !!u.expertTitle, !!u.profileImageUrl, !!u.institution];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const LEARNING_PATH_FIRST_VIDEO: Record<UserRole, string> = {
  PARENT: '02',
  EXPERT: '16',
  ADMIN: '21',
  TEACHER: '01',
};

const LEARNING_PATH_DESCRIPTION: Record<UserRole, string> = {
  PARENT: 'Çocuk profilini hazırlamaktan günlük takibe ve uzman desteğine kadar yapmanız gerekenleri doğru sırayla görün.',
  EXPERT: 'Danışan yönetimi, randevu planlama, ev çalışmaları ve raporlama adımlarını sırayla öğrenin.',
  ADMIN: 'Yönetim paneli, kullanıcı işlemleri, moderasyon ve sistem denetimi adımlarını sırayla öğrenin.',
  TEACHER: 'Platformun temel bölümlerini kısa videolarla tanıyın ve ihtiyacınız olan alana kolayca ulaşın.',
};

const LEARNING_PATH_DISMISS_KEY_PREFIX = 'dashboard-learning-path-dismissed-v1';
const LEARNING_PATH_WATCHED_KEY_PREFIX = 'otizm-tutorial-videos-watched-v2';

function wasLearningPathDismissed(userId: string, role: UserRole): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(`${LEARNING_PATH_DISMISS_KEY_PREFIX}:${userId}:${role}`) === 'true';
  } catch {
    return false;
  }
}

function wasFirstLearningPathVideoWatched(userId: string, role: UserRole): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const rawValue = window.localStorage.getItem(`${LEARNING_PATH_WATCHED_KEY_PREFIX}:${userId}:${role}`);
    const watchedVideoIds: unknown = JSON.parse(rawValue ?? '[]');
    return Array.isArray(watchedVideoIds) && watchedVideoIds.includes(LEARNING_PATH_FIRST_VIDEO[role]);
  } catch {
    return false;
  }
}

function LearningPathWelcomeCard({ userId, role }: { userId: string; role: UserRole }) {
  const [isHidden, setIsHidden] = useState(
    () => wasLearningPathDismissed(userId, role) || wasFirstLearningPathVideoWatched(userId, role),
  );

  useEffect(() => {
    const syncVisibility = () => {
      if (wasLearningPathDismissed(userId, role) || wasFirstLearningPathVideoWatched(userId, role)) {
        setIsHidden(true);
      }
    };

    window.addEventListener('storage', syncVisibility);
    window.addEventListener('focus', syncVisibility);
    return () => {
      window.removeEventListener('storage', syncVisibility);
      window.removeEventListener('focus', syncVisibility);
    };
  }, [role, userId]);

  if (isHidden) return null;

  const dismissCard = () => {
    setIsHidden(true);
    try {
      window.localStorage.setItem(`${LEARNING_PATH_DISMISS_KEY_PREFIX}:${userId}:${role}`, 'true');
    } catch {
      // Kart, tarayıcı depolamasının kapalı olduğu durumlarda da güvenle kapanır.
    }
  };

  const titleId = `learning-path-card-title-${role.toLocaleLowerCase('tr-TR')}`;

  return (
    <section
      aria-labelledby={titleId}
      className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-100 px-5 py-5 shadow-sm shadow-indigo-900/5 dark:border-indigo-800 dark:bg-indigo-950/60 sm:px-6"
    >
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />

      <button
        type="button"
        onClick={dismissCard}
        aria-label="Öğrenme yolu önerisini kapat"
        className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl text-indigo-400 transition-colors hover:bg-white/60 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-100 dark:hover:bg-white/10 dark:hover:text-indigo-200 dark:focus-visible:ring-offset-indigo-950 sm:right-4 sm:top-4"
      >
        <XCircle size={18} aria-hidden="true" />
      </button>

      <div className="flex flex-col gap-5 pr-12 sm:pr-14 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-indigo-700 ring-1 ring-inset ring-white/80 dark:bg-white/10 dark:text-indigo-200 dark:ring-white/10 sm:flex">
            <GraduationCap size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-200">
              <Sparkles size={12} aria-hidden="true" />
              Size özel video rehberi
            </span>
            <h2 id={titleId} className="mt-1.5 text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-xl">
              Nereden başlayacağınızı bilmiyor musunuz?
            </h2>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
              {LEARNING_PATH_DESCRIPTION[role]}
            </p>
          </div>
        </div>

        <Link
          to="/kullanici-rehberi"
          className="group inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-100 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-indigo-950 sm:w-auto"
        >
          Öğrenme yoluna başla
          <ArrowRight size={17} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

function getEventCountdown(startTime: string): { label: string; timeLabel: string; urgent: boolean } {
  const start = new Date(startTime);
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const eventDateStr = getLocalDateString(start);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);
  const timeLabel = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const diffMs = start.getTime() - now.getTime();
  const isToday = eventDateStr === todayStr;
  const isTomorrow = eventDateStr === tomorrowStr;
  let label: string;
  if (isToday) {
    const diffHours = Math.round(diffMs / 3600000);
    label = diffHours <= 1 ? 'Az kaldı!' : `Bugün · ${timeLabel}`;
  } else if (isTomorrow) {
    label = 'Yarın';
  } else {
    label = `${Math.round(diffMs / 86400000)} gün sonra`;
  }
  return { label, timeLabel, urgent: isToday || isTomorrow };
}

function getTaskPriority(task: ExpertTask): 'high' | 'medium' | 'low' {
  if (!task.dueDate) return 'low';
  const diffDays = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return 'high';
  if (diffDays <= 3) return 'medium';
  return 'low';
}

function getDaysSinceSession(lastSession?: string): number | null {
  if (!lastSession) return null;
  return Math.floor((Date.now() - new Date(lastSession).getTime()) / 86400000);
}

function ProfileRing({ pct }: { pct: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke={pct === 100 ? '#34d399' : '#a78bfa'}
          strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
        />
        <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">
          {pct}%
        </text>
      </svg>
      <span className="text-xs text-indigo-200 font-medium">Profil</span>
    </div>
  );
}

export function ParentDashboard() {
  const { user } = useAuthStore();
  const { children, selectedChild, setChildren, setSelectedChild, addChild } = useChildStore();
  const { subscribe, unsubscribe } = useWebSocket();

  // Onboarding & Wizard States
  const [visitedRoutes, setVisitedRoutes] = useState<Set<string>>(new Set());
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('settings-focus-mode') === 'true');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [wizardForm, setWizardForm] = useState({ name: '', birthDate: '', gender: '' });
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState('');

  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [childrenLoadError, setChildrenLoadError] = useState(false);
  const [dashboardAuxError, setDashboardAuxError] = useState(false);
  const [childrenRetry, setChildrenRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connectionRequests, setConnectionRequests] = useState<ExpertConnectionRequest[]>([]);
  const [activeConnections, setActiveConnections] = useState<ExpertConnectionRequest[]>([]);
  // Expert-specific stats
  const [expertAppointments, setExpertAppointments] = useState<AppointmentRecord[]>([]);
  const [todayAppointmentCount, setTodayAppointmentCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [expertLoading, setExpertLoading] = useState(true);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [myTasks, setMyTasks] = useState<ExpertTask[]>([]);
  const [expertStats, setExpertStats] = useState<ExpertStats | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [quickNote, setQuickNote] = useState({ patientId: '', content: '' });
  const [savingNote, setSavingNote] = useState(false);
  const [hasAvailability, setHasAvailability] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  // Growth & Discovery Hub Tab States
  const [discoveryTab, setDiscoveryTab] = useState<'quests' | 'library'>('quests');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'growth' | 'social' | 'safety' | 'wellbeing'>('all');


  
  // Admin-specific stats
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminReports, setAdminReports] = useState<Report[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);

  const refreshApptRef = useRef<() => void>(() => {});
  const expertLoadToastedRef = useRef(false);

  useEffect(() => {
    if (user?.role === 'EXPERT') {
      const loadAppts = () => appointmentService.getAll().then(data => {
        setExpertAppointments(data);
        const today = getLocalDateString();
        setTodayAppointmentCount(data.filter(a => a.date === today && a.status !== 'CANCELLED').length);
      });
      refreshApptRef.current = () => loadAppts().catch(() => {});

      expertLoadToastedRef.current = false;
      const expertLoads = [
        { label: 'Randevular', run: loadAppts },
        { label: 'Danışanlar', run: () => patientService.getPatients().then(data => { setPatientCount(data.length); setPatients(data); }) },
        { label: 'Görevler', run: () => patientService.getMyTasks().then(setMyTasks) },
        { label: 'Uzman istatistikleri', run: () => patientService.getExpertStats().then(setExpertStats) },
        { label: 'Okunmamış mesajlar', run: () => messagingService.getUnreadCount().then(setUnreadMessagesCount) },
        { label: 'Çalışma saatleri', run: () => appointmentService.getAvailability().then(data => setHasAvailability(Array.isArray(data) && data.length > 0)) },
      ];

      Promise.allSettled(expertLoads.map(item => item.run())).then(results => {
        const failedLabels = results.flatMap((result, index) =>
          result.status === 'rejected' ? [expertLoads[index].label] : []
        );
        if (failedLabels.length > 0 && !expertLoadToastedRef.current) {
          expertLoadToastedRef.current = true;
          toast.error(`${failedLabels.join(', ')} yüklenemedi. Sayfayı yenileyip tekrar deneyin.`);
        }
      }).finally(() => setExpertLoading(false));
    } else if (user?.role === 'ADMIN') {
      // Import dynamically or assume global service existence, wait we can just import it at top.
      import('@/services/adminService').then(({ adminService }) => {
        Promise.allSettled([
          adminService.getStats().then(setAdminStats),
          adminService.getReports().then(data => setAdminReports(data.slice(0, 5)))
        ]).then(results => {
          if (results.some(result => result.status === 'rejected')) {
            toast.error('Yönetim özeti yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
          }
        }).finally(() => setAdminLoading(false));
      }).catch(() => setAdminLoading(false));
    } else {
      let current = true;
      Promise.allSettled([
        childService.getAll().then(data => {
          if (!current) return data;
          setChildren(data);
          return data;
        }).catch(() => { if (current) setChildrenLoadError(true); }),
        calendarService.getUpcoming().then(events => { if (current) setUpcomingEvents(events.slice(0, 5)); }),
        messagingService.getUnreadCount().then(count => { if (current) setUnreadMessagesCount(count); }),
        patientService.getConnectionRequests().then(requests => { if (current) setConnectionRequests(requests); }),
        patientService.getActiveConnections().then(connections => { if (current) setActiveConnections(connections); }),
      ]).then(results => {
        if (current && results.slice(1).some(result => result.status === 'rejected')) {
          setDashboardAuxError(true);
        }
      }).finally(() => { if (current) setLoading(false); });
      return () => { current = false; };
    }
  }, [childrenRetry, setChildren, user?.role]);

  useEffect(() => {
    if (user?.role !== 'PARENT') return;
    try {
      const visited = new Set(JSON.parse(localStorage.getItem('guide-visited-routes') ?? '[]') as string[]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisitedRoutes(visited);
    } catch {
      // ignore
    }
    setOnboardingDismissed(localStorage.getItem('dashboard-onboarding-dismissed') === 'true');
  }, [user?.role]);

  useEffect(() => {
    if (!loading && !childrenLoadError && user?.role === 'PARENT' && children.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWelcomeWizard(true);
    }
  }, [loading, children, childrenLoadError, user?.role]);

  // #8 WebSocket: live appointment updates
  useEffect(() => {
    if (user?.role !== 'EXPERT') return;
    const topic = '/user/queue/notifications';
    subscribe(topic, (msg: unknown) => {
      const n = msg as { type?: string };
      if (n.type === 'APPOINTMENT_NEW' || n.type === 'APPOINTMENT_CONFIRMED' || n.type === 'APPOINTMENT_CANCELLED') {
        refreshApptRef.current();
      }
    });
    return () => unsubscribe(topic);
  }, [user?.role, subscribe, unsubscribe]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  })();

  const activeChild = selectedChild || children[0] || null;
  const { snapshot: currentSnapshot, error: childSnapshotError, retry: retryChildSnapshot } =
    useChildDashboardSnapshot(activeChild?.id ?? null, user?.role !== 'EXPERT' && user?.role !== 'ADMIN');
  const recentNotes = currentSnapshot?.recentNotes ?? [];
  const todayMood = currentSnapshot?.todayMood ?? null;
  const todayMeds = currentSnapshot?.todayMeds ?? [];
  const hasSensoryProfile = currentSnapshot?.hasSensoryProfile ?? false;
  const hasEmergencyCard = currentSnapshot?.hasEmergencyCard ?? false;
  const hasWellbeingLog = currentSnapshot?.hasWellbeingLog ?? false;
  const hasBehaviorLog = currentSnapshot?.hasBehaviorLog ?? false;
  const activeChildEvents = activeChild
    ? upcomingEvents.filter((event) => !event.childId || event.childId === activeChild.id).slice(0, 3)
    : [];


  const firstName = getFirstName(user?.fullName);
  const quickCaptureActions = [
    {
      to: '/gunluk-takip',
      label: 'Bugünün kaydı',
      detail: todayMood ? 'Kaydı güncelle' : 'Duygu, uyku, ilaç',
      icon: Heart,
      tone: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
    {
      to: `/notlar?open=1&category=${encodeURIComponent('Davranış')}`,
      label: 'Davranış notu',
      detail: '"Davranış" kategorisiyle yeni not',
      icon: AlertTriangle,
      tone: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    {
      to: '/notlar?open=1',
      label: 'Gözlem notu',
      detail: recentNotes.length ? `${recentNotes.length} son not` : 'Kısa not ekle',
      icon: FileText,
      tone: 'bg-sky-50 text-sky-700 ring-sky-100',
    },
    {
      to: '/takvim',
      label: 'Plan ekle',
      detail: activeChildEvents.length ? `${activeChildEvents.length} yaklaşan` : 'Randevu, okul, etkinlik',
      icon: Calendar,
      tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    },
  ];
  const pendingMedicationSlots = countDueMedicationSlots(todayMeds);
  const nextEvent = activeChildEvents[0];
  const nextEventCountdown = nextEvent ? getEventCountdown(nextEvent.startTime) : null;

  const todayTasks = activeChild ? (() => {
    type Task = {
      to: string; icon: React.ElementType; title: string; detail: string;
      duration: string; done: boolean; urgency: number; safety?: boolean;
      tone: string; cta: string; doneCta: string;
    };
    const tasks: Task[] = [];

    // Günlük kayıt — her zaman
    tasks.push({
      to: '/gunluk-takip',
      icon: Heart,
      title: todayMood ? 'Bugünün kaydını güncelle' : 'Bugünün kısa kaydını gir',
      detail: todayMood
        ? 'Ruh hali girildi; uyku, ilaç veya kısa not ekleyebilirsiniz.'
        : 'Ruh hali, uyku ve ilaç bilgisini 1 dakikada işaretleyin.',
      duration: '1 dk',
      done: Boolean(todayMood),
      urgency: 1,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      cta: todayMood ? 'Güncelle' : 'Kaydet',
      doneCta: 'Kaydı görüntüle',
    });

    // İlaç — yalnızca saati gelen ve işaretlenmemiş dozlar öne çıkar.
    if (pendingMedicationSlots > 0) {
      tasks.push({
        to: '/gunluk-takip',
        icon: Pill,
        title: 'İlaç kontrolünü tamamla',
        detail: `${pendingMedicationSlots} doz henüz işaretlenmedi.`,
        duration: '2 dk',
        done: false,
        urgency: 0,
        tone: 'bg-amber-50 text-amber-700 ring-amber-100',
        cta: 'Kontrol et',
        doneCta: 'Tamam',
      });
    }

    // Okunmamış mesaj — sadece varsa
    if (unreadMessagesCount > 0) {
      tasks.push({
        to: '/mesajlar',
        icon: MessageCircle,
        title: 'Mesajları yanıtla',
        detail: `${unreadMessagesCount} okunmamış mesajın var.`,
        duration: '2 dk',
        done: false,
        urgency: 2,
        tone: 'bg-orange-50 text-orange-700 ring-orange-100',
        cta: 'Mesajlara git',
        doneCta: 'Mesajlar',
      });
    }

    // Uzman bağlantı isteği — sadece varsa
    if (connectionRequests.length > 0) {
      tasks.push({
        to: '/cocuklarim#uzman-istekleri',
        icon: UserPlus,
        title: `${connectionRequests.length} uzman erişim isteği`,
        detail: `${connectionRequests.map(r => r.expertName).join(', ')} bağlantı bekliyor.`,
        duration: '1 dk',
        done: false,
        urgency: 2,
        tone: 'bg-violet-50 text-violet-700 ring-violet-100',
        cta: 'İncele',
        doneCta: 'Tamam',
      });
    }

    // Bugün/yarın etkinlik — varsa kendi kartı, yaklaşan saat kadar acil
    if (nextEvent && nextEventCountdown?.urgent) {
      tasks.push({
        to: '/takvim',
        icon: CalendarCheck,
        title: nextEvent.title,
        detail: `${nextEventCountdown.label} — saat ${nextEventCountdown.timeLabel}`,
        duration: '30 sn',
        done: false,
        urgency: 0,
        tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
        cta: 'Takvimi aç',
        doneCta: 'Planı gör',
      });
    }

    // Gözlem notu
    if (recentNotes.length === 0) {
      tasks.push({
        to: '/notlar',
        icon: FileText,
        title: 'Kısa gözlem notu ekle',
        detail: 'Bugün fark ettiğin bir şeyi not et.',
        duration: '2 dk',
        done: false,
        urgency: 3,
        tone: 'bg-sky-50 text-sky-700 ring-sky-100',
        cta: 'Not ekle',
        doneCta: 'Notları gör',
      });
    } else {
      tasks.push({
        to: '/notlar',
        icon: FileText,
        title: 'Gözlem notlarını gözden geçir',
        detail: `${recentNotes.length} not mevcut — yeni bir şey ekleyebilirsin.`,
        duration: '2 dk',
        done: true,
        urgency: 3,
        tone: 'bg-sky-50 text-sky-700 ring-sky-100',
        cta: 'Not ekle',
        doneCta: 'Notları gör',
      });
    }

    // Aile deneyimlerinden çözüm bulma, ürünün temel akışıdır.
    const hasVisitedCommunity = [
      '/destek-ara',
      '/haftalik-soru',
      '/forum',
      '/benzer-aileler',
      '/dertlesme-duvari',
      '/bulusmalar',
    ].some(route => visitedRoutes.has(route));

    tasks.push({
      to: '/destek-ara',
      icon: Users,
      title: hasVisitedCommunity ? 'Aile deneyimlerinde çözüm ara' : 'Yaşadığın sorunu ailelere sor',
      detail: hasVisitedCommunity
        ? 'Sorunu yaz; benzer deneyimleri, kaynakları ve sana yakın aileleri birlikte gör.'
        : 'Başka ailelerin aynı konuda neler denediğini tek aramayla bul.',
      duration: '1 dk',
      done: hasVisitedCommunity,
      urgency: 1,
      tone: 'bg-purple-50 text-purple-700 ring-purple-100',
      cta: 'Çözüm ara',
      doneCta: 'Yeniden ara',
    });

    // Takvim — acil etkinlik yoksa genel kontrol
    if (!nextEvent || !nextEventCountdown?.urgent) {
      tasks.push({
        to: '/takvim',
        icon: Calendar,
        title: nextEvent ? 'Yaklaşan etkinliği gör' : 'Takvimi planla',
        detail: nextEvent
          ? `${nextEvent.title} — ${nextEventCountdown?.label}`
          : 'Randevu, okul veya etkinlik varsa ekleyin.',
        duration: '30 sn',
        done: Boolean(nextEvent),
        urgency: 4,
        tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
        cta: 'Takvimi aç',
        doneCta: 'Planı gör',
      });
    }

    // Duyusal Profil — doldurulmadıysa öner
    if (!hasSensoryProfile) {
      tasks.push({
        to: '/duyusal-profil',
        icon: Brain,
        title: 'Duyusal profili tamamla',
        detail: 'Çocuğunuzu rahatlatan ve zorlayan ses, ışık gibi durumları belirleyin.',
        duration: '3 dk',
        done: false,
        urgency: 5,
        tone: 'bg-violet-50 text-violet-700 ring-violet-100',
        cta: 'Profili Doldur',
        doneCta: 'Profili Gör',
      });
    }

    // Acil Durum Kartı — doldurulmadıysa öner; isteğe bağlı değil, güvenlik önerisi
    if (!hasEmergencyCard) {
      tasks.push({
        to: '/acil-kart',
        icon: ShieldCheck,
        title: 'Acil Durum Kartı oluştur',
        detail: 'Kritik tıbbi ve acil durum bilgilerini içeren QR kodlu kartı hazırlayın.',
        duration: '2 dk',
        done: false,
        urgency: 2,
        safety: true,
        tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        cta: 'Kartı Hazırla',
        doneCta: 'Kartı Gör',
      });
    }

    return tasks;
  })() : [
    {
      to: '/cocuklarim',
      icon: Baby,
      title: 'İlk çocuk profilini oluştur',
      detail: 'Profil eklenince menü ve öneriler çocuğunuza göre sadeleşir.',
      duration: '3 dk',
      done: false,
      urgency: 1,
      tone: 'bg-blue-50 text-blue-700 ring-blue-100',
      cta: 'Başla',
      doneCta: 'Profili gör',
    },
    {
      to: '/yardim',
      icon: ClipboardList,
      title: 'Uygulamanın kısa yolunu görün',
      detail: 'Hangi sayfanın ne işe yaradığını hızlıca öğrenin.',
      duration: '1 dk',
      done: false,
      urgency: 2,
      tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
      cta: 'Yardımı aç',
      doneCta: 'Yardımı aç',
    },
    {
      to: '/uzmanlar',
      icon: GraduationCap,
      title: 'Uzman desteğini keşfet',
      detail: 'Randevu almadan önce uzman profillerini inceleyebilirsiniz.',
      duration: '2 dk',
      done: false,
      urgency: 3,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      cta: 'Uzman bul',
      doneCta: 'Uzman bul',
    },
  ];

  // Bekleyenler gerçek aciliyete göre öne alınır (sabit ekleme sırasına değil);
  // tamamlananlar akışı bölmemesi için listenin sonuna taşınır.
  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.urgency - b.urgency;
  });

  const pendingSortedTasks = sortedTodayTasks.filter((task) => !task.done);
  const guidedTodayTasks = sortedTodayTasks.map((task) => {
    if (task.done) return { ...task, priorityLabel: 'Tamam', stepNumber: null };
    const stepNumber = pendingSortedTasks.indexOf(task) + 1;
    const priorityLabel =
      ('safety' in task && task.safety) ? 'Güvenlik' :
      stepNumber === 1 ? 'Şimdi bunu yap' :
      stepNumber === 2 ? 'Sonra' :
      'İsteğe bağlı';
    return { ...task, priorityLabel, stepNumber };
  });
  const pendingTodayTasks = todayTasks.filter((task) => !task.done);
  const visibleTodayTasks = showAllTasks
    ? guidedTodayTasks
    : guidedTodayTasks.filter(task => !task.done).slice(0, 2);

  // Onboarding steps calculations
  const onboardingSteps = [
    { id: 'profile', done: children.length > 0 },
    { id: 'daily-log', done: visitedRoutes.has('/gunluk-takip') || todayMood !== null },
    { id: 'crisis-guide', done: visitedRoutes.has('/kriz-rehberi') },
  ];
  const completedOnboardingSteps = onboardingSteps.filter((s) => s.done).length;
  const onboardingProgressPct = Math.round((completedOnboardingSteps / onboardingSteps.length) * 100);
  const allOnboardingStepsDone = completedOnboardingSteps === onboardingSteps.length;

  // Discovery quests calculations
  const completedQuests = (hasSensoryProfile ? 1 : 0) + (hasEmergencyCard ? 1 : 0) + (hasWellbeingLog ? 1 : 0) + (hasBehaviorLog ? 1 : 0);
  const questsPct = Math.round((completedQuests / 4) * 100);


  if (childrenLoadError || childSnapshotError) {
    return (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-slate-900">
        <h1 className="text-lg font-bold">Kayıtlar yüklenemedi</h1>
        <p className="mt-2 text-sm">Verileriniz silinmedi. Bağlantıyı kontrol edip tekrar deneyin.</p>
        <Button className="mt-4" onClick={() => {
          if (childrenLoadError) {
            setChildrenLoadError(false);
            setLoading(true);
            setChildrenRetry(value => value + 1);
          } else {
            retryChildSnapshot();
          }
        }}>Tekrar dene</Button>
      </section>
    );
  }

  if (!loading && activeChild && !currentSnapshot) {
    return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">Çocuğunuzun kayıtları yükleniyor…</div>;
  }

  return (
    <div className="space-y-5 pb-8">

      {dashboardAuxError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <span>Bazı takvim veya bağlantı bilgileri yüklenemedi.</span>
          <button type="button" className="font-bold underline underline-offset-2" onClick={() => {
            setDashboardAuxError(false);
            setChildrenRetry(value => value + 1);
          }}>Tekrar dene</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{greeting}</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            {firstName || 'Merhaba'}
            {activeChild && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100/60 text-sm font-extrabold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Çocuk: {activeChild.name}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          {children.length > 1 && (
            <div className="bg-slate-100/80 p-1 rounded-2xl flex gap-1 ring-1 ring-slate-200/50">
              {children.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChild(c)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    activeChild?.id === c.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <SupportSearchBox compact />

      {user?.id && user.role && children.length === 0 && (
        <LearningPathWelcomeCard key={`${user.id}:${user.role}`} userId={user.id} role={user.role} />
      )}

      {/* ── Uzman isteği bildirimi ── */}
      {connectionRequests.length > 0 && (
        <Link
          to="/cocuklarim#uzman-istekleri"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-100/70 hover:shadow"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 ring-1 ring-amber-200">
              <Bell size={18} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-amber-900">
                {connectionRequests.length} adet bekleyen uzman erişim isteği var
              </p>
              <p className="text-xs text-amber-700/70 mt-0.5">
                {connectionRequests.map(r => r.expertName).join(', ')} — onaylamak veya reddetmek için tıklayın
              </p>
            </div>
          </div>
          <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
            Görüntüle
            <ArrowRight size={14} />
          </span>
        </Link>
      )}

      {!loading && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3 py-1 border border-indigo-200/50">
                  <Target size={14} className="text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">BUGÜNÜN ODAĞI</span>
                </div>
                <GuideTooltip content="Günlük görevlerinizi sırasıyla tamamlayarak çocuğunuzun gelişim rutinini oluşturun." position="right" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Bugün ne yapacağım?</h2>
                <button
                  type="button"
                  onClick={() => {
                    const next = !focusMode;
                    localStorage.setItem('settings-focus-mode', String(next));
                    setFocusMode(next);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm hover:border-indigo-200 hover:text-indigo-700"
                >
                  {focusMode ? 'Tüm bölümleri göster' : 'Yalnızca bugünü göster'}
                </button>
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                {activeChild
                  ? `${activeChild.name} için önce en önemli adıma odaklanın. Diğer seçeneklere sonra bakabilirsiniz.`
                  : 'Önce profil oluşturun; sonra günlük takip ve randevu akışı açılır.'}
              </p>
            </div>
          </div>
          {pendingTodayTasks.length === 0 && activeChild && (
            <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Günlük kayıtlar hazır. İsterseniz önceki adımları veya diğer önerileri inceleyebilirsiniz.
            </p>
          )}

          {/* Clean, Uniform Task List */}
          <div className="relative z-10 flex flex-col gap-3.5">
            {visibleTodayTasks.map((task, idx) => {
              const { to, icon: Icon, title, detail, duration, done, tone, cta, doneCta, priorityLabel } = task;
              const isPrimary = priorityLabel === 'Şimdi bunu yap';
              
              return (
                <div key={title} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${(idx + 1) * 75}ms` }}>
                  <Link
                    to={to}
                    className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-[20px] border p-4 sm:p-5 transition-all hover:shadow-md hover:shadow-slate-100/50 ${
                      done
                        ? 'border-emerald-100 bg-emerald-50/10 hover:bg-emerald-50/20'
                        : isPrimary
                          ? 'border-indigo-200 bg-white hover:border-indigo-300'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Subtle left border line */}
                    {done ? (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full bg-emerald-400" />
                    ) : isPrimary ? (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full bg-indigo-600" />
                    ) : (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full bg-slate-300" />
                    )}

                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Step Number / Icon Container */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-2 ring-white/50 transition-transform duration-300 group-hover:scale-105 shadow-sm ${tone} ${done ? 'opacity-60' : ''}`}>
                          <Icon size={22} />
                        </div>
                        {/* Step Number badge positioned overlaying on the icon corner */}
                        {!done && task.stepNumber && (
                          <span className={`absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm ${
                            isPrimary ? 'bg-indigo-600' : 'bg-slate-500'
                          }`}>
                            {task.stepNumber}
                          </span>
                        )}
                        {done && (
                          <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white shadow-sm animate-scaleIn">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            done
                              ? 'bg-emerald-100 text-emerald-700'
                              : isPrimary
                                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/50'
                                : priorityLabel === 'Sonra'
                                  ? 'bg-amber-100 text-amber-700'
                                  : priorityLabel === 'Güvenlik'
                                    ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200/50'
                                    : 'bg-slate-100 text-slate-600'
                          }`}>
                            {priorityLabel}
                          </span>
                          <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-100">
                            <Timer size={11} /> {duration}
                          </span>
                        </div>

                        <h3 className={`text-base sm:text-lg font-bold leading-snug tracking-tight ${
                          done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'
                        }`}>
                          {title}
                        </h3>
                        <p className={`text-sm mt-0.5 leading-relaxed ${done ? 'text-slate-400/80' : 'text-slate-600'}`}>
                          {detail}
                        </p>
                      </div>
                    </div>

                    {/* Right CTA Button */}
                    <div className="shrink-0 self-end sm:self-center w-full sm:w-auto flex justify-end">
                      <span className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
                        done
                          ? 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 hover:scale-105 active:scale-95'
                          : isPrimary
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200/50 hover:scale-105 active:scale-95'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-150/80 hover:scale-105 active:scale-95'
                      }`}>
                        {done ? doneCta : cta}
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
          {guidedTodayTasks.length > 2 && (
            <button
              type="button"
              onClick={() => setShowAllTasks(value => !value)}
              aria-expanded={showAllTasks}
              className="mt-4 rounded-xl px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
            >
              {showAllTasks ? 'Önerileri daralt' : `Diğer önerileri göster (${guidedTodayTasks.length - visibleTodayTasks.length})`}
            </button>
          )}
        </section>
      )}

      {!loading && !focusMode && activeChild && (
        <section aria-label="Diğer alanlar" className="grid gap-3 sm:grid-cols-2">
          <Link to="/destek-ara" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-violet-300 hover:bg-violet-50/50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Users size={19} /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">Ailelerden çözüm bul</strong><span className="block text-xs text-slate-500">Sorunu yaz, deneyimleri ve benzer aileleri gör</span></span>
            <ArrowRight size={16} className="text-slate-400" />
          </Link>
          <Link to="/uzmanlar" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-300 hover:bg-sky-50/50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><GraduationCap size={19} /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">Uzman desteği</strong><span className="block text-xs text-slate-500">Uzmanları incele ve randevu planla</span></span>
            <ArrowRight size={16} className="text-slate-400" />
          </Link>
        </section>
      )}

      {/* ── Yeni Kullanıcı Başlangıç Rehberi (Checklist) ── */}
      {user?.role === 'PARENT' && !onboardingDismissed && !allOnboardingStepsDone && (
        <div className="relative overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50/30 via-white to-indigo-50/10 p-6 shadow-md shadow-indigo-100/10">
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('dashboard-onboarding-dismissed', 'true');
              setOnboardingDismissed(true);
            }}
            className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Rehberi Kapat"
          >
            <XCircle size={20} />
          </button>
          
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700">Hızlı Başlangıç Rehberi</h3>
            </div>
            <span className={`text-xs font-black px-3 py-1 rounded-full ${
              allOnboardingStepsDone ? 'bg-emerald-100 text-emerald-700 animate-bounce' : 'bg-indigo-100/70 text-indigo-700'
            }`}>
              {allOnboardingStepsDone ? 'Tamamlandı 🎉' : `%${onboardingProgressPct} Hazır`}
            </span>
          </div>
          
          <p className="text-sm font-medium text-slate-600 mb-4 max-w-2xl leading-relaxed">
            İlk gün her şeyi tamamlamana gerek yok. Önce profil, kısa günlük kayıt ve zor an rehberi yeterli; diğer araçlar sonra açılır.
          </p>

          {/* Checklist Progress Bar */}
          <div className="flex items-center gap-3 mb-5 max-w-2xl">
            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden ring-1 ring-inset ring-slate-200/10">
              <div 
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out ${
                  allOnboardingStepsDone ? 'from-emerald-400 to-emerald-500' : 'from-indigo-500 to-indigo-600'
                }`}
                style={{ width: `${onboardingProgressPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-500 shrink-0">{completedOnboardingSteps}/3 Adım</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
              {/* Step 1: Profil */}
              <div className={`flex flex-col justify-between p-4.5 rounded-2xl border transition-all duration-300 ${
                children.length > 0 
                  ? 'bg-emerald-50/20 border-emerald-100/60 shadow-sm' 
                  : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-sm hover:scale-[1.02]'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-xl ${children.length > 0 ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'bg-indigo-50 text-indigo-600 border border-indigo-100/40'}`}>
                      <Baby size={18} />
                    </div>
                    {children.length > 0 ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">Tamamlandı</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">Yapılacak</span>
                    )}
                  </div>
                  <h4 className={`text-sm font-extrabold ${children.length > 0 ? 'text-slate-400 line-through' : 'text-slate-800'}`}>1. Çocuk Profili</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">Plan, takip ve uzman paylaşımı profil bilgisine göre kişiselleşir.</p>
                </div>
                {children.length === 0 && (
                  <button
                    onClick={() => setShowWelcomeWizard(true)}
                    className="mt-4 w-full text-center text-xs font-bold text-white hover:text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-xl transition-all shadow-md shadow-indigo-100 active:scale-95 cursor-pointer"
                  >
                    Profili Oluştur
                  </button>
                )}
              </div>

              {/* Step 2: Günlük Takip */}
              {(() => {
                const isDone = visitedRoutes.has('/gunluk-takip') || todayMood !== null;
                return (
                  <div className={`flex flex-col justify-between p-4.5 rounded-2xl border transition-all duration-300 ${
                    isDone 
                      ? 'bg-emerald-50/20 border-emerald-100/60 shadow-sm' 
                      : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-sm hover:scale-[1.02]'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-xl ${isDone ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'bg-indigo-50 text-indigo-600 border border-indigo-100/40'}`}>
                          <ClipboardList size={18} />
                        </div>
                        {isDone ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">Tamamlandı</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">Yapılacak</span>
                        )}
                      </div>
                      <h4 className={`text-sm font-extrabold ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>2. İlk Kısa Kayıt</h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">Önce veri girilir; günlük plan bu kayıttan sonra anlam kazanır.</p>
                    </div>
                    {!isDone && (
                      <Link
                        to="/gunluk-takip"
                        className="mt-4 w-full text-center text-xs font-bold text-white hover:text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-xl transition-all shadow-md shadow-indigo-100 block"
                      >
                        Kayda Git
                      </Link>
                    )}
                  </div>
                );
              })()}

              {/* Step 3: Zor An Rehberi */}
              {(() => {
                const isDone = visitedRoutes.has('/kriz-rehberi');
                return (
                  <div className={`flex flex-col justify-between p-4.5 rounded-2xl border transition-all duration-300 ${
                    isDone 
                      ? 'bg-emerald-50/20 border-emerald-100/60 shadow-sm' 
                      : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-sm hover:scale-[1.02]'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-xl ${isDone ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'bg-indigo-50 text-indigo-600 border border-indigo-100/40'}`}>
                          <AlertTriangle size={18} />
                        </div>
                        {isDone ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">Tamamlandı</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">Yapılacak</span>
                        )}
                      </div>
                      <h4 className={`text-sm font-extrabold ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>3. Kriz Rehberi</h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">Kriz anlarında sakinleşme ve müdahale yöntemlerini inceleyin.</p>
                    </div>
                    {!isDone && (
                      <Link
                        to="/kriz-rehberi"
                        className="mt-4 w-full text-center text-xs font-bold text-white hover:text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-xl transition-all shadow-md shadow-indigo-100 block"
                      >
                        Rehberi Oku
                      </Link>
                    )}
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {!loading && !activeChild && (
        <InteractiveOnboardingTour onStartWizard={() => setShowWelcomeWizard(true)} />
      )}

      {/* ── Hızlı Eylemler — 4 kart ── */}
      {!loading && !focusMode && activeChild && todayMood && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickCaptureActions.map(({ to, label, detail, icon: Icon, tone }) => {
            const hoverBorderColor =
              to === '/gunluk-takip' ? 'hover:border-rose-300 hover:shadow-rose-100/50' :
              to.startsWith('/notlar?open=1&category=') ? 'hover:border-amber-300 hover:shadow-amber-100/50' :
              to.startsWith('/notlar') ? 'hover:border-sky-300 hover:shadow-sky-100/50' :
              'hover:border-indigo-300 hover:shadow-indigo-100/50';

            const softGradient =
              to === '/gunluk-takip' ? 'group-hover:to-rose-50/40' :
              to.startsWith('/notlar?open=1&category=') ? 'group-hover:to-amber-50/40' :
              to.startsWith('/notlar') ? 'group-hover:to-sky-50/40' :
              'group-hover:to-indigo-50/40';

            return (
              <Link
                key={to}
                to={to}
                className={`group relative flex flex-col gap-4 overflow-hidden p-5 rounded-[24px] border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${hoverBorderColor}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent transition-all duration-300 ${softGradient} pointer-events-none`} />
                <span className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-2 ring-white transition-transform duration-300 group-hover:scale-110 ${tone}`}>
                  <Icon size={20} />
                </span>
                <div className="relative z-10">
                  <p className="text-sm font-extrabold text-slate-900">{label}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">{detail}</p>
                </div>
                <ArrowRight size={14} className="absolute bottom-4 right-4 text-slate-300 transition-all group-hover:text-slate-600 group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Bağlı Uzmanlar — kompakt ── */}
      {activeConnections.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100 shadow-sm">
                <Users size={17} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Bağlı Uzmanlar</h2>
                <p className="text-xs font-medium text-slate-500">{activeConnections.length} aktif bağlantı</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {activeConnections.map(conn => (
              <div key={conn.id} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 hover:border-indigo-100 hover:bg-white hover:shadow-md hover:shadow-indigo-50/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-extrabold text-white shadow-sm ring-2 ring-white">
                    {conn.expertName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{conn.expertName}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Çocuk: <span className="font-semibold text-indigo-700">{conn.childName}</span></p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 shrink-0 rounded-xl font-bold"
                  onClick={async () => {
                    if (!window.confirm('Bu uzman ile bağlantıyı kesmek istediğinize emin misiniz?')) return;
                    try {
                      await patientService.revokeConnection(conn.id);
                      setActiveConnections(prev => prev.filter(r => r.id !== conn.id));
                      toast.success('Uzman bağlantısı kesildi.');
                    } catch { toast.error('İşlem başarısız.'); }
                  }}
                >
                  Kes
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Haftalık konu + Keşfet & Geliş Paneli ── */}
      {!loading && !focusMode && activeChild && todayMood && (
        <div className="grid gap-5 xl:grid-cols-2">
          <WeeklyTopicWidget variant="dashboard" />

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              {/* Widget Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
                    Sonraki araçlar
                    <GuideTooltip content="Günlük kayıt tamamlandıktan sonra gelişim, güvenlik ve destek araçlarını sırayla keşfedin." position="top" />
                  </h2>
                  <p className="text-xs text-slate-500">Günlük kayıt sonrası sırayla kullanılacak destekler</p>
                </div>
                
                {/* Tabs */}
                <div className="bg-slate-100/85 p-1 rounded-2xl flex gap-1 ring-1 ring-slate-200/50 self-start sm:self-center shrink-0">
                  <button
                    onClick={() => setDiscoveryTab('quests')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-all duration-200 ${
                      discoveryTab === 'quests'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🎯 Görevler
                  </button>
                  <button
                    onClick={() => setDiscoveryTab('library')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-all duration-200 ${
                      discoveryTab === 'library'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🗂️ Tüm Araçlar
                  </button>
                </div>
              </div>

              {/* Tab 1: Quests */}
              {discoveryTab === 'quests' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Quest Progress */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Araç Keşif İlerlemesi</p>
                      <h3 className="text-xs font-extrabold text-indigo-950 mt-0.5">
                        {completedQuests === 4 ? 'Harika! Tüm ana araçları keşfettiniz 🎉' : `${4 - completedQuests} araç keşfedilmeyi bekliyor`}
                      </h3>
                      {/* Quest Progress Bar */}
                      <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden mt-2">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                          style={{ width: `${questsPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 font-black text-2xl text-indigo-600 bg-white shadow-sm rounded-xl px-3 py-1.5 ring-1 ring-slate-100">
                      %{questsPct}
                    </div>
                  </div>

                  {/* Quests List */}
                  <div className="space-y-2.5">
                    {[
                      {
                        id: 'sensory',
                        done: hasSensoryProfile,
                        title: 'Rahatlatan / zorlayan şeyleri ekle',
                        desc: 'Ses, ışık, temas ve geçişlerde neyin iyi geldiğini belirleyin.',
                        icon: Activity,
                        to: '/duyusal-profil',
                        cta: 'Profili Gör',
                        startCta: 'Kısa Anket',
                        tone: 'text-violet-600 bg-violet-50 border-violet-100/50'
                      },
                      {
                        id: 'emergency',
                        done: hasEmergencyCard,
                        title: 'Acil Durum Kartı Oluştur',
                        desc: 'Dışarısı veya okul için QR kodlu acil durum kartı hazırlayın.',
                        icon: ShieldCheck,
                        to: '/acil-kart',
                        cta: 'Kartı İncele',
                        startCta: 'Kartı Oluştur',
                        tone: 'text-emerald-600 bg-emerald-50 border-emerald-100/50'
                      },
                      {
                        id: 'wellbeing',
                        done: hasWellbeingLog,
                        title: 'Ebeveyn refahı notu',
                        desc: 'Günlük takip içinde kendi yükünüzü de görünür kılın.',
                        icon: Heart,
                        to: '/gunluk-takip',
                        cta: 'Raporu Gör',
                        startCta: 'Kayıt Ekle',
                        tone: 'text-rose-600 bg-rose-50 border-rose-100/50'
                      },
                      {
                        id: 'behavior',
                        done: hasBehaviorLog,
                        title: 'Davranış notu ekle',
                        desc: 'Notlar içinde davranıştan önce ve sonra ne olduğunu yazın.',
                        icon: ClipboardList,
                        to: '/notlar',
                        cta: 'Notları Gör',
                        startCta: 'Not Ekle',
                        tone: 'text-sky-600 bg-sky-50 border-sky-100/50'
                      }
                    ].map((quest) => {
                      const QuestIcon = quest.icon;
                      return (
                        <div key={quest.id} className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-300 hover:bg-slate-50/30 ${
                          quest.done ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}>
                          <div className="flex items-start gap-3 min-w-0">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${quest.tone} ${quest.done ? 'opacity-65' : ''}`}>
                              <QuestIcon size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className={`text-xs font-extrabold ${quest.done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{quest.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug font-medium">{quest.desc}</p>
                            </div>
                          </div>
                          <Link
                            to={quest.to}
                            className={`shrink-0 text-[10px] font-black px-3.5 py-2 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${
                              quest.done
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80 shadow-sm'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 border-transparent text-white hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-50/50'
                            }`}
                          >
                            {quest.done ? quest.cta : quest.startCta}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Library */}
              {discoveryTab === 'library' && (
                <div className="space-y-4 flex-1 flex flex-col">
                  {/* Category Filter Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none shrink-0">
                    {[
                      { id: 'all', label: 'Tümü' },
                      { id: 'growth', label: 'Analiz & Gelişim' },
                      { id: 'social', label: 'Sosyal & Akran' },
                      { id: 'safety', label: 'Yaşam & Güvenlik' },
                      { id: 'wellbeing', label: 'Sağlık & Refah' }
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        onClick={() => setLibraryFilter(pill.id as typeof libraryFilter)}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-xl border whitespace-nowrap cursor-pointer transition-all ${
                          libraryFilter === pill.id
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm animate-scaleIn'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 shadow-sm'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  {/* Grid of Categorised Cards */}
                  <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {[
                      // Gelişim
                      { to: '/gelisim-paneli', label: 'İlerleme Özeti', cat: 'growth', desc: 'Grafikler & analiz' },
                      { to: '/notlar', label: 'Gözlem Notları', cat: 'growth', desc: 'Serbest günlük notlar' },
                      { to: '/notlar', label: 'Davranış Notu', cat: 'growth', desc: 'Notlar içinde önce/sonra' },
                      { to: '/duyusal-profil', label: 'Rahatlatan Şeyler', cat: 'growth', desc: 'Hassasiyet anketi' },
                      { to: '/tarama', label: 'Tarama Testleri', cat: 'growth', desc: 'M-CHAT / gelişim testleri' },
                      // Sosyal
                      { to: '/benzer-aileler', label: 'Benzer Aileler', cat: 'social', desc: 'Akran eşleştirme' },
                      { to: '/dertlesme-duvari', label: 'Dertleşme Duvarı', cat: 'social', desc: 'İç dökme & destek' },
                      { to: '/forum', label: 'Forum', cat: 'social', desc: 'Soru & uzman cevapları' },
                      { to: '/gruplar', label: 'Gruplar', cat: 'social', desc: 'Tematik topluluklar' },
                      { to: '/mesajlar', label: 'Mesajlar', cat: 'social', desc: 'Uzman/veli sohbet' },
                      // Güvenlik
                      { to: '/acil-kart', label: 'Acil Durum Kartı', cat: 'safety', desc: 'QR kodlu çocuk kartı' },
                      { to: '/okul-defteri', label: 'Okul Defteri', cat: 'safety', desc: 'Öğretmenle ortak takip' },
                      { to: '/haklar-rehberi', label: 'Haklar Rehberi', cat: 'safety', desc: 'Yasal/sosyal haklar' },
                      { to: '/rutinler', label: 'Rutinler', cat: 'safety', desc: 'Görsel geçiş rutinleri' },
                      { to: '/gorevler', label: 'Ev Görevleri', cat: 'safety', desc: 'Uzmandan ev ödevleri' },
                      // Refah & Sağlık
                      { to: '/beslenme', label: 'Beslenme Günlüğü', cat: 'wellbeing', desc: 'Gıda & reaksiyon takibi' },
                      { to: '/gunluk-takip', label: 'Ebeveyn Refahı', cat: 'wellbeing', desc: 'Günlük takip içinde' },
                      { to: '/uzmanlar', label: 'Uzmanlar', cat: 'wellbeing', desc: 'Uzman arama & profil' },
                      { to: '/randevular', label: 'Randevular', cat: 'wellbeing', desc: 'Randevu & seans planı' },
                      { to: '/uzmanlar', label: 'Uzman Haritası', cat: 'wellbeing', desc: 'Uzmanlar içinde konum' }
                    ]
                      .filter(item => libraryFilter === 'all' || item.cat === libraryFilter)
                      .map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="flex flex-col p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all"
                        >
                          <span className="text-[11px] font-extrabold text-slate-800 leading-tight truncate">{item.label}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5 truncate leading-tight">{item.desc}</span>
                        </Link>
                      ))}
                  </div>
                </div>
              )}
          </section>
        </div>
      )}

      {/* ── Karşılama Sihirbazı Modalı (Welcome Setup Wizard) ── */}
      <Modal
        isOpen={showWelcomeWizard}
        onClose={() => setShowWelcomeWizard(false)}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-600 animate-pulse" size={18} />
            <span className="font-extrabold text-slate-900">Otizm Destek Platformu'na Hoş Geldiniz!</span>
          </div>
        }
        size="md"
      >
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-slate-600">
            Çocuğunuzun gelişimini sağlıklı takip edebilmek ve platformun kişiselleştirilmiş özelliklerinden yararlanabilmek için öncelikle çocuğunuzun profil bilgilerini girelim.
          </p>
          
          {wizardError && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-700">
              {wizardError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="wizard-child-name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Çocuğun Adı / Rumuzu</label>
              <input
                id="wizard-child-name"
                type="text"
                placeholder="Örn: Enes Can"
                value={wizardForm.name}
                onChange={e => setWizardForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wizard-child-birthdate" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Doğum Tarihi</label>
                <input
                  id="wizard-child-birthdate"
                  type="date"
                  value={wizardForm.birthDate}
                  onChange={e => setWizardForm(f => ({ ...f, birthDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Cinsiyet</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWizardForm(f => ({ ...f, gender: 'KIZ' }))}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      wizardForm.gender === 'KIZ'
                        ? 'border-pink-300 bg-pink-50 text-pink-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Kız
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardForm(f => ({ ...f, gender: 'ERKEK' }))}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      wizardForm.gender === 'ERKEK'
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Erkek
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowWelcomeWizard(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Daha Sonra Kur
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!wizardForm.name.trim()) {
                  setWizardError('Çocuğun adı zorunludur.');
                  return;
                }
                setWizardError('');
                setWizardSaving(true);
                try {
                  const child = await childService.create({
                    name: wizardForm.name,
                    birthDate: wizardForm.birthDate || undefined,
                    gender: (wizardForm.gender as 'ERKEK' | 'KIZ') || undefined,
                    diagnosisInfo: '',
                    educationProgram: '',
                    therapies: '',
                  });
                  addChild(child);
                  setShowWelcomeWizard(false);
                  toast.success('Çocuk profili başarıyla oluşturuldu! Şimdi günlük takibi ve planlarınızı yapabilirsiniz.');
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  setWizardError(msg || 'Profil oluşturulamadı. Lütfen tekrar deneyin.');
                }
                setWizardSaving(false);
              }}
              disabled={wizardSaving}
              className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 shadow-md shadow-indigo-100 transition-all disabled:opacity-50 active:scale-95"
            >
              {wizardSaving ? 'Oluşturuluyor...' : 'Profil Oluştur ve Başla'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
