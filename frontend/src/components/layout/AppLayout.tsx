import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationToast } from '@/components/notifications/NotificationToast';
import { AccessibilityWidget } from '@/components/ui/AccessibilityWidget';
import { ChatBot } from '@/components/ChatBot';
import { AlertTriangle, ChevronDown, HelpCircle, PlayCircle, Search, Menu, X, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getTutorialVideoForRoute } from '@/data/tutorialRouteVideos';
import { cn } from '@/utils/cn';
import { prefetchCommonRoutes } from '@/utils/routePrefetch';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const ROUTE_HELP: Array<{ match: string; title: string; steps: string[] }> = [
  { match: '/gunluk-takip', title: 'Bugünün kaydını sakin sakin doldurun.', steps: ['Önce duygu durumunu seçin.', 'Sonra uyku bilgisini ekleyin.', 'İlaç varsa yalnızca alındı bilgisini işaretleyin.'] },
  { match: '/cocuklarim', title: 'Burada çocuk profilini düzenlersiniz.', steps: ['Temel bilgileri ekleyin.', 'Güçlü yanları ve zorlanan alanları yazın.', 'Birden fazla çocuk varsa üstten seçim yapın.'] },
  { match: '/randevular', title: 'Uzman görüşmelerinizi buradan takip edin.', steps: ['Uygun uzmanı veya saati seçin.', 'Bekleyen randevuları kontrol edin.', 'Görüşme öncesi notlarınızı hazırlayın.'] },
  { match: '/mesajlar', title: 'Uzman ve aile mesajları burada.', steps: ['Okunmamış mesajları açın.', 'Kısa ve net cevap yazın.', 'Acil durumlarda zor an rehberini kullanın.'] },
  { match: '/kriz-rehberi', title: 'Zor anlarda önce güvenlik ve sakinleşme.', steps: ['Ortamı sadeleştirin.', 'Kısa ve net cümleler kullanın.', 'Gerekirse acil durum kartına geçin.'] },
  { match: '/acil-kart', title: 'Acil durumda paylaşılacak bilgileri hazır tutun.', steps: ['İletişim bilgilerini kontrol edin.', 'Duyusal hassasiyetleri yazın.', 'Paylaşım bağlantısını yalnızca gerektiğinde kullanın.'] },
  { match: '/notlar', title: 'Kısa gözlem notları ekleyin.', steps: ['Bugün fark ettiğiniz bir şeyi yazın.', 'Kısa cümleler yeterli.', 'İsterseniz uzmanla paylaşılacak özete ekleyin.'] },
  { match: '/tedavi', title: 'Günlük plan ve gelişim hedefleri burada.', steps: ['Bugünkü küçük adıma bakın.', 'Zor gelirse süreyi kısaltın.', 'Tamamlanan adımları işaretleyin.'] },
  { match: '/kullanici-rehberi', title: 'Platform haritasında doğru sayfayı bulun.', steps: ['Önce rolünüze özel ilk adımlara bakın.', 'Sayfa veya konu arayın.', 'İhtiyaç duyduğunuz karta tıklayın.'] },
  { match: '/yardim', title: 'Takıldığınız yerde buradan başlayın.', steps: ['Aradığınız konuyu seçin.', 'İlk adımı okuyun.', 'Gerekirse destek alanına geçin.'] },
  { match: '/', title: 'Bugün neye ihtiyacınız varsa onu seçin.', steps: ['Bugünün kaydını girebilirsiniz.', 'Randevu ve mesajlara bakabilirsiniz.', 'Zor bir an varsa rehbere geçebilirsiniz.'] },
];

function getRouteHelp(pathname: string) {
  return ROUTE_HELP.find((item) => item.match !== '/' && pathname.startsWith(item.match)) || ROUTE_HELP.find((item) => item.match === '/');
}

export function AppLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin';
  const [isSidebarCompact, setIsSidebarCompact] = useState(() => localStorage.getItem('sidebar-compact') === 'true');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const firstHelpMenuItemRef = useRef<HTMLAnchorElement>(null);
  const routeHelp = useMemo(() => getRouteHelp(location.pathname), [location.pathname]);
  const routeTutorialVideo = user ? getTutorialVideoForRoute(user.role, location.pathname) : null;
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const openCommandPalette = () => {
    window.dispatchEvent(new Event('open-command-palette'));
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHelpOpen(false);
    setIsHelpMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isHelpMenuOpen) return;

    const focusTimer = window.setTimeout(() => firstHelpMenuItemRef.current?.focus(), 0);
    const handlePointerDown = (event: PointerEvent) => {
      if (!helpMenuRef.current?.contains(event.target as Node)) {
        setIsHelpMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsHelpMenuOpen(false);
        helpButtonRef.current?.focus();
        return;
      }

      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const menuItems = Array.from(
        helpMenuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      if (menuItems.length === 0) return;

      event.preventDefault();
      const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'Home') {
        menuItems[0].focus();
      } else if (event.key === 'End') {
        menuItems[menuItems.length - 1].focus();
      } else {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = currentIndex < 0
          ? 0
          : (currentIndex + direction + menuItems.length) % menuItems.length;
        menuItems[nextIndex].focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHelpMenuOpen]);

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
          <div className="relative flex h-full w-full max-w-[320px] flex-col bg-white dark:bg-gray-900 transition-transform duration-300 ease-out shadow-2xl animate-in slide-in-from-left">
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

      <main className={cn('min-h-screen pb-20 transition-[margin] lg:pb-0', isSidebarCompact ? 'lg:ml-20' : 'lg:ml-80')}>
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
              <button
                type="button"
                onClick={openCommandPalette}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 transition-all hover:border-gray-100 hover:bg-white hover:text-slate-800 hover:shadow-sm dark:text-slate-300 dark:hover:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 border border-transparent"
              >
                <Search size={16} />
                <span className="hidden sm:inline">Ara veya komut ver...</span>
                <kbd className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 sm:inline">⌘K</kbd>
              </button>
              {isAuthenticated && user?.role === 'PARENT' && (
                <Link
                  to="/kriz-rehberi"
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100 transition-colors hover:bg-rose-100"
                >
                  <AlertTriangle size={14} />
                  <span className="hidden sm:inline">Zor an</span>
                </Link>
              )}
              {isAuthenticated && routeHelp && (
                <div ref={helpMenuRef} className="relative">
                  <button
                    ref={helpButtonRef}
                    type="button"
                    onClick={() => setIsHelpMenuOpen((value) => !value)}
                    className="flex items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-2 text-sm font-medium text-slate-600 transition-all hover:border-gray-100 hover:bg-white hover:text-slate-800 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-300 dark:hover:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 sm:px-3"
                    aria-expanded={isHelpMenuOpen}
                    aria-haspopup="menu"
                    aria-controls="layout-help-menu"
                    aria-label="Yardım menüsünü aç"
                  >
                    <HelpCircle size={16} aria-hidden="true" />
                    <span className="hidden sm:inline">Yardım</span>
                    <ChevronDown
                      size={13}
                      aria-hidden="true"
                      className={cn('hidden transition-transform sm:block', isHelpMenuOpen && 'rotate-180')}
                    />
                  </button>

                  {isHelpMenuOpen && (
                    <div
                      id="layout-help-menu"
                      role="menu"
                      aria-label="Yardım seçenekleri"
                      className="fixed inset-x-4 top-16 z-[60] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-72 sm:max-w-[calc(100vw-2rem)]"
                    >
                      <Link
                        ref={firstHelpMenuItemRef}
                        to="/kullanici-rehberi"
                        role="menuitem"
                        onClick={() => setIsHelpMenuOpen(false)}
                        className="flex w-full items-start gap-3 rounded-xl bg-primary-50 px-3 py-3 text-left transition-colors hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-primary-950/30 dark:hover:bg-primary-950/50"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
                          <PlayCircle size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-extrabold text-primary-800 dark:text-primary-200">Öğrenme yoluna başla</span>
                          <span className="mt-0.5 block text-xs font-medium leading-5 text-primary-800 dark:text-primary-200">Rolünüze özel videoları doğru sırayla izleyin.</span>
                        </span>
                      </Link>

                      {routeTutorialVideo && (
                        <Link
                          to={`/kullanici-rehberi?video=${routeTutorialVideo.id}`}
                          role="menuitem"
                          onClick={() => setIsHelpMenuOpen(false)}
                          className="mt-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-emerald-950/30"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <PlayCircle size={17} aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Bu sayfanın videosunu izle</span>
                            <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                              {routeTutorialVideo.title}
                            </span>
                          </span>
                        </Link>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsHelpOpen((value) => !value);
                          setIsHelpMenuOpen(false);
                        }}
                        className="mt-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                          <HelpCircle size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Bu sayfa için hızlı yardım</span>
                          <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">Bulunduğunuz ekranın kısa adımlarını gösterir.</span>
                        </span>
                      </button>

                      <Link
                        to="/yardim"
                        role="menuitem"
                        onClick={() => setIsHelpMenuOpen(false)}
                        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-200 dark:hover:bg-gray-800"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300">
                          <HelpCircle size={17} aria-hidden="true" />
                        </span>
                        Yardım Merkezi
                      </Link>
                    </div>
                  )}
                </div>
              )}
              {isAuthenticated && <AccessibilityWidget />}
              {isAuthenticated && <NotificationBell />}
            </div>
          </div>
          {isAuthenticated && isHelpOpen && routeHelp && (
            <section className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 p-4 shadow-sm print:hidden">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{routeHelp.title}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {routeHelp.steps.map((step, index) => (
                    <div key={step} className="rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-sky-100">
                      <span className="mr-1 text-sky-700">{index + 1}.</span>
                      {step}
                    </div>
                  ))}
                </div>
                {routeTutorialVideo && (
                  <Link
                    to={`/kullanici-rehberi?video=${routeTutorialVideo.id}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  >
                    <PlayCircle size={16} aria-hidden="true" />
                    Bu sayfanın videosunu izle
                    <span className="hidden font-semibold text-sky-100 sm:inline">· {routeTutorialVideo.title}</span>
                  </Link>
                )}
              </div>
            </section>
          )}
          {!isOnline && (
            <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-4 rounded-3xl flex items-center justify-between shadow-md shadow-orange-500/10 animate-in fade-in slide-in-from-top-4 duration-300 print:hidden border border-orange-400/20">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-white shrink-0 animate-bounce" />
                <div className="text-xs sm:text-sm font-bold leading-snug">
                  Çevrimdışı Mod: İnternet bağlantınız koptu. Yaptığınız veri girişleri cihazınıza kaydedilecek ve bağlantı geldiğinde otomatik gönderilecektir.
                </div>
              </div>
              <div className="shrink-0 text-[9px] font-black tracking-widest bg-white/20 px-2.5 py-1 rounded-full uppercase ml-4 hidden xs:block">
                ÇEVRİMDIŞI
              </div>
            </div>
          )}
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
      {isAuthenticated && <NotificationToast />}
    </div>
  );
}
