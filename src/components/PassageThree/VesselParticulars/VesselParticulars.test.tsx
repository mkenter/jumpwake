import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VesselParticulars } from './VesselParticulars';
import { DEFAULT_VESSEL } from '../vessel';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function setup() {
  const onApply = vi.fn();
  const user = userEvent.setup();
  render(
    <VesselParticulars
      vessel={DEFAULT_VESSEL}
      onApply={onApply}
      saveUnavailable={false}
    />,
  );
  return {
    user,
    onApply,
    edit: screen.getByRole('button', { name: 'Edit particulars' }),
  };
}

describe('VesselParticulars', () => {
  it('shows the active ship and opens a keyboard-accessible draft', async () => {
    const { user, edit, onApply } = setup();
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent(
      '200 tons · Jump-3',
    );
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent(
      '60/60 tons jump fuel',
    );
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    edit.focus();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('spinbutton', { name: 'Displacement' }),
    ).toHaveFocus();
    expect(edit).toHaveAttribute('aria-expanded', 'true');
    await user.clear(screen.getByRole('spinbutton', { name: 'Displacement' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(edit).toHaveFocus());
    expect(onApply).not.toHaveBeenCalled();
    await user.click(edit);
    expect(
      screen.getByRole('spinbutton', { name: 'Displacement' }),
    ).toHaveValue(200);
    await user.click(screen.getByRole('button', { name: 'Close particulars' }));
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('applies valid inputs only on submit and restores focus', async () => {
    const { user, edit, onApply } = setup();
    await user.click(edit);
    const displacement = screen.getByRole('spinbutton', {
      name: 'Displacement',
    });
    await user.clear(displacement);
    await user.type(displacement, '100');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Jump rating' }),
      '2',
    );
    const capacity = screen.getByRole('spinbutton', {
      name: 'Jump-fuel capacity',
    });
    await user.clear(capacity);
    await user.type(capacity, '27');
    const fuel = screen.getByRole('spinbutton', { name: 'Jump fuel aboard' });
    await user.clear(fuel);
    await user.type(fuel, '13');
    await user.click(
      screen.getByRole('checkbox', { name: 'Fuel scoops fitted' }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Streamlined hull' }),
    );
    expect(onApply).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Apply particulars' }));
    expect(onApply).toHaveBeenCalledWith({
      ship: {
        displacementTons: 100,
        jumpRating: 2,
        jumpFuelCapacityTons: 27,
        hasFuelScoops: false,
        streamlined: false,
      },
      state: { initialFuelTons: 13 },
    });
    await waitFor(() => expect(edit).toHaveFocus());
  });

  it('preserves blanks and invalid quantities, associates errors, and focuses the first error', async () => {
    const { user, edit, onApply } = setup();
    await user.click(edit);
    const displacement = screen.getByRole('spinbutton', {
      name: 'Displacement',
    });
    const capacity = screen.getByRole('spinbutton', {
      name: 'Jump-fuel capacity',
    });
    const fuel = screen.getByRole('spinbutton', { name: 'Jump fuel aboard' });
    await user.clear(displacement);
    await user.clear(capacity);
    await user.type(capacity, '40');
    await user.click(screen.getByRole('button', { name: 'Apply particulars' }));
    expect(displacement).toHaveValue(null);
    expect(displacement).toHaveAccessibleDescription(
      expect.stringContaining('100–5000 tons'),
    );
    await waitFor(() => expect(displacement).toHaveFocus());
    expect(fuel).toHaveValue(60);
    expect(fuel).toHaveAccessibleDescription(
      expect.stringContaining('Fuel aboard cannot exceed capacity'),
    );
    await user.type(displacement, '105');
    expect(displacement).toHaveAttribute('aria-invalid', 'true');
    await user.clear(displacement);
    await user.type(displacement, '200');
    await user.clear(capacity);
    await user.type(capacity, '200.5');
    expect(capacity).toHaveAttribute('aria-invalid', 'true');
    expect(capacity).toHaveValue(200.5);
    await user.clear(fuel);
    await user.type(fuel, '-1');
    expect(fuel).toHaveAttribute('aria-invalid', 'true');
    expect(onApply).not.toHaveBeenCalled();
  });

  it('cancels edits and restores demonstration particulars to the draft', async () => {
    const { user, edit, onApply } = setup();
    await user.click(edit);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Jump rating' }),
      '1',
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onApply).not.toHaveBeenCalled();
    await waitFor(() => expect(edit).toHaveFocus());
    await user.click(edit);
    expect(screen.getByRole('combobox', { name: 'Jump rating' })).toHaveValue(
      '3',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Jump rating' }),
      '6',
    );
    await user.click(
      screen.getByRole('button', { name: 'Restore demonstration ship' }),
    );
    expect(
      screen.getByText('Defaults restored to draft. Apply to use them.'),
    ).toBeVisible();
    expect(onApply).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Apply particulars' }));
    expect(onApply).toHaveBeenCalledWith(DEFAULT_VESSEL);
  });
});
