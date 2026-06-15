import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/giris" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ExpertRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/giris" replace />;
  if (user?.role !== 'EXPERT' && user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
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
                <Route index element={<DashboardPage />} />
                <Route path="/cocuklarim" element={<ChildrenPage />} />
                <Route path="/cocuklarim/:id" element={<ChildDetailPage />} />
                <Route path="/tedavi" element={<TreatmentPage />} />
                <Route path="/notlar" element={<NotesPage />} />
                <Route path="/takvim" element={<CalendarPage />} />
                <Route path="/mesajlar" element={<MessagesPage />} />
                <Route path="/gruplar" element={<GroupsPage />} />
                <Route path="/forum" element={<ForumPage />} />
                <Route path="/dertlesme-duvari" element={<SupportWallPage />} />
                <Route path="/benzer-aileler" element={<SimilarFamiliesPage />} />
                <Route path="/similar-families" element={<SimilarFamiliesPage />} />
                <Route path="/ayarlar" element={<SettingsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/bilgi-bankasi" element={<KnowledgePage />} />
                <Route path="/uzmanlar" element={<ExpertsPage />} />
                <Route path="/arama" element={<SearchPage />} />
                <Route path="/randevular" element={<AppointmentPage />} />
                <Route path="/appointments" element={<AppointmentPage />} />
                <Route path="/danisanlarim" element={<PatientsPage />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/expert/patients" element={<PatientsPage />} />
                <Route path="/bep-raporu" element={<BepGeneratorPage />} />
                <Route path="/tarama" element={<ScreeningPage />} />
                <Route path="/gunluk-takip" element={<DailyTrackerPage />} />
                <Route path="/gelisim-paneli" element={<AnalyticsPage />} />
                <Route path="/sosyal-hikayeler" element={<SocialStoriesPage />} />
                <Route path="/kriz-rehberi" element={<CrisisGuidePage />} />
                <Route path="/gorevler" element={<TasksPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/rutinler" element={<RoutinesPage />} />
                <Route path="/mekanlar" element={<VenueMapPage />} />
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
                <Route path="/profil/:id" element={<ProfilePage />} />
                <Route path="/davranis-gunlugu" element={<BehaviorJournalPage />} />
                <Route path="/duyusal-profil" element={<SensoryProfilePage />} />
                <Route path="/haklar-rehberi" element={<RightsGuidePage />} />
                <Route path="/okul-defteri" element={<SchoolDiaryPage />} />
                <Route path="/hedef-token" element={<GoalTokenPage />} />
                <Route path="/acil-kart" element={<EmergencyCardPage />} />
                <Route path="/beslenme" element={<NutritionPage />} />
                <Route path="/paylasimli-ilerleme" element={<SharedProgressPage />} />
                <Route path="/uzman-harita" element={<ExpertMapPage />} />
                <Route path="/ebeveyn-refahi" element={<WellbeingPage />} />
                <Route path="/yardim" element={<HelpPage />} />
                <Route path="/uzman-odasi" element={<ExpertRoute><ExpertConsultationPage /></ExpertRoute>} />
                <Route path="/uzman-erisim" element={<ConnectionManagementPage />} />
              </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
