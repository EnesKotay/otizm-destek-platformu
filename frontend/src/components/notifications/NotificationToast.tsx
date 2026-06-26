import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { getNotificationIconConfig, shouldShowNotification, playNotificationSound } from '@/utils/notificationUtils';
import { formatRelative } from '@/utils/date';
import type { Notification } from '@/types';

interface ToastItem {
  notification: Notification;
  id: string;
  exiting: boolean;
}

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 6000;

export function NotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const { subscribe, unsubscribe } = useWebSocket();

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((notification: Notification) => {
    if (!shouldShowNotification(notification.type)) return;
    if (notification.read) return;

    const id = `toast-${notification.id}-${Date.now()}`;

    setToasts(prev => {
      const next = [{ notification, id, exiting: false }, ...prev];
      if (next.length > MAX_TOASTS) {
        const removed = next.slice(MAX_TOASTS);
        removed.forEach(t => {
          const timer = timersRef.current.get(t.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(t.id);
          }
        });
        return next.slice(0, MAX_TOASTS);
      }
      return next;
    });

    playNotificationSound();

    const timer = setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    timersRef.current.set(id, timer);
  }, [dismissToast]);

  useEffect(() => {
    if (!accessToken || !user?.id) return;

    const topic = '/user/queue/notifications';
    subscribe(topic, (payload: unknown) => {
      const incoming = Array.isArray(payload) ? (payload as Notification[]) : [payload as Notification];
      incoming.filter(n => !n.read).forEach(n => addToast(n));
    });

    return () => unsubscribe(topic);
  }, [accessToken, user?.id, subscribe, unsubscribe, addToast]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const handleClick = (toast: ToastItem) => {
    dismissToast(toast.id);
    if (toast.notification.link) {
      navigate(toast.notification.link);
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '400px' }}>
      {toasts.map((toast) => {
        const config = getNotificationIconConfig(toast.notification.type);
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            onClick={() => handleClick(toast)}
            className={`pointer-events-auto flex items-start gap-3 p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 cursor-pointer transition-all duration-300 ${
              toast.exiting
                ? 'opacity-0 translate-x-full'
                : 'opacity-100 translate-x-0 animate-[slideInRight_0.3s_ease-out]'
            }`}
          >
            <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${config.bg} ${config.border}`}>
              <Icon size={18} className={config.color} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 line-clamp-1">
                {toast.notification.title}
              </p>
              {toast.notification.body && (
                <p className="text-[12px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                  {toast.notification.body}
                </p>
              )}
              <p className="text-[11px] text-indigo-400 font-medium mt-1">
                {formatRelative(toast.notification.createdAt)}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissToast(toast.id);
              }}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
