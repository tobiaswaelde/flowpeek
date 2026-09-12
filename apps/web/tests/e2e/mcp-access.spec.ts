import { expect, test, type Page } from '@playwright/test';

const admin = {
  createdAt: '2026-09-12T08:00:00.000Z',
  id: 'playwright-admin',
  role: 'SYSTEM_ADMIN',
  updatedAt: '2026-09-12T08:00:00.000Z',
  username: 'playwright',
} as const;

/** Mock the authenticated shell used by MCP token management scenarios. */
async function mockShell(page: Page): Promise<void> {
  const emptyPage = {
    items: [],
    meta: { hasNextPage: false, hasPrevPage: false, itemCount: 0, page: 1, pageCount: 0, perPage: 25 },
  };
  await page.addInitScript(() => window.localStorage.setItem('flowpeek.access-token', 'playwright-access-token'));
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: admin }));
  await page.route('**/api/v1/health', (route) =>
    route.fulfill({ json: { api: 'ok', database: 'ok', providers: [], status: 'ok' } }),
  );
  await page.route('**/api/v1/settings', (route) =>
    route.fulfill({ json: { dateTimeFormat: 'LOCALE_MEDIUM', workflowRunRetentionDays: 90 } }),
  );
  await page.route('**/api/v1/settings/preferences', (route) =>
    route.fulfill({ json: { dismissedIntroBannerIds: [] } }),
  );
  await page.route('**/api/v1/dashboard/awaiting-approval', (route) => route.fulfill({ json: [] }));
  await page.route(/\/api\/v1\/(?:provider-accounts|repositories|workflow-runs)(?:\?.*)?$/, (route) =>
    route.fulfill({ json: emptyPage }),
  );
  await page.route(/\/api\/v1\/workflow-runs\/needs-attention(?:\?.*)?$/, (route) =>
    route.fulfill({ json: emptyPage }),
  );
}

test('creates, reveals once, lists, and revokes a personal MCP token', async ({ page }, testInfo) => {
  await mockShell(page);
  let tokens: unknown[] = [];
  let releaseCreation: (() => void) | undefined;
  const creationGate = new Promise<void>((resolve) => {
    releaseCreation = resolve;
  });
  await page.route(/\/api\/v1\/mcp-tokens(?:\/[^/?]+)?(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      await creationGate;
      const body = route.request().postDataJSON() as { expiresAt: string | null; name: string };
      const created = {
        createdAt: '2026-09-12T10:00:00.000Z',
        expiresAt: body.expiresAt,
        id: 'token-id',
        lastUsedAt: null,
        name: body.name,
        revokedAt: null,
        status: 'ACTIVE',
        token: 'ezrepo_mcp_one_time_secret',
        tokenPrefix: 'ezrepo_mcp_one_time',
        userId: admin.id,
      };
      tokens = [{ ...created, token: undefined }];
      return route.fulfill({ json: created });
    }
    if (route.request().method() === 'DELETE') {
      tokens = tokens.map((token) => ({
        ...(token as object),
        revokedAt: new Date().toISOString(),
        status: 'REVOKED',
      }));
      return route.fulfill({ status: 204 });
    }
    await route.fulfill({ json: tokens });
  });

  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'MCP access' })).toBeVisible();
  await page.getByRole('button', { name: 'Create token' }).click();
  await page.getByRole('textbox', { name: 'Token name' }).fill('VS Code laptop');
  await page.getByLabel('Expiration').fill('2026-10-12T10:00');
  const createButton = page.getByRole('dialog').getByRole('button', { name: 'Create token' });
  await createButton.click();
  await expect(createButton).toBeDisabled();
  releaseCreation?.();
  await expect(page.getByRole('textbox', { name: 'Bearer token' })).toHaveValue('ezrepo_mcp_one_time_secret');
  await expect(page.getByText('Copy this token now. It will not be shown again.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mcp-token-created.png'), fullPage: true });
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('VS Code laptop')).toBeVisible();
  await expect(page.getByText(/Expires /)).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByText('Revoked', { exact: true })).toBeVisible();
});

test('allows an administrator to inspect and revoke user token metadata', async ({ page }) => {
  await mockShell(page);
  let revoked = false;
  await page.route(/\/api\/v1\/users(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        items: [admin],
        meta: { hasNextPage: false, hasPrevPage: false, itemCount: 1, page: 1, pageCount: 1, perPage: 10 },
      },
    }),
  );
  await page.route(/\/api\/v1\/mcp-tokens(?:\/token-id)?(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      revoked = true;
      return route.fulfill({ status: 204 });
    }
    expect(route.request().url()).toContain(`userId=${admin.id}`);
    await route.fulfill({
      json: [
        {
          createdAt: '2026-09-12T10:00:00.000Z',
          expiresAt: null,
          id: 'token-id',
          lastUsedAt: null,
          name: 'Automation',
          revokedAt: revoked ? '2026-09-12T11:00:00.000Z' : null,
          status: revoked ? 'REVOKED' : 'ACTIVE',
          tokenPrefix: 'ezrepo_mcp_automat',
          userId: admin.id,
        },
      ],
    });
  });

  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Manage MCP tokens' }).click();
  await expect(page.getByRole('heading', { name: 'MCP access tokens' })).toBeVisible();
  await expect(page.getByText('Automation')).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  await expect(page.getByText('Never used', { exact: false })).toBeVisible();
  await expect(page.getByText('Never expires', { exact: false })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke' }).click();
  await expect.poll(() => page.getByRole('dialog').getByRole('button', { name: 'Revoke' }).isDisabled()).toBe(true);
});
