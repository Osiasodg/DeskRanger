import { useEffect } from 'react';
import { api } from '../lib/api.js';

// La fenêtre couvre tout l'écran mais laisse passer les clics, sauf au-dessus
// des éléments marqués « .hit » (zones, menus, panneaux).
const lastPointer = { x: -1, y: -1 };

const isHolding = () => document.documentElement.classList.contains('holding');

/** Pendant un déplacement/redimensionnement, on garde la souris même hors de la zone. */
export function hold(on) {
  document.documentElement.classList.toggle('holding', on);
  if (on) api.setIgnoreMouse(false);
}

export function useClickThrough(captureAll) {
  useEffect(() => {
    let last = null;
    const apply = (ignore) => {
      if (ignore === last) return;
      last = ignore;
      api.setIgnoreMouse(ignore);
    };
    const overHit = (el) => !!el?.closest?.('.hit');

    const under = document.elementFromPoint(lastPointer.x, lastPointer.y);
    apply(!(captureAll || overHit(under)));

    const onMove = (e) => {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
      apply(!(captureAll || isHolding() || overHit(e.target)));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [captureAll]);
}
