import { expect, test } from '@playwright/test';

const base = '/ezrepo';

test('US English docs support navigation, search, keyboard access, and narrow viewports', async ({ page }) => {
  await page.goto(`${base}/`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ezRepo');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');

  await page.getByRole('link', { name: 'Deploy ezRepo' }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/deployment/?$`));
  await expect(page.locator('main h1')).toContainText('Deploying ezRepo');

  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('searchbox').fill('OAuth');
  await expect(page.getByRole('link', { name: /Provider OAuth setup/ }).first()).toBeVisible();
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/provider-webhooks`);
  await expect(page.locator('main h1')).toContainText('Manual provider webhook setup');
  const geometry = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
});
