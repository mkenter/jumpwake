// Product scope, not a verified ship design or rules-derived fuel model.
export const INITIAL_SCENARIO = {
  subsector: { columns: 8, rows: 10 },
  ship: { displacementTons: 200, jumpRating: 3, hasFuelScoops: true },
} as const;
