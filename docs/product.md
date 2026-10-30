# Product

Jumpwake helps a referee or player choose and follow an interstellar route during
tabletop play. The map and itinerary should make travel decisions easy to explain
at the table.

## v0.1 target

- Classic Traveller 1981 Books 2 and 3 as the primary rules target; see [rules.md](rules.md) for verification status.
- One 8 × 10 subsector containing authored, fictional star systems.
- A default 200-ton Jump-3 ship with scoops, streamlining, and 60 tons allocated
  to jump fuel, initially full. Vessel Particulars supports validated ship
  specifications and partial starting fuel through the same programmatic API.
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

Vessel Particulars unfolds inline below the endpoint selectors, with a compact
active-ship summary at rest. Durable specifications and fuel currently aboard have
separate ruled groups. Draft edits leave the passage unchanged until Apply passes
the CT rules validation. Cancel, Close, and Escape discard the draft and restore
focus to Edit; demonstration defaults also require Apply. Applied particulars
recreate the rules and router, preserve endpoints and the current planner view,
and clear obsolete inspection/highlighting. The manifest, chart, costs and local
fuel availability reflect the active vessel. A versioned `jumpwake.vessel` entry
in localStorage saves one applied vessel, validates restoration, and falls back
to demonstration defaults for obsolete or malformed data. If storage is unavailable,
planning still works for the visit. This is route configuration, not complete ship
construction; capacity covers jump fuel only.

The restored Design 3 composition uses an open paper chart, slate typography,
subtle plum routes and a manifest rail that reaches 340px on wider desktops. Both
section headings share a baseline. The SVG scales with the available column width up to 1040px tall;
the full chart deliberately extends below the first desktop viewport. Its 1.1
vertical projection is applied consistently to hex geometry, world positions,
route vertices and hit targets, while glyphs retain their proportions. This is
presentation spacing, not a change to engine coordinates or parsec distances.

The ceremonial masthead pairs the unchanged ornamental J/W SVG with a centered
serif Jumpwake wordmark and Navigation Service subtitle. A single navigation row
sticks at the viewport top as the letterhead scrolls away, revealing the compact
J/W badge with a short fade and slide. IntersectionObserver tracks the letterhead;
its space stays in the document, so the transition does not move planner content.
The inactive home link is inert and hidden from assistive technology, with focus
transferred to its visible counterpart when necessary. Reduced motion removes
animation and smooth scrolling.

Passage focuses the origin field; Chart and Manifest focus and scroll to their
sections, switching the mobile view below 900px. These are the existing planner
views, with one shared navigation row in both header states. Targets have an 80px
scroll margin to clear the sticky row. The initial mobile composition keeps the
full logo at a readable 272–320px width and reduces the wordmark and spacing.

Fine gold rules, frames with rounded top-left and bottom-right corners, a
chart-heading compass and numbered manifest events extend the stationery theme. The chart remains open and its
geometry, labels and hit targets retain their existing sizes. No speculative
navigation destinations, route parameters or world data are introduced.

One authoritative Ember Reach dataset supplies both the engine and chart. Its
15 authored systems include dry worlds, paid ports, gas giants and isolated Last
Ember. Orison, Serein and Ilex extend the original engine fixture to exercise
purchases and return visits. Useful descriptions from the design study are
retained as world context; fuel availability comes from engine rules.

World names and addresses use measured SVG text bounds to choose nearby positions
clear of routes, arrowheads, other labels and world markers. Placements stay
inside the chart and remain stable during hover and inspection. Measurements
refresh when the mobile chart becomes visible or its label sizes change.

The summary uses the engine's totals. The chart follows jumps in order, including
return legs. Bézier curves take their headings from neighboring jumps so the
journey flows through successive stops. Repeated world-to-world legs reuse the
same sweep in neighboring lanes. Each thin plum line terminates at an open
arrowhead on the destination marker's edge. Lane spacing is presentation-only and
does not change coordinates or distances. Each world remains one inspection
target. The manifest shows a departure entry followed by every jump and refueling
event in chronological order.
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
