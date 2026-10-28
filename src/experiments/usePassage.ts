import { useState } from 'react';
import { passages, worldById } from './data/scenario';

export function usePassage() {
  const [selected, select] = useState('ilex');
  const [origin, setOrigin] = useState('aster');
  const [destination, setDestination] = useState('orison');
  const [view, setView] = useState<'chart' | 'itinerary'>('chart');
  const passage = passages.find(
    (p) => p.origin === origin && p.destination === destination,
  );
  const stops = passage?.stops ?? [];
  const sample = () => {
    setOrigin('aster');
    setDestination('orison');
    select('ilex');
  };
  return {
    selected,
    select,
    origin,
    setOrigin,
    destination,
    setDestination,
    view,
    setView,
    passage,
    stops,
    sample,
    world: worldById(selected),
    stop: stops.find((s) => s.world === selected),
    cost: stops.reduce((sum, s) => sum + s.cost, 0),
  };
}
export type PassageState = ReturnType<typeof usePassage>;
