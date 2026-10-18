export const uid = () => Math.random().toString(36).slice(2, 10);

export const FENCE_TYPES = {
  items: 'Raccourcis',
  folder: 'Dossier',
  recent: 'Récents',
  note: 'Note',
};

export const COLORS = ['#0f172a', '#1e1b4b', '#042f2e', '#3b0764', '#4c0519', '#1c1917', '#0c4a6e', '#27272a'];
export const ACCENTS = ['#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#fbbf24', '#f87171', '#22d3ee', '#e5e7eb'];

// Couples accent / fond proposés à la création d'une zone.
export const THEMES = [
  { accent: '#60a5fa', color: '#0f172a' },
  { accent: '#a78bfa', color: '#1e1b4b' },
  { accent: '#34d399', color: '#042f2e' },
  { accent: '#f472b6', color: '#4c0519' },
  { accent: '#fbbf24', color: '#1c1917' },
  { accent: '#22d3ee', color: '#0c4a6e' },
  { accent: '#c084fc', color: '#3b0764' },
  { accent: '#e5e7eb', color: '#27272a' },
];

export function createItem(path) {
  return { id: uid(), path, name: null };
}

export function createFence(type, overrides = {}) {
  return {
    id: uid(),
    type,
    title: FENCE_TYPES[type],
    x: 40, y: 40, w: 340, h: 220,
    color: COLORS[0],
    accent: ACCENTS[0],
    opacity: 0.55,
    radius: 14,
    iconSize: 44,
    collapsed: false,
    autoSize: true,
    maxCols: 4,
    sort: 'manual',
    items: [],
    folderPath: null,
    rules: '',
    note: '',
    ...overrides,
  };
}

export function createProfile(name, fences = []) {
  return { id: uid(), name, fences };
}

// Le bureau démarre vide : l'utilisateur crée ses zones avec le bouton + en bas à droite.
export function defaultState() {
  const main = createProfile('Principal');
  return {
    version: 1,
    firstRun: true,
    settings: { alwaysOnTop: false, openAtLogin: false, singleClick: false, hideDesktopIcons: false },
    usage: {},
    activeProfile: main.id,
    profiles: [main],
  };
}

/** Complète un état chargé depuis le disque avec les champs ajoutés depuis. */
export function migrate(saved) {
  const base = defaultState();
  const profiles = (saved.profiles?.length ? saved.profiles : base.profiles).map((p) => ({
    ...p,
    fences: (p.fences ?? []).map((f) => ({ ...createFence(f.type ?? 'items'), ...f })),
  }));
  return {
    ...base,
    ...saved,
    settings: { ...base.settings, ...saved.settings },
    usage: saved.usage ?? {},
    profiles,
    activeProfile: profiles.some((p) => p.id === saved.activeProfile) ? saved.activeProfile : profiles[0].id,
  };
}
