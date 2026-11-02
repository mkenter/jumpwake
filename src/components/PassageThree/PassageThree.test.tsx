import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PassageThree } from './PassageThree';
import { DEFAULT_VESSEL, VESSEL_STORAGE_KEY } from './vessel';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.clear();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function passage() {
  const user = userEvent.setup();
  render(<PassageThree />);
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Origin' }),
    'aster',
  );
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Destination' }),
    'cinder',
  );
  const manifest = screen.getByRole('region', { name: 'Passage manifest' });
  const edit = () =>
    user.click(screen.getByRole('button', { name: 'Edit particulars' }));
  const apply = () =>
    user.click(screen.getByRole('button', { name: 'Apply particulars' }));
  return { user, manifest, edit, apply };
}

describe('applied vessel and passage integration', () => {
  it('retains the demonstration route, then replaces obsolete events and inspection for Jump-1', async () => {
    const { user, manifest, edit, apply } = await passage();
    expect(screen.getByRole('status')).toHaveTextContent('3 jumps · 7 pc');
    expect(screen.getByRole('status')).toHaveTextContent('Cr0');
    expect(within(manifest).getAllByRole('listitem')).toHaveLength(6);
    await user.click(
      screen.getByRole('button', { name: 'Inspect event 3, Drift Lantern' }),
    );
    expect(
      screen.getByRole('complementary', { name: 'World inspection' }),
    ).toBeVisible();
    await edit();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Jump rating' }),
      '1',
    );
    expect(screen.getByRole('status')).toHaveTextContent('3 jumps');
    expect(localStorage.getItem(VESSEL_STORAGE_KEY)).toBeNull();
    await apply();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Destination unreachable',
    );
    expect(within(manifest).queryAllByRole('listitem')).toHaveLength(0);
    expect(document.querySelectorAll('[data-route-leg]')).toHaveLength(0);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(manifest).toHaveTextContent(
      'Review jump range, fuel aboard and scooping equipment',
    );
    expect(screen.getByRole('combobox', { name: 'Origin' })).toHaveValue(
      'aster',
    );
    expect(screen.getByRole('combobox', { name: 'Destination' })).toHaveValue(
      'cinder',
    );
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent('Jump-1');
    await edit();
    await user.click(
      screen.getByRole('button', { name: 'Restore demonstration ship' }),
    );
    await apply();
    expect(screen.getByRole('status')).toHaveTextContent('3 jumps · 7 pc');
    expect(within(manifest).getAllByRole('listitem')).toHaveLength(6);
  });

  it('uses partial starting fuel in costs, departure events, notes and persistence', async () => {
    const { user, manifest, edit, apply } = await passage();
    await edit();
    const fuel = screen.getByRole('spinbutton', { name: 'Jump fuel aboard' });
    await user.clear(fuel);
    await user.type(fuel, '13');
    await apply();
    expect(screen.getByRole('status')).toHaveTextContent('Cr2,700');
    expect(manifest).toHaveTextContent('13 t aboard');
    expect(manifest).toHaveTextContent('Depart with available jump fuel');
    expect(manifest).toHaveTextContent('Buy 27 t unrefined fuel');
    expect(manifest).toHaveTextContent('Initial 13 t is a sunk cost');
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent(
      '13/60 tons jump fuel',
    );
    expect(
      JSON.parse(localStorage.getItem(VESSEL_STORAGE_KEY)!).state
        .initialFuelTons,
    ).toBe(13);
    await edit();
    await user.clear(
      screen.getByRole('spinbutton', { name: 'Jump fuel aboard' }),
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      JSON.parse(localStorage.getItem(VESSEL_STORAGE_KEY)!).state
        .initialFuelTons,
    ).toBe(13);
  });

  it('handles zero fuel at a dry origin and same-world passages accurately', async () => {
    const { user, manifest, edit, apply } = await passage();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origin' }),
      'cinder',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination' }),
      'brass',
    );
    await edit();
    await user.clear(
      screen.getByRole('spinbutton', { name: 'Jump fuel aboard' }),
    );
    await user.type(
      screen.getByRole('spinbutton', { name: 'Jump fuel aboard' }),
      '0',
    );
    await apply();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Destination unreachable',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination' }),
      'cinder',
    );
    expect(screen.getByRole('status')).toHaveTextContent('0 jumps');
    expect(manifest).toHaveTextContent('0 t aboard');
    expect(manifest).toHaveTextContent('Already at your destination');
  });

  it.each(['Fuel scoops fitted', 'Streamlined hull'])(
    'updates routes and inspected fuel when %s is disabled',
    async (label) => {
      const { user, manifest, edit, apply } = await passage();
      await edit();
      await user.click(screen.getByRole('checkbox', { name: label }));
      await apply();
      expect(screen.getByRole('status')).toHaveTextContent('2 jumps · 6 pc');
      expect(screen.getByRole('status')).toHaveTextContent('Cr6,000');
      expect(manifest).not.toHaveTextContent('Scoop');
      await user.click(
        screen.getByRole('button', { name: 'Inspect Drift Lantern, 0202' }),
      );
      expect(
        screen.getByRole('complementary', { name: 'World inspection' }),
      ).toHaveTextContent('No local fuel');
    },
  );

  it('restores applied particulars on mount and remains usable if saving fails', async () => {
    localStorage.setItem(
      VESSEL_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        ship: {
          ...DEFAULT_VESSEL.ship,
          displacementTons: 100,
          jumpRating: 2,
          jumpFuelCapacityTons: 27,
        },
        state: { initialFuelTons: 13 },
      }),
    );
    const user = userEvent.setup();
    render(<PassageThree />);
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent(
      '100 tons · Jump-2',
    );
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent(
      '13/27 tons jump fuel',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origin' }),
      'aster',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination' }),
      'drift',
    );
    expect(screen.getByRole('status')).toHaveTextContent('1 jump · 2 pc');
    expect(screen.getByRole('status')).toHaveTextContent('Cr700');
    expect(
      screen.getByRole('region', { name: 'Passage manifest' }),
    ).toHaveTextContent('Buy 7 t unrefined fuel');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    await user.click(screen.getByRole('button', { name: 'Edit particulars' }));
    await user.click(
      screen.getByRole('button', { name: 'Restore demonstration ship' }),
    );
    await user.click(screen.getByRole('button', { name: 'Apply particulars' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Edit particulars' }),
      ).toHaveFocus(),
    );
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent(
      '200 tons · Jump-3',
    );
    expect(screen.getByText(/Applied for this visit/)).toBeVisible();
  });
});

describe('passage preferences', () => {
  it('switches the whole itinerary, clears obsolete inspection and highlights, and returns to the default', async () => {
    const { user, manifest } = await passage();
    const economical = screen.getByRole('radio', { name: /^Lowest fuel cost/ });
    const fewer = screen.getByRole('radio', { name: /^Fewest jumps/ });
    expect(economical).toBeChecked();
    expect(fewer).toHaveAccessibleName(
      'Fewest jumps, 2 jumps, Cr6,000 purchased fuel',
    );
    const originalLegs = Array.from(
      document.querySelectorAll('[data-route-leg]'),
      (node) => node.getAttribute('d'),
    );
    await user.hover(
      screen.getByRole('button', { name: 'Inspect event 3, Drift Lantern' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Inspect event 3, Drift Lantern' }),
    );
    await user.click(fewer);
    expect(fewer).toBeChecked();
    expect(fewer).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('2 jumps · 6 pc');
    expect(screen.getByRole('status')).toHaveTextContent('Cr6,000');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(
      0,
    );
    expect(document.querySelectorAll('[data-route-leg]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-route-arrow]')).toHaveLength(2);
    expect(within(manifest).getAllByRole('listitem')).toHaveLength(4);
    expect(manifest).toHaveTextContent('Buy 60 t unrefined fuel at Cr100/t');
    expect(manifest).toHaveTextContent('Arrival: 0 t');
    expect(manifest).not.toHaveTextContent('Drift Lantern');
    expect(manifest).not.toHaveTextContent('Scoop');
    await user.click(
      screen.getByRole('button', { name: 'Inspect event 3, Brass Ledger' }),
    );
    expect(screen.getByRole('complementary')).toHaveTextContent(
      'Events 2, 3 on your passage',
    );
    await user.click(economical);
    expect(screen.getByRole('status')).toHaveTextContent('3 jumps · 7 pc');
    expect(screen.getByRole('status')).toHaveTextContent('Cr0');
    expect(within(manifest).getAllByRole('listitem')).toHaveLength(6);
    expect(
      Array.from(document.querySelectorAll('[data-route-leg]'), (node) =>
        node.getAttribute('d'),
      ),
    ).toEqual(originalLegs);
    expect(screen.getByRole('combobox', { name: 'Origin' })).toHaveValue(
      'aster',
    );
    expect(screen.getByRole('combobox', { name: 'Destination' })).toHaveValue(
      'cinder',
    );
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent(
      '60/60 tons jump fuel',
    );
  });

  it('recalculates both quotes for endpoints, shares identical itineraries, and retains the selected preference', async () => {
    const { user, manifest } = await passage();
    await user.click(screen.getByRole('radio', { name: /^Fewest jumps/ }));
    const destination = screen.getByRole('combobox', { name: 'Destination' });
    await user.selectOptions(destination, 'drift');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText(/share this itinerary/)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('1 jump · 2 pc');
    await user.selectOptions(destination, 'last');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Destination unreachable',
    );
    expect(
      screen.queryByRole('group', { name: 'Passage preference' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/share this itinerary/)).not.toBeInTheDocument();
    await user.selectOptions(destination, 'aster');
    expect(screen.getByRole('status')).toHaveTextContent('0 jumps');
    expect(manifest).toHaveTextContent('Already at your destination');
    await user.selectOptions(destination, 'cinder');
    expect(screen.getByRole('radio', { name: /^Fewest jumps/ })).toBeChecked();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origin' }),
      'brass',
    );
    expect(screen.getByRole('status')).toHaveTextContent('1 jump · 3 pc');
    expect(screen.getByText(/share this itinerary/)).toBeVisible();
  });

  it('uses the same applied particulars and partial fuel for both quotes', async () => {
    const { user, manifest, edit, apply } = await passage();
    await user.click(screen.getByRole('radio', { name: /^Fewest jumps/ }));
    await edit();
    const fuel = screen.getByRole('spinbutton', { name: 'Jump fuel aboard' });
    await user.clear(fuel);
    await user.type(fuel, '13');
    await apply();
    expect(
      screen.getByRole('radio', { name: /^Lowest fuel cost/ }),
    ).toHaveAccessibleName('Lowest fuel cost, 3 jumps, Cr2,700 purchased fuel');
    expect(screen.getByRole('radio', { name: /^Fewest jumps/ })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('Cr10,700');
    expect(manifest).toHaveTextContent('13 t aboard');
    await user.click(screen.getByRole('radio', { name: /^Lowest fuel cost/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Cr2,700');
    await edit();
    await user.click(
      screen.getByRole('checkbox', { name: 'Fuel scoops fitted' }),
    );
    await apply();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText(/share this itinerary/)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('2 jumps');
    expect(manifest).not.toHaveTextContent('Scoop');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origin' }),
      'cinder',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination' }),
      'brass',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Destination unreachable',
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

describe('deferred chart navigation focus', () => {
  it.each(['{Enter}', ' '])(
    'preserves newer world focus and opens inspection with %s',
    async (key) => {
      const user = userEvent.setup();
      render(<PassageThree />);
      const frames: FrameRequestCallback[] = [];
      vi.stubGlobal(
        'requestAnimationFrame',
        (callback: FrameRequestCallback) => {
          frames.push(callback);
          return frames.length;
        },
      );
      const chart = screen.getByRole('button', { name: 'Chart' });
      chart.focus();
      fireEvent.click(chart);
      const world = screen.getByRole('button', {
        name: 'Inspect Echo Basin, 0205',
      });
      act(() => world.focus());
      // Force navigation's deferred callback to run after the user has moved on.
      act(() => frames.splice(0).forEach((callback) => callback(0)));
      expect(world).toHaveFocus();
      await user.keyboard(key);
      expect(
        screen.getByRole('complementary', { name: 'World inspection' }),
      ).toBeVisible();
      expect(screen.getByRole('heading', { name: /Echo Basin/ })).toHaveFocus();
    },
  );
});
