import { expect, test } from '@playwright/test';

for (const source of ['chart', 'manifest'] as const) {
  test(`inspection from ${source} survives the desktop/compact boundary`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 960, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const origin = page.getByRole('combobox', { name: 'Origin' });
    const destination = page.getByRole('combobox', { name: 'Destination' });
    await origin.selectOption('aster');
    await destination.selectOption('orison');
    const chart = page.locator('#passage-chart');
    const manifest = page.locator('#passage-manifest');
    const trigger =
      source === 'chart'
        ? page.getByRole('button', { name: 'Inspect Serein, 0704' })
        : page.getByRole('button', { name: 'Inspect event 13, Serein' });
    const heading = page.locator('#inspected-world');
    const close = page.getByRole('button', { name: 'Close world details' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(heading).toBeFocused();
    await expect(
      page.getByRole('complementary', { name: 'World inspection' }),
    ).toBeVisible();

    // Resize with inspection open, including the exact layout boundary.
    for (const width of [899, 768, 900, 1024, 899]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(heading).toBeFocused();
      await expect(origin).toHaveValue('aster');
      await expect(destination).toHaveValue('orison');
      await expect(page.getByRole('status')).toContainText('Cr4,000');
      if (width < 900) {
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Events 8, 9, 12, 13');
        await page.keyboard.press('Shift+Tab');
        await expect(
          dialog.getByRole('button', { name: 'Set destination' }),
        ).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(close).toBeFocused();
        await heading.focus();
      } else {
        await expect(chart).toBeVisible();
        await expect(manifest).toBeVisible();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
      expect(
        await page.evaluate(
          'document.documentElement.scrollWidth <= innerWidth',
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: testInfo.outputPath('compact-inspection.png'),
    });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(source === 'chart' ? chart : manifest).toBeVisible();
    await expect(source === 'chart' ? manifest : chart).toBeHidden();

    // Switch views, inspect a repeated event and close using the visible control.
    await page.getByRole('button', { name: /^Manifest/ }).click();
    await expect(manifest.getByRole('listitem')).toHaveCount(14);
    const repeatedEvent = page.getByRole('button', {
      name: 'Inspect event 9, Serein',
    });
    await repeatedEvent.focus();
    await page.keyboard.press('Space');
    await expect(heading).toBeFocused();
    await close.click();
    await expect(repeatedEvent).toBeFocused();
    await page.getByRole('button', { name: 'Chart', exact: true }).click();
    await expect(chart).toBeVisible();
    await page.setViewportSize({ width: 900, height: 800 });
    await expect(chart).toBeVisible();
    await expect(manifest).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Planner view' }),
    ).toBeHidden();
    await expect(destination).toHaveValue('orison');
    await page.screenshot({
      path: testInfo.outputPath('desktop-restored.png'),
      fullPage: true,
    });
  });
}
