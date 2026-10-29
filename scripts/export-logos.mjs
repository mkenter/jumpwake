import { mkdir, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Export portable assets from the component's canonical geometry; no tracing
// or separate hand-maintained copies of the badge or orbital paths.
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
          ? '<svg width="1280" height="570" '
          : '<svg width="730" height="330" ',
      );
    await writeFile(new URL(`jumpwake-${variant}.svg`, directory), `${svg}\n`);
  }
} finally {
  await server.close();
}
