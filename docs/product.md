# Product

Jumpwake helps a referee or player choose and follow an interstellar route during
tabletop play. The map and itinerary should make travel decisions easy to explain
at the table.

## v0.1 target

- Classic Traveller-compatible conventions using the original Cepheus Engine SRD
  as the intended rules reference; see [rules.md](rules.md) for verification status.
- One 8 × 10 subsector containing authored, fictional star systems.
- One fixed 200-ton Jump-3 ship with fuel scoops and 60 tons allocated to jump
  fuel, initially full.
- Routes minimizing total **purchased fuel cost**, breaking ties by fewest jumps,
  then shortest total distance, with deterministic results.
- Routes account for available fuel, refueling opportunities, and jump constraints.
- A visual route and readable per-stop itinerary showing fuel decisions and costs.
- A static client-side application, with no accounts or backend services.

Current capabilities are documented in the [README](../README.md).

## Application interactions

Design 3 is the visual foundation of the production application at `/`. Endpoint
changes are explicit and world inspection is independent of passage selection.
The manifest holds travel decisions; world details hold local context and fuel
sources. On narrow screens, chart and manifest share endpoint state, and
inspection opens in a dismissible sheet. Chart/manifest switching applies below
900px; wider windows show both panels with a 280–340px manifest rail. Keyboard
activation, Escape/Close, focus restoration and linked world/event highlighting are supported.

The restored Design 3 composition uses an open paper chart, slate typography,
subtle plum routes and a manifest rail that reaches 340px on wider desktops. Both
section headings share a baseline. The SVG scales with the available column width up to 1040px tall;
the full chart deliberately extends below the first desktop viewport. Its 1.1
vertical projection is applied consistently to hex geometry, world positions,
route vertices and hit targets, while glyphs retain their proportions. This is
presentation spacing, not a change to engine coordinates or parsec distances.

The 72px navigation header pairs the full Art Deco J/W identity with the existing
Jumpwake wordmark at widths of 960px and above. The mark is 256px wide on desktop
and 216px on laptop, with mirrored plum-and-gold corner curves, horizontal gold
stars, and tapered rays. Below 960px, the header uses the compact framed monogram.
Both variants share the same outlined serif lettering and frame and are also
available as standalone SVGs. The planner and navigation retain their existing behavior.

One authoritative Ember Reach dataset supplies both the engine and chart. Its
15 authored systems include dry worlds, paid ports, gas giants and isolated Last
Ember. Orison, Serein and Ilex extend the original engine fixture to exercise
purchases and return visits. Useful descriptions from the design study are
retained as world context; fuel availability comes from engine rules.

The summary uses the engine's totals. The chart follows jumps in order, including
return legs; each world remains one inspection target. The manifest shows a
departure entry followed by every jump and refueling event in chronological order.
Each entry has a unique occurrence ID, including repeated visits to the same
world. World highlighting links all its events, and inspection lists those event
numbers. Desktop world inspection sits below the manifest heading, ahead of its events,
so long passages do not bury contextual details. Long manifests scroll with the
page. Incomplete selection, unreachable
routes and successful zero-jump same-world journeys have distinct states.

## Routing decisions

Arrival requires no reserve. Unreachable routes have an explicit result status.
After cost, jumps, and distance, ties compare the sequence of
`(next system ID, departure fuel)` pairs lexicographically, using ascending ID
and then ascending fuel. The engine is implemented and connected to the UI,
following its independent correctness review at `defd9df`. Initial fuel is a sunk
cost. Fuel balances show the quantity before and after each event, and the
manifest reports fuel remaining on arrival. Mechanics, algorithm details, and
deliberate simplifications are tracked in [rules.md](rules.md).

Browser tests cover calculated free and paid routes, repeated visits, unreachable
and same-world destinations, keyboard and touch inspection, focus restoration,
and desktop/mobile state retention. Captures are generated in ignored test
results, rather than committed as historical screenshots. The original visual
explorations remain on their branches.

## Explicitly deferred

Procedural world generation, ship builders, alternate rulesets, multi-subsector
travel, trading and cargo simulation, campaign management, accounts, cloud saves,
collaboration, backend APIs, deployment, offline installation, and data import/export.
