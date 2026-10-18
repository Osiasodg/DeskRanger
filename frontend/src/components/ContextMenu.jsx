import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef();
  const [pos, setPos] = useState({ left: x, top: y, visibility: 'hidden' });

  // Reste dans l'écran : s'ouvre vers le haut près du bas, vers la gauche près du bord droit.
  useLayoutEffect(() => {
    const r = ref.current.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
      top: y + r.height > window.innerHeight - 8 ? Math.max(8, y - r.height) : y,
    });
  }, [x, y]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="catcher hit" onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <ul className="menu panel hit" ref={ref} style={pos} role="menu">
        {items.filter(Boolean).map((item, i) => {
          if (item === '-') return <li key={i} className="menu-sep" role="separator" />;
          if (item.heading) return <li key={i} className="menu-heading">{item.heading}</li>;
          return (
            <li key={i}>
              <button
                role="menuitem"
                className={item.danger ? 'danger-text' : ''}
                disabled={item.disabled}
                onClick={() => { onClose(); item.onClick(); }}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
