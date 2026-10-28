import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AppShell } from './AppShell';

it('renders the navigation shell and initial scenario', () => {
  render(<AppShell />);

  const main = screen.getByRole('main');
  expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent(
    'Interstellar route planning.',
  );

  const scenario = within(main).getByRole('region', {
    name: 'The initial flight plan',
  });
  expect(within(scenario).getByText('8 × 10 hexes')).toBeVisible();
  expect(within(scenario).getByText('200-ton / Jump-3')).toBeVisible();
  expect(within(scenario).getByText('Fuel scoops')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    `#${main.id}`,
  );
});
