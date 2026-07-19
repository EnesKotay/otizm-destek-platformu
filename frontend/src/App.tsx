import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
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
import { authService } from '@/services/authService';
import { RouteMetadata } from '@/components/RouteMetadata';

// Eagerly loaded — first visit and sign-in paths
import { LoginPage } from '@/pages/LoginPage';
import { PublicLandingPage } from '@/pages/PublicLandingPage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyNamed<T extends Record<K, ComponentType<any>>, K extends string>(
  loader: () => Promise<T>,
  exportName: K,
) {
  return lazy(async () => {
    try {
      return { default: (await loader())[exportName] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isStaleChunkError =
        message.includes('Failed to fetch dynamically imported module')
        || message.includes('Importing a module script failed')
        || message.includes('MIME type of "text/html"')
        || message.includes('Loading chunk');

      if (isStaleChunkError && typeof window !== 'undefined') {
        const reloadKey = 'stale-chunk-reload-attempted';
        if (sessionStorage.getItem(reloadKey) !== 'true') {
          sessionStorage.setItem(reloadKey, 'true');
          if ('caches' in window) {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((key) => window.caches.delete(key)));
          }
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.update()));
          }
          window.location.reload();
        }
      }

      throw error;
    }
  });
}

const AdminLayout = lazyNamed(() => import('./pages/admin/AdminLayout'), 'AdminLayout');
const AppLayout = lazyNamed(() => import('@/components/layout/AppLayout'), 'AppLayout');
const RegisterPage = lazyNamed(() => import('@/pages/RegisterPage'), 'RegisterPage');
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
const VerifyEmailPage = lazyNamed(() => import('@/pages/VerifyEmailPage'), 'VerifyEmailPage');
const NotFoundPage = lazyNamed(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
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
const OnboardingPage = lazyNamed(() => import('@/pages/OnboardingPage'), 'OnboardingPage');
const ExpertRegisterPage = lazyNamed(() => import('@/pages/ExpertRegisterPage'), 'ExpertRegisterPage');
const PublicInfoPage = lazyNamed(() => import('@/pages/PublicInfoPage'), 'PublicInfoPage');
const AppointmentPage = lazyNamed(() => import('@/pages/AppointmentPage'), 'AppointmentPage');
const PatientsPage = lazyNamed(() => import('@/pages/PatientsPage'), 'PatientsPage');
const BepGeneratorPage = lazyNamed(() => import('@/pages/BepGeneratorPage'), 'BepGeneratorPage');
const DailyTrackerPage = lazyNamed(() => import('@/pages/DailyTrackerPage'), 'DailyTrackerPage');
const AnalyticsPage = lazyNamed(() => import('@/pages/AnalyticsPage'), 'AnalyticsPage');
const CrisisGuidePage = lazyNamed(() => import('@/pages/CrisisGuidePage'), 'CrisisGuidePage');
const TasksPage = lazyNamed(() => import('@/pages/TasksPage'), 'TasksPage');
const RoutinesPage = lazyNamed(() => import('@/pages/RoutinesPage'), 'RoutinesPage');
const ProfilePage = lazyNamed(() => import('@/pages/ProfilePage'), 'ProfilePage');
const PublicEmergencyCardPage = lazyNamed(() => import('@/pages/PublicEmergencyCardPage'), 'PublicEmergencyCardPage');
const EmergencyCardPage = lazyNamed(() => import('@/pages/EmergencyCardPage'), 'EmergencyCardPage');
const HelpPage = lazyNamed(() => import('@/pages/HelpPage'), 'HelpPage');
const MeetupsPage = lazyNamed(() => import('@/pages/MeetupsPage'), 'MeetupsPage');
const WeeklyQuestionPage = lazyNamed(() => import('@/pages/WeeklyQuestionPage'), 'WeeklyQuestionPage');
const UserGuidePage = lazyNamed(() => import('./pages/UserGuidePage'), 'UserGuidePage');
const NotificationsPage = lazyNamed(() => import('./pages/NotificationsPage'), 'NotificationsPage');

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AuthBootstrap({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken, setAuth, clearSession } = useAuthStore();
  const [checkingSession, setCheckingSession] = useState(isAuthenticated && !accessToken);

  useEffect(() => {
    if (!checkingSession) return;

    let active = true;
    authService.refresh()
      .then((response) => {
        if (!response.accessToken) throw new Error('Oturum yenilenemedi');
        if (active) setAuth(response.user, response.accessToken);
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [checkingSession, clearSession, setAuth]);

  if (checkingSession) return <PageLoader />;
  return <>{children}</>;
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

function RootRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/anasayfa" replace />;
  return <PublicLandingPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastContainer />
        <AuthBootstrap>
          <BrowserRouter>
            <RouteMetadata />
            <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/giris" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/kayit" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/sifremi-unuttum" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/sifre-sifirla" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/eposta-dogrula" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />
            <Route path="/tanitim" element={<PublicLandingPage />} />
            <Route path="/kvkk" element={<PublicInfoPage kind="kvkk" />} />
            <Route path="/gizlilik" element={<PublicInfoPage kind="privacy" />} />
            <Route path="/kullanim-sartlari" element={<PublicInfoPage kind="terms" />} />
            <Route path="/tibbi-uyari" element={<PublicInfoPage kind="medical" />} />
            <Route path="/acil-profil/:id" element={<PublicEmergencyCardPage />} />
            <Route path="/kayit/uzman" element={<Suspense fallback={<PageLoader />}><ExpertRegisterPage /></Suspense>} />
            <Route path="/baslangic" element={<OnboardingRoute><Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense></OnboardingRoute>} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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
                <Route path="/similar-families" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/benzer-aileler" replace /></RoleRoute>} />
                <Route path="/ayarlar" element={<RoleRoute allowedRoles={ALL_ROLES}><SettingsPage /></RoleRoute>} />
                <Route path="/bildirimler" element={<RoleRoute allowedRoles={ALL_ROLES}><NotificationsPage /></RoleRoute>} />
                <Route path="/settings" element={<RoleRoute allowedRoles={ALL_ROLES}><Navigate to="/ayarlar" replace /></RoleRoute>} />
                <Route path="/bilgi-bankasi" element={<RoleRoute allowedRoles={ALL_ROLES}><KnowledgePage /></RoleRoute>} />
                <Route path="/uzmanlar" element={<RoleRoute allowedRoles={PARENT_ONLY}><ExpertsPage /></RoleRoute>} />
                <Route path="/arama" element={<RoleRoute allowedRoles={ALL_ROLES}><Navigate to="/anasayfa" replace /></RoleRoute>} />
                <Route path="/randevular" element={<RoleRoute allowedRoles={PARENT_EXPERT}><AppointmentPage /></RoleRoute>} />
                <Route path="/appointments" element={<RoleRoute allowedRoles={PARENT_EXPERT}><Navigate to="/randevular" replace /></RoleRoute>} />
                <Route path="/danisanlarim" element={<RoleRoute allowedRoles={EXPERT_ONLY}><PatientsPage /></RoleRoute>} />
                <Route path="/patients" element={<RoleRoute allowedRoles={EXPERT_ONLY}><Navigate to="/danisanlarim" replace /></RoleRoute>} />
                <Route path="/expert/patients" element={<RoleRoute allowedRoles={EXPERT_ONLY}><Navigate to="/danisanlarim" replace /></RoleRoute>} />
                <Route path="/bep-raporu" element={<RoleRoute allowedRoles={EXPERT_ONLY}><BepGeneratorPage /></RoleRoute>} />
                <Route path="/tarama" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/cocuklarim" replace /></RoleRoute>} />
                <Route path="/gunluk-takip" element={<RoleRoute allowedRoles={PARENT_ONLY}><DailyTrackerPage /></RoleRoute>} />
                <Route path="/gelisim-paneli" element={<RoleRoute allowedRoles={PARENT_ONLY}><AnalyticsPage /></RoleRoute>} />
                <Route path="/sosyal-hikayeler" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/tedavi" replace /></RoleRoute>} />
                <Route path="/kriz-rehberi" element={<RoleRoute allowedRoles={PARENT_ONLY}><CrisisGuidePage /></RoleRoute>} />
                <Route path="/gorevler" element={<RoleRoute allowedRoles={PARENT_EXPERT}><TasksPage /></RoleRoute>} />
                <Route path="/tasks" element={<RoleRoute allowedRoles={PARENT_EXPERT}><Navigate to="/gorevler" replace /></RoleRoute>} />
                <Route path="/rutinler" element={<RoleRoute allowedRoles={PARENT_ONLY}><RoutinesPage /></RoleRoute>} />
                <Route path="/mekanlar" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/uzmanlar" replace /></RoleRoute>} />
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
                <Route path="/davranis-gunlugu" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/notlar" replace /></RoleRoute>} />
                <Route path="/duyusal-profil" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/notlar" replace /></RoleRoute>} />
                <Route path="/haklar-rehberi" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/bilgi-bankasi" replace /></RoleRoute>} />
                <Route path="/okul-defteri" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/notlar" replace /></RoleRoute>} />
                <Route path="/hedef-token" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/gorevler" replace /></RoleRoute>} />
                <Route path="/acil-kart" element={<RoleRoute allowedRoles={PARENT_ONLY}><EmergencyCardPage /></RoleRoute>} />
                <Route path="/beslenme" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/gunluk-takip" replace /></RoleRoute>} />
                <Route path="/paylasimli-ilerleme" element={<RoleRoute allowedRoles={PARENT_EXPERT}><Navigate to="/ayarlar" replace /></RoleRoute>} />
                <Route path="/uzman-harita" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/uzmanlar" replace /></RoleRoute>} />
                <Route path="/ebeveyn-refahi" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/gunluk-takip" replace /></RoleRoute>} />
                <Route path="/kullanici-rehberi" element={<RoleRoute allowedRoles={ALL_ROLES}><UserGuidePage /></RoleRoute>} />
                <Route path="/yardim" element={<RoleRoute allowedRoles={ALL_ROLES}><HelpPage /></RoleRoute>} />
                <Route path="/bulusmalar" element={<RoleRoute allowedRoles={PARENT_ONLY}><MeetupsPage /></RoleRoute>} />
                <Route path="/haftalik-soru" element={<RoleRoute allowedRoles={PARENT_ONLY}><WeeklyQuestionPage /></RoleRoute>} />
                <Route path="/uzman-odasi" element={<ExpertRoute><Navigate to="/mesajlar" replace /></ExpertRoute>} />
                <Route path="/uzman-erisim" element={<RoleRoute allowedRoles={PARENT_ONLY}><Navigate to="/ayarlar" replace /></RoleRoute>} />
              </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthBootstrap>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
