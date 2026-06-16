import { useEffect, useRef, useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Award, Baby, BarChart2, Bell, Brain, Calendar, CalendarCheck, CheckCircle, ClipboardList, Clock, FileText, GraduationCap, Heart, MessageCircle, Pill, Plus, Search, Settings, ShieldCheck, Sparkles, Target, Timer, TrendingUp, UserPlus, Users, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton';
import { WeeklyTopicWidget } from '@/components/WeeklyTopicWidget';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { calendarService } from '@/services/calendarService';
import { appointmentService } from '@/services/appointmentService';
import { patientService } from '@/services/patientService';
import { noteService } from '@/services/noteService';
import { messagingService } from '@/services/messagingService';
import { milestoneService } from '@/services/milestoneService';
import { moodService } from '@/services/moodService';
import { medicationService } from '@/services/medicationService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from '@/store/toastStore';
import { formatDateTime } from '@/utils/date';
import type { AdminStats, AppointmentRecord, CalendarEvent, DevelopmentNote, ExpertStats, ExpertTask, Medication, MoodEntry, Milestone, PatientSummary, Report, ExpertConnectionRequest } from '@/types';

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

function splitTherapies(raw?: string) {
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function buildDashboardTodayPlan(
  therapies: string[],
  notes: DevelopmentNote[],
  eventCount: number,
  todayMood?: MoodEntry | null,
  medications?: Medication[],
) {
  const source = normalizeText(
    `${therapies.join(' ')} ${notes.slice(0, 2).map((note) => `${note.title} ${note.content || ''}`).join(' ')}`
  );

  const hasCommunication = source.includes('iletisim') || source.includes('konus') || source.includes('dil') || source.includes('istek');
  const hasSocial = source.includes('sosyal') || source.includes('goz temasi') || source.includes('aba') || source.includes('davran');
  const hasSensory = source.includes('duyu') || source.includes('ergoter') || source.includes('hassas') || source.includes('regul');
  const steps: Array<{ title: string; detail: string; duration: string }> = [];

  // Eğer bugün ruh hali kötüyse (1-2) duyusal düzenlemeyi öne çek
  const moodLevel = todayMood?.moodLevel ?? 0;
  const hasLowMood = moodLevel > 0 && moodLevel <= 2;

  if (hasLowMood || hasSensory || therapies.length === 0) {
    steps.push({
      title: hasLowMood ? 'Sakinleştirici duyusal mola' : 'Kısa duyusal hazırlık',
      detail: hasLowMood
        ? 'Ruh hali düşük görünüyor — ağır battaniye, derin baskı veya ritimli sallanma ile düzenleme yapın.'
        : 'Geçişlerden önce nefes, baskı ya da minder itme ile bedeni hazırlayın.',
      duration: '4 dk',
    });
  }

  // Alınmamış ilaç varsa hatırlat
  const pendingMeds = medications?.filter(m =>
    (m.scheduledTimes ?? []).some(t => !(m.todayLogs ?? []).find(l => l.scheduledTime === t && l.taken))
  );
  if (pendingMeds && pendingMeds.length > 0) {
    steps.push({
      title: `İlaç kontrolü — ${pendingMeds.map(m => m.name).join(', ')}`,
      detail: `${pendingMeds.length} ilacın bugünkü dozu henüz alınmamış olarak görünüyor.`,
      duration: '2 dk',
    });
  }

  if (hasCommunication || therapies.length === 0) {
    steps.push({
      title: 'İki seçenekle iletişim başlat',
      detail: 'Açık uçlu soru yerine iki net seçenek sunup isteme becerisini destekleyin.',
      duration: '5 dk',
    });
  }

  if (hasSocial || therapies.length === 0) {
    steps.push({
      title: 'Sıra alma oyunu oynayın',
      detail: 'Top, blok ya da kartla önce ben sonra sen ritmi kurun.',
      duration: '6 dk',
    });
  }

  if (steps.length < 3) {
    steps.push({
      title: 'Görsel hikâye ile kapanış',
      detail: 'Kısa bir görsel rutinle günün akışını tamamlayın.',
      duration: '3 dk',
    });
  }

  const moodNote = hasLowMood ? ' Bugünün ruh hali verisi dikkate alındı.' : '';
  return {
    title: eventCount > 0 ? 'Bugün için kısa plan hazır' : 'Evde uygulanabilir günlük destek akışı',
    summary: eventCount > 0
      ? `Takvimde yaklaşan etkinlik olduğu için bugünkü akış kısa ve düzenleyici tutuldu.${moodNote}`
      : `Bugünün odağı kısa tekrarlar, net yönergeler ve baskısız oyun akışı.${moodNote}`,
    steps: steps.slice(0, 3),
  };
}

function getProfileCompleteness(u?: { fullName?: string; bio?: string; expertTitle?: string; profileImageUrl?: string; institution?: string } | null): number {
  if (!u) return 0;
  const checks = [!!u.fullName, !!u.bio, !!u.expertTitle, !!u.profileImageUrl, !!u.institution];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getAgeLabel(birthDate?: string): string {
  if (!birthDate) return 'Yaş bilgisi yok';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 'Yaş bilgisi yok';

  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return 'Yaş bilgisi yok';
  if (months < 24) return `${months} aylık`;

  const years = Math.floor(months / 12);
  const extraMonths = months % 12;
  return extraMonths > 0 ? `${years} yaş ${extraMonths} ay` : `${years} yaş`;
}

function getMoodMeta(mood?: MoodEntry | null) {
  if (!mood) {
    return {
      label: 'Kaydedilmedi',
      detail: 'Bugün duygu kaydı yok',
      className: 'bg-slate-50 text-slate-600 ring-slate-200',
      barClass: 'bg-slate-300',
      width: '20%',
    };
  }

  const moodMap = {
    1: { label: 'Zorlanıyor', detail: 'Daha sakin bir tempo iyi gelir', className: 'bg-rose-50 text-rose-700 ring-rose-200', barClass: 'bg-rose-500' },
    2: { label: 'Hassas', detail: 'Duyusal mola öne alınabilir', className: 'bg-orange-50 text-orange-700 ring-orange-200', barClass: 'bg-orange-500' },
    3: { label: 'Dengeli', detail: 'Planı kısa tekrarlarla sürdürün', className: 'bg-blue-50 text-blue-700 ring-blue-200', barClass: 'bg-blue-500' },
    4: { label: 'İyi', detail: 'Yeni beceri için uygun an', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', barClass: 'bg-emerald-500' },
    5: { label: 'Çok iyi', detail: 'Sosyal oyun eklenebilir', className: 'bg-teal-50 text-teal-700 ring-teal-200', barClass: 'bg-teal-500' },
  }[mood.moodLevel];

  return {
    ...moodMap,
    width: `${mood.moodLevel * 20}%`,
  };
}

function getPendingMedicationSlots(medications: Medication[]): number {
  return medications.reduce((count, med) => {
    const scheduledTimes = med.scheduledTimes ?? [];
    return count + scheduledTimes.filter((time) => !med.todayLogs?.some((log) => log.scheduledTime === time && log.taken)).length;
  }, 0);
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
  const { children, selectedChild, setChildren, setSelectedChild } = useChildStore();
  const { subscribe, unsubscribe } = useWebSocket();
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [recentNotes, setRecentNotes] = useState<DevelopmentNote[]>([]);
  const [thisWeekMilestones, setThisWeekMilestones] = useState<number>(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState<number>(0);
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
        noteService.getCount().then(setNotesCount),
        messagingService.getUnreadCount().then(setUnreadMessagesCount),
        appointmentService.getAll().then(data => {
          const todayStr = getLocalDateString();
          const weekEndDate = new Date();
          weekEndDate.setDate(weekEndDate.getDate() + 7);
          const weekEndStr = getLocalDateString(weekEndDate);
          const upcoming = data.filter(a => {
            const dateStr = (a.date ?? '').slice(0, 10);
            return dateStr >= todayStr && dateStr <= weekEndStr && a.status !== 'CANCELLED';
          });
          setUpcomingAppointments(upcoming.length);
        }),
        patientService.getConnectionRequests().then(setConnectionRequests),
        patientService.getActiveConnections().then(setActiveConnections),
      ]).finally(() => setLoading(false));
    }
  }, [selectedChild, setChildren, setSelectedChild, user?.role]);

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
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    noteService.getRecent(activeChild.id)
      .then((notes) => setRecentNotes(notes.slice(0, 3)))
      .catch(() => setRecentNotes([]));

    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    milestoneService.getByChild(activeChild.id)
      .then((ms: Milestone[]) => setThisWeekMilestones(ms.filter(m => new Date(m.achievedDate) >= oneWeekAgo).length))
      .catch(() => {});

    moodService.getByChild(activeChild.id)
      .then(entries => setTodayMood(entries.find(e => e.entryDate === today) ?? null))
      .catch(() => {});

    medicationService.getByChild(activeChild.id)
      .then(meds => setTodayMeds(meds.filter(m => m.isActive !== false)))
      .catch(() => {});
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
  const activeChildTherapies = splitTherapies(activeChild?.therapies);
  const dashboardTodayPlan = buildDashboardTodayPlan(activeChildTherapies, recentNotes, activeChildEvents.length, todayMood, todayMeds);
  const firstName = getFirstName(user?.fullName);
  const activeChildAge = getAgeLabel(activeChild?.birthDate);
  const primaryActions = [
    {
      to: activeChild ? '/gunluk-takip' : '/cocuklarim',
      label: activeChild ? 'Bugünün kaydını gir' : 'Çocuğumu ekle',
      detail: activeChild ? 'Duygu, uyku ve ilaç bilgisini kısaca işaretleyin.' : 'Bir kez profil oluşturun, site size göre sadeleşsin.',
      icon: activeChild ? Heart : Baby,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
    {
      to: activeChild ? '/randevular' : '/uzmanlar',
      label: activeChild ? 'Randevulara bak' : 'Uzman bul',
      detail: 'Görüşme, mesaj ve uzman desteğine buradan ulaşın.',
      icon: CalendarCheck,
      tone: 'bg-blue-50 text-blue-700 ring-blue-100',
    },
    {
      to: '/kriz-rehberi',
      label: 'Zor bir an yaşıyorum',
      detail: 'Sakinleşme adımlarını ve acil bilgileri hızlıca açın.',
      icon: AlertTriangle,
      tone: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
  ];
  const quickCaptureActions = [
    {
      to: '/gunluk-takip',
      label: 'Bugünün kaydı',
      detail: todayMood ? 'Bugün kaydedildi' : 'Duygu, uyku, ilaç',
      icon: Heart,
      tone: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
    {
      to: '/davranis-gunlugu',
      label: 'Davranış notu',
      detail: 'Davranış gözlemi',
      icon: AlertTriangle,
      tone: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    {
      to: '/notlar',
      label: 'Gözlem notu',
      detail: recentNotes.length ? `${recentNotes.length} son not` : 'Kısa not ekle',
      icon: FileText,
      tone: 'bg-sky-50 text-sky-700 ring-sky-100',
    },
    {
      to: '/takvim',
      label: 'Plan ekle',
      detail: activeChildEvents.length ? `${activeChildEvents.length} yaklaşan` : 'Randevu ve etkinlik',
      icon: Calendar,
      tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    },
  ];
  const parentStartSteps = [
    {
      to: '/cocuklarim',
      icon: Baby,
      title: 'Çocuk profilini oluşturun',
      detail: 'Yaş, tanı, güçlü yanlar ve hassasiyetler günlük planı kişiselleştirir.',
      cta: 'Profil oluştur',
      tone: 'bg-blue-50 text-blue-700 ring-blue-100',
    },
    {
      to: '/gunluk-takip',
      icon: ClipboardList,
      title: 'Bugünün kısa kaydını girin',
      detail: 'Duygu, uyku ve ilaç bilgisi eklenince öneriler daha isabetli olur.',
      cta: 'Takibe başla',
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
    {
      to: '/uzmanlar',
      icon: GraduationCap,
      title: 'Onaylı uzmanları keşfedin',
      detail: 'Şehir, uzmanlık ve puana göre filtreleyip güvenle randevu alın.',
      cta: 'Uzman bul',
      tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    },
    {
      to: '/paylasimli-ilerleme',
      icon: ShieldCheck,
      title: 'Paylaşım kontrolünü sizde tutun',
      detail: 'Gelişim notlarını uzmanla ne zaman paylaşacağınızı siz belirlersiniz.',
      cta: 'Güvenli paylaşım',
      tone: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
  ];
  const parentStats = [
    { to: '/cocuklarim', label: 'Çocuk', value: children.length, icon: Baby, iconClass: 'bg-blue-50 text-blue-600' },
    { to: '/randevular', label: 'Yaklaşan Randevu', value: upcomingAppointments, icon: Calendar, iconClass: 'bg-emerald-50 text-emerald-600' },
    { to: '/notlar', label: 'Not', value: notesCount, icon: TrendingUp, iconClass: 'bg-violet-50 text-violet-600' },
    { to: '/mesajlar', label: 'Okunmamış Mesaj', value: unreadMessagesCount, icon: MessageCircle, iconClass: 'bg-orange-50 text-orange-600' },
    { to: '/cocuklarim', label: 'Bu Hafta Hedef', value: thisWeekMilestones, icon: Award, iconClass: 'bg-yellow-50 text-yellow-600' },
  ];
  const moodMeta = getMoodMeta(todayMood);
  const pendingMedicationSlots = getPendingMedicationSlots(todayMeds);
  const nextEvent = activeChildEvents[0];
  const planTotalMinutes = dashboardTodayPlan.steps.reduce((total, step) => total + (Number.parseInt(step.duration, 10) || 0), 0);
  const readinessChecks = [
    { label: 'Profil', done: Boolean(activeChild) },
    { label: 'Duygu', done: Boolean(todayMood) },
    { label: 'Not', done: recentNotes.length > 0 },
    { label: 'Takvim', done: activeChildEvents.length > 0 },
  ];
  const readinessPct = Math.round((readinessChecks.filter((item) => item.done).length / readinessChecks.length) * 100);
  const careSignals = [
    { label: 'Plan süresi', value: `${planTotalMinutes} dk`, detail: '3 kısa adım', icon: Timer, className: 'bg-sky-50 text-sky-700 ring-sky-100' },
    { label: 'Ruh hali', value: moodMeta.label, detail: moodMeta.detail, icon: Brain, className: moodMeta.className },
    {
      label: 'İlaç',
      value: pendingMedicationSlots > 0 ? `${pendingMedicationSlots} bekliyor` : todayMeds.length > 0 ? 'Tamam' : 'Yok',
      detail: todayMeds.length > 0 ? `${todayMeds.length} aktif takip` : 'Aktif ilaç kaydı yok',
      icon: Pill,
      className: pendingMedicationSlots > 0 ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
  ];
  const todayTasks = activeChild ? [
    {
      to: '/gunluk-takip',
      icon: Heart,
      title: 'Bugünün kısa kaydını gir',
      detail: todayMood
        ? 'Ruh hali girildi; uyku, ilaç veya kısa not ekleyebilirsiniz.'
        : 'Ruh hali, uyku ve ilaç bilgisini 1 dakikada işaretleyin.',
      reason: todayMood ? 'Bugünkü ruh hali kaydı var.' : 'Ruh hali bugün kaydedilmedi.',
      duration: '1 dk',
      done: Boolean(todayMood),
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      cta: todayMood ? 'Güncelle' : 'Kaydet',
      doneCta: 'Kaydı görüntüle',
    },
    {
      to: pendingMedicationSlots > 0 ? '/gunluk-takip' : '/takvim',
      icon: pendingMedicationSlots > 0 ? Pill : CalendarCheck,
      title: pendingMedicationSlots > 0 ? 'İlaç kontrolünü tamamla' : 'Bugünkü planı kontrol et',
      detail: pendingMedicationSlots > 0
        ? `${pendingMedicationSlots} doz bekliyor.`
        : nextEvent
          ? `Sıradaki: ${nextEvent.title}`
          : 'Randevu, okul veya etkinlik varsa takvime ekleyin.',
      reason: pendingMedicationSlots > 0
        ? `${pendingMedicationSlots} ilaç dozu bekliyor.`
        : nextEvent
          ? 'Takvimde yaklaşan etkinlik var.'
          : 'Bugün için takvimde plan görünmüyor.',
      duration: pendingMedicationSlots > 0 ? '2 dk' : '30 sn',
      done: pendingMedicationSlots === 0 && Boolean(nextEvent),
      tone: pendingMedicationSlots > 0 ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-indigo-50 text-indigo-700 ring-indigo-100',
      cta: pendingMedicationSlots > 0 ? 'Kontrol et' : 'Takvimi aç',
      doneCta: 'Planı gör',
    },
    {
      to: unreadMessagesCount > 0 ? '/mesajlar' : '/notlar',
      icon: unreadMessagesCount > 0 ? MessageCircle : FileText,
      title: unreadMessagesCount > 0 ? 'Mesajları yanıtla' : 'Kısa gözlem notu ekle',
      detail: unreadMessagesCount > 0
        ? `${unreadMessagesCount} okunmamış mesaj var.`
        : recentNotes.length > 0
          ? 'Bugüne dair yeni fark ettiğiniz bir şeyi ekleyin.'
          : 'İlk not ilerleme takibini başlatır.',
      reason: unreadMessagesCount > 0
        ? `${unreadMessagesCount} mesaj yanıt bekliyor.`
        : recentNotes.length > 0
          ? 'Son gözlem notu hazır.'
          : 'Henüz gözlem notu yok.',
      duration: unreadMessagesCount > 0 ? '2 dk' : '2 dk',
      done: unreadMessagesCount === 0 && recentNotes.length > 0,
      tone: unreadMessagesCount > 0 ? 'bg-orange-50 text-orange-700 ring-orange-100' : 'bg-sky-50 text-sky-700 ring-sky-100',
      cta: unreadMessagesCount > 0 ? 'Mesajlar' : 'Not ekle',
      doneCta: 'Notları gör',
    },
  ] : [
    {
      to: '/cocuklarim',
      icon: Baby,
      title: 'İlk çocuk profilini oluştur',
      detail: 'Profil eklenince menü ve öneriler çocuğunuza göre sadeleşir.',
      reason: 'Uygulama henüz kime göre kişiselleşeceğini bilmiyor.',
      duration: '3 dk',
      done: false,
      tone: 'bg-blue-50 text-blue-700 ring-blue-100',
      cta: 'Başla',
      doneCta: 'Profili gör',
    },
    {
      to: '/yardim',
      icon: ClipboardList,
      title: 'Uygulamanın kısa yolunu görün',
      detail: 'Hangi sayfanın ne işe yaradığını hızlıca öğrenin.',
      reason: 'İlk girişte menü kalabalık gelebilir.',
      duration: '1 dk',
      done: false,
      tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
      cta: 'Yardımı aç',
      doneCta: 'Yardımı aç',
    },
    {
      to: '/uzmanlar',
      icon: GraduationCap,
      title: 'Uzman desteğini keşfet',
      detail: 'Randevu almadan önce uzman profillerini inceleyebilirsiniz.',
      reason: 'Destek seçeneklerini erken görmek karar vermeyi kolaylaştırır.',
      duration: '2 dk',
      done: false,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      cta: 'Uzman bul',
      doneCta: 'Uzman bul',
    },
  ];
  const firstPendingTaskIndex = todayTasks.findIndex((task) => !task.done);
  const guidedTodayTasks = todayTasks.map((task, index) => ({
    ...task,
    priorityLabel: task.done
      ? 'Tamam'
      : index === firstPendingTaskIndex
        ? 'Şimdi bunu yap'
        : index === firstPendingTaskIndex + 1
          ? 'Sonra'
          : 'İsteğe bağlı',
  }));
  const completedTodayTasks = todayTasks.filter((task) => task.done).length;
  const todayProgressPct = Math.round((completedTodayTasks / todayTasks.length) * 100);
  const allTodayTasksDone = completedTodayTasks === todayTasks.length;
  const dailyCoachNote = !activeChild
    ? 'Bugün yalnızca profil oluşturmanız yeterli. Diğer alanlar profil sonrası anlam kazanır.'
    : allTodayTasksDone
      ? 'Bugünün temel işleri tamam. İsterseniz gelişim planına veya bilgi bankasına geçebilirsiniz.'
      : pendingMedicationSlots > 0
        ? 'Bugün önce ilaç kontrolünü bitirmek iyi olur; diğer işleri kısa tutabilirsiniz.'
        : !todayMood
          ? 'Önce kısa günlük kaydı girin. Kalan işler daha net hale gelir.'
          : nextEvent
            ? 'Bugün planlı bir etkinlik var; not veya mesaj işleri kısa tutulabilir.'
            : 'Bugün düşük yoğunluklu bir plan yeterli: kayıt, kısa takvim kontrolü ve bir not.';

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{greeting}</p>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {firstName || 'Merhaba'}
            {activeChild && (
              <span className="text-slate-400 font-normal text-xl">· {activeChild.name}</span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {children.length > 1 && (
            <div className="flex gap-1.5">
              {children.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChild(c)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    activeChild?.id === c.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <Link
            to="/kriz-rehberi"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-100 transition-colors"
          >
            <AlertTriangle size={15} />
            Zor An
          </Link>
        </div>
      </div>

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
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Görev Merkezi</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">Bugün ne yapacağım?</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeChild
                  ? `${activeChild.name} için en önemli ${todayTasks.length} adım.`
                  : 'Önce profil oluşturun; sonra günlük takip ve randevu akışı açılır.'}
              </p>
            </div>
            <div className="w-full rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100 sm:w-48">
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-600" />
                  {completedTodayTasks}/{todayTasks.length} tamam
                </span>
                <span className="text-slate-400">%{todayProgressPct}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${todayProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-indigo-600" />
              <p className="text-sm font-semibold leading-6 text-indigo-950">{dailyCoachNote}</p>
            </div>
          </div>

          {allTodayTasksDone && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                to="/tedavi"
                className="group rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                Günün işleri tamamlandı. Gelişim planına geç
                <ArrowRight size={13} className="ml-1 inline transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/bilgi-bankasi"
                className="group rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800 transition-colors hover:bg-sky-100"
              >
                Bugün için kısa bir kaynak oku
                <ArrowRight size={13} className="ml-1 inline transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {guidedTodayTasks.map(({ to, icon: Icon, title, detail, reason, duration, done, tone, cta, doneCta, priorityLabel }) => (
              <Link
                key={title}
                to={to}
                className={`group flex min-h-[10.5rem] flex-col justify-between rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                  done
                    ? 'border-emerald-100 bg-emerald-50/35 hover:bg-white'
                    : priorityLabel === 'Şimdi bunu yap'
                      ? 'border-indigo-200 bg-white shadow-sm ring-1 ring-indigo-100 hover:border-indigo-300'
                      : 'border-slate-100 bg-slate-50/70 hover:border-indigo-200 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}>
                    <Icon size={18} />
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                      done
                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                        : priorityLabel === 'Şimdi bunu yap'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-slate-500 ring-1 ring-slate-200'
                    }`}>
                      {priorityLabel}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-slate-100">
                      {duration}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                  <p className="mt-2 rounded-xl bg-white/80 px-2.5 py-1.5 text-[11px] font-semibold leading-4 text-slate-500 ring-1 ring-slate-100">
                    {reason}
                  </p>
                  <span className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${done ? 'text-emerald-700' : 'text-indigo-700'}`}>
                    {done ? doneCta : cta}
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Bugünün Odağı — tek büyük kart ── */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-24" />
              <div className="h-5 bg-slate-100 rounded w-64" />
              <div className="h-3 bg-slate-100 rounded w-48" />
            </div>
          </div>
        </div>
      ) : !activeChild ? (
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
            <Baby size={28} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Başlamak için çocuk profili ekleyin</h2>
          <p className="mt-2 text-slate-500 text-sm max-w-sm mx-auto">
            Profil oluşturunca günlük plan, ruh hali takibi, randevu ve uzman paylaşımı otomatik düzenlenir.
          </p>
          <Link
            to="/cocuklarim"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Profil Ekle
          </Link>
        </div>
      ) : pendingMedicationSlots > 0 ? (
        <Link
          to="/gunluk-takip"
          className="group block rounded-2xl border border-amber-200 bg-amber-50 p-6 hover:bg-amber-100/70 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <Pill size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">İlaç Hatırlatması</p>
              <h2 className="text-xl font-bold text-slate-900">
                {activeChild.name} için {pendingMedicationSlots} doz bekleniyor
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {todayMeds
                  .filter(m => (m.scheduledTimes ?? []).some(t => !(m.todayLogs ?? []).find(l => l.scheduledTime === t && l.taken)))
                  .map(m => m.name)
                  .join(', ')}
              </p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-sm font-semibold text-amber-700 group-hover:translate-x-0.5 transition-transform mt-1">
              Git <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      ) : !todayMood ? (
        <Link
          to="/gunluk-takip"
          className="group block rounded-2xl border border-sky-200 bg-sky-50 p-6 hover:bg-sky-100/70 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center shrink-0">
              <Brain size={24} className="text-sky-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">Günlük Kayıt</p>
              <h2 className="text-xl font-bold text-slate-900">
                {activeChild.name}&apos;in bugünkü ruh hali henüz kaydedilmedi
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                10 saniyede işaretleyin — öneriler daha isabetli olur.
              </p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-sm font-semibold text-sky-700 group-hover:translate-x-0.5 transition-transform mt-1">
              Kaydet <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      ) : nextEvent ? (
        <Link
          to="/takvim"
          className="group block rounded-2xl border border-emerald-200 bg-emerald-50 p-6 hover:bg-emerald-100/70 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Calendar size={24} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Yaklaşan Etkinlik</p>
              <h2 className="text-xl font-bold text-slate-900">{nextEvent.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(nextEvent.startTime)}</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-sm font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform mt-1">
              Görüntüle <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Bugün İyi Gidiyor</p>
              <h2 className="text-xl font-bold text-slate-900">Günün temel kayıtları tamam</h2>
              <p className="mt-1 text-sm text-slate-500">
                Devam etmek için aşağıdaki araçları kullanabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Hızlı Eylemler — 4 kart ── */}
      {!loading && activeChild && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickCaptureActions.map(({ to, label, detail, icon: Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm hover:-translate-y-0.5 transition-all"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tone}`}>
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Bağlı Uzmanlar — kompakt ── */}
      {activeConnections.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Bağlı Uzmanlar</h2>
          </div>
          <div className="space-y-2">
            {activeConnections.map(conn => (
              <div key={conn.id} className="flex items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{conn.expertName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Çocuk: <span className="font-medium text-slate-700">{conn.childName}</span></p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 shrink-0"
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

      {/* ── Bugünün Planı — pratik mini seans ── */}
      {!loading && activeChild && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                  <Timer size={18} />
                </span>
                <p className="text-xs font-bold uppercase text-slate-400">Bugünün Mini Seansı</p>
              </div>
              <h2 className="mt-3 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                {dashboardTodayPlan.title}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{dashboardTodayPlan.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                <Clock size={14} />
                {planTotalMinutes} dk
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle size={14} />
                Baskısız tempo
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-3xl border border-sky-100 bg-sky-50/70 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase text-sky-700">Şimdi başla</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-sky-100">
                  {dashboardTodayPlan.steps[0]?.duration}
                </span>
              </div>
              <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-sky-100">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-lg font-black text-white shadow-sm">
                    1
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-950">{dashboardTodayPlan.steps[0]?.title}</h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{dashboardTodayPlan.steps[0]?.detail}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Ortam', value: 'Sakin' },
                  { label: 'Yönerge', value: 'Net' },
                  { label: 'Bitiş', value: 'Not' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white px-3 py-3 ring-1 ring-sky-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400">{item.label}</p>
                    <p className="mt-1 text-xs font-black text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/tedavi"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-slate-800"
                >
                  Planı Aç
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/notlar"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-sky-100 transition-all hover:bg-sky-50"
                >
                  Seans Notu
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Uygulama akışı</p>
                  <h3 className="mt-1 text-base font-black text-slate-950">Adım adım ilerleyin</h3>
                </div>
                <Link to="/tedavi" className="group inline-flex w-fit items-center gap-1 text-sm font-bold text-indigo-700 hover:text-indigo-800">
                  Detay
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="mt-4 space-y-2.5">
                {dashboardTodayPlan.steps.map((step, i) => (
                  <div
                    key={step.title}
                    className="group grid gap-3 rounded-2xl border border-white bg-white p-3 shadow-sm transition-all hover:border-indigo-100 sm:grid-cols-[auto_1fr_auto]"
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ring-1 ${
                      i === 0
                        ? 'bg-indigo-600 text-white ring-indigo-600'
                        : 'bg-slate-50 text-slate-500 ring-slate-200'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">{step.title}</p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{step.detail}</p>
                    </div>
                    <span className="h-fit w-fit rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
                      {step.duration}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p className="text-sm font-semibold leading-6 text-emerald-900">
                    Zorlanırsa süreyi yarıya indirin. Amaç kusursuz yapmak değil, günü güvenli bir ritimle kapatmak.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Başlangıç adımları — sadece çocuk yoksa ── */}
      {!loading && !activeChild && (
        <section className="grid gap-3 sm:grid-cols-2">
          {parentStartSteps.map(({ to, icon: Icon, title, detail, cta, tone }) => (
            <Link
              key={title}
              to={to}
              className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}>
                <Icon size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-xs text-slate-500 leading-5">{detail}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
                  {cta} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* ── Haftalık konu + Kısa Yollar ── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <WeeklyTopicWidget variant="dashboard" />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Kısa Yollar</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { to: '/notlar', label: 'Gözlem Notları', icon: FileText, tone: 'text-violet-600 bg-violet-50 ring-violet-100' },
              { to: '/gunluk-takip', label: 'Bugünün Kaydı', icon: Target, tone: 'text-emerald-600 bg-emerald-50 ring-emerald-100' },
              { to: '/mesajlar', label: 'Mesajlar', icon: Bell, tone: 'text-orange-600 bg-orange-50 ring-orange-100' },
              { to: '/gruplar', label: 'Gruplar', icon: Users, tone: 'text-sky-600 bg-sky-50 ring-sky-100' },
              { to: '/dertlesme-duvari', label: 'Destek', icon: Heart, tone: 'text-rose-600 bg-rose-50 ring-rose-100' },
              { to: '/uzmanlar', label: 'Uzmanlar', icon: GraduationCap, tone: 'text-indigo-600 bg-indigo-50 ring-indigo-100' },
            ].map(({ to, label, icon: Icon, tone }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2 py-3.5 text-center transition-all hover:border-slate-200 hover:bg-white hover:-translate-y-0.5 hover:shadow-sm"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${tone}`}>
                  <Icon size={17} />
                </span>
                <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
