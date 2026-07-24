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
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { calendarService } from '@/services/calendarService';
import { appointmentService } from '@/services/appointmentService';
import { patientService } from '@/services/patientService';
import { noteService } from '@/services/noteService';
import { messagingService } from '@/services/messagingService';
import { moodService } from '@/services/moodService';
import { medicationService } from '@/services/medicationService';
import { sensoryProfileService } from '@/services/sensoryProfileService';
import { emergencyCardService } from '@/services/emergencyCardService';
import { wellbeingService } from '@/services/wellbeingService';
import { behaviorJournalService } from '@/services/behaviorJournalService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { NotificationPermissionBanner } from '@/components/notifications/NotificationPermissionBanner';
import { toast } from '@/store/toastStore';
import { formatDateTime } from '@/utils/date';
import type { AdminStats, AppointmentRecord, CalendarEvent, DevelopmentNote, ExpertStats, ExpertTask, Medication, MoodEntry, PatientSummary, Report, ExpertConnectionRequest } from '@/types';

// Fix: parse gerçek adı — "Dr. Kemal Aydın" → "Kemal"
const HONORIFICS = new Set(['Dr.', 'Prof.', 'Av.', 'Doç.', 'Op.', 'Uzm.', 'Yrd.', 'Fzt.']);



function getFirstName(fullName?: string): string {
  if (!fullName) return '';
  const parts = fullName.split(' ').filter(Boolean);
  const name = parts.find(p => !HONORIFICS.has(p)) || parts[0] || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Fix: UTC yerine yerel tarih karşılaştırması
function getLocalDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}



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

function getPendingMedicationSlots(medications: Medication[]): number {
  return medications.reduce((count, med) => {
    const scheduledTimes = med.scheduledTimes ?? [];
    return count + scheduledTimes.filter((time) => !med.todayLogs?.some((log) => log.scheduledTime === time && log.taken)).length;
  }, 0);
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

export function DashboardPage() {
  const { user } = useAuthStore();
  const { children, selectedChild, setChildren, setSelectedChild, addChild } = useChildStore();
  const { subscribe, unsubscribe } = useWebSocket();

  // Onboarding & Wizard States
  const [visitedRoutes, setVisitedRoutes] = useState<Set<string>>(new Set());
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('settings-focus-mode') === 'true');
  const [wizardForm, setWizardForm] = useState({ name: '', birthDate: '', gender: '' });
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState('');

  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [recentNotes, setRecentNotes] = useState<DevelopmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [todayMeds, setTodayMeds] = useState<Medication[]>([]);
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

  // Discovery Quest States
  const [hasSensoryProfile, setHasSensoryProfile] = useState(false);
  const [hasEmergencyCard, setHasEmergencyCard] = useState(false);
  const [hasWellbeingLog, setHasWellbeingLog] = useState(false);
  const [hasBehaviorLog, setHasBehaviorLog] = useState(false);

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
        }
      }).finally(() => setExpertLoading(false));
    } else if (user?.role === 'ADMIN') {
      // Import dynamically or assume global service existence, wait we can just import it at top.
      import('@/services/adminService').then(({ adminService }) => {
        Promise.allSettled([
          adminService.getStats().then(setAdminStats),
          adminService.getReports().then(data => setAdminReports(data.slice(0, 5)))
        ]).finally(() => setAdminLoading(false));
      }).catch(() => setAdminLoading(false));
    } else {
      Promise.allSettled([
        childService.getAll().then(data => {
          setChildren(data);
          if (data.length > 0 && (!selectedChild || !data.some((child) => child.id === selectedChild.id))) {
            setSelectedChild(data[0]);
          }
          return data;
        }),
        calendarService.getUpcoming().then(events => setUpcomingEvents(events.slice(0, 5))),
        messagingService.getUnreadCount().then(setUnreadMessagesCount),
        patientService.getConnectionRequests().then(setConnectionRequests),
        patientService.getActiveConnections().then(setActiveConnections),
      ]).finally(() => setLoading(false));
    }
  }, [selectedChild, setChildren, setSelectedChild, user?.role]);

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
    if (!loading && user?.role === 'PARENT' && children.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWelcomeWizard(true);
    }
  }, [loading, children, user?.role]);

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

  useEffect(() => {
    if (user?.role === 'EXPERT' || user?.role === 'ADMIN') return;
    const activeChild = selectedChild || children[0];
    if (!activeChild) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecentNotes([]);
      setHasSensoryProfile(false);
      setHasEmergencyCard(false);
      setHasWellbeingLog(false);
      setHasBehaviorLog(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    noteService.getRecent(activeChild.id)
      .then((notes) => setRecentNotes(notes.slice(0, 3)))
      .catch(() => setRecentNotes([]));

    moodService.getByChild(activeChild.id)
      .then(entries => setTodayMood(entries.find(e => e.entryDate === today) ?? null))
      .catch(() => {});

    medicationService.getByChild(activeChild.id)
      .then(meds => setTodayMeds(meds.filter(m => m.isActive !== false)))
      .catch(() => {});

    sensoryProfileService.get(activeChild.id)
      .then((data) => setHasSensoryProfile(!!data))
      .catch(() => setHasSensoryProfile(false));

    emergencyCardService.get(activeChild.id)
      .then((data) => setHasEmergencyCard(!!data))
      .catch(() => setHasEmergencyCard(false));

    wellbeingService.getAll()
      .then((list) => setHasWellbeingLog(list.length > 0))
      .catch(() => setHasWellbeingLog(false));

    behaviorJournalService.getByChild(activeChild.id)
      .then((list) => setHasBehaviorLog(list.length > 0))
      .catch(() => setHasBehaviorLog(false));
  }, [children, selectedChild, user?.role]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  })();

  const activeChild = selectedChild || children[0] || null;
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
  const pendingMedicationSlots = getPendingMedicationSlots(todayMeds);
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

    // İlaç — sadece bekleyen varsa; gecikmiş bir doz her zaman en acil iştir
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

    // Topluluk — kullanıcıya haber verir ama günlük akışı bölmeyecek kadar düşük önceliklidir.
    const hasVisitedCommunity = [
      '/haftalik-soru',
      '/forum',
      '/benzer-aileler',
      '/dertlesme-duvari',
      '/bulusmalar',
    ].some(route => visitedRoutes.has(route));

    tasks.push({
      to: '/haftalik-soru',
      icon: Users,
      title: hasVisitedCommunity ? 'Topluluk alanlarını takip et' : 'Topluluğu keşfet',
      detail: hasVisitedCommunity
        ? 'Haftanın sorusu, forum ve benzer aileler alanında yeni paylaşımları görebilirsiniz.'
        : 'Haftanın sorusuna bakın; benzer süreçlerden geçen aileleri ve paylaşımları görün.',
      duration: '1 dk',
      done: hasVisitedCommunity,
      urgency: 6,
      tone: 'bg-purple-50 text-purple-700 ring-purple-100',
      cta: 'Topluluğa bak',
      doneCta: 'Yeni paylaşımlar',
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
        urgency: 5,
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
      stepNumber === 1 ? 'Şimdi bunu yap' :
      stepNumber === 2 ? 'Sonra' :
      ('safety' in task && task.safety) ? 'Güvenlik' :
      'İsteğe bağlı';
    return { ...task, priorityLabel, stepNumber };
  });
  const completedTodayTasks = todayTasks.filter((task) => task.done).length;
  const pendingTodayTasks = todayTasks.filter((task) => !task.done);
  const todayProgressPct = Math.round((completedTodayTasks / todayTasks.length) * 100);
  const allTodayTasksDone = completedTodayTasks === todayTasks.length;

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

  // Toplam tahmini süre (bekleyen görevler)
  const pendingMinutes = pendingTodayTasks.reduce((acc, t) => {
    const match = t.duration.match(/(\d+)/);
    return acc + (match ? parseInt(match[1], 10) : 0);
  }, 0);
  const pendingTimeLabel = pendingMinutes >= 60
    ? `~${Math.round(pendingMinutes / 60)} saat`
    : pendingMinutes > 0 ? `~${pendingMinutes} dakika` : '';
  // Progress bar rengi: kırmızı → sarı → yeşil
  const progressBarColor = todayProgressPct >= 80
    ? 'from-emerald-400 to-emerald-500'
    : todayProgressPct >= 50
      ? 'from-amber-400 to-yellow-500'
      : todayProgressPct >= 20
        ? 'from-orange-400 to-amber-500'
        : 'from-rose-400 to-red-500';
  // Kişisel ve dinamik coach notu
  const childFirstName = activeChild ? getFirstName(activeChild.name) : '';
  const coachHour = new Date().getHours();
  const coachTimeOfDay = coachHour < 12 ? 'sabah' : coachHour < 17 ? 'öğleden sonra' : 'akşam';
  const dailyCoachNote = !activeChild
    ? 'Bugün yalnızca profil oluşturmanız yeterli. Diğer alanlar profil sonrası anlam kazanır.'
    : allTodayTasksDone
      ? `${childFirstName} için bugünkü tüm işler tamam! 🎉 İsterseniz gelişim planına veya bilgi bankasına geçebilirsiniz.`
      : pendingMedicationSlots > 0
        ? `${childFirstName} için ${coachTimeOfDay} önce ilaç kontrolünü bitirmek iyi olur; kalan ${pendingTodayTasks.length - 1} iş daha kısa sürer.`
        : !todayMood
          ? `${childFirstName} için önce kısa günlük kaydı girin — ${coachTimeOfDay} rutini tamamlanmış hissettiriyor.`
          : nextEvent
            ? `${childFirstName} için bugün planlı bir etkinlik var; kalan ${pendingTodayTasks.length} iş kısa tutulabilir.`
            : completedTodayTasks > 0
              ? `${childFirstName} için ${completedTodayTasks} iş tamam, ${pendingTodayTasks.length} iş kaldı. ${coachTimeOfDay.charAt(0).toUpperCase() + coachTimeOfDay.slice(1)} güzel gidiyor!`
              : `${childFirstName} için ${coachTimeOfDay} planı: kayıt, kısa takvim kontrolü ve bir not. Hepsi ${pendingTimeLabel}.`;

  if (user?.role === 'ADMIN') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {greeting}, {getFirstName(user?.fullName)}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Platform yönetim merkezine hoş geldiniz. İşte bugünkü güncel durum.</p>
        </div>

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

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{greeting}</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            {firstName || 'Merhaba'}
            {activeChild && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100/60 text-sm font-extrabold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {activeChild.name}
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
          <Link
            to="/kriz-rehberi"
            className="relative group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 shadow-sm transition-all duration-300 font-bold text-sm overflow-hidden"
          >
            <span className="absolute -top-10 -left-10 w-20 h-20 bg-rose-200/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            <AlertTriangle size={15} className="text-rose-600 animate-bounce" />
            <span>Zor An</span>
          </Link>
        </div>
      </div>

      <NotificationPermissionBanner />

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

      {!loading && !focusMode && (
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { to: '/topluluk', icon: Users, title: 'Ailelerle konuş', text: 'Benzer süreçlerden geçen aileleri bul, önce güvenle mesajlaş.', tone: 'from-violet-600 to-indigo-600' },
            { to: '/uzmanlar', icon: GraduationCap, title: 'Uzmanla görüş', text: 'Doğrulanmış uzmanları karşılaştır, uygun saat için randevu al.', tone: 'from-blue-600 to-cyan-600' },
            { to: '/gunluk-takip', icon: Activity, title: 'Gelişimi kaydet', text: 'Bugünün kısa kaydını ekle ve ilerlemeyi görünür kıl.', tone: 'from-emerald-600 to-teal-600' },
          ].map(({ to, icon: Icon, title, text, tone }) => (
            <Link key={to} to={to} className={`group rounded-[24px] bg-gradient-to-br ${tone} p-5 text-white shadow-md transition hover:-translate-y-1 hover:shadow-xl`}>
              <Icon size={23} />
              <h2 className="mt-5 text-xl font-black">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-white/80">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold">Başla <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </section>
      )}

      {!loading && (
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-white to-indigo-50/30 p-6 sm:p-8 shadow-md shadow-slate-100/60 border border-slate-200/80">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-100/40 to-purple-100/40 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3 py-1 border border-indigo-200/50">
                  <Target size={14} className="text-indigo-600 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">GÖREV MERKEZİ</span>
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
                  ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{activeChild.name} için {todayTasks.length} görev</span>
                      {!allTodayTasksDone && pendingTodayTasks.length > 0 && pendingTimeLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-600">
                          <Timer size={11} />
                          {pendingTimeLabel}
                        </span>
                      )}
                      {allTodayTasksDone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <CheckCircle size={11} />
                          Tümü tamamlandı!
                        </span>
                      )}
                    </span>
                  )
                  : 'Önce profil oluşturun; sonra günlük takip ve randevu akışı açılır.'}
              </p>
            </div>
            {/* İlerleme Widget — Compact & Sleek */}
            <div className="w-full shrink-0 sm:w-52 rounded-2xl bg-white/90 backdrop-blur-sm p-4 border border-slate-100 shadow-md shadow-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İlerleme</span>
                <span className="text-xs font-bold text-slate-500">
                  {completedTodayTasks}/{todayTasks.length} bitti
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2.5">
                <span
                  className={`text-3xl font-black tracking-tighter transition-colors duration-500 ${
                    todayProgressPct >= 80 ? 'text-emerald-600' :
                    todayProgressPct >= 50 ? 'text-amber-500' :
                    todayProgressPct >= 20 ? 'text-orange-500' : 'text-rose-500'
                  }`}
                >
                  {todayProgressPct}%
                </span>
                {todayProgressPct > 0 && todayProgressPct < 100 && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    ({pendingTodayTasks.length} kaldı)
                  </span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/30">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out ${progressBarColor}`}
                  style={{ width: `${todayProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* AI Günlük Tavsiye (dailyCoachNote) */}
          <div className="relative z-10 mb-6 rounded-2xl border border-indigo-100/60 bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/30 backdrop-blur-md px-5 py-4.5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 border border-indigo-200/30 shadow-sm">
                <Sparkles size={16} className="text-indigo-600 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-700/80 uppercase tracking-wider">GÜNLÜK AKILLI KOÇ ÖNERİSİ</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-indigo-950">{dailyCoachNote}</p>
              </div>
            </div>
          </div>

          {allTodayTasksDone && (
            <div className="relative z-10 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-200 shadow-sm">
                  <CheckCircle size={17} />
                </span>
                <div>
                  <p className="text-sm font-black text-emerald-950">Bugünün görevleri tamamlandı</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
                    {childFirstName ? `${childFirstName} için temel kayıtlar hazır.` : 'Temel kayıtlar hazır.'} Aşağıdaki önem sırasına göre gelişim, rutin ve destek adımlarına geçebilirsin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Clean, Uniform Task List */}
          <div className="relative z-10 flex flex-col gap-3.5">
            {guidedTodayTasks.map((task, idx) => {
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
        </section>
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
