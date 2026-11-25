import { parseSubsectors, type Subsector } from '../../import/subsector';

export const CHART_STORAGE_KEY = 'jumpwake.importedChart';

export interface ImportedChart {
  text: string;
  source: string;
  selected: string;
  charts: Subsector[];
}

export function restoreChart(): ImportedChart | null {
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(CHART_STORAGE_KEY) ?? 'null',
    );
    if (typeof stored !== 'object' || stored === null) return null;
    const value = stored as Record<string, unknown>;
    if (
      value.version !== 1 ||
      typeof value.text !== 'string' ||
      typeof value.source !== 'string' ||
      !value.source ||
      typeof value.selected !== 'string'
    )
      return null;
    const result = parseSubsectors(value.text, value.source);
    if (
      !result.ok ||
      !result.charts.some((chart) => chart.position === value.selected)
    )
      return null;
    return {
      text: value.text,
      source: value.source,
      selected: value.selected,
      charts: result.charts,
    };
  } catch {
    return null;
  }
}

export function saveChart(chart: ImportedChart): boolean {
  try {
    window.localStorage.setItem(
      CHART_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        text: chart.text,
        source: chart.source,
        selected: chart.selected,
      }),
    );
    return true;
  } catch {
    // Avoid restoring an older chart after a failed replacement when possible.
    forgetChart();
    return false;
  }
}

export function forgetChart(): boolean {
  try {
    window.localStorage.removeItem(CHART_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
