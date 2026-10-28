import { MotionConfig } from 'motion/react';
import { AppShell } from './components';
import { Exploration } from './experiments/Exploration';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      {location.pathname === '/explore' ? <Exploration /> : <AppShell />}
    </MotionConfig>
  );
}
