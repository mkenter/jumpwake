# Classic Traveller 1981 rules audit

Primary target: **Classic Traveller (1981), Book 2: Starships** and
**Book 3: Worlds and Adventures**, read from the owner's local PDFs in
`.references/ct81/`. No errata or later supplements were consulted. No rule is
claimed to have been checked against official errata. Suspected corrections and
ambiguities remain unresolved pending an errata review.

Citations below use **printed pages**. In both supplied scans, printed page 4
is PDF viewer page 6 (zero-based index 5); printed page 15 is viewer page 17.
The printed subsector grid is Book 3 p. 13 (viewer page 15), and the starport
table is printed p. 10 (viewer page 12). PDFs and extracted text are not tracked.

## Verified mechanics and implementation audit

| Mechanic                    | Independently summarized 1981 rule and source                                                                                                                                                                | Jumpwake behavior, match and deferred work                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coordinates and distances   | Book 3, Worlds / Star Mapping, p. 4; Subsector Map Grid, p. 13: eight columns by ten rows, one parsec per hex; numbered columns are staggered.                                                               | Matches the one-based column/row layout and hex distance. Axial q/r are internal, not addresses. Conversion: q = column − 1; r = row − 1 − floor(q/2). Only authored-system stops are searched; empty-space jumps are outside scope. The printed form appears to include an extra bottom row; the p. 4 dimensions govern this demo, pending review. |
| Jump range                  | Book 2, Interstellar Travel, p. 4; Required Starship Components, pp. 13–14: jump rating limits parsecs, with hull/drive potential, sufficient power plant and computer support.                              | Matches the fixed effective Jump-3 range. Assumes a working, adequately powered drive and supporting computer/software. Does not validate a complete ship design; defer those checks.                                                                                                                                                               |
| Jump fuel and shorter jumps | Book 2, Required Starship Components / D. Fuel, pp. 14–15: jump allocation is 0.1 × displacement × jump number; shorter jumps consume the lower amount for the jump used.                                    | Matches 20/40/60 tons for this 200-ton ship. No route correction needed. Four states remain specific to this ship and initial full allocation.                                                                                                                                                                                                      |
| Port availability           | Book 3, Starport Types, p. 10: A/B supply refined fuel; C/D supply only unrefined fuel; E has none; X has no port.                                                                                           | C/D and E/X match. A/B offer both grades in the existing demo: **provisional**, because the table does not explicitly establish unrefined sales at A/B. Retained to preserve routes; later review must settle that policy before claiming full fidelity.                                                                                            |
| Prices                      | Book 2, Starship Malfunctions, p. 6; Starship Economics / Fuel, p. 9: refined Cr500/ton, unrefined Cr100/ton at most ports.                                                                                  | Matches baseline prices, including D. Unlimited supply and uniform prices are demo assumptions; local shortages, exceptions and delivery costs are excluded.                                                                                                                                                                                        |
| Gas giants                  | Book 2, Starship Malfunctions, p. 6; Book 3, Star Mapping / Gas Giants, p. 5: skimming provides free unrefined fuel, including without a port; streamlined vessels can skim. Book 3 generally allows a week. | Matches free unrefined supply for the streamlined, scoop-equipped demo. Unlimited access assumed; transit and collection time omitted. Book 2 p. 4 describes immediate refueling and re-jumping when hurried; timing reconciliation remains unresolved and does not affect this cost model.                                                         |
| Wilderness water            | Book 2, Starship Malfunctions, p. 6; Optional Components / Atmospheric Streamlining, p. 15: lake/ocean water can provide unrefined fuel.                                                                     | Unimplemented: data has no water-access field. Do not infer water from fictional descriptions. Add explicit facilities and access constraints later.                                                                                                                                                                                                |
| Equipment                   | Book 2, Atmospheric Streamlining, p. 15: streamlining includes scoops for giants and open water; must be chosen at construction.                                                                             | Fixed ship assumes both. No configurable equipment exposed; processing is not assumed. These sections do not establish a processor model for this implementation; any future processing mechanics need a source review.                                                                                                                             |
| Grades and risk             | Book 2, Starship Malfunctions, p. 6: unrefined fuel can increase drive-failure and misjump risk unless equipped for it; engineering staffing and maintenance affect failure.                                 | Grades recorded but not separate tank inventories. Risks excluded, so cheapest fuel dominates refined fuel. Scoops alone are not asserted to remove the unrefined-fuel penalty. Equipment needed to qualify for that exemption remains unspecified here. Defer risk, mixing and malfunction simulation.                                             |
| Tankage and power plant     | Book 2, D. Fuel, pp. 14–15: minimum tankage is 0.1 × M × Jn + 10 × Pn; plant allocation supports four weeks of routine operations and maneuver.                                                              | Partial model: 60 tons is jump allocation only, not total tankage. A rating-3 plant would require another 30 tons under that formula. Plant rating and consumption are not modeled; do not present this as a validated ship design.                                                                                                                 |
| Operations                  | Book 2, Interstellar Travel, p. 4; Starship Malfunctions, p. 6: roughly a week per jump regardless of length; proximity to worlds affects misjump risk, notably within 100 and 10 diameters.                 | No duration, jump-entry geometry, maintenance, crew, access restrictions or operational costs. Arrival has no modeled reserve; initial fuel is a sunk cost. These are routing policies, not universal CT rules.                                                                                                                                     |

## Rules boundary and remaining constraints

`src/rules/types.ts` defines the injected `TravelRules<S>` contract over a minimal
ID/hex system. The router owns geometry, validation of IDs/addresses, graph search,
objectives, events and results. Rules validate edition-specific facilities and supply
jump consumption and priced sources. The engine imports no CT implementation.
`src/rules/classicTraveller1981/` owns ship specifications, a separate initial
fuel state, fuel rules and starport data types. Application composition supplies
that implementation explicitly; Ember Reach remains independently authored data.

The search deliberately retains four 20-ton states, 60 tons initially aboard and
a maximum three-parsec edge. It rejects incompatible jump-consumption functions.
This is a replaceable rules boundary within a constrained router, not general ship
support. Rules callbacks must be deterministic and return finite nonnegative prices.
No existing route behavior changes in this milestone; provisional A/B supply and
excluded risk remain explicit above.

Next milestone must parameterize capacity, starting fuel, fuel granularity and
range together; establish an exact state-space model for arbitrary consumption;
validate ship specifications separately from current operational state; and extend
the independent oracle before exposing configuration. Power-plant reserves and
elapsed time need an explicit policy before calculating total operating fuel.
Grades/equipment require inventory and eligibility decisions. No vessel UI, rules
selector or new optimization objective is included here.

## Routing implementation

`createRouter(map, rules)` in `src/engine/routing.ts` snapshots and validates the map, sorts
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
labels have identical future options. On a primary-score tie, path keys have
the same length (one entry per jump), so appending the same continuation preserves
their order. Every edge strictly increases the primary score through its jump
count, even when scooping is free. The earliest settled destination state is
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
distance, and final fuel. The authoritative **Ember Reach** dataset in
`src/data/emberReach.ts` includes a free three-jump Aster–Cinder route versus a
paid two-jump corridor, dry worlds, all six port classes, and isolated Last Ember.
The integrated demo adds Orison, Serein and Ilex: Aster Quay–Orison costs Cr4,000
and revisits Serein after scooping at Ilex. The UI preserves the event order and
distinguishes repeated occurrences in the manifest.
Tests compare tiny one-column and multidimensional networks against a separate
one-ton Bellman–Ford solver across all dry/paid/free facility assignments and
endpoint pairs. Its geometry uses display-grid breadth-first walks independent
of the axial conversion and distance formula; all 6,400 subsector address pairs
are cross-checked. Itinerary checks independently replay fuel, prices, distances,
and locations, including repeated visits. Dedicated cases cover departure-fuel
and code-unit ID ties and exhaustion of free-scooping cycles.

Limitations remain the fixed ship, one subsector, deterministic facilities, and
excluded time/risk/operating costs above. Fuel grades are recorded rather than
tracked as separate tank inventories. This is a routing prototype, not a ship
operations simulation.

## Content and licensing

Original code and the fictional Ember Reach setting are separate from the
Traveller-specific module and these independently written rule summaries.
The boundary identifies removable dependencies; it grants no rights to distribute
Traveller text, names or trademarks. Review permission for derived rules content,
attribution and compatibility/trademark wording before distribution. No software
license is selected or changed, and no legal compliance claim is made. Local
rulebooks remain ignored and must not be committed or distributed.
