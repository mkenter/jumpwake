# Jumpwake

<img src="public/brand/jumpwake-full.svg" alt="Jumpwake Navigation Service" width="420" />

**Work in progress · v0.1.0**

Jumpwake is an interstellar route planner for **Classic Traveller (1981)**, built with React and TypeScript. It plots journeys between worlds on a hex chart and works out where a ship can jump, where it can refuel, and what the fuel will cost.

The project is under active development and is not a complete Traveller simulation.

## What it does

- **Plots passages** on an interactive 8 × 10 subsector chart, with selectable worlds and a chronological journey manifest.
- **Accounts for jump fuel**, ship range, partial fuel loads, fuel purchases, and gas-giant scooping.
- **Plans ordered stops or specified jumps**, carrying fuel across the whole itinerary and identifying infeasible legs.
- **Compares two routes:** lowest purchased fuel cost and fewest jumps. They are not always the same journey.
- **Lets you configure your vessel**, including displacement, jump rating, fuel capacity, starting fuel, scoops, and streamlining. The applied ship is saved locally in the browser.
- **Imports Traveller Map T5 tab-delimited data** from a local file, including subsectors from a whole sector. The last imported file and selected subsector are saved locally on the device when browser storage is available; files are not uploaded.
- **Shares passages by link**, including the route preference and vessel particulars. Imported-chart recipients need the same T5 file on their device; chart data is not included in the link.
- **Works on desktop and mobile**, with keyboard-accessible chart inspection, responsive chart/manifest views, and reduced-motion support.

The default fictional chart, **Ember Reach**, is included so you can explore without downloading any Traveller data.

## Try a passage

In Ember Reach, select **Aster Quay → Cinder Rest**. The default ship can make a three-jump passage using free fuel from gas giants, or a two-jump passage that buys fuel at Brass Ledger. Switch the routing preference to compare the itineraries.

You can also try **Aster Quay → Orison** for a route with paid fuel and a return visit, or **Aster Quay → Last Ember** for an unreachable destination.

To use your own chart, open **Chart bureau** and choose or drop a UTF-8 T5 tab-delimited file. The [Traveller Map data API](https://travellermap.com/doc/api) and [file-format documentation](https://travellermap.com/doc/fileformats) describe compatible exports. Jumpwake doesn't download or bundle official map data.

## How it works

The route planner models fuel aboard as part of the search state, so a cheaper journey can involve different refueling decisions, repeated visits, or additional jumps. Both preferences use the same routing engine and Classic Traveller 1981 rules adapter. The routing logic is independent of React.

The implementation includes unit tests, an independent routing-correctness review, and Playwright tests covering imports, routes, keyboard and touch interaction, and different screen sizes.

The CT81 adapter uses fuel equal to one tenth of hull displacement per parsec jumped (Book 2, pp. 6–7, 14–15). It offers refined fuel at A/B ports for Cr500 per ton, unrefined at C/D for Cr100 per ton, and no purchased fuel at E/X (Book 3, p. 10; Book 2, pp. 14–15). A/B unrefined sales at Cr100 are a referee assumption enabled by default; authored systems can set `unrefinedFuelAvailable: false` on an A/B port. Gas-giant scooping is a separate free source. The supported hull sizes produce whole-ton jump consumption; fractional tons are not rounded.

The vessel editor can assess operational particulars against the bundled examples or a locally imported catalog. A complete assessment supplies the computer-limited jump rating and streamlining to routing; it does not certify construction legality or assess software. Referee ratings can fill unavailable entries with a stated source. Saved vessels and shared passages retain operational particulars and referee overrides; older route-only vessels remain explicitly incomplete. Shared passages do not include private catalogs. Reapply the particulars after changing the catalog. The bundled data contains only supplied examples; a private catalog can be partial or complete. See the [catalog format](docs/drive-catalog.md). Synthetic coverage is not verified CT81 data; private dataset verification and real-vessel validation remain maintainer tasks.

Imported UWP and PBG profiles retain unknown values separately from zero. Inspection shows main-world size, hydrographics, facilities and travel-zone advisories; zones do not by themselves prohibit travel. Referee-supplied missing observations and explicit prohibitions can be provided through the world-facts interfaces. Unknown fuel sources are not assumed available by the planner. UWP does not describe complete system geometry or prove that surface liquid is water. Reference-data and interpretation gaps are tracked in DEV-79.

Operational vessels account for plant and jump consumption from one shared tank. Book 2 pp. 14–15 and 23 specify a plant allowance of 10 tons per plant rating for four weeks; the planner interpolates this as 2.5 tons per rating per week. It provisionally assumes one ordinary operating week per jump, adjustable by the referee from zero to four; this is not a detailed travel-time model, and idle or abnormal operation is not predicted. The exact search is limited to 256 critical fuel levels; the editor rejects combinations exceeding that bound. The displayed maximum endurance assumes all remaining fuel is available to the plant, without reserving jump fuel. Existing route-only vessels continue to model jump fuel alone until operational particulars are applied. The supported bundled catalog remains incomplete; see DEV-79 for reference-data dependencies.

**Current boundaries:** planning is limited to one active subsector. Fuel risk, detailed travel time, full ship construction, and some wilderness refueling options are not modeled.

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

## License and acknowledgements

The original Jumpwake source code and artwork are released under the [MIT License](LICENSE). This license does **not** grant rights to Traveller trademarks, publications, or third-party sector data.

Jumpwake is an unofficial fan project. See [third-party notices](THIRD_PARTY_NOTICES.md) for attribution.
