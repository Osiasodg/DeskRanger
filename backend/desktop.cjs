// Intégration au bureau Windows via user32.dll (koffi = FFI sans compilation) :
//  - placer la fenêtre des zones tout en bas de la pile (juste au-dessus du fond d'écran) ;
//  - la rattacher au bureau pour qu'elle survive à Win+D ;
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
      SetWindowLongPtrW: lib.func('__stdcall', 'SetWindowLongPtrW', 'intptr_t', ['intptr_t', 'int', 'intptr_t']),
      GetWindowLongPtrW: lib.func('__stdcall', 'GetWindowLongPtrW', 'intptr_t', ['intptr_t', 'int']),
    };
  } catch (err) {
    console.warn('[deskranger] koffi indisponible, intégration au bureau désactivée :', err.message);
  }
}

const HWND_BOTTOM = 1;
const SWP_NOSIZE = 0x0001;
const SWP_NOMOVE = 0x0002;
const SWP_NOACTIVATE = 0x0010;
const WM_COMMAND = 0x0111;
// Commande du menu « Affichage → Afficher les icônes du bureau ».
const TOGGLE_DESKTOP_ICONS = 0x7402;

const GWLP_HWNDPARENT = -8;

function hwndOf(win) {
  const handle = win.getNativeWindowHandle();
  return handle.length >= 8 ? Number(handle.readBigUInt64LE()) : handle.readUInt32LE();
}

function sendToBack(win) {
  if (!user32 || !win || win.isDestroyed()) return;
  user32.SetWindowPos(hwndOf(win), HWND_BOTTOM, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE);
}

/**
 * Fait de la fenêtre une « propriété » du bureau (Progman), comme les gadgets Rainmeter :
 * Win+D / « Afficher le bureau » ne la masque plus, puisqu'il remet le bureau au premier plan.
 * À rappeler régulièrement : si l'Explorateur redémarre, Progman change de handle.
 * Renvoie true si le rattachement est en place.
 */
function attachToDesktop(win) {
  if (!user32 || !win || win.isDestroyed()) return false;
  const progman = user32.FindWindowExW(0, 0, 'Progman', null);
  if (!progman) return false;
  const hwnd = hwndOf(win);
  if (Number(user32.GetWindowLongPtrW(hwnd, GWLP_HWNDPARENT)) !== Number(progman)) {
    user32.SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, progman);
  }
  return true;
}

function detachFromDesktop(win) {
  if (!user32 || !win || win.isDestroyed()) return;
  user32.SetWindowLongPtrW(hwndOf(win), GWLP_HWNDPARENT, 0);
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

module.exports = { sendToBack, attachToDesktop, detachFromDesktop, desktopIconsHidden, setDesktopIconsHidden };
