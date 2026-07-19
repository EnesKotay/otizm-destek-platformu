import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('public user journeys', () => {
  for (const path of ['/', '/giris', '/kayit', '/kvkk']) {
    test(`${path} sayfasında ciddi erişilebilirlik ihlali yok`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))).toEqual([]);
    });
  }

  test('first visit opens the product introduction', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Otizm Destek Platformu' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Aile hesabı aç' })).toBeVisible();
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
    await expect(page.getByRole('heading', { level: 1, name: 'Otizm Destek Platformu' })).toBeVisible();

    const sizes = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));

    expect(sizes.content).toBe(sizes.viewport);
    expect(sizes.height).toBeLessThan(5000);
  });
});
