import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { pushNotificationService } from '@/services/pushNotificationService';

interface NotificationPermissionBannerProps {
  onPermissionChange?: (permission: NotificationPermission) => void;
  className?: string;
}

export function NotificationPermissionBanner({ onPermissionChange, className = '' }: NotificationPermissionBannerProps) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    pushNotificationService.isSupported() ? pushNotificationService.getPermission() : 'denied',
  );
  const [subscribing, setSubscribing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!pushNotificationService.isSupported()) return;
    pushNotificationService.isSubscribed()
      .then(setSubscribed)
      .catch(() => setSubscribed(false))
      .finally(() => setStatusChecked(true));
  }, []);

  if (successMsg) {
    return (
      <div role="status" aria-live="polite" className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/70 dark:bg-gray-900 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 size={19} aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Cihaz bildirimleri etkinleştirildi.</p>
        </div>
        <button
          type="button"
          onClick={() => setSuccessMsg(false)}
          aria-label="Başarı bildirimini kapat"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-gray-800 dark:hover:text-slate-200"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (dismissed || !pushNotificationService.isSupported() || !statusChecked || (permission === 'granted' && subscribed)) {
    return null;
  }

  const handleEnable = async () => {
    setErrorMsg('');
    if (pushNotificationService.getPermission() === 'denied') {
      setPermission('denied');
      setErrorMsg('Bildirim izni tarayıcıda engellenmiş. Adres çubuğundaki site ayarlarından “Bildirimler → İzin ver” seçeneğini açın.');
      return;
    }

    setSubscribing(true);
    try {
      const granted = pushNotificationService.getPermission() === 'granted'
        ? true
        : await pushNotificationService.requestPermission();
      const newPerm = pushNotificationService.getPermission();
      setPermission(newPerm);
      onPermissionChange?.(newPerm);

      if (!granted) {
        setErrorMsg(newPerm === 'denied'
          ? 'Bildirim izni engellendi. Site ayarlarından bildirimlere izin verip tekrar deneyin.'
          : 'Bildirim izni verilmedi. Açılan tarayıcı sorusunda “İzin ver” seçeneğini seçin.');
        return;
      }

      const subscriptionCreated = await pushNotificationService.subscribe();
      if (!subscriptionCreated) {
        setErrorMsg('Tarayıcı izni verildi ancak bildirim aboneliği tamamlanamadı. Sayfayı yenileyip tekrar deneyin.');
        return;
      }

      setSubscribed(true);
      setSuccessMsg(true);
    } catch (error) {
      console.warn('Bildirimler etkinleştirilemedi:', error);
      setErrorMsg('Bildirimler şu anda etkinleştirilemedi. Lütfen sayfayı yenileyip tekrar deneyin.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <section aria-labelledby="notification-permission-title" className={`mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/80 p-4 shadow-xs dark:border-indigo-900/70 dark:bg-indigo-950/30 sm:flex-row sm:items-center ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-white text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Bell size={19} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p id="notification-permission-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">Hatırlatmaları cihazınızda alın</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            İlaç saatleri, yaklaşan randevular ve yeni uzman mesajları için cihaz bildirimi alın.
          </p>
          {errorMsg && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-xs font-semibold leading-5 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-rose-500 dark:text-rose-300" />
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:self-center">
        <button
          type="button"
          onClick={handleEnable}
          disabled={subscribing}
          className="min-h-10 flex-1 cursor-pointer whitespace-nowrap rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:border-indigo-700 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
        >
          {subscribing ? 'Etkinleştiriliyor...' : 'Bildirimleri etkinleştir'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Bildirim önerisini kapat"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-indigo-900/60 dark:hover:text-indigo-200"
          title="Kapat"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
