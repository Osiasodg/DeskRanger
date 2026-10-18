import { useCallback, useState } from 'react';
import { uid } from '../state/defaults.js';

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, kind = 'info') => {
    const id = uid();
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800);
  }, []);
  return { toasts, toast };
}
