import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('public user journeys', () => {
  for (const path of ['/', '/giris', '/kayit', '/kvkk', '/guven-merkezi']) {
    test(`${path} sayfasında ciddi erişilebilirlik ihlali yok`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))).toEqual([]);
    });
  }

  test('first visit opens the product introduction', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1, name: /yalnız değilsiniz/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ücretsiz aile hesabı oluştur' })).toBeVisible();
    await expect(page.getByText('Ailelerle deneyim paylaşın, doğrulanmış uzmanlara ulaşın ve gelişimi güvenle, tek bir yerde takip edin.')).toBeVisible();
  });

  test('login fields have accessible labels and announce validation errors', async ({ page }) => {
    await page.goto('/giris');

    await expect(page.getByLabel('E-posta')).toBeVisible();
    await expect(page.getByLabel('Şifre', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page.getByRole('alert')).toHaveCount(2);
    await expect(page.getByText('Geçerli bir e-posta adresi giriniz')).toBeVisible();
  });

  test('registration fields and password controls are accessible', async ({ page }) => {
    await page.goto('/kayit');

    await expect(page.getByLabel('Ad Soyad')).toBeVisible();
    await expect(page.getByLabel('E-posta')).toBeVisible();
    await expect(page.getByLabel('Şifre', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Şifreyi göster' })).toBeVisible();
  });

  test('mobile landing does not overflow horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /yalnız değilsiniz/ })).toBeVisible();

    const sizes = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));

    expect(sizes.content).toBe(sizes.viewport);
    expect(sizes.height).toBeLessThan(10000);
  });

  test('landing clearly explains family and expert journeys', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Ücretsiz aile hesabı oluştur' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Uzman olarak başvur' })).toBeVisible();
    await expect(page.getByText('Uzmanla güvenli iletişim kurun')).toBeVisible();
  });

  test('landing shows the product and links to transparent data controls', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByLabel('Aile paneli ürün önizlemesi')).toBeVisible();
    await page.getByRole('link', { name: /Güven merkezini aç/ }).click();

    await expect(page).toHaveURL('/guven-merkezi');
    await expect(page.getByRole('heading', { level: 1, name: 'Güven Merkezi' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Veri dışa aktarma ve silme' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Uzman doğrulaması' })).toBeVisible();
  });

  test('landing primary public links do not lead to a missing page', async ({ page }) => {
    await page.goto('/');
    const paths = await page.locator('a[href^="/"]').evaluateAll((links) =>
      [...new Set(links.map((link) => (link as HTMLAnchorElement).getAttribute('href')).filter(Boolean))],
    );

    for (const path of paths) {
      const response = await page.request.get(path as string);
      expect(response.status(), `${path} should be served`).toBeLessThan(400);
    }
  });
});
