import { expect, test } from '@playwright/test';

for (const width of [1440, 1280, 1024, 390]) {
  test(`vessel document, keyboard and passage updates at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const origin = page.getByRole('combobox', { name: 'Origin' });
    const destination = page.getByRole('combobox', { name: 'Destination' });
    await origin.selectOption('aster');
    await destination.selectOption('cinder');
    await expect(page.getByRole('status')).toContainText('3 jumps');
    const controls = page.getByRole('region', { name: 'Journey controls' });
    await controls.screenshot({ path: testInfo.outputPath('collapsed.png') });
    await page.screenshot({
      path: testInfo.outputPath('collapsed-page.png'),
      fullPage: true,
    });
    const edit = page.getByRole('button', { name: 'Edit particulars' });
    await edit.focus();
    await page.keyboard.press('Enter');
    const displacement = page.getByRole('spinbutton', { name: 'Displacement' });
    await expect(displacement).toBeFocused();
    const navBottom = (await page.getByRole('navigation').boundingBox())!;
    const inputBox = (await displacement.boundingBox())!;
    expect(inputBox.y).toBeGreaterThanOrEqual(navBottom.y + navBottom.height);
    await expect(origin).toBeVisible();
    await expect(destination).toBeVisible();
    await controls.screenshot({ path: testInfo.outputPath('expanded.png') });
    await page.screenshot({
      path: testInfo.outputPath('expanded-page.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),
    ).toBe(true);

    // Native keyboard order traverses specifications, equipment, then fuel aboard.
    for (const target of [
      page.getByRole('combobox', { name: 'Jump rating' }),
      page.getByRole('spinbutton', { name: 'Jump-fuel capacity' }),
      page.getByRole('checkbox', { name: 'Fuel scoops fitted' }),
      page.getByRole('checkbox', { name: 'Streamlined hull' }),
      page.getByRole('spinbutton', { name: 'Jump fuel aboard' }),
    ]) {
      await page.keyboard.press('Tab');
      await expect(target).toBeFocused();
    }
    const capacity = page.getByRole('spinbutton', {
      name: 'Jump-fuel capacity',
    });
    await capacity.fill('40');
    await page.getByRole('button', { name: 'Apply particulars' }).click();
    const fuel = page.getByRole('spinbutton', { name: 'Jump fuel aboard' });
    await expect(fuel).toBeFocused();
    await expect(fuel).toHaveValue('60');
    await expect(fuel).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.getByText(/Fuel aboard cannot exceed capacity/),
    ).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Cr0');
    await controls.screenshot({ path: testInfo.outputPath('validation.png') });
    await page.keyboard.press('Escape');
    await expect(edit).toBeFocused();
    await edit.click();
    await expect(capacity).toHaveValue('60');
    await fuel.fill('13');
    await page.getByRole('button', { name: 'Apply particulars' }).click();
    await expect(edit).toBeFocused();
    await expect(origin).toHaveValue('aster');
    await expect(destination).toHaveValue('cinder');
    await expect(page.getByRole('status')).toContainText('Cr2,700');
    if (width < 900)
      await page.getByRole('button', { name: 'Manifest', exact: true }).click();
    const manifest = page.getByRole('region', { name: 'Passage manifest' });
    await expect(manifest).toContainText('Arrival: 13 t');
    await expect(manifest).toContainText('Buy 27 t unrefined fuel');
    await page.getByRole('link', { name: 'Passage', exact: true }).click();
    await expect(origin).toBeFocused();
    await edit.click();
    await page.getByRole('combobox', { name: 'Jump rating' }).selectOption('1');
    await page.getByRole('button', { name: 'Apply particulars' }).click();
    await expect(page.getByRole('status')).toContainText(
      'Destination unreachable',
    );
    await expect(manifest.getByRole('listitem')).toHaveCount(0);
    await expect(page.locator('[data-route-leg]')).toHaveCount(0);
    await edit.click();
    await page
      .getByRole('button', { name: 'Restore demonstration ship' })
      .click();
    await page.getByRole('button', { name: 'Apply particulars' }).click();
    await expect(page.getByRole('status')).toContainText('3 jumps');
    await expect(page.getByRole('status')).toContainText('Cr0');
    expect(errors).toEqual([]);
  });
}

test('touch draft cancellation, applied persistence and safe restoration', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  const edit = page.getByRole('button', { name: 'Edit particulars' });
  await edit.tap();
  await page.getByRole('spinbutton', { name: 'Displacement' }).fill('100');
  await page.getByRole('combobox', { name: 'Jump rating' }).selectOption('2');
  await page.getByRole('spinbutton', { name: 'Jump-fuel capacity' }).fill('27');
  await page.getByRole('spinbutton', { name: 'Jump fuel aboard' }).fill('13');
  await page.getByRole('checkbox', { name: 'Streamlined hull' }).tap();
  await page.getByRole('button', { name: 'Apply particulars' }).tap();
  await page.reload();
  const summary = page.getByLabel('Active vessel');
  await expect(summary).toContainText('100 tons · Jump-2');
  await expect(summary).toContainText('13/27 tons jump fuel');
  await expect(summary).toContainText('Unstreamlined');
  await edit.tap();
  await page.getByRole('spinbutton', { name: 'Displacement' }).fill('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
  await expect(edit).toBeFocused();
  await page.reload();
  await expect(summary).toContainText('100 tons · Jump-2');
  await edit.tap();
  await page.getByRole('button', { name: 'Restore demonstration ship' }).tap();
  await page.getByRole('button', { name: 'Apply particulars' }).tap();
  await page.reload();
  await expect(summary).toContainText('200 tons · Jump-3');
  for (const saved of [
    '{broken',
    JSON.stringify({ version: 0, ship: {} }),
    JSON.stringify({ version: 1, ship: { displacementTons: 101 }, state: {} }),
  ]) {
    await page.evaluate(
      (value) => localStorage.setItem('jumpwake.vessel', value),
      saved,
    );
    await page.reload();
    await expect(summary).toContainText('200 tons · Jump-3');
    await expect(summary).toContainText('60/60 tons jump fuel');
  }
  await context.close();
});

test('normal-motion reveal and sticky navigation retain focus and scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Passage', exact: true }).click();
  await expect(page.getByRole('navigation')).toHaveAttribute(
    'data-condensed',
    'true',
  );
  const edit = page.getByRole('button', { name: 'Edit particulars' });
  await edit.click();
  await expect(
    page.getByRole('spinbutton', { name: 'Displacement' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(edit).toBeFocused();
  await expect(page.getByRole('navigation')).toHaveAttribute(
    'data-condensed',
    'true',
  );
  expect(await page.evaluate('scrollY')).toBeGreaterThan(100);
});

test('operational particulars control routing and survive reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const expectSummaryRow = async () => {
    const positions = await page
      .getByRole('heading', { name: 'Vessel particulars' })
      .evaluate((heading) => {
        const summary = heading.parentElement!;
        const edit = summary.querySelector('button')!.getBoundingClientRect();
        const notes = summary.querySelector('p')!.getBoundingClientRect();
        const title = heading.getBoundingClientRect();
        return {
          titleBottom: title.bottom,
          editTop: edit.top,
          editBottom: edit.bottom,
          notesTop: notes.top,
        };
      });
    expect(positions.editTop).toBeLessThan(positions.titleBottom);
    expect(positions.notesTop).toBeGreaterThanOrEqual(positions.editBottom);
  };
  await expectSummaryRow();
  await page.getByRole('button', { name: 'Edit particulars' }).click();
  await page.getByLabel('Assess operational particulars').check();
  await page.getByLabel('Jump drive letter', { exact: true }).fill('A');
  await page
    .getByLabel('Maneuver drive letter (enter none if absent)')
    .fill('A');
  await page.getByLabel('Power plant letter').fill('A');
  await page.getByLabel('Computer model').fill('1');
  await page.getByLabel('Installed total tankage (tons)').fill('80');
  await expect(
    page.getByText(/Assessment: assessed; drive jump/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Apply particulars' }).click();
  await expect(page.getByLabel('Active vessel')).toContainText('Jump-1');
  await expectSummaryRow();
  await expect(
    page.getByText(/Operational particulars are saved and shared/),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Active vessel')).toContainText('Jump-1');
  await expect(
    page.getByText(/Operational particulars retained/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit particulars' }).click();
  await expect(
    page.getByLabel('Jump drive letter', { exact: true }),
  ).toHaveValue('A');
});

test('operational vessel uses shared fuel for jump and plant and survives reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit particulars' }).click();
  await page.getByLabel('Assess operational particulars').check();
  await page.getByLabel('Jump drive letter').fill('A');
  await page
    .getByLabel('Maneuver drive letter (enter none if absent)')
    .fill('A');
  await page.getByLabel('Power plant letter').fill('A');
  await page.getByLabel('Computer model').fill('1');
  await page.getByLabel('Installed total tankage (tons)').fill('80');
  await page.getByLabel('Total fuel aboard').fill('75');
  await page.getByRole('button', { name: 'Apply particulars' }).click();
  await page.getByRole('combobox', { name: 'Origin' }).selectOption('serein');
  await page
    .getByRole('combobox', { name: 'Destination' })
    .selectOption('ilex');
  const manifest = page.getByRole('region', { name: 'Passage manifest' });
  await expect(manifest).toContainText('2.5 t plant fuel');
  await expect(manifest).toContainText('remaining 52.5 t');
  await page.reload();
  await expect(
    page.getByRole('group', { name: 'Active vessel' }),
  ).toContainText('75/80 tons total fuel');
  await expect(
    page.getByRole('group', { name: 'Active vessel' }),
  ).toContainText('Plant-1');
});
