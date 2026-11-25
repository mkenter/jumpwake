import { expect, test } from '@playwright/test';

const chart =
  'Hex\tName\tUWP\tPBG\n0101\tOne\tA867A99-C\t503\n0102\tTwo\tA867A99-C\t503\n0901\tThree\tA867A99-C\t503';

test('shares bundled and imported passages across independent contexts', async ({
  browser,
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByLabel('Origin').selectOption('aster');
  await page.getByLabel('Destination').selectOption('cinder');
  await page.getByRole('radio', { name: /^Fewest jumps/ }).check();
  await page.getByRole('button', { name: 'Copy passage link' }).click();
  const bundled = await page.evaluate(() =>
    (
      navigator as unknown as { clipboard: { readText(): Promise<string> } }
    ).clipboard.readText(),
  );
  const recipient = await browser.newContext();
  const other = await recipient.newPage();
  await other.goto('/');
  const savedVessel = JSON.stringify({
    version: 1,
    ship: {
      displacementTons: 100,
      jumpRating: 1,
      jumpFuelCapacityTons: 20,
      hasFuelScoops: false,
      streamlined: false,
    },
    state: { initialFuelTons: 10 },
  });
  await other.evaluate(
    (value) => localStorage.setItem('jumpwake.vessel', value),
    savedVessel,
  );
  await other.goto(bundled);
  await expect(other.getByLabel('Origin')).toHaveValue('aster');
  await expect(other.getByLabel('Destination')).toHaveValue('cinder');
  await expect(
    other.getByRole('radio', { name: /^Fewest jumps/ }),
  ).toBeChecked();
  await expect(
    other.getByRole('status').filter({ hasText: '2 jumps · 6 pc' }),
  ).toBeVisible();
  await expect(
    other.getByText('Shared passage restored.', { exact: false }),
  ).toBeVisible();
  await expect(other.locator('footer')).toContainText('JUMP–3');
  expect(
    await other.evaluate(() => localStorage.getItem('jumpwake.vessel')),
  ).toBe(savedVessel);
  await page.getByText('Chart bureau ·').click();
  await page.getByLabel('Load navigation chart').setInputFiles({
    name: 'chart.tab',
    mimeType: 'text/plain',
    buffer: Buffer.from(chart),
  });
  await page.getByLabel('Origin').selectOption('hex-0101');
  await page.getByLabel('Destination').selectOption('hex-0102');
  await page.getByRole('button', { name: 'Copy passage link' }).click();
  const imported = await page.evaluate(() =>
    (
      navigator as unknown as { clipboard: { readText(): Promise<string> } }
    ).clipboard.readText(),
  );
  await other.goto(imported);
  await expect(
    other.getByText('Import the matching T5 file', { exact: false }),
  ).toBeVisible();
  const input = other.getByLabel('Load navigation chart');
  await input.setInputFiles({
    name: 'wrong.tab',
    mimeType: 'text/plain',
    buffer: Buffer.from(chart.replace('One', 'Wrong')),
  });
  await expect(
    other.getByText('Import the matching T5 file', { exact: false }),
  ).toBeVisible();
  await input.setInputFiles({
    name: 'renamed.tab',
    mimeType: 'text/plain',
    buffer: Buffer.from(chart),
  });
  await expect(other.getByLabel('Origin')).toHaveValue('hex-0101');
  await expect(other.getByLabel('Destination')).toHaveValue('hex-0102');
  await other.reload();
  await expect(other.getByLabel('Destination')).toHaveValue('hex-0102');
  await recipient.close();
});
