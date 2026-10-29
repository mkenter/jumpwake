import { expect, test } from '@playwright/test';

// Design 3 has its own journey and responsive inspection coverage.
for (const design of [1, 2]) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1100 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`design ${design} / ${viewport.name}: review and interactions`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`/explore?design=${design}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Inspect Ilex, 0506' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page.getByRole('complementary', { name: 'World inspection' }),
      ).toContainText('Scoop 60 t unrefined fuel');
      expect(
        await page.evaluate(
          'document.documentElement.scrollWidth <= innerWidth',
        ),
      ).toBe(true);
      await page.screenshot({
        path: `review-artifacts/design-${design}-${viewport.name}.png`,
        fullPage: true,
      });

      const bell = page.getByRole('button', {
        name: 'Inspect Bellwether, 0307',
      });
      await bell.focus();
      await page.keyboard.press('Enter');
      await expect(bell).toHaveAttribute('aria-pressed', 'true');
      const inspector = page.getByRole('complementary', {
        name: 'World inspection',
      });
      await expect(inspector).toContainText('Buy 20 t unrefined fuel');
      await expect(inspector).toContainText('Cr2,000');
      if (viewport.name === 'mobile')
        await page
          .getByRole('button', { name: 'Itinerary', exact: true })
          .click();
      const itinerary = page.getByRole('region', {
        name: 'Itinerary',
        exact: true,
      });
      await expect(itinerary).toBeVisible();
      await itinerary.getByRole('button', { name: /Ilex/ }).click();
      await expect(
        page.getByRole('button', { name: 'Inspect Ilex, 0506' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(inspector).toContainText('Ilex');
      await expect(
        page.getByRole('button', { name: 'Inspect Ilex, 0506' }),
      ).toBeFocused();
      await page
        .getByRole('combobox', { name: 'Destination' })
        .selectOption('vela');
      await expect(page.getByRole('status')).toContainText('3 jumps, Cr2,000');
      await page
        .getByRole('button', { name: 'Inspect Meridian, 0203' })
        .click();
      await inspector.getByRole('button', { name: 'Set origin' }).click();
      await expect(page.getByRole('combobox', { name: 'Origin' })).toHaveValue(
        'meridian',
      );
      await expect(page.getByRole('status')).toContainText('No authored route');
      if (viewport.name === 'mobile')
        await page
          .getByRole('button', { name: 'Itinerary', exact: true })
          .click();
      await page
        .getByRole('button', { name: 'Restore sample journey' })
        .click();
      await expect(page.getByRole('combobox', { name: 'Origin' })).toHaveValue(
        'aster',
      );
      expect(errors).toEqual([]);
    });
  }
}

test('switches between all three designs with keyboard access', async ({
  page,
}) => {
  await page.goto('/explore');
  const nav = page.getByRole('navigation', { name: 'Design explorations' });
  for (const name of ['02 / Atlas', '03 / Manifest', '01 / Passage']) {
    const button = nav.getByRole('button', { name });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    const world = page.getByRole('button', { name: 'Inspect Meridian, 0203' });
    await world.focus();
    await page.keyboard.press('Space');
    await expect(world).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('complementary', { name: 'World inspection' })
      .getByRole('button', { name: 'Set destination' })
      .click();
    await expect(
      page.getByRole('combobox', { name: 'Destination' }),
    ).toHaveValue('meridian');
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'A passage throughthe quiet.',
  );
});
