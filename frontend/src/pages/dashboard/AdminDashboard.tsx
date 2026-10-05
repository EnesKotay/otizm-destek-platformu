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

export function AdminDashboard() {
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


  if (user?.role === 'ADMIN') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {greeting}, {getFirstName(user?.fullName)}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Platform yönetim merkezine hoş geldiniz. İşte bugünkü güncel durum.</p>
        </div>

        <LearningPathWelcomeCard key={`${user.id}:${user.role}`} userId={user.id} role={user.role} />

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 rounded-[24px] border-none bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Users size={24} className="text-white" />
                </div>
                <Badge className="bg-white/20 hover:bg-white/30 border-none backdrop-blur-md text-white">Toplam</Badge>
              </div>
              <div>
                <p className="text-4xl font-bold mb-1">{adminLoading ? '...' : adminStats?.totalUsers || 0}</p>
                <p className="text-indigo-100 font-medium">Aktif Kullanıcı</p>
              </div>
            </div>
            <Users size={120} className="absolute -right-6 -bottom-6 text-white opacity-10 pointer-events-none" />
          </Card>

          <Card className="p-6 rounded-[24px] border-slate-100 shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <GraduationCap size={24} className="text-emerald-600" />
              </div>
            </div>
            <div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{adminLoading ? '...' : adminStats?.totalExperts || 0}</p>
              <p className="text-slate-500 font-medium">Onaylı Uzman</p>
            </div>
          </Card>

          <Link to="/admin" className="block outline-none">
            <Card className="p-6 rounded-[24px] border-slate-100 shadow-sm bg-white relative overflow-hidden group hover:shadow-md hover:border-amber-200 transition-all cursor-pointer h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <ShieldCheck size={24} className="text-amber-600" />
                </div>
                {(adminStats?.pendingExperts ?? 0) > 0 && (
                  <Badge variant="warning" className="animate-pulse shadow-sm">Yeni Başvuru</Badge>
                )}
              </div>
              <div>
                <p className="text-4xl font-bold text-slate-900 mb-1">{adminLoading ? '...' : adminStats?.pendingExperts || 0}</p>
                <p className="text-slate-500 font-medium">Bekleyen Uzman</p>
              </div>
            </Card>
          </Link>

          <Link to="/admin" className="block outline-none">
            <Card className="p-6 rounded-[24px] border-slate-100 shadow-sm bg-white relative overflow-hidden group hover:shadow-md hover:border-rose-200 transition-all cursor-pointer h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                  <AlertTriangle size={24} className="text-rose-600" />
                </div>
                {(adminStats?.pendingReports ?? 0) > 0 && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <div>
                <p className="text-4xl font-bold text-slate-900 mb-1">{adminLoading ? '...' : adminStats?.pendingReports || 0}</p>
                <p className="text-slate-500 font-medium">İncelenecek Rapor</p>
              </div>
            </Card>
          </Link>
        </div>

        {/* Bottom Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={20} className="text-indigo-500" />
                  Son Raporlar ve Şikayetler
                </h2>
                <Link to="/admin" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
                  Tümünü Gör →
                </Link>
              </div>

              <div className="space-y-4">
                {adminLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                ) : adminReports.length === 0 ? (
                  <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <CheckCircle size={32} className="mx-auto text-emerald-500 mb-3" />
                    <p className="text-gray-900 font-medium">Harika! Bekleyen hiçbir rapor yok.</p>
                  </div>
                ) : (
                  adminReports.map(report => (
                    <div key={report.id} className="group flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!report.status || report.status === 'PENDING' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
                        <AlertTriangle size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 truncate">{report.targetType} Raporu</p>
                          <Badge variant={!report.status || report.status === 'PENDING' ? 'danger' : 'default'} className="shrink-0">
                            {report.status || 'BEKLİYOR'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{report.reason}</p>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Clock size={12} /> {report.createdAt ? formatDateTime(report.createdAt) : 'Tarih yok'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Haftalık Büyüme</h3>
                <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                  Platformunuza son 7 gün içinde yeni katılan kullanıcı sayısı. Büyüme ivmesini buradan takip edin.
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">{adminLoading ? '...' : adminStats?.newUsersThisWeek || 0}</span>
                  <span className="text-emerald-400 font-medium flex items-center text-sm">
                    <ArrowRight size={16} className="-rotate-45" /> Yeni üye
                  </span>
                </div>
              </div>
              <TrendingUp size={160} className="absolute -right-10 -bottom-10 text-white opacity-5 pointer-events-none" />
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-purple-500" />
                Hızlı Erişim
              </h3>
              <div className="space-y-2">
                <Link to="/admin" className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700">Tüm Yönetim İşlemleri</span>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-indigo-600">
                    <ArrowRight size={14} />
                  </div>
                </Link>
                <Link to="/settings" className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group text-left">
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700">Sistem Ayarları</span>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-indigo-600">
                    <Settings size={14} />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
}
