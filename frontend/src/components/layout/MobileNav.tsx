import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { messagingService } from '@/services/messagingService';
import { notificationService } from '@/services/notificationService';
import { cn } from '@/utils/cn';
import { prefetchRoute } from '@/utils/routePrefetch';
import { getMobileNavItems } from './navConfig';
import { MoreHorizontal } from 'lucide-react';

const MESSAGE_UNREAD_REFRESH_EVENT = 'message-unread-refresh';

export function MobileNav() {
  const role = useAuthStore(s => s.user?.role);
  const accessToken = useAuthStore(s => s.accessToken);
  const childCount = useChildStore(s => s.children.length);
  const { subscribe, unsubscribe } = useWebSocket();
  const hasChild = role !== 'PARENT' || childCount > 0;
  const mobileItems = getMobileNavItems(role, hasChild);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const refreshUnreadMessages = useCallback(() => {
    if (!accessToken) {
      setUnreadMessages(0);
      return;
    }
    messagingService.getUnreadCount().then(setUnreadMessages).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadMessages(0);
       
      setUnreadNotifs(0);
      return;
    }

    refreshUnreadMessages();
    if (accessToken) {
      notificationService.getUnreadCount().then(setUnreadNotifs).catch(() => {});
    }
    const interval = setInterval(refreshUnreadMessages, 60_000);
    return () => clearInterval(interval);
  }, [accessToken, refreshUnreadMessages]);

  useEffect(() => {
    if (!accessToken) return;
    const conversationTopic = '/user/queue/conversation-update';
    window.addEventListener(MESSAGE_UNREAD_REFRESH_EVENT, refreshUnreadMessages);
    subscribe(conversationTopic, refreshUnreadMessages);
    return () => {
      window.removeEventListener(MESSAGE_UNREAD_REFRESH_EVENT, refreshUnreadMessages);
      unsubscribe(conversationTopic);
    };
  }, [accessToken, refreshUnreadMessages, subscribe, unsubscribe]);

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
        {mobileItems.map(({ to, icon: Icon, label, mobileLabel }) => {
          const badge = getBadge(to);
          const displayLabel = mobileLabel || label;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onFocus={() => prefetchRoute(to)}
              onMouseEnter={() => prefetchRoute(to)}
              onTouchStart={() => prefetchRoute(to)}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[48px] flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-xs font-semibold transition-all',
                  isActive ? 'text-primary-600' : 'text-gray-400 active:bg-gray-100'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'relative flex h-8 w-11 items-center justify-center rounded-2xl transition-all',
                    isActive ? 'bg-primary-100' : 'hover:bg-gray-100'
                  )}>
                    <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="max-w-[4.25rem] truncate text-center leading-tight">{displayLabel}</span>
                </>
              )}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={openMoreMenu}
          className="flex min-w-[48px] flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-xs font-semibold text-gray-400 transition-all active:bg-gray-100"
          aria-label="Daha fazla menü"
        >
          <div className="relative flex h-8 w-11 items-center justify-center rounded-2xl transition-all hover:bg-gray-100">
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
