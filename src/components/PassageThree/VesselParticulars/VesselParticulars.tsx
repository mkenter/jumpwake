import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  assessVesselDesign,
  exampleDriveCatalog,
  type DriveCatalog,
  type DriveKind,
  type VesselDesign,
} from '../../../rules/classicTraveller1981/vesselDesign';
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
  catalog?: DriveCatalog;
};

export function VesselParticulars({
  vessel,
  onApply,
  saveUnavailable,
  catalog = exampleDriveCatalog,
}: Props) {
  const [operational, setOperational] = useState(Boolean(vessel.design));
  const [design, setDesign] = useState<VesselDesign>(vessel.design ?? {});
  const [manual, setManual] = useState<
    Partial<Record<DriveKind, { rating: string; provenance: string }>>
  >({});
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
  const designWithoutManual = { ...design };
  delete designWithoutManual.manualPerformance;
  const assessedDesign: VesselDesign = {
    ...designWithoutManual,
    displacementTons: draft.displacementTons.trim()
      ? Number(draft.displacementTons)
      : undefined,
    streamlined: draft.streamlined,
    manualPerformance: Object.fromEntries(
      Object.entries(manual)
        .filter(([, value]) => value.rating || value.provenance)
        .map(([kind, value]) => [
          kind,
          { rating: Number(value.rating), provenance: value.provenance },
        ]),
    ),
  } as VesselDesign;
  const assessment = assessVesselDesign(assessedDesign, catalog);
  const operationalError =
    assessment.status === 'invalid' ||
    assessment.status === 'incomplete' ||
    assessment.effectiveJump === undefined ||
    assessment.plantRating === undefined ||
    Number(draft.jumpFuelCapacityTons) >
      (assessedDesign.tankageTons ?? 0) - 10 * assessment.plantRating;

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
    if (
      Object.keys(result.errors).length ||
      (operational && operationalError)
    ) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    if (operational) {
      result.vessel.ship = {
        ...result.vessel.ship,
        jumpRating: assessment.effectiveJump!,
        hasFuelScoops: draft.streamlined,
      };
      result.vessel.design = assessedDesign;
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
              setOperational(Boolean(vessel.design));
              setDesign(vessel.design ?? {});
              setManual(
                Object.fromEntries(
                  Object.entries(vessel.design?.manualPerformance ?? {}).map(
                    ([kind, value]) => [
                      kind,
                      {
                        rating: String(value.rating),
                        provenance: value.provenance,
                      },
                    ],
                  ),
                ),
              );
              setSubmitted(false);
              setRestored(false);
              setOpen(true);
            }
          }}
        >
          {open ? 'Close particulars' : 'Edit particulars'}
          <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        <div className={styles.notes}>
          <p>
            {vessel.design
              ? 'Operational particulars retained. Reapply after changing the catalog.'
              : 'Route-only vessel: operational particulars are incomplete.'}
          </p>
          {vessel.design && (
            <p>
              Operational particulars are saved and shared; private catalog data
              is not included.
            </p>
          )}
        </div>
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
            <label>
              <input
                type="checkbox"
                checked={operational}
                onChange={(event) => setOperational(event.target.checked)}
              />{' '}
              Assess operational particulars
            </label>
            {operational && (
              <fieldset className={styles.operationalDetails}>
                <legend>Operational particulars</legend>
                <p>
                  These checks do not establish full construction legality.
                  Software is not assessed. Details are kept only for this
                  visit.
                </p>
                {(
                  [
                    'jumpDrive',
                    'maneuverDrive',
                    'powerPlant',
                    'computer',
                  ] as const
                ).map((field) => (
                  <label key={field}>
                    {
                      {
                        jumpDrive: 'Jump drive letter',
                        maneuverDrive:
                          'Maneuver drive letter (enter none if absent)',
                        powerPlant: 'Power plant letter',
                        computer: 'Computer model',
                      }[field]
                    }
                    <input
                      value={
                        design[field] === null ? 'none' : (design[field] ?? '')
                      }
                      onChange={(event) =>
                        setDesign({
                          ...design,
                          [field]:
                            field === 'maneuverDrive' &&
                            event.target.value.toLowerCase() === 'none'
                              ? null
                              : field === 'computer'
                                ? event.target.value
                                : event.target.value.toUpperCase(),
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Installed total tankage (tons)
                  <input
                    type="number"
                    min="0"
                    value={design.tankageTons ?? ''}
                    onChange={(event) =>
                      setDesign({
                        ...design,
                        tankageTons:
                          event.target.value === ''
                            ? undefined
                            : Number(event.target.value),
                      } as VesselDesign)
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={design.custom ?? false}
                    onChange={(event) =>
                      setDesign({ ...design, custom: event.target.checked })
                    }
                  />{' '}
                  Referee-customized design
                </label>
                {(['jump', 'maneuver', 'plant'] as const).map((kind) => (
                  <div key={kind}>
                    <label>
                      Referee {kind} rating for unavailable data
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={manual[kind]?.rating ?? ''}
                        onChange={(event) =>
                          setManual({
                            ...manual,
                            [kind]: {
                              rating: event.target.value,
                              provenance: manual[kind]?.provenance ?? '',
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Referee {kind} source
                      <input
                        value={manual[kind]?.provenance ?? ''}
                        onChange={(event) =>
                          setManual({
                            ...manual,
                            [kind]: {
                              rating: manual[kind]?.rating ?? '',
                              provenance: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
                <p>
                  Assessment: {assessment.status}; drive jump{' '}
                  {assessment.jumpRating ?? 'unknown'}; effective jump{' '}
                  {assessment.effectiveJump ?? 'unknown'}; maneuver{' '}
                  {assessment.maneuverRating ?? 'unknown'}; plant{' '}
                  {assessment.plantRating ?? 'unknown'}; minimum tankage{' '}
                  {assessment.minimumTankageTons ?? 'unknown'} tons.
                </p>
                {assessment.issues.length > 0 && (
                  <ul>
                    {assessment.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                )}
                {assessment.plantRating !== undefined &&
                  Number(draft.jumpFuelCapacityTons) >
                    (assessedDesign.tankageTons ?? 0) -
                      10 * assessment.plantRating && (
                    <p>
                      Jump-fuel capacity and required plant fuel exceed
                      installed tankage.
                    </p>
                  )}
                {submitted && operationalError && (
                  <p role="alert">
                    Complete or correct the operational particulars before
                    applying.
                  </p>
                )}
              </fieldset>
            )}
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
                      disabled={operational}
                      value={
                        operational
                          ? String(assessment.effectiveJump ?? '')
                          : draft.jumpRating
                      }
                      onChange={(event) => {
                        setDraft({ ...draft, jumpRating: event.target.value });
                        setRestored(false);
                      }}
                    >
                      {operational && <option value="">Unknown</option>}
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
                      disabled={operational}
                      checked={
                        operational ? draft.streamlined : draft.hasFuelScoops
                      }
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
                    setOperational(false);
                    setDesign({});
                    setManual({});
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
