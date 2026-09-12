import { expect, test } from '@playwright/test';

/** Exercise locale selection, its persisted cookie, and invalid-cookie English fallback. */
test('selects and persists a translated interface locale with an English fallback', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('ezrepo.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/provider-accounts', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        items: [],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 0, page: 1, pageCount: 0, perPage: 10 },
      },
    });
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
  await page.getByRole('button', { name: 'playwright' }).click();
  await page.getByText('Language', { exact: true }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Español' }).click();

  await expect(page.getByText('Cuentas de proveedores', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('menu', { name: 'Idioma' })).toBeVisible();
  await expect
    .poll(async () => (await page.context().cookies()).find((cookie) => cookie.name === 'ezrepo-locale')?.value)
    .toBe('es');

  await page.reload();
  await expect(page.getByText('Cuentas de proveedores', { exact: true }).first()).toBeVisible();

  await page.context().clearCookies();
  await page.context().addCookies([{ name: 'ezrepo-locale', value: 'unsupported', url: page.url() }]);
  await page.reload();
  await expect(page.getByText('Provider accounts', { exact: true }).first()).toBeVisible();
});
