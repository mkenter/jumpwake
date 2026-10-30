import { useRef, useState } from 'react';
import {
  demoChart,
  MAX_FILE_BYTES,
  parseSubsectors,
  type Subsector,
} from '../../../import/subsector';
import styles from './ChartArchive.module.css';
export function ChartArchive({
  chart,
  onSelect,
}: {
  chart: Subsector;
  onSelect: (chart: Subsector) => void;
}) {
  const [charts, setCharts] = useState<Subsector[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  return (
    <details className={styles.archive}>
      <summary>
        Chart bureau · {chart.title} · {chart.worlds.length} worlds ·{' '}
        {chart === demoChart ? 'Demonstration' : 'Imported'}
      </summary>
      <p>
        Load a local UTF-8 T5 Tab Delimited chart. Files stay in this browser
        session; refresh requires importing again.
      </p>
      <label>
        Load navigation chart{' '}
        <input
          type="file"
          disabled={loading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            const token = ++request.current;
            setErrors([]);
            if (file.size > MAX_FILE_BYTES) {
              setErrors(['File exceeds 2 MiB.']);
              return;
            }
            setLoading(true);
            try {
              const text = new TextDecoder('utf-8', { fatal: true }).decode(
                await file.arrayBuffer(),
              );
              if (token !== request.current) return;
              const result = parseSubsectors(text, file.name);
              if (!result.ok) setErrors(result.errors);
              else {
                setCharts(result.charts);
                onSelect(result.charts[0]!);
              }
            } catch {
              setErrors([
                'Unable to read UTF-8 text. Choose a T5 Tab Delimited file.',
              ]);
            } finally {
              setLoading(false);
            }
          }}
        />
      </label>
      {loading && <p role="status">Reading chart…</p>}
      {errors.length > 0 && (
        <div role="alert">
          <p>
            Chart not loaded. Correct these problems and try again. The active
            chart is unchanged.
          </p>
          <ul>
            {errors.slice(0, 100).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          {errors.length > 100 && (
            <p>{errors.length - 100} additional errors.</p>
          )}
        </div>
      )}
      {charts.length > 0 && (
        <label>
          Imported subsector{' '}
          <select
            value={charts.includes(chart) ? chart.position : ''}
            onChange={(event) =>
              onSelect(charts.find((c) => c.position === event.target.value)!)
            }
          >
            <option value="" disabled>
              Choose imported chart
            </option>
            {charts.map((c) => (
              <option key={c.position} value={c.position}>
                {c.position} · {c.worlds.length} worlds
              </option>
            ))}
          </select>
        </label>
      )}
      {chart !== demoChart && (
        <button onClick={() => onSelect(demoChart)}>
          Return to Ember Reach
        </button>
      )}
      <p>
        Source: {chart.source}. Local addresses are 0101–0810; original sector
        addresses appear in world details.
      </p>
      {chart.comments && chart.comments.length > 0 && (
        <details>
          <summary>Source comments and attribution</summary>
          {chart.comments.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </details>
      )}
    </details>
  );
}
