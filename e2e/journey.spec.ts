import { expect, test } from '@playwright/test';
for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [390, 844],
] as const) {
  test(`calculated journeys and inspection at ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/');
    const origin = page.getByRole('combobox', { name: 'Origin' });
    const destination = page.getByRole('combobox', { name: 'Destination' });
    const status = page.getByRole('status');
    const manifest = page.getByRole('region', { name: 'Passage manifest' });
    const inspector =
      width <= 700
        ? page.getByRole('dialog')
        : page.getByRole('complementary', { name: 'World inspection' });
    const chartWorld = (name: string) =>
      page.getByRole('button', { name: new RegExp(`^Inspect ${name},`) });
    const switchView = async (view: 'Chart' | 'Manifest') => {
      if (width <= 700)
        await page
          .getByRole('button', { name: new RegExp(`^${view}`) })
          .click();
    };
    const capture = async (name: string) => {
      expect(
        await page.evaluate(
          'document.documentElement.scrollWidth <= innerWidth',
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${name}.png`),
        fullPage: true,
      });
    };
    await expect(status).toHaveText('Choose an origin to begin.');
    await origin.selectOption('aster');
    await expect(status).toContainText('Choose a destination');
    await destination.selectOption('cinder');
    await expect(status).toContainText('3 jumps');
    await expect(status).toContainText('7 pc');
    await expect(status).toContainText('Cr0');
    await capture('free-chart');
    if (width > 700) {
      await chartWorld('Drift Lantern').hover();
      await expect(
        manifest.getByRole('button', {
          name: 'Inspect event 3, Drift Lantern',
        }),
      ).toHaveAttribute('data-highlighted', 'true');
    }
    await chartWorld('Drift Lantern').focus();
    await page.keyboard.press('Enter');
    await expect(inspector).toContainText('Gas giant · free scooping');
    await expect(inspector.getByRole('heading')).toBeFocused();
    await expect(destination).toHaveValue('cinder');
    await capture('inspection');
    await page.keyboard.press('Escape');
    await expect(chartWorld('Drift Lantern')).toBeFocused();
    await switchView('Manifest');
    await expect(manifest.getByRole('listitem')).toHaveCount(6);
    await expect(manifest).toContainText('Scoop 40 t unrefined fuel');
    await destination.selectOption('orison');
    await expect(status).toContainText('7 jumps');
    await expect(status).toContainText('15 pc');
    await expect(status).toContainText('Cr4,000');
    await expect(manifest.getByRole('listitem')).toHaveCount(14);
    const firstPurchase = manifest.getByRole('button', {
      name: 'Inspect event 9, Serein',
    });
    const secondPurchase = manifest.getByRole('button', {
      name: 'Inspect event 13, Serein',
    });
    await expect(firstPurchase).toContainText('0 → 20 t');
    await expect(secondPurchase).toContainText('40 → 60 t');
    await expect(secondPurchase).toContainText('Cr2,000');
    await secondPurchase.click();
    await expect(inspector).toContainText(
      'Events 8, 9, 12, 13 on your passage',
    );
    if (width <= 700) {
      await inspector.getByRole('button', { name: 'Set destination' }).focus();
      await page.keyboard.press('Tab');
      await expect(
        inspector.getByRole('button', { name: 'Close world details' }),
      ).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(
        inspector.getByRole('button', { name: 'Set destination' }),
      ).toBeFocused();
    }
    await inspector
      .getByRole('button', { name: 'Close world details' })
      .click();
    await expect(secondPurchase).toBeFocused();
    await expect(manifest).toBeVisible();
    await capture('paid-return-manifest');
    // Every event has distinct accessible-description targets, including repeat visits.
    const ids = await page
      .locator('[id]')
      .evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(new Set(ids).size).toBe(ids.length);
    await switchView('Chart');
    await expect(page.locator('polyline')).toHaveAttribute(
      'points',
      '38,38 104,137 104,335 236,335 434,236 500,269 434,236 434,38',
    );
    await capture('paid-return-chart');
    await chartWorld('Last Ember').focus();
    await page.keyboard.press('Space');
    await expect(inspector).toContainText('No local fuel');
    await inspector.getByRole('button', { name: 'Set destination' }).click();
    await expect(destination).toBeFocused();
    await expect(status).toContainText('Destination unreachable');
    await switchView('Manifest');
    await expect(manifest.getByRole('listitem')).toHaveCount(0);
    await destination.selectOption('aster');
    await expect(status).toContainText('0 jumps');
    await expect(manifest).toContainText('Already at your destination');
    await expect(manifest).toContainText('60 t aboard');
    await destination.selectOption('');
    await expect(status).toContainText('Choose a destination');
    expect(errors).toEqual([]);
  });
}
test('touch inspection, endpoint actions and responsive state retention', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Plan a journey', exact: true }).tap();
  const world = page.getByRole('button', {
    name: 'Inspect Drift Lantern, 0202',
  });
  const bounds = await world.locator('rect').boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  await world.tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Set origin', exact: true }).tap();
  await expect(page.getByRole('combobox', { name: 'Origin' })).toHaveValue(
    'drift',
  );
  await page.getByRole('button', { name: /^Manifest/ }).tap();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(
    page.getByRole('region', { name: 'Subsector chart' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Passage manifest' }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Destination' })).toHaveValue(
    'cinder',
  );
  const returnEvent = page.getByRole('button', {
    name: 'Inspect event 1, Drift Lantern',
  });
  await returnEvent.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(returnEvent).toBeFocused();
  await expect(
    page.getByRole('region', { name: 'Passage manifest' }),
  ).toBeVisible();
  await context.close();
});
