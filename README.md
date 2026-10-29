# Jumpwake

A browser-based interstellar route planner for Cepheus-compatible science-fiction
tabletop RPGs. A focused play aid for plotting journeys across a hex subsector.

## Current status

The v0.1 working demo runs at `/`, using Design 3's pale chart and passage
manifest. Choose any two worlds in the fictional Ember Reach subsector to
calculate a route with jump-fuel accounting, fuel purchasing and scooping, and
deterministic cost optimization. Inspect worlds independently of endpoint
selection; on phones, switch between Chart and Manifest with shared journey state.

The routing engine completed its independent correctness review at `defd9df`
and is connected to the application. The manifest shows departure followed by
chronological jump and refueling events, including return visits. Same-world
journeys need no travel; unreachable destinations have an explicit result.
No SRD text is included.

Try Aster Quay → Cinder Rest for free scooping, Aster Quay → Orison for paid
fuel and a return visit to Serein, and Aster Quay → Last Ember for an unreachable
destination. Ember Reach in `src/data/emberReach.ts` is the authoritative map;
it also holds world descriptions. Display formatting lives with the planner.

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

| Command               | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Start the development server                                 |
| `npm run check`       | Check formatting, lint, TypeScript, and unit/component tests |
| `npm run test:watch`  | Watch unit/component tests                                   |
| `npm run format`      | Apply formatting                                             |
| `npm run build`       | Type-check and build static assets into `dist/`              |
| `npm run build:logos` | Export full and compact SVG identities from shared geometry  |
| `npm run preview`     | Serve the production build locally                           |
| `npm run test:e2e`    | Build and run the Chromium journey tests                     |

Before the first browser test, install Chromium:

```sh
npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium` to also install system
dependencies. Playwright starts a production preview on `127.0.0.1:4173`; keep
that port free. CI installs those browser dependencies and runs all checks,
the production build, and the journey tests.

## Project notes

- [Product requirements and scope](docs/product.md)
- [Rules references and open questions](docs/rules.md)
- [Coding guide](AGENTS.md)

The logo's hand-drawn SVG geometry lives in
`src/components/JumpwakeLogo/JumpwakeLogo.tsx`. After changing it, run
`npm run build:logos` and commit the regenerated standalone assets in
`public/brand/`. The exports use fixed palette colors and outlined lettering;
they need no fonts, stylesheets, or external resources. The ivory badge is
intentionally opaque so the orbital sweeps disappear behind it.

## Licensing status

The project is intended to become open source. A code license has not yet been
selected, so no open-source license grant is made by this scaffold.
`UNLICENSED` records that pending decision; `private: true` prevents accidental
npm publication. Rules-reference and attribution questions are tracked in the
rules document and must be resolved before distributing rules-derived content.
