import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ChatBot } from '@/components/ChatBot';
import { Search, Menu, X, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// En çok ziyaret edilen sayfaların chunk'larını idle zamanda önceden yükle
function prefetchCommonRoutes() {
  const pages = [
    () => import('@/pages/DashboardPage'),
    () => import('@/pages/DailyTrackerPage'),
    () => import('@/pages/ChildrenPage'),
    () => import('@/pages/CalendarPage'),
    () => import('@/pages/AppointmentPage'),
    () => import('@/pages/AnalyticsPage'),
    () => import('@/pages/RoutinesPage'),
    () => import('@/pages/BehaviorJournalPage'),
  ];
  pages.forEach(load => load());
}

export function AppLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin';
  const [isSidebarCompact, setIsSidebarCompact] = useState(() => localStorage.getItem('sidebar-compact') === 'true');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    // Tarayıcı boşta olduğunda chunk'ları önceden indir
    if ('requestIdleCallback' in window) {
      (window as typeof window & { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(prefetchCommonRoutes);
    } else {
      setTimeout(prefetchCommonRoutes, 2000);
    }
  }, []);

  useEffect(() => {
    const handleCompactChange = (event: Event) => {
      setIsSidebarCompact(Boolean((event as CustomEvent<boolean>).detail));
    };
    const handleMobileMenuOpen = () => {
      setIsMobileMenuOpen(true);
    };
    const handleStorageChange = () => {
      setIsSidebarCompact(localStorage.getItem('sidebar-compact') === 'true');
    };

    window.addEventListener('sidebar-compact-change', handleCompactChange);
    window.addEventListener('mobile-sidebar-open', handleMobileMenuOpen);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('sidebar-compact-change', handleCompactChange);
      window.removeEventListener('mobile-sidebar-open', handleMobileMenuOpen);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300"
            onClick={closeMobileMenu}
          />
          {/* Slide-out Sidebar container */}
          <div className="relative flex h-full w-full max-w-[288px] flex-col bg-white dark:bg-gray-900 transition-transform duration-300 ease-out shadow-2xl animate-in slide-in-from-left">
            <button
              onClick={closeMobileMenu}
              className="absolute right-4 top-4 z-50 p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer"
              aria-label="Menüyü Kapat"
            >
              <X size={18} />
            </button>
            <Sidebar onClose={closeMobileMenu} />
          </div>
        </div>
      )}

      <main className={cn('min-h-screen pb-20 transition-[margin] lg:pb-0', isSidebarCompact ? 'lg:ml-20' : 'lg:ml-72')}>
        <div
          className={cn(
            'mx-auto p-4 sm:p-6 lg:p-8',
            isAdminRoute ? 'max-w-[92rem]' : 'max-w-6xl'
          )}
        >
          {/* Top bar with hamburger menu, search, and notifications */}
          <div className="flex items-center justify-between lg:justify-end gap-2 mb-6 print:hidden">
            {/* Hamburger button shown only on mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden relative z-10 p-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 shadow-sm transition-colors cursor-pointer"
              aria-label="Menüyü Aç"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-primary-200/50 hover:shadow-lg transition-all hover:scale-105 cursor-pointer shrink-0"
                >
                  <Sparkles size={13} className="animate-pulse" />
                  <span className="hidden xs:inline">Uygulamayı Yükle</span>
                </button>
              )}
              <Link
                to="/arama"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 hover:shadow-sm transition-all text-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
              >
                <Search size={16} />
                <span className="hidden sm:inline">Ara...</span>
              </Link>
              {isAuthenticated && <NotificationBell />}
            </div>
          </div>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <MobileNav />
      <ChatBot />
    </div>
  );
}
