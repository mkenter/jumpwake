import { test, expect } from '@playwright/test';

test('copies the selected passage and announces success', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Origin' }).selectOption('aster');
  await page
    .getByRole('combobox', { name: 'Destination' })
    .selectOption('cinder');
  await page.getByRole('button', { name: 'Copy passage' }).click();
  await expect(page.getByText('Passage copied to clipboard.')).toBeVisible();
  const text = await page.evaluate(() =>
    (
      navigator as unknown as { clipboard: { readText(): Promise<string> } }
    ).clipboard.readText(),
  );
  expect(text).toContain('Routing: Lowest fuel cost');
  expect(text).toContain('## Events');
});
