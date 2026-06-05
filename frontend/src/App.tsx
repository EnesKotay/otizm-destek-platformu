import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { ReactNode } from 'react';

// Eagerly loaded — critical auth path
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminExpertsPage } from './pages/admin/AdminExpertsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminArticlesPage } from './pages/admin/AdminArticlesPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SensoryProfilePage } from '@/pages/SensoryProfilePage';

import { DashboardPage } from '@/pages/DashboardPage';
import { ChildrenPage } from '@/pages/ChildrenPage';
import { ChildDetailPage } from '@/pages/ChildDetailPage';
import { TreatmentPage } from '@/pages/TreatmentPage';
import { NotesPage } from '@/pages/NotesPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { GroupsPage } from '@/pages/GroupsPage';
import { ForumPage } from '@/pages/ForumPage';
import { SimilarFamiliesPage } from '@/pages/SimilarFamiliesPage';
import { SupportWallPage } from '@/pages/SupportWallPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { ExpertsPage } from '@/pages/ExpertsPage';
import { SearchPage } from '@/pages/SearchPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { ExpertRegisterPage } from '@/pages/ExpertRegisterPage';
import { PublicLandingPage } from '@/pages/PublicLandingPage';
import { PublicInfoPage } from '@/pages/PublicInfoPage';

import { AppointmentPage } from '@/pages/AppointmentPage';
import { PatientsPage } from '@/pages/PatientsPage';
import { BepGeneratorPage } from '@/pages/BepGeneratorPage';
import { ScreeningPage } from '@/pages/ScreeningPage';
import { DailyTrackerPage } from '@/pages/DailyTrackerPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SocialStoriesPage } from '@/pages/SocialStoriesPage';
import { CrisisGuidePage } from '@/pages/CrisisGuidePage';
import { TasksPage } from '@/pages/TasksPage';
import { RoutinesPage } from '@/pages/RoutinesPage';
import { VenueMapPage } from '@/pages/VenueMapPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { BehaviorJournalPage } from '@/pages/BehaviorJournalPage';
import { RightsGuidePage } from '@/pages/RightsGuidePage';
import { PublicEmergencyCardPage } from '@/pages/PublicEmergencyCardPage';
import { SchoolDiaryPage } from '@/pages/SchoolDiaryPage';
import { GoalTokenPage } from '@/pages/GoalTokenPage';
import { EmergencyCardPage } from '@/pages/EmergencyCardPage';
import { NutritionPage } from '@/pages/NutritionPage';
import { SharedProgressPage } from '@/pages/SharedProgressPage';
import { ExpertMapPage } from '@/pages/ExpertMapPage';
import { WellbeingPage } from '@/pages/WellbeingPage';
import { HelpPage } from '@/pages/HelpPage';

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
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
