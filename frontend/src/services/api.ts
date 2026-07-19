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
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']
      .some((path) => originalRequest.url?.includes(path));

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
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
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const { accessToken } = data.data;
        useAuthStore.getState().setAccessToken(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch {
        processQueue(error, null);
        useAuthStore.getState().clearSession();
        window.location.href = '/giris';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(new Error(normalizeApiError(error)));
  }
);

export default api;
