const { app, BrowserWindow, ipcMain, screen, shell, dialog, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('node:path');
const store = require('./store.cjs');
const files = require('./files.cjs');
const search = require('./search.cjs');
const desktop = require('./desktop.cjs');
const desktopItems = require('./desktopItems.cjs');

const isDev = process.argv.includes('--dev');
// Pour chaque action, la première combinaison libre sur le PC est retenue.
const SHORTCUT_CANDIDATES = {
  search: ['Control+Alt+Space', 'Control+Shift+Space', 'Control+Alt+F'],
  edit: ['Control+Alt+E', 'Control+Shift+E'],
  toggle: ['Control+Alt+H', 'Control+Shift+H'],
};
const SHORTCUTS = {};
const REINDEX_EVERY_MS = 15 * 60 * 1000;
const DESKTOP_REATTACH_MS = 5000;

let win = null;
let tray = null;
let alwaysOnTop = false;
// On ne réaffiche en quittant que les icônes que l'application a elle-même masquées.
let iconsHiddenByUs = false;
let sessionEnding = false;

function send(channel, ...args) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

function fitToWorkArea() {
  if (!win || win.isDestroyed()) return;
  win.setBounds(screen.getPrimaryDisplay().workArea);
}

function bringToFront() {
  win.show();
  win.focus();
}

function createWindow() {
  alwaysOnTop = !!store.settings().alwaysOnTop;
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;

  win = new BrowserWindow({
    x, y, width, height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    alwaysOnTop,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Par défaut la fenêtre laisse passer les clics : seules les zones les captent.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.once('ready-to-show', () => {
    desktop.attachToDesktop(win);
    win.showInactive();
    if (!alwaysOnTop) desktop.sendToBack(win);
    // Si l'Explorateur redémarre, le bureau change de fenêtre : on s'y rattache à nouveau.
    setInterval(() => desktop.attachToDesktop(win), DESKTOP_REATTACH_MS);
  });
  // Fermeture de session ou arrêt de Windows (et non « Quitter DeskRanger »).
  win.on('session-end', () => {
    sessionEnding = true;
  });
  // Quand on clique ailleurs, les zones retournent derrière les autres fenêtres.
  win.on('blur', () => {
    if (!alwaysOnTop) desktop.sendToBack(win);
  });

  if (isDev) win.loadURL('http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  screen.on('display-metrics-changed', fitToWorkArea);
}

function openSearch() {
  bringToFront();
  send('search:open');
}

// Petite icône 2×2 dessinée à la main (BGRA) pour ne dépendre d'aucun fichier image.
function trayIcon() {
  const size = 32;
  const buf = Buffer.alloc(size * size * 4);
  for (const [sx, sy] of [[4, 4], [18, 4], [4, 18], [18, 18]]) {
    for (let y = sy; y < sy + 10; y++) {
      for (let x = sx; x < sx + 10; x++) {
        const corner = (x === sx || x === sx + 9) && (y === sy || y === sy + 9);
        if (corner) continue;
        const i = (y * size + x) * 4;
        buf[i] = 0xfa; buf[i + 1] = 0xa5; buf[i + 2] = 0x60; buf[i + 3] = 0xff;
      }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 });
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('DeskRanger');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Rechercher…', accelerator: SHORTCUTS.search, click: openSearch },
    { label: 'Mode édition', accelerator: SHORTCUTS.edit, click: () => { bringToFront(); send('mode:toggle-edit'); } },
    { label: 'Afficher / masquer les zones', accelerator: SHORTCUTS.toggle, click: () => send('fences:toggle') },
    { label: 'Aide', click: () => { bringToFront(); send('help:open'); } },
    { type: 'separator' },
    { label: 'Quitter DeskRanger', click: () => app.quit() },
  ]));
  tray.on('click', () => { bringToFront(); send('mode:toggle-edit'); });
}

function registerShortcuts() {
  const handlers = {
    search: openSearch,
    edit: () => { bringToFront(); send('mode:toggle-edit'); },
    toggle: () => send('fences:toggle'),
  };
  for (const [action, candidates] of Object.entries(SHORTCUT_CANDIDATES)) {
    const free = candidates.find((accel) => globalShortcut.register(accel, handlers[action]));
    if (free) SHORTCUTS[action] = free;
    else console.warn(`[deskranger] aucun raccourci libre pour « ${action} » : ${candidates.join(', ')}`);
  }
}

function applySettings(settings = {}) {
  alwaysOnTop = !!settings.alwaysOnTop;
  win.setAlwaysOnTop(alwaysOnTop);
  if (!alwaysOnTop && !win.isFocused()) desktop.sendToBack(win);

  if (settings.hideDesktopIcons) {
    if (desktop.desktopIconsHidden() === false && desktop.setDesktopIconsHidden(true)) iconsHiddenByUs = true;
  } else if (iconsHiddenByUs) {
    desktop.setDesktopIconsHidden(false);
    iconsHiddenByUs = false;
  }

  // En développement, on inscrirait electron.exe au démarrage : seulement pour l'app installée.
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!settings.openAtLogin });
}

function registerIpc() {
  ipcMain.handle('state:load', () => store.load());
  ipcMain.on('state:save', (_e, state) => store.save(state));
  ipcMain.handle('settings:apply', (_e, settings) => applySettings(settings));

  ipcMain.on('win:ignore', (_e, ignore) => win.setIgnoreMouseEvents(!!ignore, { forward: true }));
  ipcMain.on('win:focus', bringToFront);

  ipcMain.handle('file:icon', (_e, p) => files.icon(p));
  ipcMain.handle('file:open', (_e, p) => files.open(p));
  ipcMain.on('file:reveal', (_e, p) => shell.showItemInFolder(p));

  ipcMain.handle('dialog:pick', async (_e, kind) => {
    const properties = {
      files: ['openFile', 'multiSelections'],
      folders: ['openDirectory', 'multiSelections'],
      folder: ['openDirectory'],
    }[kind] ?? ['openFile'];
    const result = await dialog.showOpenDialog(win, { properties });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('folder:list', (_e, p) => files.listFolder(p));
  ipcMain.on('folder:watch', (_e, paths) => files.watchFolders(paths, (p) => send('folder:changed', p)));
  ipcMain.handle('files:recent', (_e, limit) => files.recent(limit));
  ipcMain.handle('files:desktop', () => files.desktopFiles());

  ipcMain.handle('search:query', (_e, q) => search.query(q));
  ipcMain.handle('search:reindex', () => search.rebuild());

  ipcMain.handle('desktop:sync', (_e, paths, enabled) => desktopItems.sync(paths, enabled));
  ipcMain.handle('desktop:sync-elevated', (_e, items) => desktopItems.syncElevated(items));

  ipcMain.handle('app:shortcuts', () => SHORTCUTS);
  ipcMain.on('app:quit', () => app.quit());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { bringToFront(); send('mode:toggle-edit'); });

  app.whenReady().then(() => {
    registerIpc();
    registerShortcuts();
    desktopItems.writeRestoreScript();
    createWindow();
    createTray();
    setTimeout(() => search.rebuild(), 3000);
    setInterval(() => search.rebuild(), REINDEX_EVERY_MS);
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (iconsHiddenByUs) desktop.setDesktopIconsHidden(false);
    // Quitter DeskRanger remet sur le bureau les éléments rangés (sauf ceux du bureau commun, qui
    // demanderaient une autorisation administrateur) : sans zones, ils seraient introuvables.
    // À l'arrêt de Windows on les laisse cachés : DeskRanger revient au démarrage.
    if (!sessionEnding) desktopItems.sync([], false);
  });
  app.on('window-all-closed', () => app.quit());
}
