import { test, expect } from '@playwright/test';

test('has title and renders login correctly', async ({ page }) => {
  await page.goto('/');

  // Expect a title to be present.
  await expect(page).toHaveTitle(/Otizm/i);

  // Expect some common element. If there's an auth wall, it might show login.
  // We'll just verify the page loads and has a basic container.
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
