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
| Jump range                  | Book 2, Interstellar Travel, p. 4; Required Starship Components, pp. 13–14: jump rating limits parsecs, with hull/drive potential, sufficient power plant and computer support.                              | Uses the configured effective jump rating (supported range 1–6). Assumes a working, adequately powered drive and supporting computer/software. Does not validate a complete ship design; defer those checks.                                                                                                                                        |
| Jump fuel and shorter jumps | Book 2, Required Starship Components / D. Fuel, pp. 14–15: jump allocation is 0.1 × displacement × jump number; shorter jumps consume the lower amount for the jump used.                                    | Uses displacement ÷ 10 × actual parsecs. Whole-ton inputs retain exact partial fuel and capacity; the default still consumes 20/40/60 tons.                                                                                                                                                                                                         |
| Port availability           | Book 3, Starport Types, p. 10: A/B supply refined fuel; C/D supply only unrefined fuel; E has none; X has no port.                                                                                           | C/D and E/X match. A/B offer both grades in the existing demo: **provisional**, because the table does not explicitly establish unrefined sales at A/B. Retained to preserve routes; later review must settle that policy before claiming full fidelity.                                                                                            |
| Prices                      | Book 2, Starship Malfunctions, p. 6; Starship Economics / Fuel, p. 9: refined Cr500/ton, unrefined Cr100/ton at most ports.                                                                                  | Matches baseline prices, including D. Unlimited supply and uniform prices are demo assumptions; local shortages, exceptions and delivery costs are excluded.                                                                                                                                                                                        |
| Gas giants                  | Book 2, Starship Malfunctions, p. 6; Book 3, Star Mapping / Gas Giants, p. 5: skimming provides free unrefined fuel, including without a port; streamlined vessels can skim. Book 3 generally allows a week. | Offers free unrefined supply only when both streamlining and fuel scoops are enabled. Unlimited access assumed; transit and collection time omitted. Book 2 p. 4 describes immediate refueling and re-jumping when hurried; timing reconciliation remains unresolved and does not affect this cost model.                                           |
| Wilderness water            | Book 2, Starship Malfunctions, p. 6; Optional Components / Atmospheric Streamlining, p. 15: lake/ocean water can provide unrefined fuel.                                                                     | Unimplemented: data has no water-access field. Do not infer water from fictional descriptions. Add explicit facilities and access constraints later.                                                                                                                                                                                                |
| Equipment                   | Book 2, Atmospheric Streamlining, p. 15: streamlining includes scoops for giants and open water; must be chosen at construction.                                                                             | Configurable scoops and streamlining gate giant access; neither implies unrefined-fuel risk protection. Processing is not assumed. These sections do not establish a processor model for this implementation; any future processing mechanics need a source review.                                                                                 |
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

`createClassicTraveller1981Rules(ship, state)` powers the Vessel Particulars
form. `ShipSpecifications` contains `displacementTons`,
`jumpRating`, `jumpFuelCapacityTons`, `hasFuelScoops`, and `streamlined`;
`ShipOperatingState` contains `initialFuelTons`. `validateShip(ship, state)`
performs the same checks without constructing rules. Recreate rules and router
when particulars or starting fuel change; construction snapshots their values.
`SHIP`, `INITIAL_STATE`, and `classicTraveller1981` retain the demonstration
configuration. The UI uses these defaults until a valid vessel is applied or
restored from local storage. Apply creates memoized rules and a router for the
active vessel; draft edits do not affect route calculation.

Supported displacement is 100–5000 tons in multiples of 10; jump rating is an
integer 1–6; capacity is whole tons from 1 to displacement; starting fuel is whole
tons from zero to capacity. Equipment flags must be booleans. These are explicit
prototype support limits, not a claim that every combination is a legal ship
design. Capacity may be insufficient for the rated jump: search uses the actual
fuel available. Equipment flags are access constraints, not construction validation.
A ship can buy unrefined fuel without scoops. Streamlining alone or scoops alone
never enables giant access. No fractional values are silently dropped.

Capacity means **available jump-fuel allocation**, not total tankage; starting
fuel means the current quantity in that allocation. No plant consumption or
reserve is deducted. Adequate drive, power plant and computer support are assumed;
minimum combined tankage and component compatibility remain unvalidated.
Fuel processing, water access, risk exemption equipment, grade mixing and time
remain outside this model. The provisional A/B supply policy is unchanged.

## Routing implementation

`createRouter(map, rules)` in `src/engine/routing.ts` validates and snapshots
IDs, addresses, jump capabilities, consumption and source records, sorts systems
by code-unit ID order, and precomputes neighbors within the supplied range and
capacity. `TravelRules<S>` supplies `maxJumpDistance`, `jumpFuelCapacityTons`,
`initialFuelTons`, deterministic system validation, distance-based consumption,
and ship-eligible fuel sources. The engine has no CT implementation dependency.

### Exact fuel states

Let C be capacity, F starting fuel, and g the greatest common divisor of positive
whole-ton jump consumptions. Retain every balance in [0, C] congruent to **0, C,
or F modulo g**. For CT, g = displacement / 10. The default retains 0/20/40/60;
a 100-ton ship with C=27 and F=13 retains 0/3/7/10/13/17/20/23/27.
This includes initial fuel, empty and full tanks, and is closed under feasible
jump consumption. Purchases are differences between balances, so a 17-ton
shortfall is represented exactly even when each parsec consumes 10 tons.

Why these states preserve optimal routes: fix any finite sequence of jumps.
Its feasible departure quantities satisfy capacity bounds, sufficient fuel for
the next jump, and nonnegative purchases; dry stops require carrying the previous
arrival quantity. Cost is linear in purchases. Minimize that cost, then the
lexicographic departure quantities for this fixed walk. A minimizing vertex
exists. At a vertex, each connected block of tight carry-without-purchase
constraints must be anchored by initial fuel, a full departure tank, or an empty
arrival tank; otherwise that whole block can shift and is not a vertex. Every
other quantity in the block differs by sums of jump consumptions. Thus all vertex
balances have one of the three retained residues. Integral anchors and consumptions
also make those vertices integral: fractional purchases cannot improve either
cost or the departure-fuel tie-break. Applying this to every candidate walk
preserves the globally optimal score and deterministic itinerary, including revisits.
This reasoning requires unlimited linear-price fuel, no fuel disposal, no reserve,
and no simulated grade inventory; it does not generalize to arbitrary fuel rules.

### Search and bounds

`findRoute(originId, destinationId, preference?)` accepts the engine's
`RoutingPreference`: `'lowest-fuel-cost'` (default) or `'fewest-jumps'`. Changing
preference requires neither new rules nor a new router. Both search exactly the
same eligible routes and fuel states under the supplied rules and ship.
It uses lexicographic Dijkstra on (system, remaining fuel). Each edge optionally
refuels and makes one jump, enumerating all
feasible retained departure quantities. Only the cheapest eligible source is
needed under the grade policy. Pairing purchases with jumps removes zero-cost
refueling cycles; a physical system may still be revisited with different fuel.

Lowest-fuel-cost labels minimize purchased credits, jumps, then total parsecs;
fewest-jumps labels minimize jumps, purchased credits, then total parsecs.
Final ties compare the sequence of `(next system ID, departure fuel)` pairs,
ascending ID then fuel.
Equal-state labels have identical future options; primary-score ties have equally
long keys, so appending the same continuation preserves their order. Each edge
adds nonnegative credits and distance plus exactly one jump. Therefore the
objective tuple strictly increases under either ordering, even with free fuel,
and Dijkstra's settlement rule remains valid.
The first settled destination is optimal. Exhaustion returns `unreachable`.
Initial fuel is a sunk cost and arrival requires no reserve. A same-world journey
has no events or cost and retains its starting fuel.

For N systems and K retained fuel levels, V=NK and E=O(N²K²) potential combined
edges. Geometry takes O(N²) time/space. An indexed binary heap replaces linear
label selection and holds at most V entries. Primary-score work is
O((V+E) log V); including path-key comparison/copying of length L≤V, the conservative
bound is O((V+E)L log V) time, O(VL+N²) space. Events use settled-parent links and
are reconstructed once; full event histories are not copied per relaxation.

Unique addresses bound N to 80. The CT input domain gives K≤31 (at most 2480
states), independent of absolute displacement; the default has K=4. The generic
engine rejects more than 64 critical levels before searching (at most 5120
states), capacity/consumption outside whole tons 1–1,000,000, and range outside
integers 1–16. Those are computational support limits. Prices must be nonnegative
whole credits per ton, bounded by floor(MAX_SAFE_INTEGER / (max(1,N)×K×C)); this
keeps every possible simple-state-path credit total exact. Unsupported models
throw rather than approximate. CT's 0/100/500 prices fit comfortably.

Results contain chronologically ordered refueling and jump events, per-event
fuel before/after, transaction source/grade/price, total purchased cost, jumps,
distance, and final fuel. The authoritative **Ember Reach** dataset in
`src/data/emberReach.ts` includes a free three-jump Aster–Cinder route versus a
paid two-jump corridor, dry worlds, all six port classes, and isolated Last Ember.
The integrated demo adds Orison, Serein and Ilex: Aster Quay–Orison costs Cr4,000
and revisits Serein after scooping at Ilex. The UI preserves the event order and
distinguishes repeated occurrences in the manifest.
Tests compare one-column and multidimensional networks against a separate
one-ton Bellman–Ford solver. It uses individual one-ton refueling edges, its own
CT arithmetic and eligibility, display-grid breadth-first geometry, and string
path keys; it does not call the production rules, heap or fuel-state compression.
Both independent objective orders run across the fixture matrix: 7,776
comparisons cover the original default facility/endpoint cases, and 46,656 span
nine ship/state/equipment configurations, two geometries, all 81 dry/paid/free
assignments, and all endpoint pairs. These compare cost, jumps,
distance **and full deterministic departure keys**, with independently replayed
ledgers and reversed input order. Another 450 comparisons check both orders for
all 225 Ember Reach pairs with interleaved preference queries. A frozen SHA-256
fingerprint of complete default results from `main` at `590c6c6` guards every event
and fuel balance across those 225 pairs. The Aster Quay–Cinder Rest case explicitly
checks Cr0/three jumps/seven parsecs against Cr6,000/two jumps/six parsecs via
Brass Ledger. All 6,400 address distances are cross-checked
separately. Explicit cases cover first-jump shortfalls, paid/free partial refueling,
different drives/displacements/capacities, dry carry-through, residual fuel,
scooping detours with return visits, invalid inputs, same-world and unreachable
journeys. Default presentation and browser regression tests retain the manifest.

Limitations remain one subsector, authored-system stops, deterministic facilities,
and excluded time/risk/operating costs above. Fuel grades are descriptive rather
than separate inventories. This is a routing prototype, not a ship operations
simulation. Fewest jumps does not predict total travel time: roughly one week
per CT jump excludes in-system transit, refueling, navigation preparation, delays
and maintenance. No duration or unrefined-fuel risk penalty is calculated.
No errata verification is claimed.

## Content and licensing

Original code and the fictional Ember Reach setting are separate from the
Traveller-specific module and these independently written rule summaries.
The boundary identifies removable dependencies; it grants no rights to distribute
Traveller text, names or trademarks. Review permission for derived rules content,
attribution and compatibility/trademark wording before distribution. No software
license is selected or changed, and no legal compliance claim is made. Local
rulebooks remain ignored and must not be committed or distributed.
