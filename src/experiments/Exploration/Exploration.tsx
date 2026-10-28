import { useState } from 'react';
import { PassageOne } from '../PassageOne';
import { PassageTwo } from '../PassageTwo';
import { PassageThree } from '../PassageThree';
import styles from './Exploration.module.css';

export function Exploration() {
  const [design, setDesign] = useState(
    () => Number(new URLSearchParams(location.search).get('design')) || 1,
  );
  return (
    <div className={styles.exploration}>
      <a className={styles.skip} href="#exploration-main">
        Skip to planner
      </a>
      <nav className={styles.switcher} aria-label="Design explorations">
        <span>
          J / W <span className={styles.caption}>DESIGN STUDIES</span>
        </span>
        <div>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              aria-pressed={design === n}
              onClick={() => {
                setDesign(n);
                history.replaceState(null, '', `?design=${n}`);
              }}
            >
              0{n}
              <span> / {['Passage', 'Atlas', 'Manifest'][n - 1]}</span>
            </button>
          ))}
        </div>
        <span className={styles.caption}>ILLUSTRATIVE PROTOTYPES</span>
      </nav>
      {design === 2 ? (
        <PassageTwo />
      ) : design === 3 ? (
        <PassageThree />
      ) : (
        <PassageOne />
      )}
    </div>
  );
}
