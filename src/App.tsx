import { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { PassageThree } from './components';
import { DriveCatalogPanel } from './components/DriveCatalogPanel';
import { loadDriveCatalog } from './components/DriveCatalogPanel/catalogStorage';
export function App() {
  const [catalog, setCatalog] = useState(loadDriveCatalog);
  return (
    <MotionConfig reducedMotion="user">
      <PassageThree catalog={catalog} />
      <DriveCatalogPanel onCatalogChange={setCatalog} />
    </MotionConfig>
  );
}
