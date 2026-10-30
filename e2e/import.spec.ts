import { expect, test } from '@playwright/test';
test.use({ hasTouch: true });
const header =
  '# Original synthetic test chart\nHex\tName\tUWP\tPBG\tRemarks\n';
const record = (hex: string, name: string, port = 'X', pbg = '001') =>
  `${hex}\t${name}\t${port}000000-0\t${pbg}\tTest supplied remark\n`;
for (const width of [1440, 1024, 390]) {
  test(`local chart workflow and density at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByText('Chart bureau ·').click();
    const input = page.getByLabel('Load navigation chart');
    for (const count of [3, 24, 80]) {
      const content =
        header +
        Array.from({ length: count }, (_, i) =>
          record(
            `${String(Math.floor(i / 10) + 1).padStart(2, '0')}${String((i % 10) + 1).padStart(2, '0')}`,
            `World ${i + 1} Full Name`,
          ),
        ).join('') +
        record('3240', 'Far world');
      await input.setInputFiles({
        name: 'custom.tab',
        mimeType: 'text/plain',
        buffer: Buffer.from(content),
      });
      await expect(
        page.getByRole('combobox', { name: 'Origin', exact: true }),
      ).toHaveValue('');
      await page
        .getByRole('combobox', { name: 'Origin', exact: true })
        .selectOption('hex-0101');
      await page
        .getByRole('combobox', { name: 'Destination', exact: true })
        .selectOption('hex-0103');
      await expect(page.getByRole('status').first()).toContainText('1 jump');
      await page.getByRole('button', { name: 'Chart', exact: true }).click();
      await page.locator('[data-world="hex-0102"]').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByText('Test supplied remark')).toBeVisible();
      await page.getByRole('button', { name: 'Close world details' }).click();
      await page
        .locator('#passage-chart')
        .screenshot({ path: info.outputPath(`${width}-${count}-chart.png`) });
      expect(
        await page.evaluate(
          'document.documentElement.scrollWidth <= innerWidth',
        ),
      ).toBe(true);
    }
    await page
      .getByRole('combobox', { name: 'Imported subsector' })
      .selectOption('P');
    await expect(
      page.getByRole('combobox', { name: 'Origin', exact: true }),
    ).toHaveValue('');
    await page
      .getByRole('combobox', { name: 'Origin', exact: true })
      .selectOption('hex-3240');
    await page
      .getByRole('combobox', { name: 'Destination', exact: true })
      .selectOption('hex-3240');
    await page.getByRole('button', { name: 'Manifest', exact: true }).click();
    await expect(
      page.getByText('Already at your destination. No travel needed.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Return to Ember Reach' }).click();
    await expect(
      page.getByRole('combobox', { name: 'Origin', exact: true }),
    ).toHaveValue('');
    await expect(
      page
        .getByRole('combobox', { name: 'Origin', exact: true })
        .locator('option'),
    ).toHaveCount(16);
    await input.setInputFiles({
      name: 'bad.tab',
      mimeType: 'text/plain',
      buffer: Buffer.from(header + 'bad'),
    });
    await expect(page.getByRole('alert')).toContainText('Line 3');
    expect(errors).toEqual([]);
  });
}

test('imported ship eligibility, comparison, manifest, unreachable and touch inspection', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByText('Chart bureau ·').click();
  const data =
    header +
    record('0101', 'Departure', 'A', '000') +
    record('0104', 'Paid port', 'C', '000') +
    record('0107', 'Arrival', 'E', '000') +
    record('0202', 'Scoop one') +
    record('0205', 'Scoop two') +
    record('0810', 'Isolated', 'X', '000');
  await page.getByLabel('Load navigation chart').setInputFiles({
    name: 'routes.tab',
    mimeType: 'text/plain',
    buffer: Buffer.from(data),
  });
  await page
    .getByRole('combobox', { name: 'Origin', exact: true })
    .selectOption('hex-0101');
  await page
    .getByRole('combobox', { name: 'Destination', exact: true })
    .selectOption('hex-0107');
  await expect(page.getByRole('status').first()).toContainText('Cr0');
  await page.getByRole('radio', { name: /Fewest jumps/ }).check();
  await expect(page.getByRole('status').first()).toContainText('Cr6,000');
  await expect(
    page.getByText('Buy 60 t unrefined fuel at Cr100/t'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit particulars' }).click();
  await page.getByLabel('Fuel scoops fitted').uncheck();
  await page.getByRole('button', { name: 'Apply particulars' }).click();
  await expect(page.getByRole('status').first()).toContainText('Cr6,000');
  await page.locator('[data-world="hex-0202"]').click();
  await expect(page.getByText('No local fuel')).toBeVisible();
  await page.getByRole('button', { name: 'Close world details' }).click();
  await page
    .getByRole('combobox', { name: 'Destination', exact: true })
    .selectOption('hex-0810');
  await expect(
    page.getByRole('heading', { name: 'Destination unreachable.' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Chart', exact: true }).click();
  await page.locator('[data-world="hex-0202"]').tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Set destination' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Destination', exact: true }),
  ).toHaveValue('hex-0202');
});
