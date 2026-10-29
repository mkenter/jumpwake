import { expect, test } from '@playwright/test';

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
