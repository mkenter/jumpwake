import { expect, test } from '@playwright/test';

for (const width of [
  1440, 1280, 1279, 1101, 1100, 1024, 960, 959, 701, 700, 390, 320,
]) {
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
      full ? '0 0 1320 296' : '370 24 580 248',
    );
    const bounds = await brand.boundingBox();
    expect(bounds!.width).toBe(
      full ? (width >= 1280 ? 256 : 216) : width > 700 ? 80 : 72,
    );
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    const layout = await page.evaluate<{
      height: number;
      gaps: number[];
      overflow: boolean;
    }>(`(() => {
      const header = document.querySelector('header');
      const items = [...header.children]
        .filter((item) => getComputedStyle(item).display !== 'none')
        .map((item, index) => (index === 0 ? item.lastElementChild : item).getBoundingClientRect());
      return {
        height: header.getBoundingClientRect().height,
        gaps: items.slice(1).map((item, index) => item.left - items[index].right),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    })()`);
    expect(layout.overflow).toBe(false);
    expect(layout.height).toBe(72);
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
      await page.evaluate(
        `getComputedStyle(document.querySelector('a[aria-label="Jumpwake home"]')).outlineStyle`,
      ),
    ).toBe('solid');
    await page.evaluate(
      `document.querySelector('a[aria-label="Jumpwake home"]').blur()`,
    );
    if ([1440, 1024, 390].includes(width)) {
      await page.screenshot({
        path: testInfo.outputPath(`masthead-${width}.png`),
      });
      await page.locator('header').screenshot({
        path: testInfo.outputPath(`masthead-${width}-detail.png`),
      });
    }
  });
}

test('standalone SVGs render independently on ivory at natural and small sizes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1120, height: 360 });
  await page.goto('/brand/jumpwake-full.svg');
  // All painted geometry remains inside the standalone view box.
  const artwork = await page.evaluate<{
    x: number;
    y: number;
    width: number;
    height: number;
    images: number;
    text: number;
  }>(`(() => {
    const svg = document.querySelector('svg');
    const { x, y, width, height } = svg.getBBox();
    return {
      x, y, width, height,
      images: svg.querySelectorAll('image').length,
      text: svg.querySelectorAll('text').length,
    };
  })()`);
  expect(artwork.x).toBeGreaterThan(0);
  expect(artwork.y).toBeGreaterThan(0);
  expect(artwork.x + artwork.width).toBeLessThan(1320);
  expect(artwork.y + artwork.height).toBeLessThan(296);
  expect(artwork.images).toBe(0);
  expect(artwork.text).toBe(0);
  await page.goto('/');
  await page.setContent(
    `<style>body{margin:0;background:#f5f4ef;color:#354248;font:12px Arial}figure{margin:0;padding:40px}img{display:block;width:100%;height:auto}figcaption{letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}#sizes{display:flex;gap:48px;align-items:center}p{margin:12px 0 0}</style><figure><figcaption>Jumpwake · Full Art Deco identity</figcaption><img alt="Jumpwake" src="/brand/jumpwake-full.svg"></figure>`,
  );
  await page.evaluate(
    'Promise.all([...document.images].map(image => image.decode()))',
  );
  await page.screenshot({ path: testInfo.outputPath('standalone-full.png') });
  await page.setViewportSize({ width: 800, height: 260 });
  await page.setContent(
    `<style>body{margin:0;background:#f5f4ef;color:#354248;font:12px Arial}figure{width:560px;margin:40px auto}img{display:block;width:100%;height:auto}figcaption{letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}</style><figure><figcaption>Future letterhead width · 560px</figcaption><img alt="Jumpwake" src="/brand/jumpwake-full.svg"></figure>`,
  );
  await page.evaluate(
    'Promise.all([...document.images].map(image => image.decode()))',
  );
  await page.screenshot({ path: testInfo.outputPath('letterhead-560.png') });
  await page.setViewportSize({ width: 800, height: 240 });
  await page.setContent(
    `<style>body{margin:0;background:#f5f4ef;color:#354248;font:12px Arial}figure{margin:0;padding:40px}img{display:block;width:100%;height:auto}figcaption{letter-spacing:2px;text-transform:uppercase;margin-bottom:32px}#sizes{display:flex;gap:32px;align-items:center}p{margin:12px 0 0}</style><figure><figcaption>Jumpwake · Compact identity</figcaption><div id="sizes">${[144, 96, 80, 72, 48, 32].map((size) => `<div style="width:${size}px"><img alt="Jumpwake at ${size}px" src="/brand/jumpwake-compact.svg"><p>${size}px</p></div>`).join('')}</div></figure>`,
  );
  await page.evaluate(
    'Promise.all([...document.images].map(image => image.decode()))',
  );
  await page.screenshot({
    path: testInfo.outputPath('standalone-compact.png'),
  });
});
