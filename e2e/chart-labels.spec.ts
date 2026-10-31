import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Real source data stays outside the repository. Set this to a locally downloaded
// Traveller Map /data/{sector}/{subsector}/tab file for the same checks.
const realFile = process.env.JUMPWAKE_TEST_CHART;
const samples = [3, 24, 80].map((count) => ({
  name: `synthetic-${count}`,
  count,
  text:
    'Hex\tName\tUWP\tPBG\n' +
    Array.from(
      { length: count },
      (_, i) =>
        `${String(Math.floor(i / 10) + 1).padStart(2, '0')}${String((i % 10) + 1).padStart(2, '0')}\tWorld ${i + 1}\tA000000-0\t001`,
    ).join('\n'),
}));
if (realFile)
  samples.push({
    name: 'traveller-map',
    count: 0,
    text: readFileSync(realFile, 'utf8'),
  });

async function labelStats(page: import('@playwright/test').Page) {
  return page.evaluate<{ count: number; collisions: string[] }>(`(() => {
    const labels = [...document.querySelectorAll('[data-world-label]')].filter(el => getComputedStyle(el).visibility === 'visible');
    const boxes = labels.map(el => {
      const text = [...el.querySelectorAll('text')].filter(t => getComputedStyle(t).visibility === 'visible').map(t => t.getBoundingClientRect());
      return { id: el.getAttribute('data-world-label'), box: { left: Math.min(...text.map(b=>b.left)), right: Math.max(...text.map(b=>b.right)), top: Math.min(...text.map(b=>b.top)), bottom: Math.max(...text.map(b=>b.bottom)) } };
    });
    const collisions = [];
    for (let i=0; i<boxes.length; i++) for (let j=i+1; j<boxes.length; j++) {
      const a=boxes[i].box, b=boxes[j].box;
      if (Math.min(a.right,b.right) - Math.max(a.left,b.left) > 1 && Math.min(a.bottom,b.bottom) - Math.max(a.top,b.top) > 1) collisions.push(boxes[i].id + '/' + boxes[j].id);
    }
    for (const { id, box } of boxes) {
      for (const path of document.querySelectorAll('[data-route-leg]')) {
        const length = path.getTotalLength(), matrix = path.getScreenCTM();
        for (let t=0; t<=length; t+=2) {
          const p=path.getPointAtLength(t), point=new DOMPoint(p.x,p.y).matrixTransform(matrix);
          if(point.x>box.left && point.x<box.right && point.y>box.top && point.y<box.bottom) { collisions.push(id + '/route'); break; }
        }
      }
      for (const world of document.querySelectorAll('[data-world]')) {
        const marker=world.querySelector('circle:last-of-type'), matrix=marker.getScreenCTM();
        const point=new DOMPoint(marker.cx.baseVal.value,marker.cy.baseVal.value).matrixTransform(matrix);
        const radius=marker.r.baseVal.value*matrix.a;
        if(Math.hypot(point.x-Math.max(box.left,Math.min(point.x,box.right)),point.y-Math.max(box.top,Math.min(point.y,box.bottom)))<radius) collisions.push(id + '/marker');
      }
    }
    return { count: labels.length, collisions };
  })()`);
}
for (const width of [1440, 1024, 390])
  for (const sample of samples) {
    test(`${sample.name} readable labels at ${width}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.getByText('Chart bureau ·').click();
      await page.getByLabel('Load navigation chart').setInputFiles({
        name: `${sample.name}.tab`,
        mimeType: 'text/plain',
        buffer: Buffer.from(sample.text),
      });
      await expect(
        page
          .getByRole('combobox', { name: 'Origin', exact: true })
          .locator('option'),
      ).not.toHaveCount(16);
      await page.getByRole('button', { name: 'Chart', exact: true }).click();
      await page.locator('#passage-chart').focus();
      const resting = await labelStats(page);
      await info.attach('resting-label-count', {
        body: String(resting.count),
        contentType: 'text/plain',
      });
      expect(resting.count).toBeGreaterThan(sample.count === 3 ? 2 : 5);
      expect(resting.collisions).toEqual([]);
      await page
        .locator('#passage-chart')
        .screenshot({ path: info.outputPath('rest.png') });
      const worlds = page.locator('[data-world]');
      const ids = await worlds.evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-world')!),
      );
      await page
        .getByRole('combobox', { name: 'Origin', exact: true })
        .selectOption(ids[0]!);
      await page
        .getByRole('combobox', { name: 'Destination', exact: true })
        .selectOption(ids[ids.length - 1]!);
      await expect(page.getByRole('status').first()).toContainText('jump');
      await page.getByRole('button', { name: 'Chart', exact: true }).click();
      await page.locator('#passage-chart').focus();
      expect((await labelStats(page)).collisions).toEqual([]);
      await expect(
        page.locator(`[data-world-label="${ids[0]}"]`),
      ).toHaveAttribute('visibility', 'visible');
      await expect(
        page.locator(`[data-world-label="${ids[ids.length - 1]}"]`),
      ).toHaveAttribute('visibility', 'visible');
      await page
        .locator('#passage-chart')
        .screenshot({ path: info.outputPath('route.png') });
      const hidden = page
        .locator('[data-world-label][visibility="hidden"]')
        .first();
      if (await hidden.count()) {
        const id = await hidden.getAttribute('data-world-label');
        const world = page.locator(`[data-world="${id}"]`);
        await world.locator('rect').hover();
        await expect(
          page.locator(`[data-world-label="${id}"]`),
        ).toHaveAttribute('visibility', 'visible');
        await world.focus();
        await expect(
          page.locator(`[data-world-label="${id}"]`),
        ).toHaveAttribute('visibility', 'visible');
        await page.keyboard.press('Enter');
        await expect(
          page.getByRole('button', { name: 'Close world details' }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Close world details' }).click();
      }
    });
  }
