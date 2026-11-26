# Local CT81 drive catalog, version 1

Import a UTF-8 JSON file through Operational vessel reference. It remains in browser local storage, separate from passage links. Replacing or removing it affects the assessment preview, not routing. Source verification remains the user's responsibility; the application does not verify provenance.

The object has exactly four properties: `version` (1), `edition` (`CT81`), `provenance` (a nonempty source description), and `rows` (an object). Row keys may be 100, 200, 400, 600, 800, 1000, 2000, 3000, 4000, or 5000. Each row is an object keyed by uppercase drive letters A–Z excluding I and O. Values are integers 1–6 for performance or `null` for an impossible combination; omitted rows and entries are unavailable. Coverage is complete only when every letter in every row is present. Duplicate keys and unsupported fields are rejected. The same entry applies to jump, maneuver and plant performance. Intermediate hulls use the next larger row; tankage uses actual displacement.

This example is synthetic and is not CT81 reference data:

```json
{
  "version": 1,
  "edition": "CT81",
  "provenance": "Synthetic example",
  "rows": { "400": { "A": 3, "B": null } }
}
```

A referee may supply a rating and source for unavailable entries in the preview. Known impossible entries cannot be overridden. Private source tables should not be committed or shared without permission.
