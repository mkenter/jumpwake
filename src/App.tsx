import { MotionConfig } from 'motion/react';
import { PassageThree } from './components';
export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <PassageThree />
    </MotionConfig>
  );
}
