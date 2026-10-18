import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// chemin → data URL (résolue) ou Promise (en cours de chargement)
const cache = new Map();

function fetchIcon(path) {
  const hit = cache.get(path);
  if (hit) return Promise.resolve(hit);
  const pending = api.getIcon(path).then((url) => {
    if (url) cache.set(path, url);
    else cache.delete(path);
    return url;
  });
  cache.set(path, pending);
  return pending;
}

export function useIcon(path) {
  const [url, setUrl] = useState(() => (typeof cache.get(path) === 'string' ? cache.get(path) : null));

  useEffect(() => {
    let alive = true;
    fetchIcon(path).then((result) => alive && setUrl(result ?? null));
    return () => { alive = false; };
  }, [path]);

  return url;
}
