import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, X, Calendar, MessageCircle, AlertCircle, MessageSquare, Info, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import { childService } from '@/services/childService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { formatRelative } from '@/utils/date';
import { patientService } from '@/services/patientService';
import type { Notification, ExpertConnectionRequest } from '@/types';

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
  const [connectionRequests, setConnectionRequests] = useState<ExpertConnectionRequest[]>([]);
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
            link: '/cocuklarim?view=screening',
            read: readIds.has(id),
            createdAt: new Date().toISOString(),
          };
        });
    } catch {
      return [];
    }
  }, [accessToken, user]);

  // Fetch initial unread count on mount
  const fetchUnread = useCallback(async () => {
    if (!accessToken) {
      setUnreadCount(0);
      return;
    }

    try {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const [count, local, reqs] = await Promise.all([
        notificationService.getUnreadCount(),
        buildLocalReminders(),
        user?.role === 'PARENT' ? patientService.getConnectionRequests() : Promise.resolve([])
      ]);
      const validReqs = reqs.filter(r => (Date.now() - new Date(r.createdAt).getTime()) < SEVEN_DAYS_MS);
      setConnectionRequests(validReqs);
      setUnreadCount(count + local.filter(n => !n.read).length + validReqs.length);
    } catch { /* ignore auth errors on startup */ }
  }, [accessToken, buildLocalReminders, user]);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const [data, local, reqs] = await Promise.all([
        notificationService.getRecent(),
        buildLocalReminders(),
        user?.role === 'PARENT' ? patientService.getConnectionRequests() : Promise.resolve([])
      ]);
      const validReqs = reqs.filter(r => (Date.now() - new Date(r.createdAt).getTime()) < SEVEN_DAYS_MS);
      const merged = [...local, ...data].slice(0, 20);
      setConnectionRequests(validReqs);
      setNotifications(merged);
      setUnreadCount(merged.filter(n => !n.read).length + validReqs.length);
    } catch { /* ignore */ }
    setLoading(false);
  }, [accessToken, buildLocalReminders, user]);

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

  // Request browser notification permission and register push subscription once on mount
  useEffect(() => {
    if (!accessToken || !pushNotificationService.isSupported()) return;
    if (Notification.permission === 'granted') {
      pushNotificationService.subscribe();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((result) => {
        if (result === 'granted') pushNotificationService.subscribe();
      });
    }
  }, [accessToken]);

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
        className={`relative p-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
          open 
            ? 'bg-indigo-50 text-indigo-600 shadow-inner' 
            : 'hover:bg-gray-100 text-gray-600 hover:shadow-sm'
        }`}
        title="Bildirimler"
      >
        <Bell size={20} className={`transition-transform duration-300 ${open ? 'scale-110 text-indigo-600' : 'text-gray-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-gradient-to-tr from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[380px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
          <div className="flex items-center justify-between p-4 bg-gray-50/80 border-b border-gray-100/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-base">Bildirimler</h3>
              {unreadCount > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} yeni
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-all font-medium cursor-pointer"
                >
                  Tümünü oku
                </button>
              )}
              <button 
                onClick={() => setOpen(false)} 
                className="p-1.5 rounded-full hover:bg-gray-200/60 transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto custom-scrollbar bg-white">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <div className="w-8 h-8 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-gray-500 font-medium">Bildirimler yükleniyor...</p>
              </div>
            ) : notifications.length === 0 && connectionRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <BellRing size={28} className="text-gray-300" />
                </div>
                <p className="text-base font-medium text-gray-900">Şu an için bildiriminiz yok</p>
                <p className="text-sm text-gray-500 mt-1.5">Yeni bir gelişme olduğunda size haber vereceğiz.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {connectionRequests.length > 0 && (
                  <div
                    className="group flex items-center justify-between gap-3 px-4 py-3 bg-amber-50/60 border-l-4 border-amber-400 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={() => { setOpen(false); navigate('/cocuklarim#uzman-istekleri'); }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-amber-100 border border-amber-200">
                        <Bell size={16} className="text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900">
                          {connectionRequests.length} Uzman Erişim İsteği
                        </p>
                        <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                          Onaylamak için tıklayın →
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {connectionRequests.length}
                    </span>
                  </div>
                )}
                {notifications.map(n => {
                  const getIcon = () => {
                    const title = n.title.toLowerCase();
                    if (n.type === 'LOCAL_REMINDER') return <AlertCircle size={18} className="text-orange-500" />;
                    if (title.includes('randevu') || title.includes('onaylandı')) return <Calendar size={18} className="text-emerald-500" />;
                    if (title.includes('mesaj')) return <MessageCircle size={18} className="text-blue-500" />;
                    if (title.includes('forum') || title.includes('yorum')) return <MessageSquare size={18} className="text-purple-500" />;
                    return <Info size={18} className="text-indigo-500" />;
                  };

                  const getIconBg = () => {
                    const title = n.title.toLowerCase();
                    if (n.type === 'LOCAL_REMINDER') return 'bg-orange-50 border-orange-100';
                    if (title.includes('randevu') || title.includes('onaylandı')) return 'bg-emerald-50 border-emerald-100';
                    if (title.includes('mesaj')) return 'bg-blue-50 border-blue-100';
                    if (title.includes('forum') || title.includes('yorum')) return 'bg-purple-50 border-purple-100';
                    return 'bg-indigo-50 border-indigo-100';
                  };

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`group relative flex items-start gap-4 p-4 transition-all duration-300 ${
                        n.link ? 'cursor-pointer hover:bg-slate-50/80' : ''
                      } ${!n.read ? 'bg-indigo-50/20' : ''}`}
                    >
                      {!n.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
                      )}
                      
                      <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${getIconBg()}`}>
                        {getIcon()}
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-6">
                        <p className={`text-[13px] ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'} mb-1`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className={`text-[12px] ${!n.read ? 'text-gray-600' : 'text-gray-500'} line-clamp-2 leading-relaxed`}>
                            {n.body}
                          </p>
                        )}
                        <p className={`text-[11px] mt-2 font-medium ${!n.read ? 'text-indigo-500' : 'text-gray-400'}`}>
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>

                      {!n.read && (
                        <button
                          onClick={(e) => handleMarkRead(n.id, e)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-indigo-100 bg-white shadow-sm border border-gray-100 transition-all shrink-0 cursor-pointer text-indigo-600"
                          title="Okundu olarak işaretle"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
