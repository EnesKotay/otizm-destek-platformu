import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/services/endpoints';

function normalizeApiError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
  }

  const status = error.response?.status;
  const responseData = error.response?.data;
  const validationDetails = responseData?.data && typeof responseData.data === 'object'
    ? Object.values(responseData.data).filter(Boolean).join(', ')
    : '';

  if (!error.response) {
    return 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin veya birkaç dakika sonra tekrar deneyin.';
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'Sunucu şu anda yanıt vermiyor. Lütfen birkaç dakika sonra tekrar deneyin.';
  }

  if (status === 401) {
    return responseData?.message || 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
  }

  if (status === 403) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (status === 404) {
    return responseData?.message || 'Aradığınız kayıt bulunamadı.';
  }

  if (status && status >= 500) {
    return 'Beklenmeyen bir sunucu hatası oluştu. Ekibimiz bu durumu inceleyebilir.';
  }

  if (responseData?.message) {
    return validationDetails
      ? `${responseData.message}: ${validationDetails}`
      : responseData.message;
  }

  return error.message || 'İşlem tamamlanamadı.';
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Çevrimdışı modda POST/PUT/DELETE isteklerini yakala ve LocalStorage'da kuyruğa at
  const method = config.method?.toLowerCase();
  if (typeof window !== 'undefined' && !navigator.onLine && method && ['post', 'put', 'delete', 'patch'].includes(method)) {
    const queue = getOfflineQueue();
    const offlineReq: OfflineRequest = {
      id: Math.random().toString(36).substring(2, 9),
      url: config.url || '',
      method: config.method || 'post',
      data: config.data,
      headers: { ...config.headers },
    };
    queue.push(offlineReq);
    saveOfflineQueue(queue);

    import('@/store/toastStore').then(({ toast }) => {
      toast.warning('Çevrimdışısınız. Değişiklikleriniz cihazınıza kaydedildi, internet geldiğinde yüklenecektir.');
    });

    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    source.cancel('OFFLINE_MOCK_SUCCESS');
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error) && error.message === 'OFFLINE_MOCK_SUCCESS') {
      return Promise.resolve({ data: { success: true, message: 'Offline saved' } } as any);
    }

    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = '/giris';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        useAuthStore.getState().setTokens(accessToken, newRefresh);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch {
        processQueue(error, null);
        useAuthStore.getState().logout();
        window.location.href = '/giris';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(new Error(normalizeApiError(error)));
  }
);

export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  data: any;
  headers: any;
}

export function getOfflineQueue(): OfflineRequest[] {
  try {
    const queue = localStorage.getItem('offline_request_queue');
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineRequest[]) {
  try {
    localStorage.setItem('offline_request_queue', JSON.stringify(queue));
  } catch { /* ignore */ }
}

export async function syncOfflineRequests() {
  if (typeof window === 'undefined') return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const { toast } = await import('@/store/toastStore');
  toast.info('İnternet bağlantısı algılandı. Çevrimdışı verileriniz senkronize ediliyor...');

  const remainingQueue: OfflineRequest[] = [];

  for (const req of queue) {
    try {
      await api.request({
        url: req.url,
        method: req.method,
        data: req.data,
        headers: {
          ...req.headers,
          Authorization: useAuthStore.getState().accessToken
            ? `Bearer ${useAuthStore.getState().accessToken}`
            : req.headers.Authorization
        }
      });
    } catch (err) {
      console.error('Failed to sync offline request:', req, err);
      if (axios.isAxiosError(err) && !err.response) {
        remainingQueue.push(req);
      }
    }
  }

  saveOfflineQueue(remainingQueue);

  if (remainingQueue.length === 0) {
    toast.success('Tüm çevrimdışı veriler başarıyla senkronize edildi!');
    window.dispatchEvent(new Event('offline-sync-completed'));
  } else {
    toast.warning('Bazı veriler senkronize edilemedi, daha sonra tekrar denenecek.');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineRequests();
  });
}

export default api;
