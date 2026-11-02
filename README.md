# Jumpwake

<img src="public/brand/jumpwake-full.svg" alt="Jumpwake Navigation Service" width="420">

**Work in progress · v0.1.0**

Jumpwake is an interstellar route planner for **Classic Traveller (1981)**, built with React and TypeScript. It plots journeys between worlds on a hex chart and works out where a ship can jump, where it can refuel, and what the fuel will cost.

The project is under active development and is not a complete Traveller simulation.

## What it does

- **Plots passages** on an interactive 8 × 10 subsector chart, with selectable worlds and a chronological journey manifest.
- **Accounts for jump fuel**, ship range, partial fuel loads, fuel purchases, and gas-giant scooping.
- **Compares two routes:** lowest purchased fuel cost and fewest jumps. They are not always the same journey.
- **Lets you configure your vessel**, including displacement, jump rating, fuel capacity, starting fuel, scoops, and streamlining. The applied ship is saved locally in the browser.
- **Imports Traveller Map T5 tab-delimited data** from a local file, including subsectors from a whole sector. Imported charts stay in the current browser session; files are not uploaded.
- **Works on desktop and mobile**, with keyboard-accessible chart inspection, responsive chart/manifest views, and reduced-motion support.

The default fictional chart, **Ember Reach**, is included so you can explore without downloading any Traveller data.

## Try a passage

In Ember Reach, select **Aster Quay → Cinder Rest**. The default ship can make a three-jump passage using free fuel from gas giants, or a two-jump passage that buys fuel at Brass Ledger. Switch the routing preference to compare the itineraries.

You can also try **Aster Quay → Orison** for a route with paid fuel and a return visit, or **Aster Quay → Last Ember** for an unreachable destination.

To use your own chart, open **Chart bureau** and import a UTF-8 T5 tab-delimited file. The [Traveller Map data API](https://travellermap.com/doc/api) and [file-format documentation](https://travellermap.com/doc/fileformats) describe compatible exports. Jumpwake doesn't download or bundle official map data.

## How it works

The route planner models fuel aboard as part of the search state, so a cheaper journey can involve different refueling decisions, repeated visits, or additional jumps. Both preferences use the same routing engine and Classic Traveller 1981 rules adapter. The routing logic is independent of React.

The implementation includes unit tests, an independent routing-correctness review, and Playwright tests covering imports, routes, keyboard and touch interaction, and different screen sizes.

**Current boundaries:** planning is limited to one active subsector. Fuel risk, power-plant fuel, travel time, full ship construction, and some wilderness refueling options are not modeled. See [rules and assumptions](docs/rules.md) for the detailed audit.

## Run locally

Requires **Node.js 24** and npm.

```sh
nvm use
npm ci
npm run dev
```

Open the URL printed by Vite. No account, API keys, or backend are required.

| Command               | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `npm run dev`         | Development server                                |
| `npm run check`       | Formatting, lint, types, and unit/component tests |
| `npm run build`       | Production build                                  |
| `npm run preview`     | Preview built assets                              |
| `npm run test:e2e`    | Playwright browser tests                          |
| `npm run build:logos` | Regenerate standalone SVG brand assets            |

Before running browser tests, install Chromium with `npx playwright install chromium` (or `--with-deps chromium` on Linux). The browser suite runs against a production preview at `127.0.0.1:4173`.

The engine can also be used directly:

```ts
import { createRouter } from './src/engine';
import { EMBER_REACH } from './src/data/emberReach';
import { createClassicTraveller1981Rules } from './src/rules/classicTraveller1981';

const rules = createClassicTraveller1981Rules(
  {
    displacementTons: 100,
    jumpRating: 2,
    jumpFuelCapacityTons: 27,
    hasFuelScoops: true,
    streamlined: true,
  },
  { initialFuelTons: 13 },
);

const router = createRouter(EMBER_REACH, rules);
const cheapest = router.findRoute('aster', 'cinder', 'lowest-fuel-cost');
const shortest = router.findRoute('aster', 'cinder', 'fewest-jumps');
```

## Project notes

- [Classic Traveller rules audit and routing implementation](docs/rules.md)
- [Contributing and coding conventions](AGENTS.md)

## License and acknowledgements

The original Jumpwake source code and artwork are released under the [MIT License](LICENSE). This license does **not** grant rights to Traveller trademarks, publications, or third-party sector data.

Jumpwake is an unofficial fan project. See [third-party notices](THIRD_PARTY_NOTICES.md) for attribution.

