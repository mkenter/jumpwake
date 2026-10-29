# Rules reference

Use **Cepheus Engine System Reference Document**, Jason “Flynn” Kemp, Samardan
Press, 2016: [publisher listing](https://www.drivethrurpg.com/en/product/186894/cepheus-engine-system-reference-document)
and [publisher preview](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/186894-sample.pdf).
The rules below were checked against an [original SRD PDF copy](https://drduick.com/D%26D/books/Cepheus_Engine_System_Reference_Document.pdf),
hosted by a third party, not the publisher. Page references use printed SRD numbers.

## Verified SRD mechanics

| Topic              | Mechanic and source section                                                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Range and distance | Jump number is range in parsecs: **Ship Drives**, p. 123. Each map hex represents one parsec: **Star Mapping**, p. 167.                                                                                                                         |
| Jump fuel          | `0.1 × hull tonnage × actual jump distance`, consumed per jump: **Fuel**, p. 124. For 200 tons, this gives 20/40/60 tons for Jump-1/2/3.                                                                                                        |
| Capacity           | Power-plant fuel is additional: one-third of plant tonnage per week, rounded down; at least two weeks carried: **Fuel**, p. 124.                                                                                                                |
| Purchasing         | Refined fuel: Cr500/ton at A/B starports. Unrefined: Cr100/ton at A/B/C. Delivery away from port adds Cr100/ton: **Fuel**, p. 109.                                                                                                              |
| Scooping           | Gas giants provide free unrefined fuel; collection takes 1D6 hours per 40 tons: **Fuel**, p. 109. Hull configuration affects suitability (pp. 120–121); scoops and processors are distinct equipment (**Fuel Scoops/Fuel Processors**, p. 128). |

## Jumpwake prototype simplifications

- The fixed ship and initial jump-fuel allocation are specified in
  [product.md](product.md). The 60 tons are a jump-fuel budget, not total ship
  tankage or a validated ship design; power-plant consumption is outside this model.
- v0.1 compares purchased fuel cost, jump count, and distance. It does not simulate
  jump-entry geometry, navigation checks, misjumps, equipment damage, piracy,
  travel/refueling duration, or fuel-delivery logistics. These exclusions are
  prototype scope choices, not claims that the SRD omits them.

## v0.1 policy decisions

- **Class D:** the services table (p. 172) explicitly offers unrefined fuel,
  whereas the purchasing paragraph (p. 109) only names A/B/C. We follow the
  services table for availability and apply the p. 109 unrefined price of
  Cr100/ton to D as an explicit prototype interpretation, not an unambiguous
  quoted rule. A/B offer both grades, C/D unrefined, E/X no port fuel.
- **Grades:** transactions retain the source and grade. Both grades are usable;
  purity, mixing, processing and fuel-related risk are not simulated. Consequently
  refined fuel (Cr500/ton) is available but dominated by unrefined fuel in this
  cost-only model. Scooped fuel is always labeled unrefined.
- **Hull:** assume the fixed ship is streamlined and equipped with scoops,
  satisfying the gas-giant case on p. 109. This is a scope assumption, not a
  complete validated ship design; no processor is assumed.
- **Facilities:** every authored system explicitly declares its starport class
  and gas-giant presence. Port supplies and accessible giants are unlimited;
  no local restrictions or water collection are modeled. Gas giants provide free
  fuel even at E/X systems. Initial fuel is a sunk cost.
- **Arrival:** no minimum reserve; reaching the destination ends the journey
  without refueling there. Departure from and arrival at the same system needs
  no actions. Unknown IDs and malformed maps are input errors, distinct from a
  valid destination that cannot be reached.
- **Geometry:** one-based columns 1–8 and rows 1–10; even display columns sit
  half a row below odd columns. Convert with `q = column - 1` and
  `r = row - 1 - floor(q / 2)`. Axial coordinates are never display addresses.
  Jumps connect only authored systems; empty-hex stops are excluded.

## Routing implementation

`createRouter` in `src/engine/routing.ts` snapshots and validates the map, sorts
systems by ID using JavaScript code-unit order, and precomputes Jump-1/2/3
neighbors. `findRoute(originId, destinationId)` runs lexicographic Dijkstra over
(system, remaining fuel). Its four fuel levels are 0/20/40/60 tons. This is exact
for a full initial tank, integer parsec distances, linear unlimited fuel prices,
and no arrival reserve: fractional purchases cannot improve an optimal journey.

Each edge optionally adds fuel and then makes one jump. All feasible departure
fuel levels are considered, including carrying fuel through dry stops. Only the
cheapest available source is needed under the grade policy above. Pairing fuel
with jumps removes zero-cost refueling cycles; every edge increases jump count.
A physical system may still be revisited with more fuel when a useful scooping
detour requires it; a settled fuel state is never revisited.

Labels minimize purchased credits, then jumps, then total parsecs. Final ties
compare the sequence of `(next system ID, departure fuel)` pairs lexicographically,
using ascending ID and then ascending fuel. This also deterministically selects
fuel transactions without adding an arrival-reserve objective. Equal-state
labels have identical future options. The earliest settled destination state is
optimal; exhausting the search returns `status: 'unreachable'`.

For N systems, there are V = 4N states and at most E = O(N²) combined edges.
Precomputation takes O(N²) time and space. A simple linear scan selects each next
label; primary-score work is O(V² + E). Stored path keys and itineraries have
length L ≤ V: including their comparisons/copies, the conservative query bound is
O((V² + E)L) time and O(VL + N²) space, hence O(N³) time and O(N²) space.
At most 80 systems fit this map. No heap, global cache, or rules framework is
needed. Repeated queries reuse geometry but own fresh labels and result objects.

Results contain chronologically ordered refueling and jump events, per-event
fuel before/after, transaction source/grade/price, total purchased cost, jumps,
distance, and final fuel. The original **Ember Reach** fixture in
`src/data/emberReach.ts` includes a free three-jump Aster–Cinder route versus a
paid two-jump corridor, dry worlds, all six port classes, and isolated Last Ember.
Tests compare tiny networks against a separate one-ton Bellman–Ford solver.

Limitations remain the fixed ship, one subsector, deterministic facilities, and
excluded time/risk/operating costs above. Fuel grades are recorded rather than
tracked as separate tank inventories. This is a routing prototype, not a ship
operations simulation.

## Content and licensing

The SRD includes Open Game Content/Product Identity designations (p. 1), a separate
compatibility-statement license (p. 205), and OGL 1.0a (pp. 206–207). Review their
application, attribution, and notices before distributing derived content or making
compatibility claims; this is not a legal determination. Summarize only needed
mechanics with citations. Do not import proprietary Traveller text or setting data.
