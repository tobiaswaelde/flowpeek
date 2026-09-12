import { expect, test } from '@playwright/test';

test('lists approval-gated workflows with provider and pull-request actions', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('ezrepo.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: { id: 'playwright', role: 'VIEWER', username: 'playwright' } }),
  );
  await page.route('**/api/v1/dashboard/awaiting-approval', (route) =>
    route.fulfill({
      json: [
        {
          awaitingApproval: true,
          completedAt: null,
          displayTitle: 'Deploy pull request',
          durationMs: null,
          id: 'run-1',
          provider: { displayName: 'GitHub', id: 'provider-1', providerType: 'GITHUB' },
          providerCreatedAt: '2026-09-09T08:00:00.000Z',
          providerRunId: '42',
          repository: {
            id: 'repository-1',
            name: 'ezrepo',
            owner: 'twaelde',
            url: 'https://github.com/twaelde/ezrepo',
          },
          reviewUrl: 'https://github.com/twaelde/ezrepo/pull/12',
          startedAt: '2026-09-09T08:01:00.000Z',
          status: 'QUEUED',
          url: 'https://github.com/twaelde/ezrepo/actions/runs/42',
          workflowName: 'Deploy',
        },
      ],
    }),
  );
  await page.route('**/api/v1/workflow-runs/needs-attention**', (route) =>
    route.fulfill({
      json: {
        items: [],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 3, page: 1, pageCount: 3, perPage: 1 },
      },
    }),
  );

  await page.goto('/workflows/awaiting-approval');

  const workflowRunNavigation = page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('region', { name: 'Workflow runs' });
  await expect(workflowRunNavigation.getByRole('link', { name: 'All runs' })).toHaveAttribute('href', '/workflow-runs');
  await expect(workflowRunNavigation.getByRole('link', { name: 'Awaiting approval' })).toHaveAttribute(
    'href',
    '/workflows/awaiting-approval',
  );
  await expect(workflowRunNavigation.getByRole('link', { name: 'Awaiting approval' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(workflowRunNavigation.getByRole('link', { name: 'Needs attention' })).toHaveAttribute(
    'href',
    '/workflow-runs/needs-attention',
  );
  await expect(page.getByRole('heading', { name: 'Awaiting approval' })).toBeVisible();
  const table = page.locator('[data-awaiting-approval-table]');
  await expect(table).toBeVisible();
  await expect
    .poll(() => table.evaluate((element) => element.parentElement?.hasAttribute('data-page-content')))
    .toBe(true);
  await expect
    .poll(() =>
      page.locator('[data-provider-approval-notice]').evaluate((notice) => {
        const noticeBounds = notice.getBoundingClientRect();
        const contentBounds = notice.closest('[data-page-content]')?.getBoundingClientRect();
        return Boolean(
          contentBounds && noticeBounds.left >= contentBounds.left && noticeBounds.right <= contentBounds.right,
        );
      }),
    )
    .toBe(true);
  await expect(page.getByText('twaelde/ezrepo', { exact: true })).toBeVisible();
  await expect(table.getByText('GitHub', { exact: true })).toBeVisible();
  const approveLink = page.getByRole('link', { name: 'Approve in provider' });
  await expect(approveLink).toHaveAttribute('href', 'https://github.com/twaelde/ezrepo/actions/runs/42');
  const reviewLink = page.getByRole('link', { name: 'Open pull request' });
  await expect(reviewLink).toHaveAttribute('href', 'https://github.com/twaelde/ezrepo/pull/12');
  await approveLink.hover();
  await expect(
    page.locator('[data-slot="content"][data-side]').filter({ hasText: 'Approve in provider' }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await reviewLink.hover();
  await expect(page.locator('[data-slot="content"][data-side]').filter({ hasText: 'Open pull request' })).toBeVisible();
  await expect(page.locator('table')).not.toContainText(/\b(?:AM|PM)\b/);

  await page.getByPlaceholder('Search workflows or repositories').fill('missing');
  await expect(page.getByText('No workflows are currently awaiting approval.')).toBeVisible();
});
