const { contextBridge, ipcRenderer, webUtils } = require('electron');

const EVENTS = new Set(['mode:toggle-edit', 'fences:toggle', 'search:open', 'help:open', 'folder:changed']);

contextBridge.exposeInMainWorld('api', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.send('state:save', state),
  applySettings: (settings) => ipcRenderer.invoke('settings:apply', settings),

  setIgnoreMouse: (ignore) => ipcRenderer.send('win:ignore', ignore),
  focusWindow: () => ipcRenderer.send('win:focus'),

  getIcon: (p) => ipcRenderer.invoke('file:icon', p),
  open: (p) => ipcRenderer.invoke('file:open', p),
  reveal: (p) => ipcRenderer.send('file:reveal', p),
  pick: (kind) => ipcRenderer.invoke('dialog:pick', kind),
  pathForFile: (file) => webUtils.getPathForFile(file),

  listFolder: (p) => ipcRenderer.invoke('folder:list', p),
  watchFolders: (paths) => ipcRenderer.send('folder:watch', paths),
  recent: (limit) => ipcRenderer.invoke('files:recent', limit),
  desktopFiles: () => ipcRenderer.invoke('files:desktop'),

  search: (q) => ipcRenderer.invoke('search:query', q),
  reindex: () => ipcRenderer.invoke('search:reindex'),

  syncDesktop: (paths, enabled) => ipcRenderer.invoke('desktop:sync', paths, enabled),
  syncDesktopElevated: (items) => ipcRenderer.invoke('desktop:sync-elevated', items),

  shortcuts: () => ipcRenderer.invoke('app:shortcuts'),
  quit: () => ipcRenderer.send('app:quit'),

  on: (channel, callback) => {
    if (!EVENTS.has(channel)) throw new Error(`Événement inconnu : ${channel}`);
    const handler = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
