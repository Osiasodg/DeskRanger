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

// Catégories de « Ranger le bureau » pour ce qu'aucune zone ne réclame.
// La dernière (sans règle) reçoit tout le reste : rien n'est laissé de côté.
export const SORT_CATEGORIES = [
  { title: 'Applications', rules: '.lnk .exe .url .appref-ms', theme: THEMES[2] },
  { title: 'Dossiers', rules: 'dossier', theme: THEMES[4] },
  { title: 'Documents', rules: '.pdf .doc .docx .xls .xlsx .ppt .pptx .odt .ods .odp .txt .md .csv .rtf', theme: THEMES[0] },
  { title: 'Images', rules: '.png .jpg .jpeg .gif .bmp .webp .svg .heic', theme: THEMES[3] },
  { title: 'Médias', rules: '.mp3 .wav .flac .m4a .mp4 .mkv .avi .mov', theme: THEMES[6] },
  { title: 'Archives', rules: '.zip .rar .7z .tar .gz', theme: THEMES[5] },
  { title: 'Autres', rules: '', theme: THEMES[7] },
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
    settings: {
      alwaysOnTop: false,
      // Sans DeskRanger, les éléments rangés restent cachés du bureau : il doit démarrer avec Windows.
      openAtLogin: true,
      openAtLoginDefaulted: true,
      singleClick: false,
      hideDesktopIcons: false,
      // Un élément rangé dans une zone disparaît du bureau (attribut « caché », fichier non déplacé).
      hideZonedItems: true,
    },
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
  const settings = { ...base.settings, ...saved.settings };
  // Les versions ≤ 0.2.0 démarraient sans Windows par défaut : on active le démarrage une seule fois.
  if (!saved.settings?.openAtLoginDefaulted) Object.assign(settings, { openAtLogin: true, openAtLoginDefaulted: true });
  return {
    ...base,
    ...saved,
    settings,
    usage: saved.usage ?? {},
    profiles,
    activeProfile: profiles.some((p) => p.id === saved.activeProfile) ? saved.activeProfile : profiles[0].id,
  };
}
