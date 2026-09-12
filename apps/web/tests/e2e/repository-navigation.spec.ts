import { expect, test, type Page } from '@playwright/test';

const repository = {
  enabled: true,
  id: 'repository-1',
  lastSyncAt: null,
  name: 'ezrepo',
  owner: 'twaelde',
  providerAccountId: 'provider-1',
  providerRepositoryId: 'repository-1',
  url: 'https://github.com/tobiaswaelde/ezrepo',
  workflowRunCount: 12,
  workflowRunRetentionDays: 30,
};

/** Configure the assigned repository list and detail for a non-administrative user. */
async function mockViewerRepositories(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('ezrepo.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: { id: 'playwright-viewer', role: 'VIEWER', username: 'playwright' } }),
  );
  await page.route(/\/api\/v1\/repositories(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        items: [repository],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 1, page: 1, pageCount: 1, perPage: 10 },
      },
    }),
  );
  await page.route('**/api/v1/repositories/repository-1', (route) => route.fulfill({ json: repository }));
  await page.route('**/api/v1/dashboard/awaiting-approval', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/workflow-runs/needs-attention**', (route) =>
    route.fulfill({
      json: {
        items: [],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 0, page: 1, pageCount: 0, perPage: 1 },
      },
    }),
  );
}

test('viewer browses assigned repositories without administration actions', async ({ page }, testInfo) => {
  await mockViewerRepositories(page);
  await page.goto('/repositories');

  await expect(page).toHaveTitle('Repositories · ezRepo');
  const brandLink = page.getByRole('link', { name: 'ezRepo' });
  await expect(brandLink).toHaveText('ezRepo');
  await expect(brandLink).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/tobiaswaelde/ezrepo',
  );
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  const repositoriesLink = navigation.getByRole('link', { name: 'Repositories' });
  await expect(repositoriesLink).toHaveAttribute('href', '/repositories');
  await expect(repositoriesLink).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByText('Administration', { exact: true })).toHaveCount(0);
  await expect(page.getByText('twaelde', { exact: true })).toBeVisible();
  await expect(page.getByText('ezrepo', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add repository' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Disable' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open in provider' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('viewer-repository-navigation-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  await expect(brandLink).toHaveText('ez');
  await expect(navigation.getByRole('button', { name: 'Workflow runs' })).toBeVisible();
  await expect(repositoriesLink).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: testInfo.outputPath('viewer-repository-navigation-collapsed.png'), fullPage: true });
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(brandLink).toHaveText('ezRepo');

  await page.getByPlaceholder('Search ezRepo').fill('repositories');
  await expect(page.getByRole('link', { name: 'Repositories' }).last()).toHaveAttribute('href', '/repositories');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open repository' }).click();

  await expect(page).toHaveURL(/\/repositories\?repository=repository-1$/);
  const repositoryDialog = page.getByRole('dialog', { name: 'twaelde/ezrepo' });
  await expect(repositoryDialog).toBeVisible();
  await expect(repositoryDialog.getByText('Enabled', { exact: true })).toBeVisible();
  await expect(repositoryDialog.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await expect(repositoryDialog.getByRole('button', { name: 'Refresh provider data' })).toHaveCount(0);
  await expect(repositoryDialog.getByRole('heading', { name: 'Workflow filters' })).toHaveCount(0);
  await expect(repositoryDialog.getByRole('heading', { name: 'Members' })).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/repositories$/);
  await expect(repositoryDialog).not.toBeVisible();
  await expect(repositoriesLink).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(repositoryDialog).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/repositories\?repository=repository-1$/);
  await expect(repositoryDialog).toBeVisible();

  await page.goto('/repositories/repository-1?source=detail#settings');
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}|${url.searchParams.get('repository')}|${url.searchParams.get('source')}|${url.hash}`;
    })
    .toBe('/repositories|repository-1|detail|#settings');
  await expect(repositoryDialog).toBeVisible();

  await page.goto('/admin/repositories/repository-1?source=legacy#details');
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}|${url.searchParams.get('repository')}|${url.searchParams.get('source')}|${url.hash}`;
    })
    .toBe('/repositories|repository-1|legacy|#details');
  await page.setViewportSize({ height: 844, width: 390 });
  await expect(repositoryDialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('viewer-repository-mobile.png'), fullPage: true });
});

test('administrator refreshes renamed repository metadata from the provider', async ({ page }, testInfo) => {
  let releaseRefresh: (() => void) | undefined;
  let refreshAttempts = 0;
  const refreshResponse = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  await page.addInitScript(() => window.localStorage.setItem('ezrepo.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: { id: 'playwright-admin', role: 'SYSTEM_ADMIN', username: 'playwright' } }),
  );
  await page.route('**/api/v1/repositories/repository-1/refresh', async (route) => {
    refreshAttempts += 1;
    if (refreshAttempts > 1) {
      await route.fulfill({ json: { message: 'Provider repository not found.' }, status: 404 });
      return;
    }
    await refreshResponse;
    await route.fulfill({
      json: {
        ...repository,
        name: 'ezrepo',
        owner: 'new-owner',
        url: 'https://github.com/new-owner/ezrepo',
      },
    });
  });
  await page.route('**/api/v1/repositories/repository-1/workflow-filters', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/repositories/repository-1/memberships', (route) => route.fulfill({ json: [] }));
  await page.route(/\/api\/v1\/users(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { items: [], meta: { itemCount: 0, pageCount: 0 } } }),
  );
  await page.route('**/api/v1/repositories/repository-1', (route) => route.fulfill({ json: repository }));
  await page.route(/\/api\/v1\/repositories(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        items: [repository],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 1, page: 1, pageCount: 1, perPage: 10 },
      },
    }),
  );

  await page.goto('/repositories?repository=repository-1');

  const refreshButton = page.getByRole('button', { name: 'Refresh provider data' });
  await refreshButton.click();
  await expect(refreshButton).toBeDisabled();
  await expect(refreshButton.locator('[data-slot="leadingIcon"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('repository-refresh-loading.png'), fullPage: true });
  releaseRefresh?.();

  await expect(page.getByRole('dialog', { name: 'new-owner/ezrepo' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open in provider' })).toHaveAttribute(
    'href',
    'https://github.com/new-owner/ezrepo',
  );
  await expect(page.getByText('Repository data was refreshed from the provider.', { exact: true })).toBeVisible();

  await refreshButton.click();
  await expect(
    page.getByText('Repository data could not be refreshed from the provider.', { exact: true }),
  ).toBeVisible();
});
