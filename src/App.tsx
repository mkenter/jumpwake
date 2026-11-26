import { MotionConfig } from 'motion/react';
import { PassageThree } from './components';
import { DriveCatalogPanel } from './components/DriveCatalogPanel';
export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <PassageThree />
      <DriveCatalogPanel />
    </MotionConfig>
  );
}
