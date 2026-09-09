import { expect, test } from '@playwright/test';

test('lists approval-gated workflows with provider and pull-request actions', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: { id: 'playwright', role: 'VIEWER', username: 'playwright' } }),
  );
  await page.route('**/api/v1/dashboard/awaiting-approval', (route) =>
    route.fulfill({
      json: [
        {
          awaitingApproval: true,
          completedAt: null,
          durationMs: null,
          id: 'run-1',
          provider: { displayName: 'GitHub', id: 'provider-1', providerType: 'GITHUB' },
          providerCreatedAt: '2026-09-09T08:00:00.000Z',
          providerRunId: '42',
          repository: {
            id: 'repository-1',
            name: 'flowpeek',
            owner: 'twaelde',
            url: 'https://github.com/twaelde/flowpeek',
          },
          reviewUrl: 'https://github.com/twaelde/flowpeek/pull/12',
          startedAt: '2026-09-09T08:01:00.000Z',
          status: 'QUEUED',
          url: 'https://github.com/twaelde/flowpeek/actions/runs/42',
          workflowName: 'Deploy',
        },
      ],
    }),
  );

  await page.goto('/workflows/awaiting-approval');

  await expect(page.getByRole('heading', { name: 'Awaiting approval' })).toBeVisible();
  await expect(page.getByText('twaelde/flowpeek', { exact: true })).toBeVisible();
  await expect(page.getByText('GitHub', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Approve in provider' })).toHaveAttribute(
    'href',
    'https://github.com/twaelde/flowpeek/actions/runs/42',
  );
  await expect(page.getByRole('link', { name: 'Open pull request' })).toHaveAttribute(
    'href',
    'https://github.com/twaelde/flowpeek/pull/12',
  );
  await expect(page.locator('table')).not.toContainText(/\b(?:AM|PM)\b/);

  await page.getByPlaceholder('Search workflows or repositories').fill('missing');
  await expect(page.getByText('No workflows are currently awaiting approval.')).toBeVisible();
});
