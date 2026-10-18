import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { createItem, createProfile, defaultState, migrate } from './defaults.js';

const SAVE_DELAY_MS = 400;

export const activeProfile = (s) => s.profiles.find((p) => p.id === s.activeProfile) ?? s.profiles[0];
const findFence = (s, id) => activeProfile(s).fences.find((f) => f.id === id);

function makeActions(mutate) {
  return {
    updateFence: (id, patch) => mutate((s) => {
      const fence = findFence(s, id);
      if (fence) Object.assign(fence, patch);
    }),
    addFence: (fence) => mutate((s) => { activeProfile(s).fences.push(fence); }),
    removeFence: (id) => mutate((s) => {
      const p = activeProfile(s);
      p.fences = p.fences.filter((f) => f.id !== id);
    }),
    // L'ordre du tableau sert d'ordre d'empilement : la dernière zone est au-dessus.
    bringToFront: (id) => mutate((s) => {
      const fences = activeProfile(s).fences;
      const i = fences.findIndex((f) => f.id === id);
      if (i >= 0 && i < fences.length - 1) fences.push(...fences.splice(i, 1));
    }),

    addItems: (fenceId, paths, index) => mutate((s) => {
      const fence = findFence(s, fenceId);
      if (!fence) return;
      const known = new Set(fence.items.map((it) => it.path.toLowerCase()));
      const fresh = paths.filter((p) => p && !known.has(p.toLowerCase())).map(createItem);
      fence.items.splice(index ?? fence.items.length, 0, ...fresh);
    }),
    // Déplace un ou plusieurs éléments (dans la même zone ou vers une autre), en gardant leur ordre.
    moveItems: (fromId, itemIds, toId, index) => mutate((s) => {
      const from = findFence(s, fromId);
      const to = findFence(s, toId);
      if (!from || !to) return;
      const ids = new Set(itemIds);
      let target = index ?? to.items.length;
      if (from === to) target -= from.items.slice(0, target).filter((it) => ids.has(it.id)).length;
      const moving = from.items.filter((it) => ids.has(it.id));
      from.items = from.items.filter((it) => !ids.has(it.id));
      // Un élément déjà présent dans la zone d'arrivée n'y est pas ajouté en double.
      const known = new Set(to.items.map((it) => it.path.toLowerCase()));
      const accepted = from === to ? moving : moving.filter((it) => !known.has(it.path.toLowerCase()));
      to.items.splice(Math.min(target, to.items.length), 0, ...accepted);
    }),
    removeItems: (fenceId, itemIds) => mutate((s) => {
      const fence = findFence(s, fenceId);
      const ids = new Set(itemIds);
      if (fence) fence.items = fence.items.filter((it) => !ids.has(it.id));
    }),
    clearFence: (fenceId) => mutate((s) => {
      const fence = findFence(s, fenceId);
      if (fence) fence.items = [];
    }),
    renameItem: (fenceId, itemId, name) => mutate((s) => {
      const item = findFence(s, fenceId)?.items.find((it) => it.id === itemId);
      if (item) item.name = name || null;
    }),

    bumpUsage: (path) => mutate((s) => { s.usage[path] = (s.usage[path] ?? 0) + 1; }),
    updateSettings: (patch) => mutate((s) => { Object.assign(s.settings, patch); }),
    dismissWelcome: () => mutate((s) => { s.firstRun = false; }),

    switchProfile: (id) => mutate((s) => { s.activeProfile = id; }),
    addProfile: (name) => mutate((s) => {
      const profile = createProfile(name);
      s.profiles.push(profile);
      s.activeProfile = profile.id;
    }),
    renameProfile: (id, name) => mutate((s) => {
      const profile = s.profiles.find((p) => p.id === id);
      if (profile) profile.name = name;
    }),
    removeProfile: (id) => mutate((s) => {
      if (s.profiles.length < 2) return;
      s.profiles = s.profiles.filter((p) => p.id !== id);
      if (s.activeProfile === id) s.activeProfile = s.profiles[0].id;
    }),
  };
}

export function useAppState() {
  const [state, setState] = useState(null);
  const latest = useRef(null);
  const saveTimer = useRef();

  useEffect(() => {
    api.loadState().then((saved) => setState(saved ? migrate(saved) : defaultState()));
  }, []);

  useEffect(() => {
    if (!state) return;
    latest.current = state;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api.saveState(state), SAVE_DELAY_MS);
  }, [state]);

  useEffect(() => {
    const flush = () => latest.current && api.saveState(latest.current);
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const mutate = useCallback((fn) => setState((prev) => {
    const next = structuredClone(prev);
    fn(next);
    return next;
  }), []);

  const actions = useMemo(() => makeActions(mutate), [mutate]);
  return [state, actions];
}
