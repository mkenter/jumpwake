import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { INITIAL_SCENARIO } from '../../data/initialScenario';
import styles from './AppShell.module.css';

export function AppShell() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const { subsector, ship } = INITIAL_SCENARIO;

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <span className={styles.wordmark}>Jumpwake</span>
        <span className={styles.status}>Foundation preview</span>
      </header>
      <main id="main-content" className={styles.main}>
        <h1>Interstellar route planning.</h1>
        <p className={styles.intro}>
          A clearer course between the stars. Jumpwake is taking shape as a
          navigation aid for Cepheus-compatible adventures.
        </p>
        <section aria-labelledby="scenario-heading" className={styles.scenario}>
          <h2 id="scenario-heading">The initial flight plan</h2>
          <dl className={styles.facts}>
            <div>
              <dt>Subsector</dt>
              <dd>
                {subsector.columns} × {subsector.rows} hexes
              </dd>
            </div>
            <div>
              <dt>Ship</dt>
              <dd>
                {ship.displacementTons}-ton / Jump-{ship.jumpRating}
              </dd>
            </div>
            <div>
              <dt>Equipment</dt>
              <dd>{ship.hasFuelScoops ? 'Fuel scoops' : 'No fuel scoops'}</dd>
            </div>
          </dl>
        </section>
        <div className={styles.about}>
          <button
            type="button"
            className={clsx(
              styles.aboutButton,
              isAboutOpen && styles.isExpanded,
            )}
            aria-expanded={isAboutOpen}
            aria-controls="build-details"
            onClick={() => setIsAboutOpen((open) => !open)}
          >
            About this build{' '}
            <span aria-hidden="true">{isAboutOpen ? '−' : '+'}</span>
          </button>
          <motion.div
            id="build-details"
            hidden={!isAboutOpen}
            initial={false}
            animate={{ opacity: isAboutOpen ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          >
            <p className={styles.buildDetails}>
              This is the application foundation. The subsector map, route
              calculation, and per-stop itinerary are still to come.
            </p>
          </motion.div>
        </div>
      </main>
      <footer className={styles.footer}>
        Built for the journey at your table.
      </footer>
    </div>
  );
}
