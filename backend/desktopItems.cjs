// Fait disparaître du bureau Windows les éléments rangés dans une zone, sans les déplacer :
// on leur met l'attribut « caché » (l'Explorateur ne les affiche plus sur le bureau), et on
// le retire quand ils quittent toutes les zones.
//
// Garde-fous :
//  - seuls les éléments situés directement sur le Bureau (utilisateur ou public) sont touchés ;
//  - on ne réaffiche que ce que DeskRanger a lui-même caché (registre hidden-desktop-items.json),
//    jamais un fichier que l'utilisateur avait caché de son côté.
const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const FILE_ATTRIBUTE_HIDDEN = 0x2;
const INVALID_FILE_ATTRIBUTES = 0xffffffff;
const SHCNE_ATTRIBUTES = 0x00000800;
const SHCNE_UPDATEDIR = 0x00001000;
const SHCNF_PATHW = 0x0005;

let win32 = null;
if (process.platform === 'win32') {
  try {
    const koffi = require('koffi');
    const kernel32 = koffi.load('kernel32.dll');
    const shell32 = koffi.load('shell32.dll');
    win32 = {
      GetFileAttributesW: kernel32.func('__stdcall', 'GetFileAttributesW', 'uint32_t', ['str16']),
      SetFileAttributesW: kernel32.func('__stdcall', 'SetFileAttributesW', 'int', ['str16', 'uint32_t']),
      SHChangeNotify: shell32.func('__stdcall', 'SHChangeNotify', 'void', ['int32_t', 'uint32_t', 'str16', 'void *']),
    };
  } catch (err) {
    console.warn('[deskranger] masquage des éléments du bureau indisponible :', err.message);
  }
}

const registryPath = () => path.join(app.getPath('userData'), 'hidden-desktop-items.json');
const publicDesktop = () => path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop');
const desktopDirs = () => [app.getPath('desktop'), publicDesktop()].map((d) => d.toLowerCase());

/** Éléments cachés par DeskRanger : chemin en minuscules → chemin d'origine. */
let registry = null;

function loadRegistry() {
  if (registry) return registry;
  try {
    registry = new Map(JSON.parse(fs.readFileSync(registryPath(), 'utf8')).map((p) => [p.toLowerCase(), p]));
  } catch {
    registry = new Map();
  }
  return registry;
}

function saveRegistry() {
  try {
    fs.mkdirSync(path.dirname(registryPath()), { recursive: true });
    fs.writeFileSync(registryPath(), JSON.stringify([...registry.values()], null, 2), 'utf8');
  } catch (err) {
    console.error('[deskranger] registre des éléments cachés non enregistré :', err);
  }
}

const isOnDesktop = (p) => desktopDirs().includes(path.dirname(p).toLowerCase());

/** Attributs du fichier, ou null s'il n'existe plus. */
function attributes(p) {
  const value = win32.GetFileAttributesW(p);
  return value === INVALID_FILE_ATTRIBUTES ? null : value;
}

function setHidden(p, hidden) {
  const current = attributes(p);
  if (current === null) return false;
  const next = (hidden ? current | FILE_ATTRIBUTE_HIDDEN : current & ~FILE_ATTRIBUTE_HIDDEN) >>> 0;
  return next === current || win32.SetFileAttributesW(p, next) !== 0;
}

// Prévient l'Explorateur pour que le bureau se mette à jour tout de suite.
function notifyShell(changed) {
  for (const p of changed) win32.SHChangeNotify(SHCNE_ATTRIBUTES, SHCNF_PATHW, p, null);
  for (const dir of [app.getPath('desktop'), publicDesktop()]) win32.SHChangeNotify(SHCNE_UPDATEDIR, SHCNF_PATHW, dir, null);
}

/**
 * Aligne le bureau sur les zones : `zonedPaths` (éléments de toutes les zones) doivent être cachés
 * si `enabled`, tout ce que DeskRanger avait caché d'autre est réaffiché.
 * Renvoie les éléments qui demandent les droits administrateur (bureau public).
 */
function sync(zonedPaths, enabled) {
  if (!win32) return { failed: [], hidden: 0 };
  const reg = loadRegistry();
  const wanted = new Map(enabled ? zonedPaths.filter(isOnDesktop).map((p) => [p.toLowerCase(), p]) : []);
  const changed = [];
  const failed = [];

  for (const [key, p] of wanted) {
    if (reg.has(key)) continue;
    const attrs = attributes(p);
    // Fichier introuvable, ou déjà caché par l'utilisateur lui-même : on n'y touche pas.
    if (attrs === null || attrs & FILE_ATTRIBUTE_HIDDEN) continue;
    if (setHidden(p, true)) { reg.set(key, p); changed.push(p); } else failed.push({ path: p, hide: true });
  }
  for (const [key, p] of reg) {
    if (wanted.has(key)) continue;
    if (attributes(p) === null) { reg.delete(key); continue; }
    if (setHidden(p, false)) { reg.delete(key); changed.push(p); } else failed.push({ path: p, hide: false });
  }

  saveRegistry();
  if (changed.length) notifyShell(changed);
  return { failed, hidden: reg.size };
}

const ELEVATED_SCRIPT = `param([string]$List)
$items = Get-Content -Raw -Encoding UTF8 -LiteralPath $List | ConvertFrom-Json
foreach ($i in $items) {
  try {
    $f = Get-Item -LiteralPath $i.path -Force
    if ($i.hide) { $f.Attributes = $f.Attributes -bor [IO.FileAttributes]::Hidden }
    else { $f.Attributes = $f.Attributes -band (-bnot [IO.FileAttributes]::Hidden) }
  } catch {}
}
`;

/**
 * Applique les changements refusés (bureau public) avec les droits administrateur :
 * Windows affiche sa fenêtre de confirmation (UAC). Renvoie le nombre d'éléments traités.
 */
function syncElevated(items) {
  if (!win32 || !items.length) return Promise.resolve({ done: 0, failed: items.length });
  const dir = app.getPath('userData');
  const listFile = path.join(dir, 'pending-desktop-items.json');
  const scriptFile = path.join(dir, 'set-desktop-items.ps1');
  fs.writeFileSync(listFile, JSON.stringify(items), 'utf8');
  fs.writeFileSync(scriptFile, `\uFEFF${ELEVATED_SCRIPT}`, 'utf8');

  const inner = `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptFile}" -List "${listFile}"`;
  const command = `Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '${inner.replace(/'/g, "''")}'`;

  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-Command', command], { windowsHide: true }, () => {
      // Que l'utilisateur ait accepté ou refusé, on constate le résultat réel sur le disque.
      const reg = loadRegistry();
      let done = 0;
      for (const { path: p, hide } of items) {
        const attrs = attributes(p);
        const nowHidden = attrs !== null && (attrs & FILE_ATTRIBUTE_HIDDEN) !== 0;
        if (hide && nowHidden) { reg.set(p.toLowerCase(), p); done++; }
        if (!hide && (!nowHidden || attrs === null)) { reg.delete(p.toLowerCase()); done++; }
      }
      saveRegistry();
      notifyShell(items.map((i) => i.path));
      fs.rmSync(listFile, { force: true });
      resolve({ done, failed: items.length - done });
    });
  });
}

module.exports = { sync, syncElevated };
