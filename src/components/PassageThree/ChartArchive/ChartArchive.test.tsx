import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PassageThree } from '../PassageThree';

const chart =
  'Hex\tName\tUWP\tPBG\tRemarks\n0101\tDropped World\tA867A99-C\t100\t\n';

function file(name: string, bytes: Uint8Array) {
  const result = new File([bytes as BlobPart], name);
  Object.defineProperty(result, 'arrayBuffer', {
    value: () => Promise.resolve(bytes.buffer),
    configurable: true,
  });
  return result;
}
const textFile = (name: string, text: string) =>
  file(name, new TextEncoder().encode(text));

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
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

async function setup() {
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
  await user.click(screen.getByText(/Chart bureau/));
  const zone = screen.getByText(
    'Drop a T5 Tab Delimited chart here, or choose a file.',
  ).parentElement!;
  return { user, zone };
}

function assertRoutePreserved() {
  expect(screen.getByRole('combobox', { name: 'Origin' })).toHaveValue('aster');
  expect(screen.getByRole('combobox', { name: 'Destination' })).toHaveValue(
    'cinder',
  );
  expect(
    screen.getByRole('heading', { name: /Ember Reach.*field chart/ }),
  ).toBeVisible();
  expect(
    within(
      screen.getByRole('region', { name: 'Passage manifest' }),
    ).getAllByRole('listitem'),
  ).toHaveLength(6);
}

describe('chart file interactions', () => {
  it('allows another import after forgetting during a pending read', async () => {
    const { user, zone } = await setup();
    fireEvent.drop(zone, {
      dataTransfer: { files: [textFile('first.tab', chart)], types: ['Files'] },
    });
    await screen.findByText(/Source: first.tab/);

    let finishRead!: (bytes: ArrayBuffer) => void;
    const pending = textFile('pending.tab', chart);
    Object.defineProperty(pending, 'arrayBuffer', {
      value: () =>
        new Promise<ArrayBuffer>((resolve) => (finishRead = resolve)),
    });
    fireEvent.drop(zone, {
      dataTransfer: { files: [pending], types: ['Files'] },
    });
    expect(screen.getByLabelText('Load navigation chart')).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Forget imported chart' }),
    );
    expect(screen.getByLabelText('Load navigation chart')).toBeEnabled();
    expect(screen.queryByText('Reading chart…')).not.toBeInTheDocument();

    await user.upload(
      screen.getByLabelText('Load navigation chart'),
      textFile('later.tab', chart),
    );
    await screen.findByText(/Source: later.tab/);
    finishRead(new TextEncoder().encode(chart).buffer);
    await waitFor(() =>
      expect(screen.getByText(/Source: later.tab/)).toBeVisible(),
    );
  });

  it.each(['drop', 'picker'])(
    'imports the same valid file via %s',
    async (method) => {
      const { user, zone } = await setup();
      const input = textFile('chart.tab', chart);
      if (method === 'drop')
        fireEvent.drop(zone, {
          dataTransfer: { files: [input], types: ['Files'] },
        });
      else
        await user.upload(
          screen.getByLabelText('Load navigation chart'),
          input,
        );
      await waitFor(() =>
        expect(screen.getByText(/Source: chart.tab/)).toBeVisible(),
      );
      expect(
        screen.getByRole('heading', { name: /field chart/ }),
      ).toHaveTextContent('chart.tab');
    },
  );

  it.each([
    ['invalid T5', () => [textFile('bad.tab', 'invalid')], /Chart not loaded/],
    [
      'oversized',
      () => [file('large.tab', new Uint8Array(2 * 1024 * 1024 + 1))],
      /File exceeds 2 MiB/,
    ],
    [
      'invalid UTF-8',
      () => [file('bad.tab', new Uint8Array([255]))],
      /Unable to read UTF-8/,
    ],
    [
      'unreadable',
      () => {
        const f = textFile('bad.tab', chart);
        Object.defineProperty(f, 'arrayBuffer', {
          value: () => Promise.reject(new Error('unreadable')),
        });
        return [f];
      },
      /Unable to read UTF-8/,
    ],
    [
      'multiple files',
      () => [textFile('a.tab', chart), textFile('b.tab', chart)],
      /Drop one chart file at a time/,
    ],
  ])('preserves chart and route for %s', async (_name, makeFiles, feedback) => {
    const { zone } = await setup();
    fireEvent.drop(zone, {
      dataTransfer: { files: makeFiles(), types: ['Files'] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(feedback);
    assertRoutePreserved();
  });

  it('does not advertise or import a text-only drag', async () => {
    const { zone } = await setup();
    const transfer = { types: ['text/plain'], files: [], dropEffect: 'copy' };
    fireEvent.dragEnter(zone, { dataTransfer: transfer });
    fireEvent.dragOver(zone, { dataTransfer: transfer });
    expect(transfer.dropEffect).toBe('none');
    expect(zone).not.toHaveAttribute('data-dragging');
    fireEvent.drop(zone, { dataTransfer: transfer });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Drop one chart file at a time',
    );
    assertRoutePreserved();
  });

  it('shows file drag feedback and prevents default navigation', async () => {
    const { zone } = await setup();
    const transfer = { types: ['Files'], files: [], dropEffect: 'none' };
    expect(fireEvent.dragEnter(zone, { dataTransfer: transfer })).toBe(false);
    expect(zone).toHaveAttribute('data-dragging', 'true');
    expect(fireEvent.dragOver(zone, { dataTransfer: transfer })).toBe(false);
    expect(transfer.dropEffect).toBe('copy');
    expect(fireEvent.drop(zone, { dataTransfer: transfer })).toBe(false);
    expect(zone).not.toHaveAttribute('data-dragging');
  });
});
