const routePreloaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/DashboardPage'),
  '/cocuklarim': () => import('@/pages/ChildrenPage'),
  '/tedavi': () => import('@/pages/TreatmentPage'),
  '/notlar': () => import('@/pages/NotesPage'),
  '/takvim': () => import('@/pages/CalendarPage'),
  '/mesajlar': () => import('@/pages/MessagesPage'),
  '/gruplar': () => import('@/pages/GroupsPage'),
  '/forum': () => import('@/pages/ForumPage'),
  '/dertlesme-duvari': () => import('@/pages/SupportWallPage'),
  '/benzer-aileler': () => import('@/pages/SimilarFamiliesPage'),
  '/similar-families': () => import('@/pages/SimilarFamiliesPage'),
  '/bulusmalar': () => import('@/pages/MeetupsPage'),
  '/haftalik-soru': () => import('@/pages/WeeklyQuestionPage'),
  '/ayarlar': () => import('@/pages/SettingsPage'),
  '/settings': () => import('@/pages/SettingsPage'),
  '/bilgi-bankasi': () => import('@/pages/KnowledgePage'),
  '/uzmanlar': () => import('@/pages/ExpertsPage'),
  '/arama': () => import('@/pages/DashboardPage'),
  '/randevular': () => import('@/pages/AppointmentPage'),
  '/appointments': () => import('@/pages/AppointmentPage'),
  '/danisanlarim': () => import('@/pages/PatientsPage'),
  '/patients': () => import('@/pages/PatientsPage'),
  '/expert/patients': () => import('@/pages/PatientsPage'),
  '/bep-raporu': () => import('@/pages/BepGeneratorPage'),
  '/tarama': () => import('@/pages/ChildrenPage'),
  '/gunluk-takip': () => import('@/pages/DailyTrackerPage'),
  '/gelisim-paneli': () => import('@/pages/AnalyticsPage'),
  '/sosyal-hikayeler': () => import('@/pages/TreatmentPage'),
  '/kriz-rehberi': () => import('@/pages/CrisisGuidePage'),
  '/gorevler': () => import('@/pages/TasksPage'),
  '/tasks': () => import('@/pages/TasksPage'),
  '/rutinler': () => import('@/pages/RoutinesPage'),
  '/mekanlar': () => import('@/pages/ExpertsPage'),
  '/profil': () => import('@/pages/ProfilePage'),
  '/davranis-gunlugu': () => import('@/pages/NotesPage'),
  '/duyusal-profil': () => import('@/pages/NotesPage'),
  '/haklar-rehberi': () => import('@/pages/KnowledgePage'),
  '/okul-defteri': () => import('@/pages/NotesPage'),
  '/hedef-token': () => import('@/pages/TasksPage'),
  '/acil-kart': () => import('@/pages/EmergencyCardPage'),
  '/beslenme': () => import('@/pages/DailyTrackerPage'),
  '/paylasimli-ilerleme': () => import('@/pages/SettingsPage'),
  '/uzman-harita': () => import('@/pages/ExpertsPage'),
  '/ebeveyn-refahi': () => import('@/pages/DailyTrackerPage'),
  '/kullanici-rehberi': () => import('@/pages/UserGuidePage'),
  '/yardim': () => import('@/pages/HelpPage'),
  '/admin': () => import('@/pages/admin/AdminOverviewPage'),
  '/admin/analytics': () => import('@/pages/admin/AdminAnalyticsPage'),
  '/admin/experts': () => import('@/pages/admin/AdminExpertsPage'),
  '/admin/users': () => import('@/pages/admin/AdminUsersPage'),
  '/admin/content': () => import('@/pages/admin/AdminArticlesPage'),
  '/admin/reports': () => import('@/pages/admin/AdminReportsPage'),
  '/admin/auditlog': () => import('@/pages/admin/AdminAuditLogPage'),
  '/admin/settings': () => import('@/pages/admin/AdminSettingsPage'),
};

const prefetched = new Set<string>();

function normalizedRoute(to: string) {
  const [path] = to.split(/[?#]/);
  if (path.startsWith('/cocuklarim/')) return '/cocuklarim';
  if (path.startsWith('/profil/')) return '/profil';
  return path;
}

export function prefetchRoute(to: string) {
  const path = normalizedRoute(to);
  const load = routePreloaders[path];
  if (!load || prefetched.has(path)) return;
  prefetched.add(path);
  load().catch(() => prefetched.delete(path));
}

export function prefetchCommonRoutes() {
  ['/', '/gunluk-takip', '/cocuklarim', '/takvim', '/randevular', '/gelisim-paneli', '/rutinler', '/notlar']
    .forEach(prefetchRoute);
}
