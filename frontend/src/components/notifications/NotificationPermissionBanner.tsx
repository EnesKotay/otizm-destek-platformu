import { useState, useEffect } from 'react';
import { Bell, Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react';
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

  if (dismissed || !pushNotificationService.isSupported() || !statusChecked || (permission === 'granted' && subscribed && !successMsg)) {
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
    <div className={`mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-400/20 animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-amber-300 animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold flex items-center gap-1.5">
            <Bell size={15} className="text-indigo-200" />
            Anlık Tarayıcı Bildirimlerini Açın
          </p>
          <p className="text-xs text-primary-100 mt-0.5 leading-relaxed">
            İlaç saatleri, randevu zamanları ve uzman mesajlarını uygulama kapalıyken bile anında öğrenin.
          </p>
          {errorMsg && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg bg-white/15 px-2.5 py-2 text-xs font-semibold leading-5 text-white">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          disabled={subscribing}
          className="px-4 py-2 bg-white text-primary-700 font-bold text-xs rounded-xl shadow-md transition-all hover:bg-primary-50 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {subscribing ? 'Etkinleştiriliyor...' : permission === 'granted' ? 'Aboneliği Tamamla' : 'Bildirimleri Aç'}
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
