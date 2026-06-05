import api from './api';

let cachedPublicKey = (import.meta as { env?: Record<string, string> }).env?.VITE_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export const pushNotificationService = {
  isSupported: () => 'serviceWorker' in navigator && 'PushManager' in window,

  getPermission: () => ('Notification' in window ? Notification.permission : 'denied') as NotificationPermission,

  async getPublicKey(): Promise<string> {
    if (cachedPublicKey) return cachedPublicKey;
    try {
      const response = await api.get<{ data: { publicKey: string } }>('/push/vapid-public-key');
      cachedPublicKey = response.data.data?.publicKey ?? '';
      return cachedPublicKey;
    } catch {
      return '';
    }
  },

  async getRegistration(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration();
    return existing ?? navigator.serviceWorker.register('/sw.js');
  },

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  async subscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const publicKey = await this.getPublicKey();
    if (!publicKey) return false;
    try {
      const reg = await this.getRegistration();
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await api.post('/push/subscribe', existing.toJSON());
        return true;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
      await api.post('/push/subscribe', sub.toJSON());
      return true;
    } catch (e) {
      console.warn('Push subscription failed:', e);
      return false;
    }
  },

  async unsubscribe(): Promise<void> {
    if (!this.isSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await api.post('/push/unsubscribe', sub.toJSON()).catch(() => {});
    }
  },

  async isSubscribed(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  },
};
