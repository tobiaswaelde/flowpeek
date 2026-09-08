import { expect, test } from '@playwright/test';

/** Verify that repository and user administration share the full Query Kit table layout. */
test('repository and user administration render full-page Query Kit tables', async ({ page }, testInfo) => {
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route(/\/api\/v1\/repositories(?:\?.*)?$/, async (route) => {
    expect(route.request().url()).toContain('fields=');
    await route.fulfill({
      contentType: 'application/json',
      json: {
        items: [
          {
            enabled: true,
            id: 'repository-1',
            lastSyncAt: null,
            name: 'flowpeek',
            owner: 'twaelde',
            providerAccountId: 'provider-1',
            providerRepositoryId: 'repository-1',
            url: 'https://github.com/tobiaswaelde/flowpeek',
            workflowRunRetentionDays: 30,
          },
        ],
        meta: { itemCount: 1, pageCount: 1 },
      },
    });
  });
  await page.route(/\/api\/v1\/users(?:\?.*)?$/, async (route) => {
    expect(route.request().url()).toContain('fields=');
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
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { id: 'playwright-admin', role: 'SYSTEM_ADMIN', username: 'playwright' },
    });
  });

  await page.goto('/admin/repositories');

  const repositoryBreadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
  await expect(repositoryBreadcrumb.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
  await expect(repositoryBreadcrumb).toContainText('Repositories');
  await expect(page.getByRole('link', { name: 'flowpeek', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/tobiaswaelde/flowpeek',
  );
  await page.keyboard.press('Shift+O');
  await expect(page.getByText('Table options', { exact: true })).toBeVisible();
  await page.keyboard.press('Shift+O');

  await page.goto('/admin/users');

  const userBreadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
  await expect(userBreadcrumb.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
  await expect(userBreadcrumb).toContainText('Users');
  await expect(page.getByText('System administrator', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeDisabled();
  await page.keyboard.press('Shift+O');
  await expect(page.getByText('Table options', { exact: true })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath('user-table.png'), fullPage: true });
});
