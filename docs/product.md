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

## Design 3 interactive study

Design 3 at `/explore?design=3` is the chosen visual foundation. Its prototype
keeps endpoint changes explicit and world inspection separate from passage
selection. The manifest holds travel decisions; world details hold local context
and fuel sources. On narrow screens, chart and manifest share endpoint state,
and inspection opens in a dismissible sheet.

The shared fixtures provide only Aster–Orison and Aster–Vela passages. Other pairs
show a missing-example state, not an engine verdict on reachability. Same-world
endpoints and incomplete selection have separate states. No navigation/fuel
symbol system or new rules requirements are established by this study.

## Routing decisions

Arrival requires no reserve. Unreachable routes have an explicit result status.
After cost, jumps, and distance, ties compare the sequence of
`(next system ID, departure fuel)` pairs lexicographically, using ascending ID
and then ascending fuel. The engine and authored Ember Reach fixture are
implemented; the engine completed its independent correctness review at
`defd9df`. It is not yet connected to the Design 3 UI, whose map and manifest
still use authored examples. Integrating engine results and presenting
unreachable routes and stops with no usable fuel remain UI work. Mechanics,
algorithm details, and deliberate simplifications are tracked in
[rules.md](rules.md).

## Explicitly deferred

Procedural world generation, ship builders, alternate rulesets, multi-subsector
travel, trading and cargo simulation, campaign management, accounts, cloud saves,
collaboration, backend APIs, deployment, offline installation, and data import/export.
