import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const KEY_NAMES = { Control: 'Ctrl', Shift: 'Maj', Space: 'Espace' };

/** « Control+Alt+Space » → « Ctrl + Alt + Espace » */
export const formatAccelerator = (accel) => accel.split('+').map((k) => KEY_NAMES[k] ?? k).join(' + ');

/** Raccourcis globaux réellement enregistrés (le premier libre de chaque liste), déjà formatés. */
export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState({});
  useEffect(() => { api.shortcuts().then(setShortcuts); }, []);
  const label = (action) => (shortcuts[action] ? formatAccelerator(shortcuts[action]) : 'indisponible');
  return label;
}
