const { app } = require('electron');
const fsp = require('node:fs/promises');
const path = require('node:path');

const MAX_ENTRIES = 80000;
const SKIP = new Set(['node_modules', '.git', 'AppData', '$RECYCLE.BIN', '__pycache__', '.cache', 'venv', '.venv']);
const NOT_AN_APP = /uninstall|désinstaller|desinstaller|readme|help$/i;

let index = [];
let building = null;

async function walk(dir, depth, kind, out, seen) {
  if (out.length >= MAX_ENTRIES) return;
  let dirents;
  try { dirents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const d of dirents) {
    if (out.length >= MAX_ENTRIES) return;
    if (d.name.startsWith('.') || d.name === 'desktop.ini' || SKIP.has(d.name)) continue;
    const full = path.join(dir, d.name);
    const key = full.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const isDir = d.isDirectory();

    if (kind === 'app') {
      if (!isDir && /\.(lnk|url)$/i.test(d.name)) {
        const name = d.name.replace(/\.(lnk|url)$/i, '');
        if (!NOT_AN_APP.test(name)) out.push({ path: full, name, lower: name.toLowerCase(), isDir: false, kind });
      }
    } else {
      out.push({ path: full, name: d.name, lower: d.name.toLowerCase(), isDir, kind });
    }
    if (isDir && depth > 0) await walk(full, depth - 1, kind, out, seen);
  }
}

function rebuild() {
  if (building) return building;
  building = (async () => {
    const out = [];
    const seen = new Set();
    const startMenus = [
      path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    ];
    for (const dir of startMenus) await walk(dir, 4, 'app', out, seen);

    // Les applications du menu Démarrer apparaissent souvent en double : on garde un nom unique.
    const appNames = new Set();
    const apps = out.filter((e) => !appNames.has(e.lower) && appNames.add(e.lower));
    out.length = 0;
    out.push(...apps);

    for (const name of ['desktop', 'documents', 'downloads', 'pictures', 'music', 'videos']) {
      try { await walk(app.getPath(name), 5, 'file', out, seen); } catch { /* dossier absent */ }
    }
    index = out;
  })().finally(() => { building = null; });
  return building;
}

function tokenScore(text, token) {
  const at = text.indexOf(token);
  if (at === 0) return 100;
  if (at > 0) return /[\s._\-()]/.test(text[at - 1]) ? 80 : 55;
  let j = 0;
  for (const ch of text) if (ch === token[j]) j++;
  return j === token.length ? 25 : -1;
}

function query(q) {
  const tokens = String(q ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!index.length && !building) rebuild();
  const status = { indexing: !!building, total: index.length };
  if (!tokens.length) return { results: [], ...status };

  const scored = [];
  for (const entry of index) {
    let score = 0;
    for (const token of tokens) {
      const s = tokenScore(entry.lower, token);
      if (s < 0) { score = -1; break; }
      score += s;
    }
    if (score < 0) continue;
    score -= entry.lower.length * 0.15;
    if (entry.kind === 'app') score += 25;
    else if (entry.isDir) score += 5;
    scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 40).map(({ entry }) => ({
    path: entry.path, name: entry.name, isDir: entry.isDir, kind: entry.kind,
  }));
  return { results, ...status };
}

module.exports = { rebuild, query };
