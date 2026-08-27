import { expect, test } from '@playwright/test';

/** Verify the provider-account form's native controls and retain a review screenshot. */
test('provider account form renders as a structured native UI form', async ({ page }, testInfo) => {
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/provider-accounts', async (route) => {
    await route.fulfill({ contentType: 'application/json', json: [] });
  });
  await page.route('**/api/v1/provider-accounts/authentication-options', async (route) => {
    await route.fulfill({ contentType: 'application/json', json: { oauthProviderTypes: [] } });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { id: 'playwright-admin', role: 'SYSTEM_ADMIN', username: 'playwright' },
    });
  });

  await page.goto('/admin/providers');

  await expect(page.getByRole('heading', { level: 1, name: /provider accounts|anbieter-konten/i })).toBeVisible();
  await expect(page.getByPlaceholder(/production github|produktion github/i)).toBeVisible();
  await expect(page.getByRole('combobox').first()).toBeVisible();
  await expect(page.getByPlaceholder(/read-only token|schreibgeschützten token/i)).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath('provider-account-form.png'), fullPage: true });
});
