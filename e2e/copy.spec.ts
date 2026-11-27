import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`copies the ordered voyage at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 844 });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Origin' }).selectOption('aster');
    await page
      .getByRole('combobox', { name: 'Destination' })
      .selectOption('cinder');
    if (width < 900)
      await page
        .getByRole('navigation')
        .getByRole('button', { name: 'Manifest', exact: true })
        .click();
    const manifest = page.getByRole('region', { name: 'Passage manifest' });
    await expect(manifest.getByRole('listitem')).toHaveCount(4);
    await expect(manifest).toContainText('Jump Aster Quay → Drift Lantern');
    await page
      .getByRole('button', { name: 'Copy passage', exact: true })
      .click();
    await expect(page.getByText('Passage copied to clipboard.')).toBeVisible();
    const text = await page.evaluate(() =>
      (
        navigator as unknown as { clipboard: { readText(): Promise<string> } }
      ).clipboard.readText(),
    );
    expect(text).toContain('Routing: Lowest fuel cost');
    expect(text).toContain('## Voyage');
    expect(text).toContain('Jump Aster Quay → Drift Lantern');
    expect(text).toContain('scooped 80 t');
    expect(text.indexOf('**Drift Lantern**')).toBeLessThan(
      text.indexOf('**Echo Basin**'),
    );
  });
}
