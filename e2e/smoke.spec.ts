import { expect, test } from '@playwright/test';

test('renders the built application shell', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');

  await expect(page).toHaveTitle(/Jumpwake/);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText(
    'Interstellar route planning.',
  );
  await expect(
    main.getByRole('region', { name: 'The initial flight plan' }),
  ).toBeVisible();
  await expect(main.getByText('200-ton / Jump-3')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
