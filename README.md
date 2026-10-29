# Jumpwake

A browser-based interstellar route planner for Cepheus-compatible science-fiction
tabletop RPGs. A focused play aid for plotting journeys across a hex subsector.

## Current status

Responsive application shell plus visual studies at `/explore`. Design 3
(`/explore?design=3`) is the chosen visual foundation and a working interactive
passage prototype: choose endpoints, inspect worlds and stops, and switch between
authored example journeys. It uses shared fictional fixtures; its routes and fuel
decisions are not calculated. The production shell remains separate from the
studies. See the [Design 3 review](review-artifacts/design-3-review.md) for the
interaction critique and comparable screenshots.

The routing engine is implemented and completed its independent correctness
review at `defd9df`, but is not yet connected to the UI. It provides
Traveller subsector geometry, jump-fuel accounting, fuel purchasing and scooping,
and deterministic cost optimization. The original Ember Reach fixture exercises
free refueling detours and unreachable destinations. Connecting engine results to
the Design 3 map and itinerary remains to be done. No SRD text is included.

The engine exports `createRouter`, coordinate conversions, and fuel rules through
`src/engine/index.ts`. Construct a router from `EMBER_REACH` in
`src/data/emberReach.ts`, then call `findRoute('aster', 'cinder')`. See
[the rules document](docs/rules.md#routing-implementation) for the algorithm,
complexity, assumptions, and result contract.

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
