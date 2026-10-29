import { expect, test } from '@playwright/test';

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [390, 844],
] as const) {
  test(`Design 3 journey at ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/explore?design=3');
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
    const capture = async (state: string) => {
      expect(
        await page.evaluate(
          'document.documentElement.scrollWidth <= innerWidth',
        ),
      ).toBe(true);
      await page.evaluate('window.scrollTo(0, 0)');
      await page.screenshot({
        path: `review-artifacts/design-3-${state}-${width}.png`,
      });
    };

    await expect(status).toHaveText('Choose an origin to begin.');
    await capture('start');
    await origin.selectOption('aster');
    await expect(status).toContainText('Choose a destination');
    await destination.selectOption('orison');
    await expect(status).toContainText('3 jumps');
    await expect(status).toContainText('7 pc');
    await expect(status).toContainText('Cr2,000');
    await capture('passage');

    // Hover links the views without selecting or changing endpoints.
    if (width > 700) {
      await chartWorld('Bellwether').hover();
      await expect(chartWorld('Bellwether')).toHaveAttribute(
        'data-highlighted',
        'true',
      );
      await expect(chartWorld('Bellwether')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      const bellRow = manifest.getByRole('button', {
        name: 'Inspect stop 2, Bellwether',
      });
      await expect(bellRow).toHaveAttribute('data-highlighted', 'true');
      await manifest
        .getByRole('button', { name: 'Inspect stop 3, Ilex' })
        .hover();
      await expect(chartWorld('Ilex')).toHaveAttribute(
        'data-highlighted',
        'true',
      );
      await expect(inspector).toHaveCount(0);
    }
    await chartWorld('Ilex').focus();
    await page.keyboard.press('Enter');
    await expect(inspector).toContainText('Gas giant · free scooping');
    await expect(inspector).not.toContainText('Scoop 60 t');
    await expect(inspector.getByRole('heading')).toBeFocused();
    await expect(destination).toHaveValue('orison');
    const actionBounds = await inspector
      .getByRole('button', { name: 'Set destination' })
      .boundingBox();
    expect(actionBounds).not.toBeNull();
    expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(height);
    await capture('inspection');
    await page.keyboard.press('Escape');
    await expect(inspector).toHaveCount(0);
    await expect(chartWorld('Ilex')).toBeFocused();

    if (width <= 700)
      await page.getByRole('button', { name: /^Manifest/ }).click();
    await expect(manifest).toContainText('Buy 20 t unrefined fuel');
    await capture('manifest');
    const bellStop = manifest.getByRole('button', {
      name: 'Inspect stop 2, Bellwether',
    });
    await bellStop.click();
    await expect(inspector).toContainText('Stop 2 on your passage');
    await expect(inspector).toContainText('Unrefined · Cr100/t');
    await expect(inspector).not.toContainText('Buy 20 t');
    if (width <= 700) {
      // Native modal containment: Tab and Shift+Tab stay in the sheet.
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
    await expect(bellStop).toBeFocused();
    await expect(manifest).toBeVisible();

    await destination.selectOption('vela');
    await expect(status).toContainText('6 pc');
    await expect(manifest).toContainText('Scoop 40 t');
    await expect(manifest).not.toContainText('Orison');
    await capture('alternative');
    if (width <= 700)
      await page.getByRole('button', { name: 'Chart', exact: true }).click();
    await chartWorld('Meridian').focus();
    await page.keyboard.press('Space');
    await expect(inspector).toContainText('Outside your passage');
    await expect(destination).toHaveValue('vela');
    await inspector.getByRole('button', { name: 'Set destination' }).click();
    await expect(destination).toHaveValue('meridian');
    await expect(destination).toBeFocused();
    await expect(status).toContainText('No authored route');
    if (width <= 700)
      await page.getByRole('button', { name: /^Manifest/ }).click();
    await expect(manifest).toContainText('This pair has no illustrative route');
    await expect(
      manifest.getByRole('button', { name: /Inspect stop/ }),
    ).toHaveCount(0);
    await capture('unavailable');
    await destination.selectOption('aster');
    await expect(status).toContainText('You’re already at Aster');
    await page.getByRole('button', { name: 'Aster → Orison' }).click();
    await expect(status).toContainText('7 pc');
    await expect(destination).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test('choose endpoints through world inspection and preserve state across responsive views', async ({
  page,
}) => {
  await page.goto('/explore?design=3');
  await page.getByRole('button', { name: 'Inspect Aster, 0208' }).click();
  await page.getByRole('button', { name: 'Set origin', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Origin' })).toHaveValue(
    'aster',
  );
  await page.getByRole('button', { name: 'Inspect Orison, 0704' }).click();
  await page
    .getByRole('button', { name: 'Set destination', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('7 pc');
  await page.getByRole('button', { name: 'Inspect Ilex, 0506' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Manifest/ }).click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(
    page.getByRole('region', { name: 'Subsector chart' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Passage manifest' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText('7 pc');
});

test('touch targets and sample entry on a narrow screen', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/explore?design=3');
  await page.getByRole('button', { name: 'Try a sample' }).tap();
  await expect(page.getByRole('status')).toContainText('7 pc');
  const world = page.getByRole('button', { name: 'Inspect Ilex, 0506' });
  const target = await world.locator('rect').boundingBox();
  expect(target!.width).toBeGreaterThanOrEqual(44);
  expect(target!.height).toBeGreaterThanOrEqual(44);
  await world.tap();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading')).toContainText('Ilex');
  await sheet.getByRole('button', { name: 'Close world details' }).tap();
  await expect(world).toBeFocused();
  await expect(page.getByRole('combobox', { name: 'Destination' })).toHaveValue(
    'orison',
  );
  await context.close();
});
