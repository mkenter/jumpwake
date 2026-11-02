import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Masthead } from './Masthead';

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('Masthead', () => {
  it('exposes one home link and delegates the three supported destinations', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <Masthead
        title="Ember Reach"
        compact
        view="chart"
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getAllByRole('link', { name: 'Jumpwake home' })).toHaveLength(
      1,
    );
    expect(screen.getByRole('button', { name: 'Chart' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('link', { name: 'Passage' }));
    await user.click(screen.getByRole('button', { name: 'Chart' }));
    await user.click(screen.getByRole('button', { name: 'Manifest' }));
    expect(onNavigate.mock.calls).toEqual([
      ['passage'],
      ['chart'],
      ['manifest'],
    ]);
  });

  it('reflects the mobile view without declaring desktop panels mutually exclusive', () => {
    const onNavigate = vi.fn();
    const { rerender } = render(
      <Masthead
        title="Ember Reach"
        compact
        view="manifest"
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getByRole('button', { name: 'Manifest' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Chart' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    rerender(
      <Masthead
        title="Ember Reach"
        compact={false}
        view="manifest"
        onNavigate={onNavigate}
      />,
    );
    expect(
      screen.queryByRole('group', { name: 'Planner view' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Manifest' }),
    ).not.toHaveAttribute('aria-pressed');
  });
});
