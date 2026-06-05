import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { messagingService } from '@/services/messagingService';
import { notificationService } from '@/services/notificationService';
import { cn } from '@/utils/cn';
import { getMobileNavItems } from './navConfig';
import { MoreHorizontal } from 'lucide-react';

export function MobileNav() {
  const role = useAuthStore(s => s.user?.role);
  const accessToken = useAuthStore(s => s.accessToken);
  const mobileItems = getMobileNavItems(role);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadMessages(0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadNotifs(0);
      return;
    }

    messagingService.getUnreadCount().then(setUnreadMessages).catch(() => {});
    notificationService.getUnreadCount().then(setUnreadNotifs).catch(() => {});
    const interval = setInterval(() => {
      messagingService.getUnreadCount().then(setUnreadMessages).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const getBadge = (to: string): number => {
    if (to === '/mesajlar') return unreadMessages;
    return 0;
  };

  const openMoreMenu = () => {
    window.dispatchEvent(new CustomEvent('mobile-sidebar-open'));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur-sm lg:hidden safe-area-pb">
      <div className="flex items-center justify-around px-1 pb-2 pt-1">
        {mobileItems.map(({ to, icon: Icon, label }) => {
          const badge = getBadge(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[48px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-medium transition-all',
                  isActive ? 'text-primary-600' : 'text-gray-400 active:bg-gray-100'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'relative flex h-7 w-10 items-center justify-center rounded-2xl transition-all',
                    isActive ? 'bg-primary-100' : ''
                  )}>
                    <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={openMoreMenu}
          className="flex min-w-[48px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-medium text-gray-400 transition-all active:bg-gray-100"
          aria-label="Daha fazla menü"
        >
          <div className="relative flex h-7 w-10 items-center justify-center rounded-2xl transition-all">
            <MoreHorizontal size={20} strokeWidth={1.8} aria-hidden="true" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 bg-primary-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </div>
          <span>Daha Fazla</span>
        </button>
      </div>
    </nav>
  );
}
