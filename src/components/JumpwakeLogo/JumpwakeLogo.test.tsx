import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JumpwakeLogo } from './JumpwakeLogo';

describe('JumpwakeLogo', () => {
  it.each(['full', 'compact'] as const)(
    'names the standalone %s identity for assistive technology',
    (variant) => {
      render(<JumpwakeLogo variant={variant} />);
      expect(screen.getByRole('img', { name: 'Jumpwake' })).toBeVisible();
    },
  );

  it('leaves the linked brand with one accessible name when decorative', () => {
    render(
      <a href="/" aria-label="Jumpwake home">
        <JumpwakeLogo decorative />
        <JumpwakeLogo decorative variant="compact" />
      </a>,
    );
    expect(screen.getByRole('link', { name: 'Jumpwake home' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
