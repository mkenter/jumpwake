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

## Still unresolved

- Class D fuel: **Starport Class Services**, p. 172, lists unrefined fuel, while
  **Fuel**, p. 109, names only A/B/C for purchase. Resolve this discrepancy before
  deriving availability or prices for class D ports.
- Whether to track refined/unrefined fuel and purification, or explicitly collapse
  grades. Scooped fuel must not silently be treated as refined.
- How the fixed ship's hull configuration satisfies scooping requirements; the
  travel and equipment sections describe different hull cases.
- Which authored systems offer each fuel source, including any water collection
  or local restrictions; do not infer these solely from the presence of a world.

## Content and licensing

The SRD includes Open Game Content/Product Identity designations (p. 1), a separate
compatibility-statement license (p. 205), and OGL 1.0a (pp. 206–207). Review their
application, attribution, and notices before distributing derived content or making
compatibility claims; this is not a legal determination. Summarize only needed
mechanics with citations. Do not import proprietary Traveller text or setting data.
