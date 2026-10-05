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

export function ExpertDashboard() {
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


  if (user?.role === 'EXPERT') {
    const todayStr = getLocalDateString();
    const todayAppointments = expertAppointments.filter(a => a.date === todayStr && a.status !== 'CANCELLED');
    const upcomingPendingCount = expertAppointments.filter(a => a.status === 'PENDING' && a.date >= todayStr).length;
    const pendingAppts = expertAppointments.filter(a => a.status === 'PENDING' && a.date >= todayStr).slice(0, 4);
    const expertFirstName = getFirstName(user?.fullName);
    const isEmpty = !expertLoading && patientCount === 0 && expertAppointments.length === 0;
    const profilePct = getProfileCompleteness(user);
    const pendingTasks = myTasks.filter(t => t.status === 'PENDING').slice(0, 5);
    const recentPatients = [...patients].sort((a, b) => (b.lastSession || '').localeCompare(a.lastSession || '')).slice(0, 4);
    const filteredPatients = patientSearch.trim()
      ? patients.filter(p => normalizeText(p.name).includes(normalizeText(patientSearch))).slice(0, 6)
      : recentPatients;
    const nextAppointment = [...expertAppointments]
      .filter(a => a.date >= todayStr && a.status !== 'CANCELLED')
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

    // #2 Weekly strip: next 7 days appointment counts
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dateStr = getLocalDateString(d);
      const count = expertAppointments.filter(a => a.date === dateStr && a.status !== 'CANCELLED').length;
      const label = i === 0 ? 'Bugün' : d.toLocaleDateString('tr-TR', { weekday: 'short' });
      return { dateStr, label, count, isToday: i === 0 };
    });

    // #9 Analytics: CSS bars from monthlyData
    const maxCompleted = expertStats ? Math.max(...expertStats.monthlyData.map(m => m.completed), 1) : 1;

    const expertSubtitle = expertLoading
      ? 'Veriler yükleniyor...'
      : isEmpty
        ? 'Başlamak için çalışma saatlerinizi belirleyin ve profilinizi tamamlayın.'
        : todayAppointmentCount > 0
          ? `Bugün ${todayAppointmentCount} randevunuz var${upcomingPendingCount > 0 ? `, ${upcomingPendingCount} bekleyen onay` : ''}.`
          : upcomingPendingCount > 0
            ? `${upcomingPendingCount} onay bekleyen randevu isteği var.`
            : 'Bugün planlanmış randevu bulunmuyor.';

    const expertFocusItems = [
      upcomingPendingCount > 0 && {
        tone: 'bg-amber-50 text-amber-700 ring-amber-100',
        icon: Clock,
        title: `${upcomingPendingCount} randevu onay bekliyor`,
        detail: 'Aileler yanıtınızı bekliyor.',
        to: '/randevular',
        cta: 'Onayla',
      },
      todayAppointmentCount > 0 && {
        tone: 'bg-blue-50 text-blue-700 ring-blue-100',
        icon: Calendar,
        title: `Bugün ${todayAppointmentCount} görüşme var`,
        detail: nextAppointment ? `Sıradaki: ${nextAppointment.time} · ${nextAppointment.childName || nextAppointment.parentName || 'Randevu'}` : 'Günlük programınızı kontrol edin.',
        to: '/randevular',
        cta: 'Programa git',
      },
      unreadMessagesCount > 0 && {
        tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
        icon: MessageCircle,
        title: `${unreadMessagesCount} okunmamış mesaj`,
        detail: 'Danışan iletişimini bekletmeyin.',
        to: '/mesajlar',
        cta: 'Mesajlar',
      },
      !hasAvailability && {
        tone: 'bg-teal-50 text-teal-700 ring-teal-100',
        icon: Timer,
        title: 'Çalışma saatleri eksik',
        detail: 'Ailelerin randevu alabilmesi için uygunluk tanımlayın.',
        to: '/randevular',
        cta: 'Saatleri ayarla',
      },
      profilePct < 100 && {
        tone: 'bg-violet-50 text-violet-700 ring-violet-100',
        icon: Settings,
        title: `Profil %${profilePct} tamamlandı`,
        detail: 'Biyografi, kurum ve fotoğraf görünürlüğü artırır.',
        to: '/settings',
        cta: 'Tamamla',
      },
      patientCount === 0 && {
        tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        icon: UserPlus,
        title: 'Henüz aktif danışan yok',
        detail: 'Profil ve saatler tamamlandığında aileler size ulaşabilir.',
        to: '/danisanlarim',
        cta: 'Danışanlar',
      },
    ].filter(Boolean).slice(0, 3) as Array<{
      tone: string;
      icon: ElementType;
      title: string;
      detail: string;
      to: string;
      cta: string;
    }>;

    if (expertFocusItems.length === 0) {
      expertFocusItems.push({
        tone: 'bg-slate-50 text-slate-700 ring-slate-100',
        icon: ShieldCheck,
        title: 'Bugünkü ana işler tamam',
        detail: 'Program, mesaj ve kurulum tarafında acil aksiyon görünmüyor.',
        to: '/randevular',
        cta: 'Takvimi aç',
      });
    }

    // #1 Approve/reject handlers
    const handleConfirm = async (id: string) => {
      setActioningId(id);
      try {
        await appointmentService.confirm(id);
        refreshApptRef.current();
        toast.success('Randevu onaylandı');
      } catch { toast.error('Onaylama başarısız'); }
      finally { setActioningId(null); }
    };
    const handleCancel = async (id: string) => {
      setActioningId(id);
      try {
        await appointmentService.cancel(id);
        refreshApptRef.current();
        toast.success('Randevu iptal edildi');
      } catch { toast.error('İptal başarısız'); }
      finally { setActioningId(null); }
    };

    // #4 Quick note submit
    const handleSaveNote = async () => {
      if (!quickNote.patientId || !quickNote.content.trim()) return;
      const p = patients.find(pt => pt.id === quickNote.patientId);
      if (!p) return;
      setSavingNote(true);
      try {
        await noteService.create({ childId: p.childId, title: 'Uzman notu', content: quickNote.content });
        toast.success('Not kaydedildi');
        setQuickNote({ patientId: '', content: '' });
      } catch { toast.error('Not kaydedilemedi'); }
      finally { setSavingNote(false); }
    };

    const expertQuickActions = [
      { to: '/randevular', icon: Calendar, label: 'Randevularım', badge: upcomingPendingCount > 0 ? upcomingPendingCount : null, color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200' },
      { to: '/danisanlarim', icon: Users, label: 'Danışanlarım', badge: null, color: 'hover:bg-green-50 hover:text-green-700 hover:border-green-200' },
      { to: '/mesajlar', icon: MessageCircle, label: 'Mesajlar', badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, color: 'hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200' },
      { to: '/bep-raporu', icon: FileText, label: 'BEP Raporu Yaz', badge: null, color: 'hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200' },
      { to: '/forum', icon: MessageCircle, label: 'Forum', badge: null, color: 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200' },
    ] as const;

    return (
      <div className="space-y-6">
        <LearningPathWelcomeCard key={`${user.id}:${user.role}`} userId={user.id} role={user.role} />

        <section className="overflow-hidden rounded-[28px] border-none bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 shadow-xl shadow-indigo-900/10 text-white relative">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Sparkles size={160} />
          </div>
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr] relative z-10">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={user?.verified ? 'bg-emerald-500/20 text-emerald-100 border-none' : 'bg-amber-500/20 text-amber-100 border-none'}>
                  {user?.verified ? 'Onaylı Uzman' : 'Onay Bekliyor'}
                </Badge>
                {hasAvailability && <Badge className="bg-white/10 text-indigo-100 border-none">Saatler Tanımlı</Badge>}
                <ProfileRing pct={profilePct} />
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">
                {greeting}, {user?.expertTitle || 'Uzman'} {expertFirstName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-200">{expertSubtitle}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/randevular"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/30"
                >
                  <Calendar size={18} />
                  Programı Aç
                </Link>
                <Link
                  to="/patients"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  <Users size={18} />
                  Danışanlar
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById('quick-note-textarea')?.focus()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  <FileText size={18} />
                  Hızlı Not
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/5 p-6 sm:p-8 lg:border-l lg:border-t-0 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Öncelikli İşler</p>
                  <h2 className="mt-1.5 font-semibold text-white">Bugünkü Çalışma Odağı</h2>
                </div>
                {upcomingPendingCount > 0 && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {expertFocusItems.map(({ icon: Icon, title, detail, to }) => (
                  <Link
                    key={title}
                    to={to}
                    className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/10 p-3 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm`}>
                      <Icon size={18} className="opacity-80" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-indigo-200">{detail}</span>
                    </span>
                    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white group-hover:bg-white group-hover:text-indigo-900 transition-colors">
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stat cards - Redesigned */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {expertLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (<>
            <Link to="/randevular" className="col-span-2 sm:col-span-1">
              <Card hover className="p-5 border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Calendar size={18} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold">{todayAppointmentCount}</p>
                    <p className="text-sm font-medium text-blue-100">Bugünkü Randevu</p>
                  </div>
                </div>
                <Calendar size={100} className="absolute -right-6 -bottom-6 text-white opacity-10 group-hover:scale-110 transition-transform" />
              </Card>
            </Link>
            
            <Link to="/randevular" className="col-span-2 sm:col-span-1">
              <Card hover className="p-5 border-none shadow-md bg-gradient-to-br from-amber-500 to-amber-600 text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Clock size={18} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold">{upcomingPendingCount}</p>
                    <p className="text-sm font-medium text-amber-100">Bekleyen Onay</p>
                  </div>
                </div>
                <Clock size={100} className="absolute -right-6 -bottom-6 text-white opacity-10 group-hover:scale-110 transition-transform" />
              </Card>
            </Link>

            <Link to="/patients" className="col-span-1">
              <Card hover className="p-5 h-full flex flex-col justify-center border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{patientCount}</p>
                    <p className="text-xs font-medium text-slate-500">Aktif Danışan</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/mesajlar" className="col-span-1">
              <Card hover className="p-5 h-full flex flex-col justify-center border border-slate-100 relative">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 relative">
                    <MessageCircle size={20} className="text-indigo-600" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{unreadMessagesCount}</p>
                    <p className="text-xs font-medium text-slate-500">Okunmamış Mesaj</p>
                  </div>
                </div>
              </Card>
            </Link>
          </>)}
        </div>

        {/* 7 Günlük Program */}
        {!expertLoading && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-indigo-500" /> 7 Günlük Program
              </h3>
              <Link to="/randevular" className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">
                Tümünü gör →
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(({ dateStr, label, count, isToday }) => (
                <Link key={dateStr} to={`/randevular`}
                  className={`flex flex-col items-center rounded-2xl py-4 px-1 gap-1.5 text-center transition-all hover:-translate-y-1 ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-4 ring-indigo-50' : 'bg-slate-50 hover:bg-slate-100 border border-slate-100'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>{label}</span>
                  <span className={`text-xl font-black ${isToday ? 'text-white' : 'text-slate-700'}`}>{dateStr.slice(8)}</span>
                  {/* Randevu sayısı badge */}
                  {count > 0 ? (
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full leading-none ${isToday ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                      {count}
                    </span>
                  ) : (
                    <span className="h-4" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Hızlı Eylemler — grid */}
        {!expertLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {expertQuickActions.map(({ to, icon: Icon, label, badge, color }) => (
              <Link
                key={to}
                to={to}
                className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm text-center transition-all hover:shadow-md hover:-translate-y-0.5 ${color}`}
              >
                <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <Icon size={20} className="text-gray-500" />
                </div>
                <span className="text-xs font-semibold text-gray-700 leading-tight">{label}</span>
                {badge !== null && badge > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Kurulum Rehberi — tamamlanınca success banner */}
        {!expertLoading && profilePct === 100 && hasAvailability && patientCount > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">Kurulum tamamlandı!</p>
              <p className="text-xs text-emerald-600 mt-0.5">Profiliniz, çalışma saatleriniz ve danışanlarınız hazır.</p>
            </div>
          </div>
        )}
        {!expertLoading && !(profilePct === 100 && hasAvailability && patientCount > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" /> Kurulum Rehberi
              <span className="ml-auto text-xs font-normal text-gray-400">
                {[hasAvailability, profilePct === 100, patientCount > 0].filter(Boolean).length}/3 tamamlandı
              </span>
            </h3>
            <div className="space-y-2">
              {[
                {
                  done: hasAvailability,
                  title: 'Çalışma saatlerinizi belirleyin',
                  detail: 'Ebeveynler uygun saatlerinize göre randevu alabilsin.',
                  to: '/randevular',
                  cta: 'Saatleri Ayarla',
                },
                {
                  done: profilePct === 100,
                  title: 'Profilinizi tamamlayın',
                  detail: `Biyografi, fotoğraf ve kurum bilgisi — şu an %${profilePct} dolu.`,
                  to: '/settings',
                  cta: 'Profili Düzenle',
                },
                {
                  done: patientCount > 0,
                  title: 'İlk danışanınızı alın',
                  detail: 'Profil eksiksiz ve saatler tanımlıysa aileler sizi bulabilir.',
                  to: '/danisanlarim',
                  cta: 'Danışanlara Git',
                },
              ].map(({ done, title, detail, to, cta }) => (
                <div key={title} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${done ? 'opacity-50' : 'bg-indigo-50'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500' : 'bg-white border-2 border-indigo-300'}`}>
                    {done && <CheckCircle size={14} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{title}</p>
                    {!done && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
                  </div>
                  {!done && (
                    <Link to={to} className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
                      {cta} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Today's appointments — timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Activity size={18} className="text-teal-500" /> Bugünün Randevuları
              {todayAppointments.length > 0 && (
                <span className="ml-auto text-xs font-normal text-gray-400">{todayAppointments.length} randevu</span>
              )}
            </h3>
            <div className="flex-1">
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Bugün randevu bulunmuyor</p>
              ) : (
                <div className="relative pl-16">
                  <div className="absolute left-[38px] top-3 bottom-3 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {todayAppointments.slice(0, 6).map(a => {
                      const now = new Date();
                      const [h, m] = a.time.split(':').map(Number);
                      const apptTime = new Date(); apptTime.setHours(h, m, 0, 0);
                      const isPast = apptTime < now && a.status !== 'PENDING';
                      const isCurrent = !isPast && Math.abs(apptTime.getTime() - now.getTime()) < 3600000;
                      return (
                        <div key={a.id} className="relative flex items-start gap-3">
                          <span className={`absolute -left-16 text-[11px] font-bold tabular-nums pt-1.5 w-12 text-right ${isPast ? 'text-gray-300' : 'text-gray-500'}`}>
                            {a.time}
                          </span>
                          <div className={`absolute -left-[26px] mt-1.5 w-4 h-4 rounded-full border-2 shrink-0 ${
                            isPast ? 'bg-gray-100 border-gray-200' :
                            isCurrent ? 'bg-teal-500 border-teal-200 ring-2 ring-teal-100' :
                            'bg-white border-indigo-400'
                          }`} />
                          <div className={`flex-1 flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            isPast ? 'bg-gray-50 opacity-60' :
                            isCurrent ? 'bg-teal-50 ring-1 ring-teal-100' :
                            'bg-slate-50'
                          }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isPast ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                              {a.childName?.charAt(0) ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{a.childName}</p>
                              <p className="text-xs text-gray-500">{a.type === 'ONLINE' ? 'Online' : 'Yüz Yüze'} · {a.duration} dk</p>
                            </div>
                            {a.status === 'PENDING' ? (
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => handleConfirm(a.id)} disabled={actioningId === a.id}
                                  className="w-7 h-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center transition-colors disabled:opacity-50" title="Onayla">
                                  <CheckCircle size={14} />
                                </button>
                                <button onClick={() => handleCancel(a.id)} disabled={actioningId === a.id}
                                  className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors disabled:opacity-50" title="İptal">
                                  <XCircle size={14} />
                                </button>
                              </div>
                            ) : (
                              <Badge variant={a.status === 'CONFIRMED' ? 'success' : 'default'} className="shrink-0">
                                {a.status === 'CONFIRMED' ? 'Onaylı' : a.status === 'COMPLETED' ? 'Tamamlandı' : a.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <Link to="/randevular" className="mt-4 text-sm text-indigo-600 font-medium text-center hover:underline">
              Tüm Randevulara Git
            </Link>
          </div>

          {/* #1 Pending approval list + #4 Quick note */}
          <div className="space-y-4">
            {pendingAppts.length > 0 && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-amber-600" /> Onay Bekleyen ({upcomingPendingCount})
                </h3>
                <div className="space-y-2">
                  {pendingAppts.map(a => (
                    <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.childName || a.parentName}</p>
                        <p className="text-xs text-gray-500">{a.date} · {a.time}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleConfirm(a.id)}
                          disabled={actioningId === a.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={12} /> Onayla
                        </button>
                        <button
                          onClick={() => handleCancel(a.id)}
                          disabled={actioningId === a.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <XCircle size={12} /> Reddet
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick note — always visible */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" /> Hızlı Not Ekle
              </p>
              <div className="space-y-2">
                <select
                  value={quickNote.patientId}
                  onChange={e => setQuickNote(q => ({ ...q, patientId: e.target.value }))}
                  disabled={patients.length === 0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{patients.length === 0 ? 'Henüz danışan yok' : 'Danışan seçin'}</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <textarea
                  id="quick-note-textarea"
                  rows={3}
                  value={quickNote.content}
                  onChange={e => setQuickNote(q => ({ ...q, content: e.target.value }))}
                  disabled={patients.length === 0}
                  placeholder={patients.length === 0 ? 'Not eklemek için önce danışan gerekiyor.' : 'Not içeriği...'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                />
                {patients.length === 0 && (
                  <Link to="/patients" className="block rounded-lg bg-indigo-50 px-3 py-2 text-center text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                    Danışanlar sayfasına git
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={savingNote || patients.length === 0 || !quickNote.patientId || !quickNote.content.trim()}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {savingNote ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Patient activity feed with search + alarm */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users size={16} className="text-emerald-500" /> Danışanlar
              </h3>
              <div className="ml-auto relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Ara..."
                  className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-28"
                />
              </div>
            </div>
            {patients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Henüz danışan yok</p>
            ) : filteredPatients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Eşleşen danışan bulunamadı</p>
            ) : (
              <div className="space-y-2 flex-1">
                {filteredPatients.map(p => {
                  const daysSince = getDaysSinceSession(p.lastSession);
                  const isInactive = daysSince !== null && daysSince >= 14;
                  const isOverdue = daysSince !== null && daysSince >= 30;
                  const pct = p.totalTasks > 0 ? Math.round((p.tasksCompleted / p.totalTasks) * 100) : 0;
                  return (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors ${isOverdue ? 'ring-1 ring-red-100 bg-red-50/30' : isInactive ? 'ring-1 ring-amber-100 bg-amber-50/20' : ''}`}>
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                          {p.name.charAt(0)}
                        </div>
                        {isOverdue && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <AlertTriangle size={9} className="text-white" />
                          </span>
                        )}
                        {!isOverdue && isInactive && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                            <Clock size={9} className="text-white" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className={`text-xs ${isOverdue ? 'text-red-500' : isInactive ? 'text-amber-600' : 'text-gray-500'}`}>
                          {daysSince === null ? 'Seans yok' : daysSince === 0 ? 'Bugün' : `${daysSince} gün önce`} · {p.tasksCompleted}/{p.totalTasks} görev
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-0.5">
                        <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link to="/patients" className="mt-4 text-sm text-indigo-600 font-medium text-center hover:underline">
              Tüm Danışanlara Git
            </Link>
          </div>

          {/* #6 Monthly stats + #7 BEP tasks */}
          <div className="space-y-4">
            {/* #6 Monthly stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart2 size={16} className="text-blue-500" /> Bu Ay İstatistikler
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-600">{expertStats?.completedThisMonth ?? '—'}</p>
                  <p className="text-xs text-gray-500">Tamamlanan</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-500">{expertStats?.cancelledThisMonth ?? '—'}</p>
                  <p className="text-xs text-gray-500">İptal</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-600">{expertStats?.totalThisMonth ?? '—'}</p>
                  <p className="text-xs text-gray-500">Toplam</p>
                </div>
              </div>

              {expertStats && expertStats.totalThisMonth > 0 && (() => {
                const rate = Math.round((expertStats.completedThisMonth / expertStats.totalThisMonth) * 100);
                return (
                  <div className={`flex items-center gap-3 mb-3 p-2.5 rounded-xl ring-1 ${rate >= 80 ? 'bg-green-50 ring-green-100' : rate >= 50 ? 'bg-blue-50 ring-blue-100' : 'bg-amber-50 ring-amber-100'}`}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${rate >= 80 ? 'text-green-700' : rate >= 50 ? 'text-blue-700' : 'text-amber-700'}`}>Tamamlanma Oranı</span>
                        <span className={`text-sm font-bold ${rate >= 80 ? 'text-green-700' : rate >= 50 ? 'text-blue-700' : 'text-amber-700'}`}>%{rate}</span>
                      </div>
                      <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Mini analytics chart */}
              {expertStats && expertStats.monthlyData.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Son 6 ay tamamlanan seans</p>
                  <div className="flex items-end gap-1.5 h-20">
                    {expertStats.monthlyData.map(m => (
                      <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5 group">
                        <span className="text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{m.completed}</span>
                        <div className="w-full flex flex-col justify-end" style={{ height: '60px' }}>
                          <div
                            className="w-full bg-indigo-500 rounded-t-sm transition-all hover:bg-indigo-400"
                            style={{ height: `${m.completed > 0 ? Math.max(6, Math.round((m.completed / maxCompleted) * 60)) : 0}px` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-400 truncate w-full text-center">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* #7 BEP/Task list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ClipboardList size={16} className="text-violet-500" />
                Bekleyen Görevler
                {expertStats && expertStats.pendingTasksCount > 0 && (
                  <span className="ml-auto bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {expertStats.pendingTasksCount}
                  </span>
                )}
              </h3>
              {pendingTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Bekleyen görev yok</p>
              ) : (
                <div className="space-y-2">
                  {pendingTasks.map(t => {
                    const priority = getTaskPriority(t);
                    const priorityMeta = {
                      high: { label: 'Acil', cls: 'bg-red-100 text-red-700', iconCls: 'bg-red-100', iconColor: 'text-red-600', rowCls: 'ring-1 ring-red-100 bg-red-50/40' },
                      medium: { label: '3 gün', cls: 'bg-amber-100 text-amber-700', iconCls: 'bg-amber-100', iconColor: 'text-amber-600', rowCls: '' },
                      low: { label: 'Normal', cls: 'bg-gray-100 text-gray-500', iconCls: 'bg-violet-100', iconColor: 'text-violet-600', rowCls: '' },
                    }[priority];
                    return (
                      <div key={t.id} className={`flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors ${priorityMeta.rowCls}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${priorityMeta.iconCls}`}>
                          <ClipboardList size={13} className={priorityMeta.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                          {t.dueDate && (
                            <p className="text-xs text-gray-400">Bitiş: {new Date(t.dueDate).toLocaleDateString('tr-TR')}</p>
                          )}
                        </div>
                        <span className={`shrink-0 self-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${priorityMeta.cls}`}>
                          {priorityMeta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to="/patients" className="mt-3 text-xs text-indigo-600 font-medium hover:underline block text-center">
                Tüm görevleri yönet
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
