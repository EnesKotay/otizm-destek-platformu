import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import { childService } from '@/services/childService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { formatRelative } from '@/utils/date';
import type { Notification } from '@/types';

const LOCAL_READ_KEY = 'local_notification_read_ids';
const LOCAL_ACTIVITY_KEY = 'local_activity_done_dates';

function getReadLocalIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LOCAL_READ_KEY) || '[]') as string[]);
  } catch {
    return new Set<string>();
  }
}

function rememberLocalRead(id: string) {
  const ids = getReadLocalIds();
  ids.add(id);
  localStorage.setItem(LOCAL_READ_KEY, JSON.stringify([...ids]));
}

function isLocalNotification(id: string) {
  return id.startsWith('local-');
}

function hasActivityDoneToday(childId: string): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_ACTIVITY_KEY) || '{}') as Record<string, string>;
    return stored[childId] === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const { subscribe, unsubscribe, send } = useWebSocket();

  const buildLocalReminders = useCallback(async (): Promise<Notification[]> => {
    if (!accessToken || user?.role !== 'PARENT') return [];
    try {
      const readIds = getReadLocalIds();
      const today = new Date().toISOString().slice(0, 10);
      const children = await childService.getAll();
      return children
        .filter(child => !hasActivityDoneToday(child.id))
        .slice(0, 2)
        .map(child => {
          const id = `local-activity-${child.id}-${today}`;
          return {
            id,
            type: 'LOCAL_REMINDER',
            title: `${child.name} için kısa aktivite zamanı`,
            body: 'Bugün tarama aktivitelerinden kısa bir oyun kaydı henüz görünmüyor.',
            link: '/tarama',
            read: readIds.has(id),
            createdAt: new Date().toISOString(),
          };
        });
    } catch {
      return [];
    }
  }, [accessToken, user?.role]);

  // Fetch initial unread count on mount
  const fetchUnread = useCallback(async () => {
    if (!accessToken) {
      setUnreadCount(0);
      return;
    }

    try {
      const [count, local] = await Promise.all([
        notificationService.getUnreadCount(),
        buildLocalReminders(),
      ]);
      setUnreadCount(count + local.filter(n => !n.read).length);
    } catch { /* ignore auth errors on startup */ }
  }, [accessToken, buildLocalReminders]);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const [data, local] = await Promise.all([
        notificationService.getRecent(),
        buildLocalReminders(),
      ]);
      const merged = [...local, ...data].slice(0, 20);
      setNotifications(merged);
      setUnreadCount(merged.filter(n => !n.read).length);
    } catch { /* ignore */ }
    setLoading(false);
  }, [accessToken, buildLocalReminders]);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUnread();
  }, [fetchUnread]);

  // Fallback polling — unread count her 60 saniyede bir yenilenir (WS düşükse)
  useEffect(() => {
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // WS (yeniden) bağlandığında kaçırılan bildirimleri çek
  useEffect(() => {
    const handleReconnect = () => {
      fetchUnread();
      send('/app/notifications/ping', {});
    };
    window.addEventListener('ws-reconnected', handleReconnect);
    return () => window.removeEventListener('ws-reconnected', handleReconnect);
  }, [send, fetchUnread]);

  // Request browser notification permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // WebSocket subscription — replaces the 30-second polling interval
  useEffect(() => {
    if (!accessToken || !user?.id) return;

    const topic = `/user/queue/notifications`;

    subscribe(topic, (payload: unknown) => {
      const incoming = Array.isArray(payload) ? (payload as Notification[]) : [payload as Notification];
      // Show browser notification for each new unread item
      if ('Notification' in window && Notification.permission === 'granted') {
        incoming.filter(n => !n.read).forEach(n => {
          new window.Notification(n.title, {
            body: n.body ?? undefined,
            icon: '/logo192.png',
            tag: n.id,
          });
        });
      }
      setNotifications(prev => {
        // Merge: put new notifications at the top, remove duplicates
        const ids = new Set(incoming.map(n => n.id));
        const merged = [...incoming, ...prev.filter(n => !ids.has(n.id))].slice(0, 20);
        setUnreadCount(merged.filter(n => !n.read).length);
        return merged;
      });
    });

    return () => unsubscribe(topic);
  }, [accessToken, subscribe, unsubscribe, user?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isLocalNotification(id)) rememberLocalRead(id);
      else await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      notifications.filter(n => isLocalNotification(n.id)).forEach(n => rememberLocalRead(n.id));
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      try {
        if (isLocalNotification(n.id)) rememberLocalRead(n.id);
        else await notificationService.markRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        title="Bildirimler"
      >
        <Bell size={20} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Bildirimler</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                >
                  Tümünü oku
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Henüz bildirim yok</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 p-3 border-b border-gray-50 transition-colors ${
                    n.link ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${!n.read ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{formatRelative(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkRead(n.id, e)}
                      className="p-1 rounded-lg hover:bg-indigo-100 transition-colors shrink-0 cursor-pointer"
                      title="Okundu olarak işaretle"
                    >
                      <Check size={14} className="text-indigo-600" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
