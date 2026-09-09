import { expect, test } from '@playwright/test';

/** Configure global defaults and apply the selected timestamp format across administration pages. */
test('updates global retention and date-time formatting with visible request progress', async ({ page }, testInfo) => {
  let settings = { dateTimeFormat: 'LOCALE_MEDIUM', workflowRunRetentionDays: 90 };
  let releaseSettingsUpdate: (() => void) | undefined;
  const settingsUpdateResponse = new Promise<void>((resolve) => {
    releaseSettingsUpdate = resolve;
  });

  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { id: 'playwright-admin', role: 'SYSTEM_ADMIN', username: 'playwright' },
    });
  });
  await page.route('**/api/v1/settings', async (route) => {
    if (route.request().method() === 'PATCH') {
      const input = route.request().postDataJSON() as typeof settings;
      expect(input).toEqual({ dateTimeFormat: 'ISO', workflowRunRetentionDays: 30 });
      await settingsUpdateResponse;
      settings = input;
    }
    await route.fulfill({ contentType: 'application/json', json: settings });
  });
  await page.route('**/api/v1/settings/preferences', async (route) => {
    await route.fulfill({ contentType: 'application/json', json: { dismissedIntroBannerIds: [] } });
  });
  await page.route(/\/api\/v1\/users(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        items: [
          {
            createdAt: '2026-09-08T08:00:00.000Z',
            id: 'playwright-admin',
            role: 'SYSTEM_ADMIN',
            updatedAt: '2026-09-08T08:00:00.000Z',
            username: 'playwright',
          },
        ],
        meta: { itemCount: 1, pageCount: 1 },
      },
    });
  });

  await page.goto('/admin/settings');

  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Workflow run retention' })).toHaveValue('90');
  await page.getByRole('spinbutton', { name: 'Workflow run retention' }).fill('30');
  await page.getByRole('combobox', { name: 'Default date and time format' }).click();
  await page.getByRole('option', { name: 'ISO style' }).click();
  await expect(page.getByText('2026-09-09 13:05', { exact: true })).toBeVisible();

  const saveButton = page.getByRole('button', { name: 'Save settings' });
  await saveButton.click();
  await expect(saveButton).toBeDisabled();
  await expect(saveButton.locator('[data-slot="leadingIcon"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('global-settings-saving.png'), fullPage: true });
  releaseSettingsUpdate?.();
  await expect(page.getByText('Global settings saved.', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Users' }).click();
  await expect(page.locator('tbody')).toContainText('2026-09-08 10:00');
});

/** Let non-administrators manage personal preferences without exposing global settings. */
test('shows personal settings but hides global defaults from non-administrators', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { id: 'playwright-viewer', role: 'VIEWER', username: 'viewer' },
    });
  });
  await page.route('**/api/v1/settings', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { dateTimeFormat: 'LOCALE_MEDIUM', workflowRunRetentionDays: 90 },
    });
  });
  await page.route('**/api/v1/settings/preferences', async (route) => {
    await route.fulfill({ contentType: 'application/json', json: { dismissedIntroBannerIds: ['dashboard'] } });
  });

  await page.goto('/admin/settings');

  await expect(page).toHaveURL('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Page introductions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore all banners' })).toBeEnabled();
  await expect(page.getByRole('spinbutton', { name: 'Workflow run retention' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save settings' })).toHaveCount(0);
});
