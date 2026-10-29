import { mkdir, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Export portable assets from the component's canonical geometry; no tracing
// or separate hand-maintained copies of the badge or ornamental paths.
const server = await createServer({
  server: { middlewareMode: true, ws: false },
});
try {
  const { JumpwakeLogo } = await server.ssrLoadModule(
    '/src/components/JumpwakeLogo/JumpwakeLogo.tsx',
  );
  const directory = new URL('../public/brand/', import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const variant of ['full', 'compact']) {
    const svg = renderToStaticMarkup(createElement(JumpwakeLogo, { variant }))
      .replace(/ class="[^"]*"/g, '')
      .replace(
        '<svg ',
        variant === 'full'
          ? '<svg width="1320" height="296" '
          : '<svg width="580" height="248" ',
      );
    await writeFile(new URL(`jumpwake-${variant}.svg`, directory), `${svg}\n`);
  }
} finally {
  await server.close();
}
