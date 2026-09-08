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

/** Verify that repository discovery follows the provider-first multi-stage dialog flow. */
test('adds a repository selected from an enabled provider account', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route(/\/api\/v1\/provider-accounts(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        items: [
          {
            displayName: 'Production GitHub',
            enabled: true,
            id: 'provider-1',
            providerType: 'GITHUB',
          },
          {
            displayName: 'Disabled GitLab',
            enabled: false,
            id: 'provider-2',
            providerType: 'GITLAB',
          },
        ],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 2, page: 1, pageCount: 1, perPage: 100 },
      },
    });
  });
  await page.route('**/api/v1/provider-accounts/provider-1/repositories', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: [
        {
          name: 'already-tracked',
          owner: 'flowpeek',
          providerRepositoryId: 'repository-1',
          tracked: true,
          url: 'https://github.com/flowpeek/already-tracked',
        },
        {
          name: 'new-repository',
          owner: 'flowpeek',
          providerRepositoryId: 'repository-2',
          tracked: false,
          url: 'https://github.com/flowpeek/new-repository',
        },
      ],
    });
  });
  await page.route('**/api/v1/provider-accounts/provider-1/repositories', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    expect(route.request().postDataJSON()).toEqual({ providerRepositoryId: 'repository-2' });
    await route.fulfill({
      contentType: 'application/json',
      json: {
        enabled: true,
        id: 'repository-2',
        lastSyncAt: null,
        name: 'new-repository',
        owner: 'flowpeek',
        providerAccountId: 'provider-1',
        url: 'https://github.com/flowpeek/new-repository',
        workflowRunRetentionDays: null,
      },
    });
  });
  await page.route(/\/api\/v1\/repositories(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        items: [],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 0, page: 1, pageCount: 0, perPage: 10 },
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
  await page.getByRole('button', { name: 'Add repository' }).click();
  await expect(page.getByRole('heading', { name: 'Add repository' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Show popup' }).click();
  await page.getByRole('option', { name: 'Production GitHub (GitHub)' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Show popup' }).click();
  await expect(page.getByRole('option', { name: /flowpeek\/already-tracked/ })).toHaveAttribute('data-disabled', '');
  await page.getByRole('option', { name: 'flowpeek/new-repository' }).click();
  await page.getByRole('button', { name: 'Add repository' }).last().click();

  await expect(page.getByRole('heading', { name: 'Add repository' })).not.toBeVisible();
});
