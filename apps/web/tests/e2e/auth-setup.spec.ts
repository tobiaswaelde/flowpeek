import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

const administrator = {
  avatarUpdatedAt: null,
  firstName: 'Vera',
  id: 'administrator-id',
  lastName: 'Admin',
  role: 'SYSTEM_ADMIN',
  username: 'vera',
} as const;

test('creates and signs in the first administrator from the guided setup', async ({ page }, testInfo) => {
  await page.route('**/api/v1/auth/setup-status', (route) => route.fulfill({ json: { initialized: false } }));
  await page.route('**/api/v1/auth/setup', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      firstName: 'Vera',
      lastName: 'Admin',
      password: 'secure-password',
      username: 'vera',
    });
    await route.fulfill({ json: { accessToken: 'setup-access-token', user: administrator } });
  });

  await page.goto('/');
  await expect(page).toHaveURL('/auth/setup');
  await expect(page.getByRole('heading', { name: 'First-run setup' })).toBeVisible();
  await page.getByLabel('First name').fill('Vera');
  await page.getByLabel('Last name').fill('Admin');
  await page.getByLabel('Username').fill('vera');
  await page.getByLabel('Password', { exact: true }).fill('secure-password');
  await page.getByLabel('Confirm password').fill('different-password');
  await page.getByRole('button', { name: 'Create administrator' }).click();
  await expect(page.getByText('The passwords do not match.')).toBeVisible();
  await page.getByLabel('Confirm password').fill('secure-password');
  await page.screenshot({ path: testInfo.outputPath('first-run-setup.png'), fullPage: true });
  await page.getByRole('button', { name: 'Create administrator' }).click();

  await expect(page).toHaveURL('/');
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('ezrepo.access-token')))
    .toBe('setup-access-token');
});

test('redirects an initialized installation away from setup', async ({ page }) => {
  await page.route('**/api/v1/auth/setup-status', (route) => route.fulfill({ json: { initialized: true } }));

  await page.goto('/auth/setup');

  await expect(page).toHaveURL('/auth/signin');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ezRepo' }).locator('img')).toHaveAttribute('src', '/logo.svg');
  await page.screenshot({ path: resolve(process.cwd(), '../../docs/public/screenshots/sign-in.png'), fullPage: true });
});
