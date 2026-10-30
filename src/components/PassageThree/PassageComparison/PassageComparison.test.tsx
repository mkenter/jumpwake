import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { createRouter } from '../../../engine';
import { classicTraveller1981 } from '../../../rules/classicTraveller1981';
import { EMBER_REACH } from '../../../data/emberReach';
import { PassageComparison } from './PassageComparison';

const router = createRouter(EMBER_REACH, classicTraveller1981);
const economical = router.findRoute('aster', 'cinder');
const fewerJumps = router.findRoute('aster', 'cinder', 'fewest-jumps');
if (economical.status !== 'reachable' || fewerJumps.status !== 'reachable')
  throw new Error('Expected contrasting passages');

it('quotes the actual cost and jumps with a checked native radio and keyboard selection', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(
    <PassageComparison
      economical={economical}
      fewerJumps={fewerJumps}
      preference="lowest-fuel-cost"
      onSelect={onSelect}
    />,
  );
  expect(
    screen.getByRole('group', { name: 'Passage preference' }),
  ).toBeVisible();
  const low = screen.getByRole('radio', {
    name: /Lowest fuel cost.*3 jumps.*Cr0 purchased fuel/,
  });
  expect(low).toBeChecked();
  await user.tab();
  expect(low).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(onSelect).toHaveBeenCalledWith('fewest-jumps');
  expect(
    screen.getByRole('radio', {
      name: /Fewest jumps.*2 jumps.*Cr6,000 purchased fuel/,
    }),
  ).toHaveFocus();
});

it('collapses a shared complete ledger, but preserves choices for differing fuel transactions', () => {
  const { rerender } = render(
    <PassageComparison
      economical={economical}
      fewerJumps={economical}
      preference="fewest-jumps"
      onSelect={vi.fn()}
    />,
  );
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.getByText(/share this itinerary/)).toBeVisible();
  rerender(
    <PassageComparison
      economical={economical}
      fewerJumps={{
        ...economical,
        // A valid free-fuel allocation with the same totals and path but
        // 20 extra tons scooped at Echo and carried to arrival.
        fuelRemainingTons: 20,
        events: economical.events.map((event, i) =>
          i === 3 && event.kind === 'refuel'
            ? {
                ...event,
                tons: event.tons + 20,
                fuelAfterTons: event.fuelAfterTons + 20,
              }
            : i === 4 && event.kind === 'jump'
              ? {
                  ...event,
                  fuelBeforeTons: event.fuelBeforeTons + 20,
                  fuelAfterTons: event.fuelAfterTons + 20,
                }
              : event,
        ),
      }}
      preference="fewest-jumps"
      onSelect={vi.fn()}
    />,
  );
  expect(screen.getAllByRole('radio')).toHaveLength(2);
});
