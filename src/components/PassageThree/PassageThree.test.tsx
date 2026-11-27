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
import * as engine from '../../engine';
import * as chartStorage from './chartStorage';
import { parseSubsectors } from '../../import/subsector';
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
  it('does not attribute a prohibited passage to fuel in either routing mode', async () => {
    const parsed = parseSubsectors(
      'Hex\tName\tUWP\tPBG\n0101\tAlpha\tA000000-0\t000\n0102\tBeta\tA000000-0\t000',
    );
    if (!parsed.ok) throw new Error(parsed.errors.join());
    const original = parsed.charts[0]!;
    const [a, b] = original.worlds;
    const chart = {
      ...original,
      worlds: [{ ...a!, facts: { ...a!.facts!, travelProhibited: true } }, b!],
    };
    vi.spyOn(chartStorage, 'restoreChart').mockReturnValue({
      text: '',
      source: 'test',
      selected: chart.position!,
      charts: [chart],
    });
    const user = userEvent.setup();
    render(<PassageThree />);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origin' }),
      a!.id,
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination' }),
      b!.id,
    );
    const manifest = screen.getByRole('region', { name: 'Passage manifest' });
    expect(manifest).toHaveTextContent(
      'fuel, refueling, or travel restrictions may prevent a passage',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Routing mode' }),
      'direct',
    );
    expect(manifest).toHaveTextContent(
      'Fuel, refueling, or travel restrictions may prevent this leg',
    );
  });
  it('does not recalculate an unreachable itinerary on unrelated renders', async () => {
    const actualCreateRouter = engine.createRouter;
    const findRoute = vi.fn();
    vi.spyOn(engine, 'createRouter').mockImplementation((systems, rules) => {
      const router = actualCreateRouter(systems, rules);
      findRoute.mockImplementation(router.findRoute);
      return { ...router, findRoute };
    });
    const user = userEvent.setup();
    render(<PassageThree />);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origin' }),
      'aster',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination' }),
      'last',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Destination unreachable',
    );
    expect(findRoute).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Edit particulars' }));
    expect(findRoute).toHaveBeenCalledTimes(2);
  });
  it('retains the demonstration route, then replaces obsolete events and inspection for Jump-1', async () => {
    const { user, manifest, edit, apply } = await passage();
    expect(screen.getByRole('status')).toHaveTextContent('3 jumps · 7 pc');
    expect(screen.getByRole('status')).toHaveTextContent('Cr0');
    expect(within(manifest).getAllByRole('listitem')).toHaveLength(4);
    await user.click(
      screen.getByRole('button', { name: 'Inspect visit 2, Drift Lantern' }),
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
      'No chain of jumps reaches the destination at Jump-1',
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
    expect(within(manifest).getAllByRole('listitem')).toHaveLength(4);
  });

  it('uses partial starting fuel in costs, departure events, notes and persistence', async () => {
    const { user, manifest, edit, apply } = await passage();
    await edit();
    const fuel = screen.getByRole('spinbutton', { name: 'Jump fuel aboard' });
    await user.clear(fuel);
    await user.type(fuel, '13');
    await apply();
    expect(screen.getByRole('status')).toHaveTextContent('Cr2,700');
    expect(manifest).toHaveTextContent('Arrival: 13 t');
    expect(manifest).toHaveTextContent('Departure: 40 t');
    expect(manifest).toHaveTextContent('Buy 27 t unrefined fuel');
    expect(manifest).toHaveTextContent('Initial fuel is a sunk cost');
    expect(screen.getByLabelText('Active vessel')).toHaveTextContent(
      '13/60 tons jump fuel',
    );
    expect(
      JSON.parse(localStorage.getItem(VESSEL_STORAGE_KEY)!).state
        .initialFuelTons,
    ).toBe(13);
    await edit();
    await user.click(
      screen.getByRole('checkbox', { name: 'Fuel scoops fitted' }),
    );
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
      'Jump range is sufficient, but fuel, refueling, or travel restrictions may prevent a passage.',
    );
    expect(within(manifest).queryAllByRole('listitem')).toHaveLength(0);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination' }),
      'cinder',
    );
    expect(screen.getByRole('status')).toHaveTextContent('0 jumps');
    expect(manifest).toHaveTextContent('Arrival: 0 t');
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
      screen.getByRole('button', { name: 'Inspect visit 2, Drift Lantern' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Inspect visit 2, Drift Lantern' }),
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
    expect(within(manifest).getAllByRole('listitem')).toHaveLength(3);
    expect(manifest).toHaveTextContent(
      'Buy 60 t unrefined fuel from starport at Cr100/t',
    );
    expect(manifest).toHaveTextContent('Arrival: 0 t');
    expect(manifest).not.toHaveTextContent('Drift Lantern');
    expect(manifest).not.toHaveTextContent('Scoop');
    await user.click(
      screen.getByRole('button', { name: 'Inspect visit 2, Brass Ledger' }),
    );
    expect(screen.getByRole('complementary')).toHaveTextContent(
      'Visits 2 on your passage',
    );
    await user.click(economical);
    expect(screen.getByRole('status')).toHaveTextContent('3 jumps · 7 pc');
    expect(screen.getByRole('status')).toHaveTextContent('Cr0');
    expect(within(manifest).getAllByRole('listitem')).toHaveLength(4);
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
    expect(manifest).toHaveTextContent('Arrival: 13 t');
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

describe('copy passage', () => {
  it('copies the selected manifest and updates it when the preference changes', async () => {
    const { user } = await passage();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Copy passage' }));
    const first = writeText.mock.calls[0]![0];
    expect(first).toContain('Source: Original fictional demonstration');
    expect(first).toContain('Routing: Lowest fuel cost');
    expect(first).toContain('Starting jump fuel:');
    expect(first).toContain('## Voyage');
    expect(first).toContain('1. **Aster Quay**');
    expect(screen.getByText('Passage copied to clipboard.')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: /^Fewest jumps/ }));
    expect(
      screen.queryByText('Passage copied to clipboard.'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy passage' }));
    expect(writeText.mock.calls[1]![0]).toContain('Routing: Fewest jumps');
    expect(writeText.mock.calls[1]![0]).not.toEqual(first);
  });

  it('hides the action for missing and unreachable endpoints', async () => {
    const user = userEvent.setup();
    render(<PassageThree />);
    expect(screen.queryByRole('button', { name: 'Copy passage' })).toBeNull();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origin' }),
      'aster',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination' }),
      'last',
    );
    expect(screen.queryByRole('button', { name: 'Copy passage' })).toBeNull();
  });

  it('explains when operational source notes make the link too long', async () => {
    localStorage.setItem(
      VESSEL_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        ...DEFAULT_VESSEL,
        design: {
          manualPerformance: {
            jump: { rating: 2, provenance: 'x'.repeat(2000) },
          },
        },
      }),
    );
    const { user } = await passage();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Copy passage link' }));
    expect(screen.getByText(/Passage link is too long to share/)).toBeVisible();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('reports clipboard denial without removing the passage', async () => {
    const { user, manifest } = await passage();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied'),
    );
    await user.click(screen.getByRole('button', { name: 'Copy passage' }));
    expect(screen.getByText(/Could not copy passage/)).toBeVisible();
    expect(within(manifest).getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});

describe('chart-first itinerary', () => {
  it('adds repeated waypoints and reorders and removes them', async () => {
    const user = userEvent.setup();
    render(<PassageThree />);
    const world = screen.getByRole('button', { name: /Inspect Brass Ledger,/ });
    await user.click(world);
    await user.click(
      screen.getByRole('button', { name: 'Add required waypoint' }),
    );
    await user.click(world);
    await user.click(
      screen.getByRole('button', { name: 'Add required waypoint' }),
    );
    expect(screen.getByRole('combobox', { name: 'Stop 2' })).toHaveValue(
      'brass',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Stop 2' }),
      'drift',
    );
    await user.click(
      screen.getByRole('button', { name: 'Move stop 2 earlier' }),
    );
    expect(screen.getByRole('combobox', { name: 'Stop 1' })).toHaveValue(
      'drift',
    );
    await user.click(screen.getByRole('button', { name: 'Remove stop 1' }));
    expect(screen.getByRole('combobox', { name: 'Stop 1' })).toHaveValue(
      'brass',
    );
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('return passage', () => {
  it('enables swapping only for distinct selected endpoints and recalculates unreachable routes', async () => {
    const { user } = await passage();
    const swap = screen.getByRole('button', { name: 'Swap endpoints' });
    const origin = screen.getByRole('combobox', { name: 'Origin' });
    const destination = screen.getByRole('combobox', { name: 'Destination' });
    await user.selectOptions(destination, '');
    expect(swap).toBeDisabled();
    await user.selectOptions(destination, 'aster');
    expect(swap).toBeDisabled();
    await user.selectOptions(destination, 'last');
    expect(swap).toBeEnabled();
    await user.click(swap);
    expect(origin).toHaveValue('last');
    expect(destination).toHaveValue('aster');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Destination unreachable',
    );
  });

  it.each(['waypoints', 'direct'] as const)(
    'reverses selected stops and recalculates both alternatives in %s mode',
    async (mode) => {
      const actualCreateRouter = engine.createRouter;
      const findRoute = vi.fn();
      vi.spyOn(engine, 'createRouter').mockImplementation((systems, rules) => {
        const router = actualCreateRouter(systems, rules);
        findRoute.mockImplementation(router.findRoute);
        return { ...router, findRoute };
      });
      const { user } = await passage();
      for (const name of ['Brass Ledger', 'Drift Lantern']) {
        await user.click(
          screen.getByRole('button', { name: new RegExp(`Inspect ${name},`) }),
        );
        await user.click(
          screen.getByRole('button', { name: 'Add required waypoint' }),
        );
      }
      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Routing mode' }),
        mode,
      );
      findRoute.mockClear();
      await user.click(screen.getByRole('button', { name: 'Swap endpoints' }));
      expect(screen.getByRole('combobox', { name: 'Stop 1' })).toHaveValue(
        'drift',
      );
      expect(screen.getByRole('combobox', { name: 'Stop 2' })).toHaveValue(
        'brass',
      );
      expect(findRoute).toHaveBeenCalledTimes(2);
      expect(findRoute).toHaveBeenCalledWith(
        'cinder',
        'aster',
        'lowest-fuel-cost',
        ['drift', 'brass'],
        mode,
      );
      expect(findRoute).toHaveBeenCalledWith(
        'cinder',
        'aster',
        'fewest-jumps',
        ['drift', 'brass'],
        mode,
      );
    },
  );
});
