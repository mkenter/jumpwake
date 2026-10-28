import { MotionConfig } from 'motion/react';
import { AppShell } from './components';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppShell />
    </MotionConfig>
  );
}
