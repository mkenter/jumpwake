import { expect, test } from '@playwright/test';

for (const width of [1440, 1024, 960, 959, 701, 700, 390, 320]) {
  test(`brand stays legible and clear of masthead content at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const brand = page.getByRole('link', { name: 'Jumpwake home' });
    await expect(brand).toHaveAttribute('href', '/');
    await expect(brand.locator('svg:visible')).toHaveCount(1);
    const logo = brand.locator('svg:visible');
    const full = width >= 960;
    await expect(logo).toHaveAttribute(
      'viewBox',
      full ? '0 0 1280 570' : '285 125 730 330',
    );
    const bounds = await brand.boundingBox();
    expect(bounds!.width).toBe(
      full ? (width > 1100 ? 256 : 224) : width > 700 ? 80 : 72,
    );
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    const layout = await page.locator('header').evaluate((header) => {
      const items = [...header.children]
        .filter((item) => getComputedStyle(item).display !== 'none')
        .map((item) => item.getBoundingClientRect());
      return {
        height: header.getBoundingClientRect().height,
        gaps: items
          .slice(1)
          .map((item, index) => item.left - items[index]!.right),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.height).toBeLessThanOrEqual(130);
    for (const gap of layout.gaps) expect(gap).toBeGreaterThanOrEqual(12);
    const wordmark = page
      .getByText('JUMPWAKE', { exact: false })
      .filter({ has: page.locator('small') });
    await expect(wordmark).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Skip to planner' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(brand).toBeFocused();
    expect(
      await brand.evaluate((element) => getComputedStyle(element).outlineStyle),
    ).toBe('solid');
    await brand.evaluate((element) => element.blur());
    if ([1440, 1024, 390].includes(width)) {
      await page.screenshot({
        path: testInfo.outputPath(`masthead-${width}.png`),
      });
      await page
        .locator('header')
        .screenshot({
          path: testInfo.outputPath(`masthead-${width}-detail.png`),
        });
    }
  });
}

test('standalone SVGs render independently on ivory at natural and small sizes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1120, height: 620 });
  await page.goto('/brand/jumpwake-full.svg');
  // All painted geometry remains inside the standalone view box.
  const artwork = await page.locator('svg').evaluate((svg: SVGSVGElement) => {
    const { x, y, width, height } = svg.getBBox();
    return {
      x,
      y,
      width,
      height,
      images: svg.querySelectorAll('image').length,
      text: svg.querySelectorAll('text').length,
    };
  });
  expect(artwork.x).toBeGreaterThan(0);
  expect(artwork.y).toBeGreaterThan(0);
  expect(artwork.x + artwork.width).toBeLessThan(1280);
  expect(artwork.y + artwork.height).toBeLessThan(570);
  expect(artwork.images).toBe(0);
  expect(artwork.text).toBe(0);
  await page.goto('/');
  await page.setContent(
    `<style>body{margin:0;background:#f5f4ef;color:#354248;font:12px Arial}figure{margin:0;padding:40px}img{display:block;width:100%;height:auto}figcaption{letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}#sizes{display:flex;gap:48px;align-items:center}p{margin:12px 0 0}</style><figure><figcaption>Jumpwake · Full orbital identity</figcaption><img alt="Jumpwake" src="/brand/jumpwake-full.svg"></figure>`,
  );
  await page
    .getByRole('img')
    .evaluate((image: HTMLImageElement) => image.decode());
  await page.screenshot({ path: testInfo.outputPath('standalone-full.png') });
  await page.setViewportSize({ width: 800, height: 240 });
  await page.setContent(
    `<style>body{margin:0;background:#f5f4ef;color:#354248;font:12px Arial}figure{margin:0;padding:40px}img{display:block;width:100%;height:auto}figcaption{letter-spacing:2px;text-transform:uppercase;margin-bottom:32px}#sizes{display:flex;gap:40px;align-items:center}p{margin:12px 0 0}</style><figure><figcaption>Jumpwake · Compact identity</figcaption><div id="sizes">${[144, 96, 72, 48, 32].map((size) => `<div style="width:${size}px"><img alt="Jumpwake at ${size}px" src="/brand/jumpwake-compact.svg"><p>${size}px</p></div>`).join('')}</div></figure>`,
  );
  for (const image of await page.getByRole('img').all()) {
    await image.evaluate((element: HTMLImageElement) => element.decode());
  }
  await page.screenshot({
    path: testInfo.outputPath('standalone-compact.png'),
  });
});
