import { expect, test } from '@playwright/test';

/** Verify that repository and user administration share the full Query Kit table layout. */
test('repository and user administration render full-page Query Kit tables', async ({ page }, testInfo) => {
  let releaseRepositoryUpdate: (() => void) | undefined;
  const repositoryUpdateResponse = new Promise<void>((resolve) => {
    releaseRepositoryUpdate = resolve;
  });
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route(/\/api\/v1\/repositories(?:\?.*)?$/, async (route) => {
    expect(route.request().url()).toContain('fields=');
    expect(route.request().url()).toContain('workflowRunCount');
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
            workflowRunCount: 12,
            workflowRunRetentionDays: 30,
          },
        ],
        meta: { itemCount: 1, pageCount: 1 },
      },
    });
  });
  await page.route('**/api/v1/repositories/repository-1', async (route) => {
    expect(route.request().method()).toBe('PATCH');
    await repositoryUpdateResponse;
    await route.fulfill({ contentType: 'application/json', json: {} });
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
  await expect(page.getByRole('columnheader', { name: 'Workflow runs' })).toBeVisible();
  await expect(page.locator('tbody')).toContainText('12');
  await expect(page.locator('tbody').getByRole('link', { name: 'flowpeek', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open in provider' })).toHaveAttribute(
    'href',
    'https://github.com/tobiaswaelde/flowpeek',
  );
  const repositoryActionsHeader = page.getByRole('columnheader', { name: 'Actions' });
  await expect(repositoryActionsHeader).toHaveCSS('position', 'sticky');
  await expect(repositoryActionsHeader.getByText('Actions', { exact: true })).toHaveClass(/justify-end/);
  await expect(page.locator('tbody td').first()).toHaveCSS('padding-top', '8px');
  await expect(page.getByRole('link', { name: 'Open repository settings' })).toHaveClass(/text-sm/);
  const toggleRepositoryButton = page.getByRole('button', { name: 'Disable' });
  await toggleRepositoryButton.click();
  await expect(toggleRepositoryButton).toBeDisabled();
  await expect(toggleRepositoryButton.locator('[data-slot="leadingIcon"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('repository-action-loading.png'), fullPage: true });
  releaseRepositoryUpdate?.();
  await expect(page.locator('tbody').getByRole('button')).toBeEnabled();
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

/** Verify that repository discovery supports searching and selecting multiple repositories. */
test('adds multiple repositories selected from an enabled provider account', async ({ page }, testInfo) => {
  const addedRepositoryIds: string[] = [];
  let releaseRepositoryDiscovery: (() => void) | undefined;
  let releaseRepositoryAdds: (() => void) | undefined;
  const repositoryDiscoveryResponse = new Promise<void>((resolve) => {
    releaseRepositoryDiscovery = resolve;
  });
  const repositoryAddResponses = new Promise<void>((resolve) => {
    releaseRepositoryAdds = resolve;
  });
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
    await repositoryDiscoveryResponse;
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
        {
          name: 'another-repository',
          owner: 'flowpeek',
          providerRepositoryId: 'repository-3',
          tracked: false,
          url: 'https://github.com/flowpeek/another-repository',
        },
      ],
    });
  });
  await page.route('**/api/v1/provider-accounts/provider-1/repositories', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON() as { providerRepositoryId: string };
    addedRepositoryIds.push(body.providerRepositoryId);
    await repositoryAddResponses;
    await route.fulfill({
      contentType: 'application/json',
      json: {
        enabled: true,
        id: body.providerRepositoryId,
        lastSyncAt: null,
        name: body.providerRepositoryId === 'repository-2' ? 'new-repository' : 'another-repository',
        owner: 'flowpeek',
        providerAccountId: 'provider-1',
        url: `https://github.com/flowpeek/${
          body.providerRepositoryId === 'repository-2' ? 'new-repository' : 'another-repository'
        }`,
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
  await expect(page.getByRole('heading', { name: 'Add repositories' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Show popup' }).click();
  await page.getByRole('option', { name: 'Production GitHub (GitHub)' }).click();
  const nextButton = page.getByRole('button', { name: 'Next' });
  await expect(nextButton).toBeDisabled();
  await expect(nextButton.locator('[data-slot="leadingIcon"]')).toBeVisible();
  releaseRepositoryDiscovery?.();
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
  await expect(page.getByRole('checkbox', { name: 'Select flowpeek/already-tracked' })).toBeDisabled();
  await page.getByPlaceholder('Search repositories').fill('repository');
  await page.getByRole('checkbox', { name: 'Select flowpeek/new-repository' }).click();
  await page.getByRole('checkbox', { name: 'Select flowpeek/another-repository' }).click();
  await expect(page.getByText('Selected: 2', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('multi-repository-selection.png'), fullPage: true });
  const addButton = page.getByRole('button', { name: 'Add selected (2)' });
  await addButton.click();
  await expect(addButton).toBeDisabled();
  await expect(addButton.locator('[data-slot="leadingIcon"]')).toBeVisible();
  await expect.poll(() => addedRepositoryIds.length).toBe(2);
  releaseRepositoryAdds?.();

  await expect(page.getByRole('heading', { name: 'Add repositories' })).not.toBeVisible();
  expect(addedRepositoryIds.sort()).toEqual(['repository-2', 'repository-3']);
});

/** Verify the repository settings screen exposes retention, workflow filters, and memberships. */
test('repository settings load retention, filters, and members', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/repositories/repository-1', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      contentType: 'application/json',
      json: {
        enabled: true,
        id: 'repository-1',
        lastSyncAt: null,
        name: 'flowpeek',
        owner: 'twaelde',
        providerAccountId: 'provider-1',
        url: 'https://github.com/tobiaswaelde/flowpeek',
        workflowRunRetentionDays: 30,
      },
    });
  });
  await page.route('**/api/v1/repositories/repository-1/workflow-filters', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: [{ id: 'filter-1', mode: 'DENY', pattern: 'draft-*', repositoryId: 'repository-1' }],
    });
  });
  await page.route('**/api/v1/repositories/repository-1/memberships', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: [
        {
          id: 'membership-1',
          repositoryId: 'repository-1',
          role: 'MANAGER',
          user: { id: 'user-1', role: 'MANAGER', username: 'maintainer' },
          userId: 'user-1',
        },
      ],
    });
  });
  await page.route(/\/api\/v1\/users(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        items: [
          {
            createdAt: '2026-09-08T08:00:00.000Z',
            id: 'user-2',
            role: 'VIEWER',
            updatedAt: '2026-09-08T08:00:00.000Z',
            username: 'viewer',
          },
        ],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 1, page: 1, pageCount: 1, perPage: 100 },
      },
    });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { id: 'playwright-admin', role: 'SYSTEM_ADMIN', username: 'playwright' },
    });
  });

  await page.goto('/admin/repositories/repository-1');

  await expect(page.getByRole('heading', { level: 1, name: 'twaelde/flowpeek' })).toBeVisible();
  await expect(page.locator('input[type=number]')).toHaveValue('30');
  await expect(page.getByText('draft-*', { exact: true })).toBeVisible();
  await expect(page.getByText('maintainer', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add workflow filter' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Add member' })).toBeDisabled();
  await expect(page.getByRole('columnheader', { name: 'Actions' }).first()).toHaveCSS('position', 'sticky');
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveClass(/text-sm/);
});

/** Verify that the workflow-run history is available directly after the dashboard navigation item. */
test('workflow runs render in a filterable and sortable full-page table', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route(/\/api\/v1\/workflow-runs(?:\?.*)?$/, async (route) => {
    const requestUrl = route.request().url();
    expect(requestUrl).toContain('fields=');
    expect(requestUrl).toContain('repositoryName');
    expect(requestUrl).toContain('repositoryOwner');
    expect(requestUrl).toContain('providerType');
    await route.fulfill({
      contentType: 'application/json',
      json: {
        items: [
          {
            completedAt: '2026-09-08T08:02:30.000Z',
            displayTitle: 'Build',
            durationMs: 150_000,
            id: 'run-1',
            providerCreatedAt: '2026-09-08T08:00:00.000Z',
            providerRunId: '42',
            providerType: 'GITHUB',
            repositoryId: 'repository-1',
            repositoryName: 'flowpeek',
            repositoryOwner: 'twaelde',
            startedAt: '2026-09-08T08:00:00.000Z',
            status: 'SUCCESS',
            url: 'https://github.com/tobiaswaelde/flowpeek/actions/runs/42',
            workflowName: 'Build',
          },
        ],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 1, page: 1, pageCount: 1, perPage: 25 },
      },
    });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { id: 'playwright-admin', role: 'SYSTEM_ADMIN', username: 'playwright' },
    });
  });

  await page.goto('/workflow-runs');

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link', { name: 'Workflow runs' })).toHaveAttribute('href', '/workflow-runs');
  await expect(page.locator('tbody').getByRole('link', { name: 'Build', exact: true })).toHaveCount(0);
  await expect(page.getByText('twaelde/flowpeek', { exact: true })).toBeVisible();
  await expect(page.getByText('GitHub', { exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Provider time' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Started' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Provider run ID' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Completed' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCSS('position', 'sticky');
  await expect(page.locator('tbody')).not.toContainText(/\b(?:AM|PM)\b/);
  const externalLink = page.getByRole('link', { name: 'Open in provider' });
  await expect(externalLink).toHaveAttribute('href', 'https://github.com/tobiaswaelde/flowpeek/actions/runs/42');
  await expect(externalLink.locator('[aria-hidden="true"]')).toBeVisible();
  await expect(page.getByText('Success', { exact: true })).toBeVisible();
  await page.keyboard.press('Shift+O');
  await expect(page.getByText('Table options', { exact: true })).toBeVisible();
});
