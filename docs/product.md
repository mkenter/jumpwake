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

## Open functional decisions

- Decide required final reserves and how to present unreachable destinations and
  stops with no usable fuel.
- Define a stable result order when cost, jump count, and total distance all tie.

These are agreed prototype requirements. Mechanics and deliberate simplifications
are tracked separately in [rules.md](rules.md).

## Explicitly deferred

Procedural world generation, ship builders, alternate rulesets, multi-subsector
travel, trading and cargo simulation, campaign management, accounts, cloud saves,
collaboration, backend APIs, deployment, offline installation, and data import/export.
