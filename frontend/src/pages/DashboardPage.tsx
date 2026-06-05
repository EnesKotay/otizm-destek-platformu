import { useEffect, useRef, useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Award, Baby, BarChart2, Bell, Brain, Calendar, CheckCircle, ChevronDown, ChevronUp, ClipboardList, Clock, FileText, GraduationCap, Heart, MessageCircle, Pill, Plus, Settings, ShieldCheck, Sparkles, Target, Timer, TrendingUp, UserPlus, Users, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
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
import type { AdminStats, AppointmentRecord, CalendarEvent, DevelopmentNote, ExpertStats, ExpertTask, Medication, MoodEntry, Milestone, PatientSummary, Report } from '@/types';

// Fix: parse gerçek adı — "Dr. Kemal Aydın" → "Kemal"
const HONORIFICS = new Set(['Dr.', 'Prof.', 'Av.', 'Doç.', 'Op.', 'Uzm.', 'Yrd.', 'Fzt.']);
function getFirstName(fullName?: string): string {
  if (!fullName) return '';
  const parts = fullName.split(' ').filter(Boolean);
  return parts.find(p => !HONORIFICS.has(p)) || parts[0] || '';
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
  // Expert-specific stats
  const [expertAppointments, setExpertAppointments] = useState<AppointmentRecord[]>([]);
  const [todayAppointmentCount, setTodayAppointmentCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [expertLoading, setExpertLoading] = useState(true);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [myTasks, setMyTasks] = useState<ExpertTask[]>([]);
  const [expertStats, setExpertStats] = useState<ExpertStats | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [quickNote, setQuickNote] = useState({ open: false, patientId: '', content: '' });
  const [savingNote, setSavingNote] = useState(false);
  const [hasAvailability, setHasAvailability] = useState(false);
  
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
  const firstName = user?.fullName?.split(' ')[0];
  const primaryActions = [
    { to: '/tedavi', label: 'Günlük plan', icon: Activity },
    { to: '/notlar', label: 'Not ekle', icon: Plus },
    { to: '/calendar', label: 'Takvim', icon: Calendar },
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
  const activeChildAge = getAgeLabel(activeChild?.birthDate);
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

  if (user?.role === 'ADMIN') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {greeting}, {user?.fullName?.split(' ')[0]}
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
                <button onClick={() => toast.info('Sistem ayarları yapım aşamasında.')} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group text-left">
                  <span className="text-sm font-semibold text-gray-700">Sistem Ayarları</span>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400">
                    <Settings size={14} />
                  </div>
                </button>
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
        setQuickNote({ open: false, patientId: '', content: '' });
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
                {profilePct < 100 && <Badge className="bg-white/10 text-slate-200 border-none">Profil %{profilePct}</Badge>}
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
                  onClick={() => setQuickNote(q => ({ ...q, open: true }))}
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
          {/* #1 Today's appointments with approve/reject on pending */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-teal-500" /> Bugünün Randevuları
            </h3>
            <div className="space-y-2 flex-1">
              {todayAppointments.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
                    {a.childName?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.childName}</p>
                    <p className="text-xs text-gray-500">{a.time} · {a.type === 'ONLINE' ? 'Online' : 'Yüz Yüze'}</p>
                  </div>
                  {a.status === 'PENDING' ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleConfirm(a.id)}
                        disabled={actioningId === a.id}
                        className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Onayla"
                      >
                        <CheckCircle size={15} />
                      </button>
                      <button
                        onClick={() => handleCancel(a.id)}
                        disabled={actioningId === a.id}
                        className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                        title="İptal"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  ) : (
                    <Badge variant={a.status === 'CONFIRMED' ? 'success' : 'default'}>
                      {a.status === 'CONFIRMED' ? 'Onaylı' : a.status === 'COMPLETED' ? 'Tamamlandı' : a.status}
                    </Badge>
                  )}
                </div>
              ))}
              {todayAppointments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Bugün randevu bulunmuyor</p>
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

            {/* #4 Quick note */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <button
                type="button"
                onClick={() => setQuickNote(q => ({ ...q, open: !q.open }))}
                className="w-full flex items-center justify-between font-semibold text-gray-900"
              >
                <span className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-500" /> Hızlı Not Ekle
                </span>
                {quickNote.open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {quickNote.open && (
                <div className="mt-3 space-y-2">
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
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* #5 Patient activity feed */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={16} className="text-emerald-500" /> Son Danışan Aktivitesi
            </h3>
            {recentPatients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Henüz danışan yok</p>
            ) : (
              <div className="space-y-2">
                {recentPatients.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-700">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        Son seans: {p.lastSession ? new Date(p.lastSession).toLocaleDateString('tr-TR') : 'Yok'} · {p.tasksCompleted}/{p.totalTasks} görev
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${p.totalTasks > 0 ? Math.round((p.tasksCompleted / p.totalTasks) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {p.totalTasks > 0 ? Math.round((p.tasksCompleted / p.totalTasks) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
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
              <div className="grid grid-cols-3 gap-3 mb-4">
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

              {/* #9 Mini analytics chart */}
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
                  {pendingTasks.map(t => (
                    <div key={t.id} className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                        <ClipboardList size={13} className="text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                        {t.dueDate && (
                          <p className="text-xs text-gray-400">Bitiş: {new Date(t.dueDate).toLocaleDateString('tr-TR')}</p>
                        )}
                      </div>
                    </div>
                  ))}
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
      <PageOnboarding
        pageId="dashboard"
        title="Gösterge Paneline Hoş Geldiniz"
        description="Çocuğunuzun günlük özetini buradan takip edebilirsiniz."
        steps={[
          {
            icon: <Activity size={20} />,
            title: "Günlük Plan",
            description: "Her gün yapmanız önerilen aktiviteleri görün."
          },
          {
            icon: <Calendar size={20} />,
            title: "Yaklaşan Etkinlikler",
            description: "Randevu ve planlanmış etkinliklerinizi takip edin."
          },
          {
            icon: <Brain size={20} />,
            title: "Duygu Durumu",
            description: "Çocuğunuzun o günkü duygu durumunu ve buna uygun tavsiyeleri görün."
          }
        ]}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{greeting}</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
                  {firstName ? `${firstName}, bugün sade bir akışla ilerleyelim` : 'Bugün sade bir akışla ilerleyelim'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  {activeChild
                    ? `${activeChild.name} için ${planTotalMinutes} dakikalık destek akışı, duygu durumu ve yaklaşan işler hazır.`
                    : 'İlk çocuk profilini eklediğinizde günlük planınız burada görünecek.'}
                </p>
                {children.length > 1 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {children.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedChild(c)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${activeChild?.id === c.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {primaryActions.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {activeChild && (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {careSignals.map(({ label, value, detail, icon: Icon, className }) => {
                  const isMoodMissing = label === 'Ruh hali' && !todayMood;
                  const inner = (
                    <div className={`rounded-xl px-4 py-3 ring-1 h-full ${className} ${isMoodMissing ? 'hover:ring-2 transition-all' : ''}`}>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-current">
                        <Icon size={15} />
                        {label}
                      </div>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{detail}</p>
                      {isMoodMissing && (
                        <p className="mt-1.5 text-xs font-semibold text-current opacity-75">+ Kaydet →</p>
                      )}
                    </div>
                  );
                  return isMoodMissing
                    ? <Link key={label} to="/gunluk-takip">{inner}</Link>
                    : <div key={label}>{inner}</div>;
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6 lg:border-l lg:border-t-0">
            {activeChild ? (
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Aktif odak</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-lg font-bold text-white shadow-sm">
                      {activeChild.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-slate-950">{activeChild.name}</h2>
                      <p className="text-sm text-slate-500">{activeChildAge}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(activeChildTherapies.length > 0 ? activeChildTherapies.slice(0, 3) : ['Günlük destek akışı']).map((therapy) => (
                      <Badge key={therapy} variant="info" className="bg-white text-primary-700 ring-1 ring-primary-100">
                        {therapy}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Hazırlık</span>
                    <span className="font-bold text-primary-700">{readinessPct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${readinessPct}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {readinessChecks.map((item) => (
                      <div key={item.label} className={`flex items-center gap-2 text-xs font-medium ${item.done ? 'text-emerald-600' : 'text-slate-500'}`}>
                        <span className={`h-2 w-2 rounded-full shrink-0 ${item.done ? 'bg-emerald-500' : 'bg-orange-300'}`} />
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                    <Baby size={22} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">Profil bekleniyor</p>
                  <p className="mt-1 text-sm text-slate-500">Günlük akış için çocuk profili ekleyin.</p>
                  <Link
                    to="/cocuklarim"
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-primary-600 px-3 text-xs font-bold text-white transition-colors hover:bg-primary-700"
                  >
                    <Plus size={14} />
                    İlk profili ekle
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {!loading && !activeChild && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {parentStartSteps.map(({ to, icon: Icon, title, detail, cta, tone }) => (
            <Link
              key={title}
              to={to}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${tone}`}>
                <Icon size={20} />
              </span>
              <h2 className="mt-4 text-sm font-bold text-slate-950">{title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{detail}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary-700">
                {cta}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* Today's quick readiness banner — sabah nötr mavi, öğleden sonra amber */}
      {!loading && activeChild && readinessPct < 100 && (() => {
        const isAfternoon = new Date().getHours() >= 14;
        return (
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${isAfternoon ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm font-semibold ${isAfternoon ? 'text-amber-800' : 'text-blue-800'}`}>Bugünün hazırlığı tamamlanmadı</p>
                <span className={`text-sm font-bold ${isAfternoon ? 'text-amber-700' : 'text-blue-700'}`}>{readinessPct}%</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isAfternoon ? 'bg-amber-200' : 'bg-blue-100'}`}>
                <div className={`h-full rounded-full transition-all ${isAfternoon ? 'bg-amber-500' : 'bg-blue-400'}`} style={{ width: `${readinessPct}%` }} />
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              {readinessChecks.filter(c => !c.done).map(c => (
                <span key={c.label} className={`text-xs font-medium bg-white px-2 py-0.5 rounded-full border ${isAfternoon ? 'border-amber-200 text-amber-700' : 'border-blue-100 text-blue-600'}`}>{c.label}</span>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          parentStats.map(({ to, label, value, icon: Icon, iconClass }) => (
            <Link
              key={`${to}-${label}`}
              to={to}
              className="group rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-2xl font-semibold text-slate-950">{value}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{label}</p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon size={19} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        </div>
      ) : activeChild ? (
        <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Bugünün planı</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{dashboardTodayPlan.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{dashboardTodayPlan.summary}</p>
              </div>
              <Link
                to="/tedavi"
                className="inline-flex h-9 w-fit items-center gap-2 rounded-xl bg-primary-50 px-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100"
              >
                Detay
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-5 space-y-0">
              {dashboardTodayPlan.steps.map((step, index) => {
                const isLast = index === dashboardTodayPlan.steps.length - 1;
                return (
                  <div key={step.title} className="relative flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700 ring-1 ring-primary-100 z-10">
                        {index + 1}
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-slate-100 my-1" />}
                    </div>
                    {/* Step content */}
                    <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">{step.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">{step.detail}</p>
                        </div>
                        <span className="shrink-0 w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                          {step.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Duygu ve takip</p>
                  <h2 className="mt-2 font-semibold text-slate-950">{moodMeta.label}</h2>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${moodMeta.className}`}>
                  <Brain size={18} />
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${moodMeta.barClass}`} style={{ width: moodMeta.width }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{moodMeta.detail}</p>
              {todayMood?.notes && <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-700">{todayMood.notes}</p>}
              {!todayMood && (
                <Link
                  to="/gunluk-takip"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-100 hover:bg-primary-50 transition-colors"
                >
                  <Plus size={12} />
                  Şimdi Kaydet
                </Link>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sıradaki</p>
              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Calendar size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{nextEvent?.title || 'Planlı etkinlik yok'}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {nextEvent ? formatDateTime(nextEvent.startTime) : 'Kısa oyun akışıyla devam edebilirsiniz.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <FileText size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{recentNotes[0]?.title || 'Henüz not yok'}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                      {recentNotes[0]?.content || 'Bugün kısa bir gözlem notu ekleyebilirsiniz.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Baby size={24} />}
            title="Henüz çocuk profili yok"
            description="Profil oluşturduğunuzda günlük plan, duygu takibi, randevular ve uzman paylaşımı tek ekranda birleşir."
            action={
              <Link to="/cocuklarim">
                <Button size="sm">
                  <Plus size={14} className="mr-1" />
                  Profil Oluştur
                </Button>
              </Link>
            }
          />
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <WeeklyTopicWidget variant="dashboard" />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Kısa yollar</h2>
              <p className="mt-1 text-sm text-slate-500">Sık kullanılan aile araçları</p>
            </div>
            <Link to="/uzmanlar" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800">
              Uzmanlar
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { to: '/notlar', label: 'Gelişim notları', icon: FileText, tone: 'text-violet-600 bg-violet-50' },
              { to: '/gunluk-takip', label: 'Günlük takip', icon: Target, tone: 'text-emerald-600 bg-emerald-50' },
              { to: '/mesajlar', label: 'Mesajlar', icon: Bell, tone: 'text-orange-600 bg-orange-50' },
              { to: '/gruplar', label: 'Gruplar', icon: Users, tone: 'text-sky-600 bg-sky-50' },
              { to: '/dertlesme-duvari', label: 'Destek', icon: Heart, tone: 'text-rose-600 bg-rose-50' },
              { to: '/cocuklarim', label: 'Profil', icon: Baby, tone: 'text-blue-600 bg-blue-50' },
            ].map(({ to, label, icon: Icon, tone }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-200 hover:bg-white"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon size={16} />
                </span>
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
