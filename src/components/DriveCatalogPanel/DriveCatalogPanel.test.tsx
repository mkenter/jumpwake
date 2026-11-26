import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DriveCatalogPanel } from './DriveCatalogPanel';

const catalog = (provenance: string) =>
  JSON.stringify({ version: 1, edition: 'CT81', provenance, rows: {} });

function deferredFile() {
  let resolve!: (value: string) => void;
  const text = new Promise<string>((done) => {
    resolve = done;
  });
  return { file: { text: () => text }, resolve };
}

afterEach(() => localStorage.clear());

describe('drive catalog imports', () => {
  it('does not let an earlier read replace a later selection or removal', async () => {
    render(<DriveCatalogPanel />);
    const input = screen.getByLabelText('Import drive catalog JSON');
    const first = deferredFile();
    const second = deferredFile();
    fireEvent.change(input, { target: { files: [first.file] } });
    fireEvent.change(input, { target: { files: [second.file] } });
    await act(async () => second.resolve(catalog('New source')));
    await act(async () => first.resolve(catalog('Old source')));
    expect(screen.getByText(/Source: New source/)).toBeInTheDocument();
    const third = deferredFile();
    fireEvent.change(input, { target: { files: [third.file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove catalog' }));
    await act(async () => third.resolve(catalog('Removed source')));
    expect(screen.getByText(/No private catalog loaded/)).toBeInTheDocument();
    expect(
      localStorage.getItem('jumpwake.private-drive-catalog.v1'),
    ).toBeNull();
  });
});
