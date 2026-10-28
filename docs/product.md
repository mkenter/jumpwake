# Product

Jumpwake helps a referee or player choose and follow an interstellar route during
tabletop play. The map and itinerary should make travel decisions easy to explain
at the table.

## v0.1 target

- Classic Traveller-compatible conventions using the original Cepheus Engine SRD
  as the intended rules reference; see [rules.md](rules.md) for verification status.
- One 8 × 10 subsector containing authored, fictional star systems.
- One fixed 200-ton Jump-3 ship with fuel scoops.
- Routes minimizing total **purchased fuel cost**, with deterministic tie-breaking.
- A visual route and readable per-stop itinerary showing fuel decisions and costs.
- A static client-side application, with no accounts or backend services.

Current capabilities are documented in the [README](../README.md).

## Open functional decisions

- Define starting fuel, required final reserves, and how to present unreachable
  destinations and stops with no usable fuel.
- Decide how time and risk affect route eligibility and the itinerary.
- Define the complete tie-breaking order after purchased cost, and test it explicitly.
  Do not silently substitute shortest distance or fewest jumps as the objective.

## Explicitly deferred

Procedural world generation, ship builders, alternate rulesets, multi-subsector
travel, trading and cargo simulation, campaign management, accounts, cloud saves,
collaboration, backend APIs, deployment, offline installation, and data import/export.
