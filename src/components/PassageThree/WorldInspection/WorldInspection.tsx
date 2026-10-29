import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { address, worldById } from '../../../data/passageScenario';
import styles from './WorldInspection.module.css';

export type Inspection = { id: string; trigger: HTMLElement | SVGElement };
type Props = {
  inspection: Inspection;
  compact: boolean;
  origin: string;
  destination: string;
  routeIndex: number;
  hasPassage: boolean;
  onClose: () => void;
  onUseWorld: (endpoint: 'origin' | 'destination') => void;
};

export function WorldInspection({
  inspection,
  compact,
  origin,
  destination,
  routeIndex,
  hasPassage,
  onClose,
  onUseWorld,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  const world = worldById(inspection.id);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (compact) dialog?.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
    };
  }, [inspection, compact]);

  const content = (
    <motion.div
      key={world.id}
      initial={reduced ? false : { opacity: 0.6, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.16 }}
    >
      <div className={styles.heading}>
        <h2 id="inspected-world" ref={headingRef} tabIndex={-1}>
          {world.name}{' '}
          <span>
            {address(world)} · Port {world.port}
          </span>
        </h2>
        <button
          className={styles.close}
          aria-label="Close world details"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className={styles.relationship}>
        {world.id === origin
          ? 'Your origin'
          : world.id === destination
            ? 'Your destination'
            : routeIndex >= 0
              ? `Stop ${routeIndex + 1} on your passage`
              : hasPassage
                ? 'Outside your passage'
                : 'World details'}{' '}
        · inspecting only
      </p>
      <p className={styles.note}>{world.note}</p>
      <p className={styles.fuel}>
        <span>Local fuel</span>
        {world.fuel}
      </p>
      <div className={styles.actions}>
        <button
          disabled={world.id === origin}
          onClick={() => onUseWorld('origin')}
        >
          {world.id === origin ? 'Current origin' : 'Set origin'}
        </button>
        <button
          disabled={world.id === destination}
          onClick={() => onUseWorld('destination')}
        >
          {world.id === destination ? 'Current destination' : 'Set destination'}
        </button>
      </div>
    </motion.div>
  );

  return compact ? (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby="inspected-world"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === headingRef.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {content}
    </dialog>
  ) : (
    <aside
      className={styles.inspector}
      aria-label="World inspection"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {content}
    </aside>
  );
}
