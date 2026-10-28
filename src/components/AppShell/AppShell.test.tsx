import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { AppShell } from './AppShell';

it('lets a player reveal and hide the current build limitations', async () => {
  const user = userEvent.setup();
  render(<AppShell />);

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Interstellar route planning.',
  );

  const toggle = screen.getByRole('button', { name: 'About this build' });
  const details = screen.getByText(/This is the application foundation/);

  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(details).not.toBeVisible();

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await waitFor(() => expect(details).toBeVisible());
  expect(details).toHaveTextContent(/route calculation/);

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(details).not.toBeVisible();
});
