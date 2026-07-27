import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pushMocks = vi.hoisted(() => ({
  isSupported: vi.fn(),
  getPermission: vi.fn(),
  isSubscribed: vi.fn(),
  requestPermission: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock('@/services/pushNotificationService', () => ({
  pushNotificationService: pushMocks,
}));

import { NotificationPermissionBanner } from '@/components/notifications/NotificationPermissionBanner';

let permission: NotificationPermission;
let container: HTMLDivElement;
let root: Root;

async function flushRender() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderBanner() {
  await act(async () => {
    root.render(<NotificationPermissionBanner />);
  });
  await flushRender();
}

function buttonByName(name: string) {
  const button = [...container.querySelectorAll('button')].find((candidate) => (
    candidate.getAttribute('aria-label') === name || candidate.textContent?.trim() === name
  ));
  if (!button) throw new Error(`“${name}” düğmesi bulunamadı.`);
  return button;
}

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  permission = 'default';
  pushMocks.isSupported.mockReturnValue(true);
  pushMocks.getPermission.mockImplementation(() => permission);
  pushMocks.isSubscribed.mockResolvedValue(false);
  pushMocks.requestPermission.mockImplementation(async () => {
    permission = 'granted';
    return true;
  });
  pushMocks.subscribe.mockResolvedValue(true);

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('NotificationPermissionBanner', () => {
  it('tarayıcı desteklemiyorsa gösterilmez', async () => {
    pushMocks.isSupported.mockReturnValue(false);

    await renderBanner();

    expect(container.textContent).not.toContain('Hatırlatmaları cihazınızda alın');
  });

  it('amacı ve eylemi abonelik jargonuna girmeden açıklar', async () => {
    await renderBanner();

    expect(container.textContent).toContain('Hatırlatmaları cihazınızda alın');
    expect(container.textContent).toContain('İlaç saatleri, yaklaşan randevular');
    expect(buttonByName('Bildirimleri etkinleştir')).not.toBeDisabled();
    expect(container.textContent).not.toMatch(/Aboneliği tamamla/i);
  });

  it('başarılı cihaz kaydından sonra başarı durumunu gösterir ve ardından gizlenir', async () => {
    await renderBanner();

    await click(buttonByName('Bildirimleri etkinleştir'));

    expect(pushMocks.requestPermission).toHaveBeenCalledOnce();
    expect(pushMocks.subscribe).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Cihaz bildirimleri etkinleştirildi.');
    expect(container.textContent).not.toContain('Hatırlatmaları cihazınızda alın');

    await click(buttonByName('Başarı bildirimini kapat'));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('tarayıcı izni verilmiş ama cihaz kaydı yoksa aynı anlaşılır eylemi gösterir', async () => {
    permission = 'granted';

    await renderBanner();

    expect(buttonByName('Bildirimleri etkinleştir')).not.toBeDisabled();
    expect(pushMocks.requestPermission).not.toHaveBeenCalled();
  });

  it('cihaz kaydı tamamlanamazsa kullanıcıya hata gösterir', async () => {
    pushMocks.subscribe.mockResolvedValue(false);
    await renderBanner();

    await click(buttonByName('Bildirimleri etkinleştir'));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('bildirim aboneliği tamamlanamadı');
    expect(buttonByName('Bildirimleri etkinleştir')).not.toBeDisabled();
  });

  it('cihaz zaten kayıtlıysa kartı göstermez', async () => {
    permission = 'granted';
    pushMocks.isSubscribed.mockResolvedValue(true);

    await renderBanner();

    expect(pushMocks.isSubscribed).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain('Hatırlatmaları cihazınızda alın');
  });
});
