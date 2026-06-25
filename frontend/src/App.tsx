import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  ADMIN_ONLY,
  ALL_ROLES,
  EXPERT_ADMIN,
  EXPERT_ONLY,
  PARENT_EXPERT,
  PARENT_ONLY,
  ROLE_HOME_PATH,
  canAccessRole,
} from '@/config/roleAccess';
import type { UserRole } from '@/config/roleAccess';
import type { ComponentType, ReactNode } from 'react';

// Eagerly loaded — critical auth path
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyNamed<T extends Record<K, ComponentType<any>>, K extends string>(
  loader: () => Promise<T>,
  exportName: K,
) {
  return lazy(async () => ({ default: (await loader())[exportName] }));
}

const AdminLayout = lazyNamed(() => import('./pages/admin/AdminLayout'), 'AdminLayout');
const AdminOverviewPage = lazyNamed(() => import('./pages/admin/AdminOverviewPage'), 'AdminOverviewPage');
const AdminAnalyticsPage = lazyNamed(() => import('./pages/admin/AdminAnalyticsPage'), 'AdminAnalyticsPage');
const AdminExpertsPage = lazyNamed(() => import('./pages/admin/AdminExpertsPage'), 'AdminExpertsPage');
const AdminUsersPage = lazyNamed(() => import('./pages/admin/AdminUsersPage'), 'AdminUsersPage');
const AdminArticlesPage = lazyNamed(() => import('./pages/admin/AdminArticlesPage'), 'AdminArticlesPage');
const AdminReportsPage = lazyNamed(() => import('./pages/admin/AdminReportsPage'), 'AdminReportsPage');
const AdminAuditLogPage = lazyNamed(() => import('./pages/admin/AdminAuditLogPage'), 'AdminAuditLogPage');
const AdminSettingsPage = lazyNamed(() => import('./pages/admin/AdminSettingsPage'), 'AdminSettingsPage');
const ForgotPasswordPage = lazyNamed(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const NotFoundPage = lazyNamed(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
const SensoryProfilePage = lazyNamed(() => import('@/pages/SensoryProfilePage'), 'SensoryProfilePage');
const DashboardPage = lazyNamed(() => import('@/pages/DashboardPage'), 'DashboardPage');
const ChildrenPage = lazyNamed(() => import('@/pages/ChildrenPage'), 'ChildrenPage');
const ChildDetailPage = lazyNamed(() => import('@/pages/ChildDetailPage'), 'ChildDetailPage');
const TreatmentPage = lazyNamed(() => import('@/pages/TreatmentPage'), 'TreatmentPage');
const NotesPage = lazyNamed(() => import('@/pages/NotesPage'), 'NotesPage');
const CalendarPage = lazyNamed(() => import('@/pages/CalendarPage'), 'CalendarPage');
const MessagesPage = lazyNamed(() => import('@/pages/MessagesPage'), 'MessagesPage');
const GroupsPage = lazyNamed(() => import('@/pages/GroupsPage'), 'GroupsPage');
const ForumPage = lazyNamed(() => import('@/pages/ForumPage'), 'ForumPage');
const SimilarFamiliesPage = lazyNamed(() => import('@/pages/SimilarFamiliesPage'), 'SimilarFamiliesPage');
const SupportWallPage = lazyNamed(() => import('@/pages/SupportWallPage'), 'SupportWallPage');
const SettingsPage = lazyNamed(() => import('@/pages/SettingsPage'), 'SettingsPage');
const KnowledgePage = lazyNamed(() => import('@/pages/KnowledgePage'), 'KnowledgePage');
const ExpertsPage = lazyNamed(() => import('@/pages/ExpertsPage'), 'ExpertsPage');
const SearchPage = lazyNamed(() => import('@/pages/SearchPage'), 'SearchPage');
const OnboardingPage = lazyNamed(() => import('@/pages/OnboardingPage'), 'OnboardingPage');
const ExpertRegisterPage = lazyNamed(() => import('@/pages/ExpertRegisterPage'), 'ExpertRegisterPage');
const PublicLandingPage = lazyNamed(() => import('@/pages/PublicLandingPage'), 'PublicLandingPage');
const PublicInfoPage = lazyNamed(() => import('@/pages/PublicInfoPage'), 'PublicInfoPage');
const AppointmentPage = lazyNamed(() => import('@/pages/AppointmentPage'), 'AppointmentPage');
const PatientsPage = lazyNamed(() => import('@/pages/PatientsPage'), 'PatientsPage');
const BepGeneratorPage = lazyNamed(() => import('@/pages/BepGeneratorPage'), 'BepGeneratorPage');
const ScreeningPage = lazyNamed(() => import('@/pages/ScreeningPage'), 'ScreeningPage');
const DailyTrackerPage = lazyNamed(() => import('@/pages/DailyTrackerPage'), 'DailyTrackerPage');
const AnalyticsPage = lazyNamed(() => import('@/pages/AnalyticsPage'), 'AnalyticsPage');
const SocialStoriesPage = lazyNamed(() => import('@/pages/SocialStoriesPage'), 'SocialStoriesPage');
const CrisisGuidePage = lazyNamed(() => import('@/pages/CrisisGuidePage'), 'CrisisGuidePage');
const TasksPage = lazyNamed(() => import('@/pages/TasksPage'), 'TasksPage');
const RoutinesPage = lazyNamed(() => import('@/pages/RoutinesPage'), 'RoutinesPage');
const VenueMapPage = lazyNamed(() => import('@/pages/VenueMapPage'), 'VenueMapPage');
const ProfilePage = lazyNamed(() => import('@/pages/ProfilePage'), 'ProfilePage');
const BehaviorJournalPage = lazyNamed(() => import('@/pages/BehaviorJournalPage'), 'BehaviorJournalPage');
const RightsGuidePage = lazyNamed(() => import('@/pages/RightsGuidePage'), 'RightsGuidePage');
const PublicEmergencyCardPage = lazyNamed(() => import('@/pages/PublicEmergencyCardPage'), 'PublicEmergencyCardPage');
const SchoolDiaryPage = lazyNamed(() => import('@/pages/SchoolDiaryPage'), 'SchoolDiaryPage');
const GoalTokenPage = lazyNamed(() => import('@/pages/GoalTokenPage'), 'GoalTokenPage');
const EmergencyCardPage = lazyNamed(() => import('@/pages/EmergencyCardPage'), 'EmergencyCardPage');
const NutritionPage = lazyNamed(() => import('@/pages/NutritionPage'), 'NutritionPage');
const SharedProgressPage = lazyNamed(() => import('@/pages/SharedProgressPage'), 'SharedProgressPage');
const ExpertMapPage = lazyNamed(() => import('@/pages/ExpertMapPage'), 'ExpertMapPage');
const WellbeingPage = lazyNamed(() => import('@/pages/WellbeingPage'), 'WellbeingPage');
const HelpPage = lazyNamed(() => import('@/pages/HelpPage'), 'HelpPage');
const UserGuidePage = lazyNamed(() => import('@/pages/UserGuidePage'), 'UserGuidePage');
const ExpertConsultationPage = lazyNamed(() => import('@/pages/ExpertConsultationPage'), 'ExpertConsultationPage');
const ConnectionManagementPage = lazyNamed(() => import('@/pages/ConnectionManagementPage'), 'ConnectionManagementPage');

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      retry: 1, 
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 dakika boyunca veriyi taze kabul et (gereksiz fetch'i engeller)
      gcTime: 10 * 60 * 1000,   // 10 dakika boyunca cache'te tut
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/giris" replace />;
  return <>{children}</>;
}

function RoleRoute({ allowedRoles, children }: { allowedRoles: readonly UserRole[]; children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/giris" replace />;
  if (!canAccessRole(user?.role, allowedRoles)) {
    return <Navigate to={user?.role ? ROLE_HOME_PATH[user.role] : '/'} replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  return <RoleRoute allowedRoles={ADMIN_ONLY}>{children}</RoleRoute>;
}

function ExpertRoute({ children }: { children: ReactNode }) {
  return <RoleRoute allowedRoles={EXPERT_ADMIN}>{children}</RoleRoute>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isOnboardingCompleted } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/giris" replace />;
  if (isOnboardingCompleted()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastContainer />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/giris" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/kayit" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/sifremi-unuttum" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/sifre-sifirla" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/tanitim" element={<PublicLandingPage />} />
            <Route path="/kvkk" element={<PublicInfoPage kind="kvkk" />} />
            <Route path="/gizlilik" element={<PublicInfoPage kind="privacy" />} />
            <Route path="/kullanim-sartlari" element={<PublicInfoPage kind="terms" />} />
            <Route path="/tibbi-uyari" element={<PublicInfoPage kind="medical" />} />
            <Route path="/acil-profil/:id" element={<PublicEmergencyCardPage />} />
            <Route path="/kayit/uzman" element={<Suspense fallback={<PageLoader />}><ExpertRegisterPage /></Suspense>} />
            <Route path="/baslangic" element={<OnboardingRoute><Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense></OnboardingRoute>} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<UserGuidePage />} />
                <Route path="/anasayfa" element={<DashboardPage />} />
                <Route path="/cocuklarim" element={<RoleRoute allowedRoles={PARENT_ONLY}><ChildrenPage /></RoleRoute>} />
                <Route path="/cocuklarim/:id" element={<RoleRoute allowedRoles={PARENT_EXPERT}><ChildDetailPage /></RoleRoute>} />
                <Route path="/tedavi" element={<RoleRoute allowedRoles={PARENT_ONLY}><TreatmentPage /></RoleRoute>} />
                <Route path="/notlar" element={<RoleRoute allowedRoles={PARENT_EXPERT}><NotesPage /></RoleRoute>} />
                <Route path="/takvim" element={<RoleRoute allowedRoles={PARENT_ONLY}><CalendarPage /></RoleRoute>} />
                <Route path="/mesajlar" element={<RoleRoute allowedRoles={ALL_ROLES}><MessagesPage /></RoleRoute>} />
                <Route path="/gruplar" element={<RoleRoute allowedRoles={ALL_ROLES}><GroupsPage /></RoleRoute>} />
                <Route path="/forum" element={<RoleRoute allowedRoles={ALL_ROLES}><ForumPage /></RoleRoute>} />
                <Route path="/dertlesme-duvari" element={<RoleRoute allowedRoles={PARENT_ONLY}><SupportWallPage /></RoleRoute>} />
                <Route path="/benzer-aileler" element={<RoleRoute allowedRoles={PARENT_ONLY}><SimilarFamiliesPage /></RoleRoute>} />
                <Route path="/similar-families" element={<RoleRoute allowedRoles={PARENT_ONLY}><SimilarFamiliesPage /></RoleRoute>} />
                <Route path="/ayarlar" element={<RoleRoute allowedRoles={ALL_ROLES}><SettingsPage /></RoleRoute>} />
                <Route path="/settings" element={<RoleRoute allowedRoles={ALL_ROLES}><SettingsPage /></RoleRoute>} />
                <Route path="/bilgi-bankasi" element={<RoleRoute allowedRoles={ALL_ROLES}><KnowledgePage /></RoleRoute>} />
                <Route path="/uzmanlar" element={<RoleRoute allowedRoles={PARENT_ONLY}><ExpertsPage /></RoleRoute>} />
                <Route path="/arama" element={<RoleRoute allowedRoles={ALL_ROLES}><SearchPage /></RoleRoute>} />
                <Route path="/randevular" element={<RoleRoute allowedRoles={PARENT_EXPERT}><AppointmentPage /></RoleRoute>} />
                <Route path="/appointments" element={<RoleRoute allowedRoles={PARENT_EXPERT}><AppointmentPage /></RoleRoute>} />
                <Route path="/danisanlarim" element={<RoleRoute allowedRoles={EXPERT_ONLY}><PatientsPage /></RoleRoute>} />
                <Route path="/patients" element={<RoleRoute allowedRoles={EXPERT_ONLY}><PatientsPage /></RoleRoute>} />
                <Route path="/expert/patients" element={<RoleRoute allowedRoles={EXPERT_ONLY}><PatientsPage /></RoleRoute>} />
                <Route path="/bep-raporu" element={<RoleRoute allowedRoles={EXPERT_ONLY}><BepGeneratorPage /></RoleRoute>} />
                <Route path="/tarama" element={<RoleRoute allowedRoles={PARENT_ONLY}><ScreeningPage /></RoleRoute>} />
                <Route path="/gunluk-takip" element={<RoleRoute allowedRoles={PARENT_ONLY}><DailyTrackerPage /></RoleRoute>} />
                <Route path="/gelisim-paneli" element={<RoleRoute allowedRoles={PARENT_ONLY}><AnalyticsPage /></RoleRoute>} />
                <Route path="/sosyal-hikayeler" element={<RoleRoute allowedRoles={PARENT_ONLY}><SocialStoriesPage /></RoleRoute>} />
                <Route path="/kriz-rehberi" element={<RoleRoute allowedRoles={PARENT_ONLY}><CrisisGuidePage /></RoleRoute>} />
                <Route path="/gorevler" element={<RoleRoute allowedRoles={PARENT_EXPERT}><TasksPage /></RoleRoute>} />
                <Route path="/tasks" element={<RoleRoute allowedRoles={PARENT_EXPERT}><TasksPage /></RoleRoute>} />
                <Route path="/rutinler" element={<RoleRoute allowedRoles={PARENT_ONLY}><RoutinesPage /></RoleRoute>} />
                <Route path="/mekanlar" element={<RoleRoute allowedRoles={PARENT_ONLY}><VenueMapPage /></RoleRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="experts" element={<AdminExpertsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="content" element={<AdminArticlesPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="auditlog" element={<AdminAuditLogPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
                <Route path="/profil/:id" element={<RoleRoute allowedRoles={ALL_ROLES}><ProfilePage /></RoleRoute>} />
                <Route path="/davranis-gunlugu" element={<RoleRoute allowedRoles={PARENT_ONLY}><BehaviorJournalPage /></RoleRoute>} />
                <Route path="/duyusal-profil" element={<RoleRoute allowedRoles={PARENT_ONLY}><SensoryProfilePage /></RoleRoute>} />
                <Route path="/haklar-rehberi" element={<RoleRoute allowedRoles={PARENT_ONLY}><RightsGuidePage /></RoleRoute>} />
                <Route path="/okul-defteri" element={<RoleRoute allowedRoles={PARENT_ONLY}><SchoolDiaryPage /></RoleRoute>} />
                <Route path="/hedef-token" element={<RoleRoute allowedRoles={PARENT_ONLY}><GoalTokenPage /></RoleRoute>} />
                <Route path="/acil-kart" element={<RoleRoute allowedRoles={PARENT_ONLY}><EmergencyCardPage /></RoleRoute>} />
                <Route path="/beslenme" element={<RoleRoute allowedRoles={PARENT_ONLY}><NutritionPage /></RoleRoute>} />
                <Route path="/paylasimli-ilerleme" element={<RoleRoute allowedRoles={PARENT_EXPERT}><SharedProgressPage /></RoleRoute>} />
                <Route path="/uzman-harita" element={<RoleRoute allowedRoles={PARENT_ONLY}><ExpertMapPage /></RoleRoute>} />
                <Route path="/ebeveyn-refahi" element={<RoleRoute allowedRoles={PARENT_ONLY}><WellbeingPage /></RoleRoute>} />
                <Route path="/kullanici-rehberi" element={<RoleRoute allowedRoles={ALL_ROLES}><UserGuidePage /></RoleRoute>} />
                <Route path="/yardim" element={<RoleRoute allowedRoles={ALL_ROLES}><HelpPage /></RoleRoute>} />
                <Route path="/uzman-odasi" element={<ExpertRoute><ExpertConsultationPage /></ExpertRoute>} />
                <Route path="/uzman-erisim" element={<RoleRoute allowedRoles={PARENT_ONLY}><ConnectionManagementPage /></RoleRoute>} />
              </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
