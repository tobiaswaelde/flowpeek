import { expect, test } from '@playwright/test';

const nonSquarePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAIAAABJdyC1AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAGTElEQVR4nO3WwQ3DQAwDQbe9jeWfztJCfoSFAViAMZJ1fPp+hAABAr3hFDzzLxACBAjkYFkCAgS61Qk0rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAg0K0XUcPaz0AIEMjBsgQECHTrRdSw9jMQAgRysCwBAQLdehE1rP0MhACBHCxLQIBAt15EDWs/AyFAIAfLEhAgK/LwQds25t0eLloWgAAAABJRU5ErkJggg==',
  'base64',
);

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

/** Upload, crop, and remove the current user's profile picture without exposing the original source. */
test('manages a cropped personal avatar from upload and HTTPS import', async ({ page }, testInfo) => {
  let currentUser = {
    avatarUpdatedAt: null as string | null,
    id: 'playwright-viewer',
    role: 'VIEWER',
    username: 'viewer',
  };
  let uploadCount = 0;
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ contentType: 'application/json', json: currentUser }),
  );
  await page.route('**/api/v1/settings/preferences', (route) =>
    route.fulfill({ contentType: 'application/json', json: { dismissedIntroBannerIds: [] } }),
  );
  await page.route('**/api/v1/auth/me/avatar', async (route) => {
    if (route.request().method() === 'DELETE') {
      currentUser = { ...currentUser, avatarUpdatedAt: null };
      return route.fulfill({ contentType: 'application/json', json: currentUser });
    }
    uploadCount += 1;
    expect(route.request().postDataBuffer()?.toString('latin1')).toContain('image/webp');
    currentUser = { ...currentUser, avatarUpdatedAt: `2026-09-12T10:00:0${uploadCount}.000Z` };
    await route.fulfill({ contentType: 'application/json', json: currentUser });
  });
  await page.route('**/api/v1/auth/me/avatar/remote-preview', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ url: 'https://example.com/avatar.png' });
    await route.fulfill({ body: nonSquarePng, contentType: 'image/png' });
  });
  await page.route('**/api/v1/users/playwright-viewer/avatar**', (route) =>
    route.fulfill({ body: nonSquarePng, contentType: 'image/webp' }),
  );

  await page.goto('/admin/settings');
  await page
    .locator('input[type="file"]')
    .setInputFiles({ buffer: nonSquarePng, mimeType: 'image/png', name: 'avatar.png' });
  const cropDialog = page.getByRole('dialog', { name: 'Crop profile picture' });
  await expect(cropDialog).toBeVisible();
  await expect(cropDialog.getByRole('button', { name: 'Zoom in' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('avatar-crop-dialog.png'), fullPage: true });
  await cropDialog.getByRole('button', { name: 'Apply crop' }).click();
  await expect(page.getByText('Profile picture updated.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove profile picture' })).toBeVisible();

  await page.getByPlaceholder('https://example.com/avatar.jpg').fill('https://example.com/avatar.png');
  await page.getByRole('button', { name: 'Import image' }).click();
  await expect(cropDialog).toBeVisible();
  await cropDialog.getByRole('button', { name: 'Apply crop' }).click();
  await expect.poll(() => uploadCount).toBe(2);

  await page.getByRole('button', { name: 'Remove profile picture' }).click();
  await expect(page.getByRole('button', { name: 'Remove profile picture' })).toHaveCount(0);
});
