import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/services/api', () => ({ default: apiMocks }));

import { pushNotificationService } from '@/services/pushNotificationService';

type TestSubscription = {
  toJSON: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

let currentSubscription: TestSubscription | null;
let createdSubscription: TestSubscription;
let registration: {
  pushManager: {
    getSubscription: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();

  createdSubscription = {
    toJSON: vi.fn(() => ({
      endpoint: 'https://push.example.test/subscription',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    })),
    unsubscribe: vi.fn(async () => {
      currentSubscription = null;
      return true;
    }),
  };
  currentSubscription = createdSubscription;
  registration = {
    pushManager: {
      getSubscription: vi.fn(async () => currentSubscription),
      subscribe: vi.fn(async () => {
        currentSubscription = createdSubscription;
        return createdSubscription;
      }),
    },
  };

  Object.defineProperty(window, 'PushManager', { configurable: true, value: class PushManager {} });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: { permission: 'granted', requestPermission: vi.fn(async () => 'granted') },
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn(async () => registration),
      register: vi.fn(async () => registration),
    },
  });

  apiMocks.get.mockResolvedValue({ data: { data: { publicKey: 'AQID' } } });
  apiMocks.post.mockResolvedValue({ data: { success: true } });
});

describe('pushNotificationService', () => {
  it('eşzamanlı abonelik çağrılarını tek sunucu kaydında birleştirir', async () => {
    const results = await Promise.all([
      pushNotificationService.subscribe(),
      pushNotificationService.subscribe(),
      pushNotificationService.subscribe(),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(registration.pushManager.getSubscription).toHaveBeenCalledOnce();
    expect(apiMocks.post).toHaveBeenCalledOnce();
    expect(apiMocks.post).toHaveBeenCalledWith('/push/subscribe', {
      endpoint: 'https://push.example.test/subscription',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    });
  });

  it('yerel abonelik yoksa VAPID anahtarıyla yeni abonelik oluşturur', async () => {
    currentSubscription = null;

    const result = await pushNotificationService.subscribe();

    expect(result).toBe(true);
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    }));
    expect(apiMocks.post).toHaveBeenCalledOnce();
  });

  it('sunucu kaydı başarısızsa yerel aboneliği geri alır', async () => {
    apiMocks.post.mockRejectedValueOnce(new Error('Sunucu erişilemiyor'));

    const result = await pushNotificationService.subscribe();

    expect(result).toBe(false);
    expect(createdSubscription.unsubscribe).toHaveBeenCalledOnce();
    expect(await pushNotificationService.isSubscribed()).toBe(false);
  });

  it('Notification API yoksa destekleniyor saymaz', () => {
    delete (window as Window & { Notification?: typeof Notification }).Notification;

    expect(pushNotificationService.isSupported()).toBe(false);
  });
});
