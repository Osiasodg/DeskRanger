const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const filePath = () => path.join(app.getPath('userData'), 'layout.json');
// Avant d'être renommée DeskRanger, l'application s'appelait « Zones ».
const legacyFilePath = () => path.join(app.getPath('appData'), 'Zones', 'layout.json');

let state;

// Reprend la disposition de l'ancienne version si la nouvelle n'en a pas encore.
function migrateLegacyLayout() {
  const target = filePath();
  const legacy = legacyFilePath();
  if (fs.existsSync(target) || !fs.existsSync(legacy)) return;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(legacy, target);
  } catch (err) {
    console.error('[deskranger] reprise de l’ancienne disposition impossible :', err);
  }
}

function load() {
  if (state !== undefined) return state;
  migrateLegacyLayout();
  try {
    state = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
  } catch {
    state = null;
  }
  return state;
}

// Écriture atomique : on écrit un fichier temporaire puis on le renomme,
// pour ne jamais laisser une disposition à moitié écrite.
function save(next) {
  state = next;
  const target = filePath();
  const tmp = `${target}.tmp`;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(tmp, target);
  } catch (err) {
    console.error('[deskranger] sauvegarde impossible :', err);
  }
}

function settings() {
  return load()?.settings ?? {};
}

module.exports = { load, save, settings };
