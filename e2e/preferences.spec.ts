import { expect, test } from '@playwright/test';

for (const width of [1440, 1024, 390]) {
  test(`passage comparison, keyboard selection and linked itinerary at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const origin = page.getByRole('combobox', { name: 'Origin' });
    const destination = page.getByRole('combobox', { name: 'Destination' });
    const status = page.getByRole('status');
    const economical = page.getByRole('radio', { name: /^Lowest fuel cost/ });
    const fewer = page.getByRole('radio', { name: /^Fewest jumps/ });
    const manifest = page.locator('#passage-manifest');
    const chart = page.locator('#passage-chart');
    const nav = page.getByRole('navigation', { name: 'Planner navigation' });
    const inspector =
      width < 900
        ? page.getByRole('dialog')
        : page.getByRole('complementary', { name: 'World inspection' });
    const view = async (name: 'Chart' | 'Manifest') => {
      if (width < 900)
        await nav.getByRole('button', { name, exact: true }).click();
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
    await origin.selectOption('aster');
    await destination.selectOption('cinder');
    await expect(economical).toBeChecked();
    await expect(economical).toHaveAccessibleName(
      'Lowest fuel cost, 3 jumps, Cr0 purchased fuel',
    );
    await expect(fewer).toHaveAccessibleName(
      'Fewest jumps, 2 jumps, Cr6,000 purchased fuel',
    );
    await expect(
      page.getByRole('button', { name: 'Edit particulars' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(status).toContainText('3 jumps · 7 pc');
    const originalLegs = await chart
      .locator('[data-route-leg]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('d')));
    await capture('economical');

    // Native arrow-key selection keeps focus and scroll in the comparison.
    await economical.focus();
    await page.evaluate('window.scrollTo(0, 300)');
    await expect(nav).toHaveAttribute('data-condensed', 'true');
    const before = await page.evaluate<number>('scrollY');
    const main = await page.locator('main').elementHandle();
    await page.keyboard.press('ArrowRight');
    await expect(fewer).toBeChecked();
    await expect(fewer).toBeFocused();
    await expect(status).toContainText('2 jumps · 6 pc');
    await expect(status).toContainText('Cr6,000');
    expect(await page.evaluate('scrollY')).toBe(before);
    expect(await main!.evaluate((node) => node.isConnected)).toBe(true);
    await expect(nav).toHaveAttribute('data-condensed', 'true');
    expect((await nav.boundingBox())!.y).toBe(0);
    await expect(chart.locator('[data-route-leg]')).toHaveCount(2);
    await expect(chart.locator('[data-route-arrow]')).toHaveCount(2);
    await expect(chart.locator('[data-route-leg]').first()).toHaveAttribute(
      'data-to',
      'brass',
    );
    await capture('fewer-jumps');
    await view('Manifest');
    await expect(manifest.getByRole('listitem')).toHaveCount(4);
    await expect(manifest).toContainText('Buy 60 t unrefined fuel at Cr100/t');
    await expect(manifest).not.toContainText('Scoop');
    const purchase = manifest.getByRole('button', {
      name: 'Inspect event 3, Brass Ledger',
    });
    await purchase.click();
    await expect(inspector).toContainText('Events 2, 3 on your passage');
    await page.keyboard.press('Escape');
    await expect(purchase).toBeFocused();
    await purchase.hover();
    await expect(purchase).toHaveAttribute('data-highlighted', 'true');
    await economical.click();
    await expect(economical).toBeChecked();
    await expect(status).toContainText('3 jumps · 7 pc');
    await expect(status).toContainText('Cr0');
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
    await expect(manifest.getByRole('listitem')).toHaveCount(6);
    await view('Chart');
    expect(
      await chart
        .locator('[data-route-leg]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('d'))),
    ).toEqual(originalLegs);
    await expect(origin).toHaveValue('aster');
    await expect(destination).toHaveValue('cinder');

    // Endpoint changes collapse identical complete itineraries and keep failures explicit.
    await fewer.click();
    await destination.selectOption('drift');
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByText(/share this itinerary/)).toBeVisible();
    await expect(status).toContainText('1 jump · 2 pc');
    await capture('shared');
    await destination.selectOption('last');
    await expect(status).toContainText('Destination unreachable');
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByText(/share this itinerary/)).toHaveCount(0);
    await destination.selectOption('aster');
    await expect(status).toContainText('0 jumps');
    await destination.selectOption('cinder');
    await expect(fewer).toBeChecked();

    // Applied starting fuel feeds both quotations without resetting endpoints/preference.
    await page.getByRole('button', { name: 'Edit particulars' }).click();
    await page.getByRole('spinbutton', { name: 'Jump fuel aboard' }).fill('13');
    await page.getByRole('button', { name: 'Apply particulars' }).click();
    await expect(fewer).toBeChecked();
    await expect(economical).toHaveAccessibleName(
      'Lowest fuel cost, 3 jumps, Cr2,700 purchased fuel',
    );
    await expect(fewer).toHaveAccessibleName(
      'Fewest jumps, 2 jumps, Cr10,700 purchased fuel',
    );
    await expect(status).toContainText('Cr10,700');
    await view('Manifest');
    await expect(manifest).toContainText('13 t aboard');
    await origin.selectOption('cinder');
    await destination.selectOption('brass');
    await expect(status).toContainText('Destination unreachable');
    await expect(page.getByRole('radio')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('touch selection preserves the mobile planner view and vessel', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Plan a journey', exact: true }).tap();
  await page.getByRole('radio', { name: /^Fewest jumps/ }).tap();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Manifest', exact: true })
    .tap();
  await expect(page.locator('#passage-chart')).toBeHidden();
  await expect(
    page.locator('#passage-manifest').getByRole('listitem'),
  ).toHaveCount(4);
  await page.getByRole('radio', { name: /^Lowest fuel cost/ }).tap();
  await expect(page.locator('#passage-chart')).toBeHidden();
  await expect(
    page.locator('#passage-manifest').getByRole('listitem'),
  ).toHaveCount(6);
  await expect(page.getByLabel('Active vessel')).toContainText(
    '60/60 tons jump fuel',
  );
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(
    page.getByRole('radio', { name: /^Lowest fuel cost/ }),
  ).toBeChecked();
  await expect(page.locator('#passage-chart')).toBeVisible();
  await context.close();
});
