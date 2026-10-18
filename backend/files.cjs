const { app, shell, nativeImage } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { shellIcon } = require('./shellIcon.cjs');

const HIDDEN = /^(desktop\.ini|thumbs\.db|~\$.*|\..*)$/i;
const ICON_CACHE_MAX = 800;
const FOLDER_LIMIT = 500;

const iconCache = new Map();

const IMAGE_EXT = /\.(png|jpe?g|gif|bmp|webp|heic|tiff?)$/i;

// 1. aperçu réel pour les images ; 2. icône Windows identique à l'Explorateur ;
// 3. replis si l'intégration Windows est indisponible.
async function loadIcon(p) {
  if (IMAGE_EXT.test(p)) {
    try {
      const img = await nativeImage.createThumbnailFromPath(p, { width: 128, height: 128 });
      if (!img.isEmpty()) return img.toDataURL();
    } catch { /* pas de vignette : on passe à l'icône */ }
  }
  try {
    const url = shellIcon(p);
    if (url) return url;
  } catch (err) {
    console.warn('[deskranger] icône système en échec :', p, err.message);
  }
  // app.getFileIcon donne une icône de disque pour les dossiers : l'interface dessine la sienne.
  const stat = await fsp.stat(p).catch(() => null);
  if (stat?.isDirectory() && path.parse(p).root !== p) return 'folder';
  try {
    const img = await app.getFileIcon(p, { size: 'large' });
    if (!img.isEmpty()) return img.toDataURL();
  } catch { /* fichier introuvable */ }
  return null;
}

async function icon(p) {
  if (iconCache.has(p)) return iconCache.get(p);
  const pending = loadIcon(p);
  iconCache.set(p, pending);
  if (iconCache.size > ICON_CACHE_MAX) iconCache.delete(iconCache.keys().next().value);
  const url = await pending;
  if (!url) iconCache.delete(p);
  return url;
}

async function open(p) {
  const error = await shell.openPath(p);
  return error || null;
}

function toEntry(dir, dirent) {
  return { path: path.join(dir, dirent.name), name: dirent.name, isDir: dirent.isDirectory() };
}

async function listFolder(dir) {
  try {
    const dirents = await fsp.readdir(dir, { withFileTypes: true });
    return dirents
      .filter((d) => !HIDDEN.test(d.name))
      .map((d) => toEntry(dir, d))
      .sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name, 'fr', { numeric: true }))
      .slice(0, FOLDER_LIMIT);
  } catch {
    return null;
  }
}

const watchers = new Map();

function watchFolders(paths, onChange) {
  const wanted = new Set(paths);
  for (const [p, watcher] of watchers) {
    if (!wanted.has(p)) { watcher.close(); watchers.delete(p); }
  }
  for (const p of wanted) {
    if (watchers.has(p)) continue;
    try {
      let timer;
      const watcher = fs.watch(p, { persistent: false }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => onChange(p), 300);
      });
      watcher.on('error', () => { watcher.close(); watchers.delete(p); });
      watchers.set(p, watcher);
    } catch { /* dossier inaccessible : la zone affichera l'erreur */ }
  }
}

// Fichiers modifiés récemment dans les dossiers personnels (premier niveau seulement).
async function recent(limit = 24) {
  const roots = ['desktop', 'downloads', 'documents'].map((name) => app.getPath(name));
  const found = [];
  await Promise.all(roots.map(async (root) => {
    const dirents = await fsp.readdir(root, { withFileTypes: true }).catch(() => []);
    await Promise.all(dirents
      .filter((d) => d.isFile() && !HIDDEN.test(d.name))
      .map(async (d) => {
        const full = path.join(root, d.name);
        const stat = await fsp.stat(full).catch(() => null);
        if (stat) found.push({ path: full, name: d.name, isDir: false, mtime: stat.mtimeMs });
      }));
  }));
  return found.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}

// Contenu du bureau de l'utilisateur et du bureau public (pour « Ranger le bureau »).
async function desktopFiles() {
  const publicDesktop = path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop');
  const lists = await Promise.all([app.getPath('desktop'), publicDesktop].map(listFolder));
  return lists.flatMap((list) => list ?? []);
}

module.exports = { icon, open, listFolder, watchFolders, recent, desktopFiles };
