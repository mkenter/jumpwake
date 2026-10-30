import clsx from 'clsx';
import type { RouteResult, RoutingPreference } from '../../../engine';
import { credits, preferenceNames } from '../presentation';
import styles from './PassageComparison.module.css';

type Passage = Extract<RouteResult, { status: 'reachable' }>;
type Props = {
  economical: Passage;
  fewerJumps: Passage;
  preference: RoutingPreference;
  onSelect: (preference: RoutingPreference) => void;
};

export function PassageComparison({
  economical,
  fewerJumps,
  preference,
  onSelect,
}: Props) {
  // Compare the complete ledger, not just totals or the worlds visited: fuel
  // quantities and transactions are part of the itinerary the player follows.
  const shared =
    economical.fuelRemainingTons === fewerJumps.fuelRemainingTons &&
    JSON.stringify(economical.events) === JSON.stringify(fewerJumps.events);

  if (shared)
    return (
      <p className={styles.shared}>
        Lowest fuel cost &amp; fewest jumps share this itinerary.
      </p>
    );

  return (
    <fieldset className={styles.comparison}>
      <legend className={styles.sr}>Passage preference</legend>
      {(
        [
          ['lowest-fuel-cost', economical],
          ['fewest-jumps', fewerJumps],
        ] as const
      ).map(([choice, passage]) => (
        <label
          key={choice}
          className={clsx(
            styles.quotation,
            choice === preference && styles.selected,
          )}
        >
          <input
            type="radio"
            aria-label={`${preferenceNames[choice]}, ${passage.jumpCount} ${passage.jumpCount === 1 ? 'jump' : 'jumps'}, ${credits(passage.totalCostCredits)} purchased fuel`}
            name="passage-preference"
            value={choice}
            checked={choice === preference}
            onChange={() => onSelect(choice)}
          />
          <span className={styles.name}>{preferenceNames[choice]}</span>
          <span className={styles.figures}>
            {passage.jumpCount} {passage.jumpCount === 1 ? 'jump' : 'jumps'}
            <span aria-hidden="true"> · </span>
            {credits(passage.totalCostCredits)} fuel
          </span>
          <span className={styles.selection} aria-hidden="true">
            {choice === preference ? 'Selected' : 'Select'}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
