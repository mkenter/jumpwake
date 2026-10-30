import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { validateShip } from '../../../rules/classicTraveller1981';
import { DEFAULT_VESSEL, type Vessel } from '../vessel';
import styles from './VesselParticulars.module.css';

type Draft = {
  displacementTons: string;
  jumpRating: string;
  jumpFuelCapacityTons: string;
  initialFuelTons: string;
  hasFuelScoops: boolean;
  streamlined: boolean;
};
type NumericField = Exclude<keyof Draft, 'hasFuelScoops' | 'streamlined'>;
type Errors = Partial<Record<NumericField, string>>;

function draftFrom({ ship, state }: Vessel): Draft {
  return {
    displacementTons: String(ship.displacementTons),
    jumpRating: String(ship.jumpRating),
    jumpFuelCapacityTons: String(ship.jumpFuelCapacityTons),
    initialFuelTons: String(state.initialFuelTons),
    hasFuelScoops: ship.hasFuelScoops,
    streamlined: ship.streamlined,
  };
}

function validateDraft(draft: Draft): { vessel: Vessel; errors: Errors } {
  const number = (field: NumericField) =>
    draft[field].trim() === '' ? NaN : Number(draft[field]);
  const vessel: Vessel = {
    ship: {
      displacementTons: number('displacementTons'),
      jumpRating: number('jumpRating'),
      jumpFuelCapacityTons: number('jumpFuelCapacityTons'),
      hasFuelScoops: draft.hasFuelScoops,
      streamlined: draft.streamlined,
    },
    state: { initialFuelTons: number('initialFuelTons') },
  };
  const errors: Errors = {};
  const check = (field: NumericField, candidate: Vessel, message: string) => {
    try {
      validateShip(candidate.ship, candidate.state);
    } catch {
      errors[field] = message;
    }
  };
  // Isolate each field against valid companions so the rules API can report
  // every invalid field, rather than just its first thrown error.
  const base = DEFAULT_VESSEL;
  check(
    'displacementTons',
    {
      ship: { ...base.ship, displacementTons: vessel.ship.displacementTons },
      state: base.state,
    },
    'Enter 100–5000 tons in steps of 10.',
  );
  check(
    'jumpRating',
    {
      ship: { ...base.ship, jumpRating: vessel.ship.jumpRating },
      state: base.state,
    },
    'Choose a jump rating from 1 to 6.',
  );
  check(
    'jumpFuelCapacityTons',
    {
      ship: {
        ...base.ship,
        displacementTons: errors.displacementTons
          ? base.ship.displacementTons
          : vessel.ship.displacementTons,
        jumpFuelCapacityTons: vessel.ship.jumpFuelCapacityTons,
      },
      state: { initialFuelTons: 0 },
    },
    'Enter whole tons from 1 up to the vessel’s displacement.',
  );
  check(
    'initialFuelTons',
    {
      ship: {
        ...base.ship,
        displacementTons: 5000,
        jumpFuelCapacityTons: errors.jumpFuelCapacityTons
          ? 5000
          : vessel.ship.jumpFuelCapacityTons,
      },
      state: vessel.state,
    },
    'Enter whole tons from 0 up to the jump-fuel capacity. Fuel aboard cannot exceed capacity.',
  );
  return { vessel, errors };
}

type Props = {
  vessel: Vessel;
  onApply: (vessel: Vessel) => void;
  saveUnavailable: boolean;
};

export function VesselParticulars({ vessel, onApply, saveUnavailable }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(vessel));
  const [submitted, setSubmitted] = useState(false);
  const [restored, setRestored] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();
  const { errors } = validateDraft(draft);
  const { ship, state } = vessel;

  useEffect(() => {
    if (open) firstRef.current?.focus();
  }, [open]);

  function close() {
    // Move focus before removing the document, so the browser anchors to the
    // surviving edit control. Reveal it with the smallest possible scroll.
    editRef.current?.focus({ preventScroll: true });
    setOpen(false);
    requestAnimationFrame(() =>
      editRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'instant',
      }),
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateDraft(draft);
    setSubmitted(true);
    if (Object.keys(result.errors).length) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    validateShip(result.vessel.ship, result.vessel.state);
    onApply(result.vessel);
    close();
  }

  function numeric(
    field: NumericField,
    label: string,
    min: number,
    max: number,
    step: number,
    hint?: string,
  ) {
    const error = submitted ? errors[field] : undefined;
    return (
      <div className={styles.field}>
        <label htmlFor={`vessel-${field}`}>{label}</label>
        <div className={styles.number}>
          <input
            ref={field === 'displacementTons' ? firstRef : undefined}
            id={`vessel-${field}`}
            name={field}
            type="number"
            inputMode="numeric"
            required
            min={min}
            max={max}
            step={step}
            value={draft[field]}
            onChange={(event) => {
              setDraft({ ...draft, [field]: event.target.value });
              setRestored(false);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [
                `vessel-${field}-unit`,
                hint ? `vessel-${field}-hint` : '',
                error ? `vessel-${field}-error` : '',
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
          <span id={`vessel-${field}-unit`}>tons</span>
        </div>
        {hint && (
          <p className={styles.hint} id={`vessel-${field}-hint`}>
            {hint}
          </p>
        )}
        {error && (
          <p className={styles.error} id={`vessel-${field}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.particulars}>
      <div className={styles.summary}>
        <h2>Vessel particulars</h2>
        <div role="group" aria-label="Active vessel" className={styles.details}>
          <span>
            {ship.displacementTons} tons · Jump-{ship.jumpRating}
          </span>
          <span>
            {state.initialFuelTons}/{ship.jumpFuelCapacityTons} tons jump fuel
          </span>
          <span>
            {ship.hasFuelScoops ? 'Scoops' : 'No scoops'} ·{' '}
            {ship.streamlined ? 'Streamlined' : 'Unstreamlined'}
          </span>
        </div>
        <button
          ref={editRef}
          type="button"
          aria-expanded={open}
          aria-controls="vessel-document"
          onClick={() => {
            if (open) close();
            else {
              setDraft(draftFrom(vessel));
              setSubmitted(false);
              setRestored(false);
              setOpen(true);
            }
          }}
        >
          {open ? 'Close particulars' : 'Edit particulars'}
          <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
      </div>
      {saveUnavailable && (
        <p className={styles.saveNote}>
          Applied for this visit. Local saving is unavailable in this browser.
        </p>
      )}
      <div id="vessel-document" hidden={!open}>
        {open && (
          <motion.form
            ref={formRef}
            className={styles.document}
            aria-label="Vessel particulars"
            noValidate
            onSubmit={submit}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
            }}
            initial={reduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            <div className={styles.introduction}>
              <p>Particulars for passage</p>
              <span>Configure your vessel for route planning.</span>
            </div>
            <div className={styles.groups}>
              <fieldset className={styles.specifications}>
                <legend>Vessel specifications</legend>
                <div className={styles.numbers}>
                  {numeric(
                    'displacementTons',
                    'Displacement',
                    100,
                    5000,
                    10,
                    '100–5000 tons · steps of 10',
                  )}
                  <div className={styles.field}>
                    <label htmlFor="vessel-jumpRating">Jump rating</label>
                    <select
                      id="vessel-jumpRating"
                      value={draft.jumpRating}
                      onChange={(event) => {
                        setDraft({ ...draft, jumpRating: event.target.value });
                        setRestored(false);
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6].map((rating) => (
                        <option key={rating} value={rating}>
                          Jump-{rating}
                        </option>
                      ))}
                    </select>
                  </div>
                  {numeric(
                    'jumpFuelCapacityTons',
                    'Jump-fuel capacity',
                    1,
                    Number(draft.displacementTons) || 5000,
                    1,
                    'Space allocated to jump fuel, excluding power-plant fuel.',
                  )}
                </div>
                <div className={styles.equipment}>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.hasFuelScoops}
                      onChange={(event) => {
                        setDraft({
                          ...draft,
                          hasFuelScoops: event.target.checked,
                        });
                        setRestored(false);
                      }}
                    />{' '}
                    Fuel scoops fitted
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.streamlined}
                      onChange={(event) => {
                        setDraft({
                          ...draft,
                          streamlined: event.target.checked,
                        });
                        setRestored(false);
                      }}
                    />{' '}
                    Streamlined hull
                  </label>
                </div>
                <p className={styles.hint}>
                  Gas-giant scooping requires both scoops and a streamlined
                  hull.
                </p>
              </fieldset>
              <fieldset className={styles.operating}>
                <legend>Current operating state</legend>
                {numeric(
                  'initialFuelTons',
                  'Jump fuel aboard',
                  0,
                  Number(draft.jumpFuelCapacityTons) || 5000,
                  1,
                  'Fuel available at departure. May be less than capacity.',
                )}
              </fieldset>
            </div>
            <div className={styles.actions}>
              <div className={styles.restore}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(draftFrom(DEFAULT_VESSEL));
                    setSubmitted(false);
                    setRestored(true);
                  }}
                >
                  Restore demonstration ship
                </button>
                <span aria-live="polite">
                  {restored
                    ? 'Defaults restored to draft. Apply to use them.'
                    : 'Changes take effect when applied.'}
                </span>
              </div>
              <button type="button" className={styles.cancel} onClick={close}>
                Cancel
              </button>
              <button type="submit" className={styles.apply}>
                Apply particulars <span aria-hidden="true">→</span>
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </div>
  );
}
