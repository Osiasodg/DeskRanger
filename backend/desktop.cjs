// Intégration au bureau Windows via user32.dll (koffi = FFI sans compilation) :
//  - placer la fenêtre des zones tout en bas de la pile (juste au-dessus du fond d'écran) ;
//  - masquer / réafficher les icônes natives du bureau.
let user32 = null;

if (process.platform === 'win32') {
  try {
    const koffi = require('koffi');
    const lib = koffi.load('user32.dll');
    user32 = {
      SetWindowPos: lib.func('__stdcall', 'SetWindowPos', 'int',
        ['intptr_t', 'intptr_t', 'int', 'int', 'int', 'int', 'uint32_t']),
      FindWindowExW: lib.func('__stdcall', 'FindWindowExW', 'intptr_t',
        ['intptr_t', 'intptr_t', 'str16', 'str16']),
      SendMessageW: lib.func('__stdcall', 'SendMessageW', 'intptr_t',
        ['intptr_t', 'uint32_t', 'uintptr_t', 'intptr_t']),
      IsWindowVisible: lib.func('__stdcall', 'IsWindowVisible', 'int', ['intptr_t']),
    };
  } catch (err) {
    console.warn('[zones] koffi indisponible, intégration au bureau désactivée :', err.message);
  }
}

const HWND_BOTTOM = 1;
const SWP_NOSIZE = 0x0001;
const SWP_NOMOVE = 0x0002;
const SWP_NOACTIVATE = 0x0010;
const WM_COMMAND = 0x0111;
// Commande du menu « Affichage → Afficher les icônes du bureau ».
const TOGGLE_DESKTOP_ICONS = 0x7402;

function sendToBack(win) {
  if (!user32 || !win || win.isDestroyed()) return;
  const handle = win.getNativeWindowHandle();
  const hwnd = handle.length >= 8 ? Number(handle.readBigUInt64LE()) : handle.readUInt32LE();
  user32.SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE);
}

// La vue des icônes (SHELLDLL_DefView) est sous Progman, ou sous un WorkerW
// quand le fond d'écran est un diaporama.
function findDesktopView() {
  const progman = user32.FindWindowExW(0, 0, 'Progman', null);
  let view = progman && user32.FindWindowExW(progman, 0, 'SHELLDLL_DefView', null);
  let worker = 0;
  while (!view && (worker = user32.FindWindowExW(0, worker, 'WorkerW', null))) {
    view = user32.FindWindowExW(worker, 0, 'SHELLDLL_DefView', null);
  }
  return view || 0;
}

/** true / false, ou null si l'état est inconnu (koffi absent, bureau introuvable). */
function desktopIconsHidden() {
  if (!user32) return null;
  const view = findDesktopView();
  const list = view && user32.FindWindowExW(view, 0, 'SysListView32', null);
  return list ? !user32.IsWindowVisible(list) : null;
}

/** Masque ou réaffiche les icônes natives. Renvoie true si l'état voulu est atteint. */
function setDesktopIconsHidden(hidden) {
  const current = desktopIconsHidden();
  if (current === null) return false;
  if (current !== hidden) user32.SendMessageW(findDesktopView(), WM_COMMAND, TOGGLE_DESKTOP_ICONS, 0);
  return true;
}

module.exports = { sendToBack, desktopIconsHidden, setDesktopIconsHidden };
