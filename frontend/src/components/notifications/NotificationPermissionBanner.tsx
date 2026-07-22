import { useState, useEffect } from 'react';
import { Bell, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { pushNotificationService } from '@/services/pushNotificationService';

interface NotificationPermissionBannerProps {
  onPermissionChange?: (permission: NotificationPermission) => void;
  className?: string;
}

export function NotificationPermissionBanner({ onPermissionChange, className = '' }: NotificationPermissionBannerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribing, setSubscribing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (pushNotificationService.isSupported()) {
      setPermission(pushNotificationService.getPermission());
    }
  }, []);

  if (dismissed || !pushNotificationService.isSupported() || permission === 'granted') {
    if (successMsg) {
      return (
        <div className={`mb-6 p-4 rounded-2xl bg-emerald-500 text-white shadow-md flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-white shrink-0" />
            <p className="text-sm font-bold">Web Push anlık bildirimleri başarıyla aktifleştirildi!</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(false)}
            className="p-1 hover:bg-white/20 rounded-lg text-white"
          >
            <X size={16} />
          </button>
        </div>
      );
    }
    return null;
  }

  const handleEnable = async () => {
    setSubscribing(true);
    try {
      const granted = await pushNotificationService.requestPermission();
      if (granted) {
        await pushNotificationService.subscribe();
        setSuccessMsg(true);
      }
      const newPerm = pushNotificationService.getPermission();
      setPermission(newPerm);
      onPermissionChange?.(newPerm);
    } catch {
      /* ignore */
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className={`mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-400/20 animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-amber-300 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-extrabold flex items-center gap-1.5">
            <Bell size={15} className="text-indigo-200" />
            Anlık Tarayıcı Bildirimlerini Açın
          </p>
          <p className="text-xs text-primary-100 mt-0.5 leading-relaxed">
            İlaç saatleri, randevu zamanları ve uzman mesajlarını uygulama kapalıyken bile anında öğrenin.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          disabled={subscribing}
          className="px-4 py-2 bg-white text-primary-700 font-bold text-xs rounded-xl shadow-md transition-all hover:bg-primary-50 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {subscribing ? 'Etkinleştiriliyor...' : 'Bildirimleri Aç'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-2 text-primary-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          title="Kapat"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
