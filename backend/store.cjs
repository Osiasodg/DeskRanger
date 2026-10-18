const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const filePath = () => path.join(app.getPath('userData'), 'layout.json');

let state;

function load() {
  if (state !== undefined) return state;
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
    console.error('[zones] sauvegarde impossible :', err);
  }
}

function settings() {
  return load()?.settings ?? {};
}

module.exports = { load, save, settings };
