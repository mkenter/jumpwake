import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import { JumpwakeLogo } from '../../JumpwakeLogo';
import styles from './Masthead.module.css';

type MastheadProps = {
  compact: boolean;
  view: 'chart' | 'manifest';
  onNavigate: (destination: 'passage' | 'chart' | 'manifest') => void;
};

export function Masthead({ compact, view, onNavigate }: MastheadProps) {
  const [condensed, setCondensed] = useState(false);
  const ceremonyRef = useRef<HTMLElement>(null);
  const homeRef = useRef<HTMLAnchorElement>(null);
  const compactHomeRef = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const ceremony = ceremonyRef.current;
    if (!ceremony) return;
    let focusFrame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      const next = entry.boundingClientRect.bottom <= 0;
      const focused = document.activeElement;
      const target =
        next && ceremony.contains(focused)
          ? compactHomeRef.current
          : !next && focused === compactHomeRef.current
            ? homeRef.current
            : null;
      setCondensed(next);
      if (target) {
        cancelAnimationFrame(focusFrame);
        focusFrame = requestAnimationFrame(() =>
          target.focus({ preventScroll: true }),
        );
      }
    });
    observer.observe(ceremony);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(focusFrame);
    };
  }, []);

  return (
    <>
      <header
        className={styles.ceremony}
        ref={ceremonyRef}
        inert={condensed}
        aria-hidden={condensed || undefined}
      >
        <a
          className={styles.identity}
          href="/"
          aria-label="Jumpwake home"
          ref={homeRef}
        >
          <JumpwakeLogo decorative className={styles.fullLogo} />
          <h1 className={styles.wordmark}>JUMPWAKE</h1>
          <span className={styles.subtitle}>NAVIGATION SERVICE</span>
        </a>
      </header>
      <motion.nav
        aria-label="Planner navigation"
        data-condensed={condensed}
        className={clsx(styles.navigation, condensed && styles.condensed)}
        initial={false}
        animate={{
          boxShadow: condensed ? '0 8px 24px #3542480c' : '0 0 0 #35424800',
        }}
        transition={{ duration: reduced ? 0 : 0.2 }}
      >
        <motion.div
          className={styles.compactIdentity}
          inert={!condensed}
          aria-hidden={!condensed}
          initial={false}
          animate={{
            opacity: condensed ? 1 : 0,
            x: condensed || reduced ? 0 : -8,
          }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <a href="/" aria-label="Jumpwake home" ref={compactHomeRef}>
            <JumpwakeLogo variant="compact" decorative />
          </a>
          <span>NAVIGATION SERVICE</span>
        </motion.div>
        <span className={styles.motto} aria-hidden={condensed}>
          The stars, <em>within reach.</em>
        </span>
        <motion.div
          layout={!reduced}
          className={styles.controls}
          role={compact ? 'group' : undefined}
          aria-label={compact ? 'Planner view' : undefined}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <a
            href="#journey-controls"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('passage');
            }}
          >
            Passage
          </a>
          <button
            aria-controls="passage-chart"
            aria-pressed={compact ? view === 'chart' : undefined}
            onClick={() => onNavigate('chart')}
          >
            Chart
          </button>
          <button
            aria-controls="passage-manifest"
            aria-pressed={compact ? view === 'manifest' : undefined}
            onClick={() => onNavigate('manifest')}
          >
            Manifest
          </button>
        </motion.div>
        <span className={styles.edition} aria-hidden={condensed}>
          Ember Reach <span>Chart Nº 001</span>
        </span>
      </motion.nav>
    </>
  );
}
