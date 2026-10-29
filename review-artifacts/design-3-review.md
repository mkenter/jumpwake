# Design 3 interaction review

Open `/explore?design=3`. Choose Aster, then Orison; inspect Ilex from the chart
or manifest; change the destination to Vela. Meridian demonstrates a missing
fixture, and Aster–Aster demonstrates identical endpoints. “Try a sample” is a
shortcut into the authored passage.

## What improved

- Endpoint selection and inspection have separate effects. Hover/focus links a
  world to its manifest row; activation opens details. Only an endpoint control
  or an explicit “Set” action changes the passage. Escape/Close restores focus to
  the initiating world or stop, without switching views.
- The summary answers “how many jumps, how far, what purchased fuel cost?” before
  the detailed manifest. Compact rows retain each action, leg distance, fuel
  balance, and purchase cost. World details add port, local fuel, and setting
  context instead of repeating the planned refueling action.
- The smaller masthead and removal of repeated promotional text leave the map,
  manifest, and inspection actions in view at both laptop sizes. The pale palette,
  serif typography, double rules, arched chart, and paired composition remain.
- The phone layout uses Chart/Manifest views with a shared summary. A native
  modal inspection sheet preserves the underlying view and position. This was
  chosen over the earlier flow that moved users from a stop to the chart and left
  world details below it. Desktop inspection stays beside the chart.
- Blank, partial, same-world, authored, and missing-example states have distinct
  language. Missing examples do not imply that a real route is impossible.

## Evaluation and remaining questions

Playwright exercises both endpoint controls and chart-based endpoint actions,
linked hover, Enter/Space activation, Escape/Close, focus return and modal focus
cycling, actual touch taps, destination replacement, example recovery, and
responsive state retention. The checked phone world target is at least 44 × 44
CSS pixels. Screenshots use reduced motion; another interaction test uses normal
motion. No horizontal overflow occurs in the captured states.

The 1440 × 900 view fits the full workspace and footer. At 1280 × 800 the useful
workspace and inspection actions fit; the footer can require a small scroll.
At 390 × 844 the entire chart's worlds and the manifest's four stops are visible
in their respective views; chart guidance/footer continue below the fold.
This is a browser-based design evaluation, not participant usability research.

After engine integration, revisit long manifests, alternative-route comparisons,
and the distinction between calculating, unreachable, and incomplete results.
Test whether fuel opportunities or leg distances need map annotations before
adding symbols. Validate label density against real routes; the current chart
uses text halos for legibility and only twelve fixture worlds. Fuel grade,
availability, arrival reserve, and optimization explanations remain dependent on
the unresolved product/rules decisions. Small secondary chart text and phone
view-switching deserve testing with people using the planner at the table.

## Comparable captures

All images are viewport captures at the dimensions shown, at the top of the page.
“Before” is the original preselected Orison passage with Ilex inspected. “Inspect”
shows those same endpoints and world after the refinement (a sheet on mobile).

| Viewport   | Before                             | Passage                              | Inspect                                 | Manifest                               |
| ---------- | ---------------------------------- | ------------------------------------ | --------------------------------------- | -------------------------------------- |
| 1440 × 900 | [Before](design-3-before-1440.png) | [Passage](design-3-passage-1440.png) | [Inspect](design-3-inspection-1440.png) | [Manifest](design-3-manifest-1440.png) |
| 1280 × 800 | [Before](design-3-before-1280.png) | [Passage](design-3-passage-1280.png) | [Inspect](design-3-inspection-1280.png) | [Manifest](design-3-manifest-1280.png) |
| 390 × 844  | [Before](design-3-before-390.png)  | [Passage](design-3-passage-390.png)  | [Inspect](design-3-inspection-390.png)  | [Manifest](design-3-manifest-390.png)  |

The same directory also contains `start`, `alternative`, and `unavailable` captures
for each width. Recreate the current states with
`npm run test:e2e -- e2e/design-three.spec.ts`; the before images are retained
as historical references.
