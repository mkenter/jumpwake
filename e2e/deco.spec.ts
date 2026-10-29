import { expect, test } from '@playwright/test';

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [390, 844],
] as const) {
  test(`letterhead, sticky navigation and calculated passage at ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Planner navigation' });
    const home = page.getByRole('link', { name: 'Jumpwake home' });
    const manifest = page.getByRole('region', { name: 'Passage manifest' });
    const chart = page.getByRole('region', { name: 'Subsector chart' });
    await expect(nav).toHaveAttribute('data-condensed', 'false');
    await expect(home).toHaveCount(1);
    await expect(home.locator('svg')).toHaveAttribute(
      'viewBox',
      '0 0 1320 296',
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'JUMPWAKE',
    );
    await expect(
      page.getByText('NAVIGATION SERVICE', { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText('PASSENGER NAVIGATION SERVICE')).toHaveCount(0);
    const mainPageTop = await page.evaluate(
      'document.querySelector("main").getBoundingClientRect().top + scrollY',
    );
    expect(mainPageTop).toBeLessThan(310);
    await page.screenshot({
      path: testInfo.outputPath(`initial-${width}.png`),
    });

    await page.getByRole('combobox', { name: 'Origin' }).selectOption('aster');
    await page
      .getByRole('combobox', { name: 'Destination' })
      .selectOption('orison');
    await expect(page.getByRole('status')).toContainText('Cr4,000');
    if (width < 900)
      await nav.getByRole('button', { name: 'Manifest' }).click();
    await expect(manifest.getByRole('listitem')).toHaveCount(14);
    await page.screenshot({
      path: testInfo.outputPath(`calculated-${width}.png`),
    });

    await page.evaluate('window.scrollTo(0, 330)');
    await expect(nav).toHaveAttribute('data-condensed', 'true');
    await expect(home).toHaveCount(1);
    await expect(home.locator('svg')).toHaveAttribute(
      'viewBox',
      '370 24 580 248',
    );
    expect((await nav.boundingBox())!.y).toBe(0);
    expect(
      await page.evaluate(
        'document.querySelector("main").getBoundingClientRect().top + scrollY',
      ),
    ).toBe(mainPageTop);
    await page.screenshot({
      path: testInfo.outputPath(`scrolled-${width}.png`),
    });
    await nav.getByRole('button', { name: 'Manifest' }).click();
    await expect(manifest).toBeFocused();
    await expect(manifest).toBeVisible();
    expect((await manifest.boundingBox())!.y).toBeGreaterThanOrEqual(
      (await nav.boundingBox())!.height,
    );
    await nav.getByRole('button', { name: 'Chart', exact: true }).click();
    await expect(chart).toBeVisible();
    await expect(chart).toBeFocused();
    if (width < 900) await expect(manifest).toBeHidden();
    await nav.getByRole('link', { name: 'Passage' }).click();
    await expect(page.getByRole('combobox', { name: 'Origin' })).toBeFocused();
    await expect(
      page.getByRole('combobox', { name: 'Destination' }),
    ).toHaveValue('orison');
    await page.evaluate('window.scrollTo(0, 0)');
    await expect(nav).toHaveAttribute('data-condensed', 'false');
    await expect(home).toHaveCount(1);
    expect(
      await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),
    ).toBe(true);
  });
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`header focus and navigation survive both transition directions with ${reducedMotion}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Planner navigation' });
    const home = page.getByRole('link', { name: 'Jumpwake home' });
    await home.focus();
    await page.evaluate('window.scrollTo(0, 330)');
    await expect(nav).toHaveAttribute('data-condensed', 'true');
    await expect(home).toBeFocused();
    await expect(home.locator('svg')).toHaveAttribute(
      'viewBox',
      '370 24 580 248',
    );
    await page.keyboard.press('Tab');
    await expect(nav.getByRole('link', { name: 'Passage' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      nav.getByRole('button', { name: 'Chart', exact: true }),
    ).toBeFocused();
    await home.focus();
    await page.evaluate('window.scrollTo(0, 0)');
    await expect(nav).toHaveAttribute('data-condensed', 'false');
    await expect(home).toBeFocused();
    await expect(home.locator('svg')).toHaveAttribute(
      'viewBox',
      '0 0 1320 296',
    );
    if (reducedMotion === 'reduce') {
      expect(
        await page.evaluate(
          'document.querySelector("nav").getAnimations({subtree:true}).filter(animation => animation.playState === "running").length',
        ),
      ).toBe(0);
    }
  });
}
