import { expect, test } from '@playwright/test';

test('loads the built app and exposes build details with the keyboard', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page).toHaveTitle(/Jumpwake/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Interstellar route planning.',
  );

  const toggle = page.getByRole('button', { name: 'About this build' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText(/This is the application foundation/),
  ).toBeVisible();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(pageErrors).toEqual([]);
});
