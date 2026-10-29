import { expect, test } from '@playwright/test';
for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [1100, 800],
  [1024, 800],
  [960, 800],
  [900, 800],
  [899, 800],
  [768, 800],
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
      width < 900
        ? page.getByRole('dialog')
        : page.getByRole('complementary', { name: 'World inspection' });
    const chartWorld = (name: string) =>
      page.getByRole('button', { name: new RegExp(`^Inspect ${name},`) });
    const switchView = async (view: 'Chart' | 'Manifest') => {
      if (width < 900)
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
      await page.screenshot({
        path: testInfo.outputPath(`${name}-viewport.png`),
      });
    };
    await expect(status).toHaveText('Choose an origin to begin.');
    await origin.selectOption('aster');
    await expect(status).toContainText('Choose a destination');
    await destination.selectOption('cinder');
    await expect(status).toContainText('3 jumps');
    await expect(status).toContainText('7 pc');
    await expect(status).toContainText('Cr0');
    const chart = page.getByRole('region', { name: 'Subsector chart' });
    const chartSvg = chart.locator('svg[role="group"]');
    if (width >= 900) {
      const chartBox = await chartSvg.boundingBox();
      const railBox = await page
        .getByRole('region', { name: 'Passage manifest' })
        .boundingBox();
      const mapHeading = await chart.getByRole('heading').boundingBox();
      const manifestHeading = await manifest.getByRole('heading').boundingBox();
      expect(chartBox).not.toBeNull();
      expect(railBox).not.toBeNull();
      expect(chartBox!.height).toBeGreaterThan(600);
      expect(railBox!.width).toBeGreaterThanOrEqual(280);
      expect(railBox!.width).toBeLessThanOrEqual(340);
      if (width >= 1280) expect(railBox!.width).toBeCloseTo(340, 0);
      expect(chartBox!.width).toBeGreaterThan(railBox!.width * 1.9);
      await expect(
        page.getByRole('group', { name: 'Planner view' }),
      ).toBeHidden();
      expect(Math.abs(mapHeading!.y - manifestHeading!.y)).toBeLessThan(8);
      // The SVG's view box includes the 1.1 row projection, so the rendered
      // grid should occupy the intended generous chart area.
      const gridBox = await chartSvg.locator('g').first().boundingBox();
      expect(gridBox).not.toBeNull();
      expect(gridBox!.height).toBeGreaterThan(600);
    } else {
      const chartBox = await chartSvg.boundingBox();
      expect(chartBox).not.toBeNull();
      expect(chartBox!.x).toBeGreaterThanOrEqual(0);
      expect(chartBox!.x + chartBox!.width).toBeLessThanOrEqual(width);
      expect(chartBox!.width / chartBox!.height).toBeCloseTo(650 / 800, 1);
      const hitBox = await chartWorld('Drift Lantern')
        .locator('rect')
        .boundingBox();
      expect(hitBox).not.toBeNull();
      expect(hitBox!.width).toBeGreaterThanOrEqual(44);
      expect(hitBox!.height).toBeGreaterThanOrEqual(44);
    }
    // Every inspection target, including Last Ember on the bottom row,
    // stays wholly inside the chart so its keyboard focus ring is not clipped.
    const svgBounds = (await chartSvg.boundingBox())!;
    for (const target of await chartSvg.locator('rect').all()) {
      const hit = (await target.boundingBox())!;
      expect(hit.width).toBeGreaterThanOrEqual(44);
      expect(hit.height).toBeGreaterThanOrEqual(44);
      expect(hit.x).toBeGreaterThan(svgBounds.x + 1);
      expect(hit.y).toBeGreaterThan(svgBounds.y + 1);
      expect(hit.x + hit.width).toBeLessThan(svgBounds.x + svgBounds.width - 1);
      expect(hit.y + hit.height).toBeLessThan(
        svgBounds.y + svgBounds.height - 1,
      );
    }
    for (const world of await chartSvg.locator('[data-world]').all()) {
      const label = (await world.locator('text').first().boundingBox())!;
      expect(label.height).toBeGreaterThanOrEqual(12);
      expect(label.x).toBeGreaterThanOrEqual(svgBounds.x);
      expect(label.x + label.width).toBeLessThanOrEqual(
        svgBounds.x + svgBounds.width,
      );
    }
    await capture('free-chart');
    if (width >= 900) {
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
    await capture('selected-serein-inspection');
    if (width < 900) {
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
    const legs = page.locator('polyline[data-route-leg]');
    await expect(legs).toHaveCount(7);
    const plottedWorlds = [
      'Aster Quay',
      'Drift Lantern',
      'Echo Basin',
      'Kestrel Vault',
      'Serein',
      'Ilex',
      'Serein',
      'Orison',
    ];
    const plottedPoints: number[][][] = [];
    for (let index = 0; index < 7; index++) {
      const line = legs.nth(index);
      const points = (await line.getAttribute('points'))!
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number));
      plottedPoints.push(points);
      const head = (await chart
        .locator('[data-route-arrow]')
        .nth(index)
        .getAttribute('points'))!
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number));
      expect(points.at(-1)).toEqual(head[1]);
      expect(points).toHaveLength(index === 4 || index === 5 ? 4 : 2);
      for (const [name, endpoint, arriving] of [
        [plottedWorlds[index], points[0], false],
        [plottedWorlds[index + 1], points.at(-1), true],
      ] as const) {
        const center = await page
          .getByRole('button', { name: new RegExp(`^Inspect ${name},`) })
          .locator('circle')
          .nth(1)
          .evaluate((element) => ({
            x: Number(element.getAttribute('cx')),
            y: Number(element.getAttribute('cy')),
            radius: Number(element.getAttribute('r')),
          }));
        if (arriving) {
          expect(
            Math.hypot(endpoint![0]! - center.x, endpoint![1]! - center.y),
          ).toBeCloseTo(center.radius + 1);
        } else {
          expect(endpoint![0]).toBeCloseTo(center.x, 5);
          expect(endpoint![1]).toBeCloseTo(center.y, 5);
        }
      }
    }
    const outward = plottedPoints[4]![1]!;
    const returning = plottedPoints[5]![2]!;
    expect(
      Math.hypot(outward[0]! - returning[0]!, outward[1]! - returning[1]!),
    ).toBeCloseTo(7);
    await expect(legs.nth(4)).toHaveAttribute('data-traversals', '2');
    await expect(legs.nth(5)).toHaveAttribute('data-traversals', '2');
    await expect(chart.locator('[data-route-arrow]')).toHaveCount(7);
    expect(
      await page.evaluate(
        'getComputedStyle(document.querySelector("[data-route-arrow]")).fill',
      ),
    ).toBe('none');
    expect(
      await page.evaluate(
        'parseFloat(getComputedStyle(document.querySelector("polyline[data-route-leg]")).strokeWidth)',
      ),
    ).toBeLessThan(2);
    await page
      .getByRole('navigation', { name: 'Planner navigation' })
      .getByRole('button', { name: 'Chart', exact: true })
      .click();
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
  await page.setViewportSize({ width: 899, height: 800 });
  await expect(page.getByRole('button', { name: /^Manifest/ })).toBeVisible();
  await expect(page.locator('#passage-chart')).toBeHidden();
  await expect(page.locator('#passage-manifest')).toBeVisible();
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
