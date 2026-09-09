import { expect, test, type Page } from '@playwright/test';

const emptyPage = {
  items: [],
  meta: { hasNextPage: false, hasPrevPage: false, itemCount: 0, page: 1, pageCount: 0, perPage: 25 },
};

interface PreferenceMocks {
  dismissedBannerIds: Set<string>;
  waitForDismiss?: Promise<void>;
}

/** Mock authenticated application resources used across the page-shell scenarios. */
async function mockApplication(page: Page, preferences: PreferenceMocks): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: { id: 'playwright-admin', role: 'SYSTEM_ADMIN', username: 'playwright' } }),
  );
  await page.route(/\/api\/v1\/settings\/preferences(?:\/intro-banners(?:\/[^/?]+)?)?$/, async (route) => {
    const request = route.request();
    if (request.method() === 'PUT') {
      await preferences.waitForDismiss;
      preferences.dismissedBannerIds.add(decodeURIComponent(request.url().split('/').at(-1) ?? ''));
    } else if (request.method() === 'DELETE') {
      preferences.dismissedBannerIds.clear();
    }
    await route.fulfill({ json: { dismissedIntroBannerIds: [...preferences.dismissedBannerIds] } });
  });
  await page.route(/\/api\/v1\/settings$/, (route) =>
    route.fulfill({ json: { dateTimeFormat: 'LOCALE_MEDIUM', workflowRunRetentionDays: 90 } }),
  );
  await page.route('**/api/v1/health', (route) =>
    route.fulfill({ json: { api: 'ok', database: 'ok', providers: [], status: 'ok' } }),
  );
  await page.route('**/api/v1/dashboard/failures', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/dashboard/latest-runs', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/dashboard/awaiting-approval', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/dashboard/repositories**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/dashboard/trend**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/dashboard/summary**', (route) =>
    route.fulfill({
      json: {
        awaitingApprovalCount: 0,
        completedCount: 0,
        medianDurationMs: null,
        queuedCount: 0,
        runningCount: 0,
        statuses: { cancelled: 0, failed: 0, skipped: 0, success: 0, unknown: 0 },
        successRate: 0,
      },
    }),
  );
  await page.route(/\/api\/v1\/(?:provider-accounts|repositories|users|workflow-runs)(?:\?.*)?$/, (route) =>
    route.fulfill({ json: emptyPage }),
  );
  await page.route('**/api/v1/repositories/repository-1', (route) =>
    route.fulfill({
      json: {
        enabled: true,
        id: 'repository-1',
        lastSyncAt: null,
        name: 'flowpeek',
        owner: 'tobiaswaelde',
        providerAccountId: 'provider-1',
        url: 'https://github.com/tobiaswaelde/flowpeek',
        workflowRunRetentionDays: 90,
      },
    }),
  );
  await page.route('**/api/v1/repositories/repository-1/workflow-filters', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/repositories/repository-1/memberships', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/notification-channels', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/notification-rules', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/notification-deliveries', (route) => route.fulfill({ json: [] }));
}

test('uses the shared page shell, toolbar, breadcrumbs, and introduction on every authenticated page', async ({
  page,
}, testInfo) => {
  await mockApplication(page, { dismissedBannerIds: new Set() });
  const pages = [
    { bannerId: 'dashboard', path: '/', title: 'Workflow dashboard' },
    { bannerId: 'workflow-runs', path: '/workflow-runs', title: 'Workflow runs' },
    { bannerId: 'awaiting-approval', path: '/workflows/awaiting-approval', title: 'Awaiting approval' },
    { bannerId: 'notifications', path: '/notifications', title: 'Notifications' },
    { bannerId: 'admin-providers', path: '/admin/providers', title: 'Provider accounts' },
    { bannerId: 'admin-repositories', path: '/admin/repositories', title: 'Repositories' },
    { bannerId: 'repository-details', path: '/admin/repositories/repository-1', title: 'tobiaswaelde/flowpeek' },
    { bannerId: 'admin-users', path: '/admin/users', title: 'Users' },
    { bannerId: 'settings', path: '/admin/settings', title: 'Settings' },
  ];

  for (const currentPage of pages) {
    await page.goto(currentPage.path);
    const pageShell = page.locator('[data-page-shell]');
    const pageToolbar = page.locator('[data-page-toolbar]');
    const introduction = page.locator(`[data-intro-banner-id="${currentPage.bannerId}"]`);
    await expect(pageShell).toHaveCount(1);
    await expect(pageToolbar).toHaveCount(1);
    await expect(pageToolbar.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible();
    await expect(pageToolbar.locator('[data-page-introduction]')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: currentPage.title })).toBeVisible();
    await expect(introduction).toBeVisible();
    await expect
      .poll(() =>
        introduction.evaluate((element) => {
          const banner = element.getBoundingClientRect();
          const shell = element.closest('[data-page-shell]')?.getBoundingClientRect();
          return Boolean(shell && banner.left >= shell.left && banner.right <= shell.right);
        }),
      )
      .toBe(true);
    await expect
      .poll(() =>
        introduction.getByRole('button').evaluate((button) => {
          const action = button.getBoundingClientRect();
          const banner = button.closest('[data-intro-banner-id]')?.getBoundingClientRect();
          return Boolean(banner && action.left >= banner.left && action.right <= banner.right);
        }),
      )
      .toBe(true);
  }

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/admin/providers');
  const mobileToolbar = page.locator('[data-page-toolbar]');
  await expect(mobileToolbar.getByRole('button', { name: 'Sort' })).toBeVisible();
  await expect(mobileToolbar.getByRole('button', { name: 'Filter' })).toBeVisible();
  await expect(mobileToolbar.getByRole('button', { name: 'Table options' })).toBeVisible();
  await expect(mobileToolbar.getByRole('button', { name: 'Add provider' })).toBeVisible();
  await expect
    .poll(() =>
      mobileToolbar.evaluate((toolbar) => {
        const toolbarBounds = toolbar.getBoundingClientRect();
        const actions = toolbar.querySelector(':scope > [data-slot="right"]')?.getBoundingClientRect();
        return Boolean(actions && actions.left >= toolbarBounds.left && actions.right <= toolbarBounds.right);
      }),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.locator('[data-intro-banner-id="admin-providers"]').evaluate((element) => {
        const banner = element.getBoundingClientRect();
        const shell = element.closest('[data-page-shell]')?.getBoundingClientRect();
        return Boolean(shell && banner.left >= shell.left && banner.right <= shell.right);
      }),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('button', { name: 'Dismiss introduction for Provider accounts' }).evaluate((button) => {
        const action = button.getBoundingClientRect();
        const banner = button.closest('[data-intro-banner-id]')?.getBoundingClientRect();
        return Boolean(banner && action.left >= banner.left && action.right <= banner.right);
      }),
    )
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('providers-mobile.png'), fullPage: true });
});

test('keeps table breadcrumbs, controls, and creation actions in one toolbar row', async ({ page }, testInfo) => {
  await mockApplication(page, { dismissedBannerIds: new Set() });
  const tablePages = [
    { newAction: undefined, path: '/workflow-runs' },
    { newAction: 'Add provider', path: '/admin/providers' },
    { newAction: 'Add repository', path: '/admin/repositories' },
    { newAction: undefined, path: '/admin/users' },
  ];

  for (const currentPage of tablePages) {
    await page.goto(currentPage.path);
    const toolbar = page.locator('[data-page-toolbar]');
    await expect(toolbar).toHaveCount(1);
    await expect(toolbar.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible();
    await expect(toolbar.getByRole('button', { name: 'Sort' })).toBeVisible();
    await expect(toolbar.getByRole('button', { name: 'Filter' })).toBeVisible();
    await expect(toolbar.getByRole('button', { name: 'Table options' })).toBeVisible();
    if (currentPage.newAction) await expect(toolbar.getByRole('button', { name: currentPage.newAction })).toBeVisible();

    const buttonRows = await toolbar
      .getByRole('button')
      .evaluateAll((buttons) => [...new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)))]);
    expect(buttonRows).toHaveLength(1);

    if (currentPage.path === '/admin/providers') {
      await page.screenshot({ path: testInfo.outputPath('providers-toolbar.png'), fullPage: true });
    }
  }
});

test('keeps the page toolbar fixed while only the dashboard content scrolls', async ({ page }) => {
  await page.setViewportSize({ height: 500, width: 1800 });
  await mockApplication(page, { dismissedBannerIds: new Set() });
  await page.goto('/');

  const content = page.locator('[data-page-content]');
  const toolbar = page.locator('[data-page-toolbar]');
  const toolbarTop = await toolbar.evaluate((element) => element.getBoundingClientRect().top);
  await expect.poll(() => content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);

  await content.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));

  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() => toolbar.evaluate((element) => element.getBoundingClientRect().top)).toBe(toolbarTop);
  await expect.poll(() => page.evaluate(() => document.scrollingElement?.scrollTop ?? window.scrollY)).toBe(0);
  await expect
    .poll(() =>
      content.evaluate((element) => {
        const contentBounds = element.getBoundingClientRect();
        const shellBounds = element.closest('[data-page-shell]')?.getBoundingClientRect();
        return Boolean(
          shellBounds &&
          Math.abs(contentBounds.left - shellBounds.left) <= 1 &&
          Math.abs(contentBounds.right - shellBounds.right) <= 1,
        );
      }),
    )
    .toBe(true);
});

test('persists a dismissal and restores all banners from personal settings', async ({ page }, testInfo) => {
  let releaseDismiss: (() => void) | undefined;
  const waitForDismiss = new Promise<void>((resolve) => {
    releaseDismiss = resolve;
  });
  const preferences = { dismissedBannerIds: new Set<string>(), waitForDismiss };
  await mockApplication(page, preferences);
  await page.goto('/');

  const dismissButton = page.getByRole('button', { name: 'Dismiss introduction for Workflow dashboard' });
  await dismissButton.click();
  await expect(dismissButton).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('page-introduction-dismiss-loading.png'), fullPage: true });
  releaseDismiss?.();
  await expect(page.locator('[data-intro-banner-id="dashboard"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Workflow dashboard' })).toBeAttached();

  await page.reload();
  await expect(page.locator('[data-intro-banner-id="dashboard"]')).toHaveCount(0);

  await page.goto('/admin/settings');
  await expect(page.getByText('Hidden introductory banners: 1.')).toBeVisible();
  await page.getByRole('button', { name: 'Restore all banners' }).click();
  await expect(page.getByText('Introductory banners restored.')).toBeVisible();
  await expect(page.getByText('Hidden introductory banners: 0.')).toBeVisible();

  await page.goto('/');
  await expect(page.locator('[data-intro-banner-id="dashboard"]')).toBeVisible();
});

test.describe('theme rendering', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`renders the shared page shell in ${theme} mode`, async ({ page }) => {
      await page.addInitScript((colorMode) => window.localStorage.setItem('nuxt-color-mode', colorMode), theme);
      await mockApplication(page, { dismissedBannerIds: new Set() });

      await page.goto('/');

      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      await expect(page.locator('[data-page-shell]')).toBeVisible();
      await expect(page.locator('[data-intro-banner-id="dashboard"]')).toBeVisible();
    });
  }
});
