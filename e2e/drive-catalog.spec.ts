import { expect, test } from '@playwright/test';
test('local catalog changes the assessment and survives reload and removal', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByText('Operational vessel reference').click();
  await page.getByLabel('Hull tons').fill('300');
  await expect(page.getByText(/Assessment: incomplete/)).toBeVisible();
  await page.getByLabel('Import drive catalog JSON').setInputFiles({
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        edition: 'CT81',
        provenance: 'Synthetic fixture',
        rows: { 400: { A: 2 } },
      }),
    ),
  });
  await expect(page.getByText(/Assessment: assessed; jump 2/)).toBeVisible();
  await page.reload();
  await page.getByText('Operational vessel reference').click();
  await expect(page.getByText(/Synthetic fixture/)).toBeVisible();
  await page.getByLabel('Import drive catalog JSON').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByText(/Import failed/)).toBeVisible();
  await expect(page.getByText(/Synthetic fixture/)).toBeVisible();
  await page.getByRole('button', { name: 'Remove catalog' }).click();
  await page.reload();
  await page.getByText('Operational vessel reference').click();
  await expect(page.getByText(/No private catalog loaded/)).toBeVisible();
});
