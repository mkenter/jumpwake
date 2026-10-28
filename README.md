# Jumpwake

A browser-based interstellar route planner for Cepheus-compatible science-fiction
tabletop RPGs. A focused play aid for plotting journeys across a hex subsector.

## Current status

Application foundation only: a responsive shell, provisional CSS tokens, one
pure hex-distance utility, and development checks. Map rendering, fuel accounting,
route optimization, and itineraries are not implemented. No setting data or SRD
text is included.

## Development

Use **Node 24** and npm. With nvm installed:

```sh
nvm use
npm ci
npm run dev
```

Open the local URL printed by Vite. No accounts, environment variables, or backend
services are required.

| Command              | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Start the development server                                 |
| `npm run check`      | Check formatting, lint, TypeScript, and unit/component tests |
| `npm run test:watch` | Watch unit/component tests                                   |
| `npm run format`     | Apply formatting                                             |
| `npm run build`      | Type-check and build static assets into `dist/`              |
| `npm run preview`    | Serve the production build locally                           |
| `npm run test:e2e`   | Build and run the Chromium smoke test                        |

Before the first browser test, install Chromium:

```sh
npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium` to also install system
dependencies. Playwright starts a production preview on `127.0.0.1:4173`; keep
that port free. CI installs those browser dependencies and runs all checks,
the production build, and the smoke test.

## Project notes

- [Product requirements and scope](docs/product.md)
- [Rules references and open questions](docs/rules.md)
- [Coding guide](AGENTS.md)

## Licensing status

The project is intended to become open source. A code license has not yet been
selected, so no open-source license grant is made by this scaffold.
`UNLICENSED` records that pending decision; `private: true` prevents accidental
npm publication. Rules-reference and attribution questions are tracked in the
rules document and must be resolved before distributing rules-derived content.
