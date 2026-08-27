import { expect, test, type Page } from '@playwright/test';

const accessToken = 'playwright-access-token';
const dashboardRun = {
  completedAt: '2026-08-27T10:02:00.000Z',
  durationMs: 120_000,
  id: 'run-1',
  provider: { displayName: 'GitHub', id: 'provider-1', providerType: 'GITHUB' },
  providerCreatedAt: '2026-08-27T10:00:00.000Z',
  providerRunId: '101',
  repository: { id: 'repository-1', name: 'flowpeek', owner: 'flowpeek', url: 'https://github.com/flowpeek/flowpeek' },
  startedAt: '2026-08-27T10:00:00.000Z',
  status: 'FAILED',
  url: 'https://github.com/flowpeek/flowpeek/actions/runs/101',
  workflowName: 'CI',
};

/** Configure the current authenticated user and dashboard endpoint responses. */
async function mockDashboard(page: Page, role: 'SYSTEM_ADMIN' | 'VIEWER'): Promise<void> {
  await page.addInitScript((token) => window.localStorage.setItem('flowpeek.access-token', token), accessToken);
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ contentType: 'application/json', json: { id: 'playwright', role, username: 'playwright' } });
  });
}

test('redirects unauthenticated visitors to sign-in', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('hides system administration navigation from viewers', async ({ page }) => {
  await mockDashboard(page, 'VIEWER');
  await page.route('**/api/v1/dashboard/failures', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/dashboard/latest-runs', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/dashboard/trend**', (route) => route.fulfill({ json: [] }));

  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByText('Administration', { exact: true })).not.toBeVisible();
  await expect(page.getByText('No workflows are currently failing.')).toBeVisible();
  await expect(page.getByText('No workflow runs are available yet.')).toBeVisible();
});

test('renders dashboard values, reloads for range filters, and presents request errors', async ({ page }) => {
  await mockDashboard(page, 'SYSTEM_ADMIN');
  let failDashboardRequest = false;
  const trendUrls: string[] = [];
  await page.route('**/api/v1/dashboard/failures', (route) =>
    failDashboardRequest
      ? route.abort('failed')
      : route.fulfill({ contentType: 'application/json', json: [dashboardRun] }),
  );
  await page.route('**/api/v1/dashboard/latest-runs', (route) =>
    route.fulfill({ contentType: 'application/json', json: [dashboardRun] }),
  );
  await page.route('**/api/v1/dashboard/trend**', (route) => {
    trendUrls.push(route.request().url());
    return route.fulfill({
      contentType: 'application/json',
      json: [{ bucketStart: '2026-08-27T00:00:00.000Z', errorCount: 1, successCount: 0 }],
    });
  });

  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Provider accounts' })).toBeVisible();
  await expect(page.getByText('CI', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Failed', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2m 0s', { exact: true })).toBeVisible();

  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Last 7 days' }).click();
  await expect.poll(() => trendUrls.some((url) => new URL(url).searchParams.get('bucket') === 'hour')).toBe(true);

  failDashboardRequest = true;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('Dashboard data could not be loaded. Try again shortly.')).toBeVisible();
});
