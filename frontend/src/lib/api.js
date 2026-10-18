// Pont vers le processus Electron (voir backend/preload.cjs).
// Hors Electron (simple navigateur), un substitut permet quand même d'afficher l'interface.
const browserStub = {
  loadState: async () => null,
  saveState: () => {},
  applySettings: async () => {},
  setIgnoreMouse: () => {},
  focusWindow: () => {},
  getIcon: async () => null,
  open: async () => 'Disponible uniquement dans l’application Electron',
  reveal: () => {},
  pick: async () => [],
  pathForFile: () => null,
  listFolder: async () => [],
  watchFolders: () => {},
  recent: async () => [],
  desktopFiles: async () => [],
  search: async () => ({ results: [], indexing: false, total: 0 }),
  reindex: async () => {},
  syncDesktop: async () => ({ failed: [], hidden: 0 }),
  syncDesktopElevated: async () => ({ done: 0, failed: 0 }),
  shortcuts: async () => ({ search: 'Control+Alt+Space', edit: 'Control+Alt+E', toggle: 'Control+Alt+H' }),
  quit: () => {},
  on: () => () => {},
};

export const api = window.api ?? browserStub;
