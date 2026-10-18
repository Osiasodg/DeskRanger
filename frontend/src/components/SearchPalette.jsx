import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { matchScore } from '../lib/fuzzy.js';
import { displayName, parentDir } from '../lib/paths.js';
import { useIcon } from '../hooks/useIcon.js';
import Icon, { FileIcon } from './Icons.jsx';

const KIND_LABEL = { app: 'Application', folder: 'Dossier', file: 'Fichier' };

function ResultIcon({ path, label }) {
  const icon = useIcon(path);
  return <span className="result-icon"><FileIcon icon={icon} label={label} /></span>;
}

export default function SearchPalette({ profile, usage, onOpen, onReveal, onPin, onClose }) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState({ results: [], indexing: false, total: 0 });
  const [selected, setSelected] = useState(0);
  const targets = profile.fences.filter((f) => f.type === 'items');
  const [target, setTarget] = useState(targets[0]?.id ?? '');
  const listRef = useRef();

  useEffect(() => {
    api.focusWindow();
    api.search('').then(setRemote);
  }, []);

  useEffect(() => {
    setSelected(0);
    if (!query.trim()) return undefined;
    const timer = setTimeout(() => api.search(query).then(setRemote), 90);
    return () => clearTimeout(timer);
  }, [query]);

  const zoneItems = useMemo(() => profile.fences.flatMap((f) => (f.type === 'items'
    ? f.items.map((it) => ({ path: it.path, label: it.name ?? displayName(it.path), kind: 'zone', zone: f.title }))
    : [])), [profile]);

  // D'abord vos zones (bonus aux éléments souvent ouverts), puis l'index du PC.
  const results = useMemo(() => {
    const q = query.trim();
    const local = q
      ? zoneItems
        .map((it) => ({ ...it, score: matchScore(it.label.toLowerCase(), q) }))
        .filter((it) => it.score >= 0)
        .map((it) => ({ ...it, score: it.score + Math.min(30, (usage[it.path] ?? 0) * 3) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
      : [...zoneItems].filter((it) => usage[it.path])
        .sort((a, b) => usage[b.path] - usage[a.path]).slice(0, 8);
    if (!q) return local;
    const seen = new Set(local.map((it) => it.path.toLowerCase()));
    const rest = remote.results
      .filter((r) => !seen.has(r.path.toLowerCase()))
      .map((r) => ({
        path: r.path,
        label: r.kind === 'app' ? displayName(r.path) : r.name,
        kind: r.kind === 'app' ? 'app' : r.isDir ? 'folder' : 'file',
      }));
    return [...local, ...rest].slice(0, 40);
  }, [query, zoneItems, remote, usage]);

  useEffect(() => {
    listRef.current?.children[selected]?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const run = (result, e) => {
    if (e?.ctrlKey) {
      if (target) onPin(result.path, target);
      return;
    }
    if (e?.shiftKey) onReveal(result.path);
    else onOpen(result.path);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && results[selected]) { e.preventDefault(); run(results[selected], e); }
    else if (e.key === 'Escape') onClose();
  };

  const status = remote.indexing
    ? 'Indexation en cours…'
    : `${remote.total.toLocaleString('fr-FR')} éléments indexés`;

  return (
    <div className="modal-backdrop hit" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel palette" role="dialog" aria-label="Recherche">
        <div className="palette-input">
          <Icon name="search" size={18} />
          <input
            autoFocus
            value={query}
            placeholder="Rechercher une application, un fichier, un dossier…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>Échap</kbd>
        </div>

        {results.length > 0 && !query.trim() && <div className="palette-heading">Les plus utilisés</div>}
        <ul className="results" ref={listRef}>
          {results.map((r, i) => (
            <li key={`${r.kind}:${r.path}`}>
              <button
                className={`result${i === selected ? ' is-selected' : ''}`}
                onMouseEnter={() => setSelected(i)}
                onClick={(e) => run(r, e)}
              >
                <ResultIcon path={r.path} label={r.label} />
                <span className="result-text">
                  <span className="result-label">{r.label}</span>
                  <span className="result-path">{r.kind === 'app' ? 'Menu Démarrer' : parentDir(r.path)}</span>
                </span>
                <span className={`badge badge-${r.kind}`}>{r.kind === 'zone' ? r.zone : KIND_LABEL[r.kind]}</span>
                {r.kind !== 'zone' && targets.length > 0 && (
                  <span
                    className="icon-btn"
                    role="button"
                    title="Épingler dans la zone choisie (Ctrl+Entrée)"
                    onClick={(e) => { e.stopPropagation(); onPin(r.path, target); }}
                  >
                    <Icon name="pin" size={14} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {results.length === 0 && (
          <div className="palette-empty">
            {query.trim()
              ? (remote.indexing ? 'Indexation en cours, réessayez dans un instant…' : 'Aucun résultat')
              : 'Cherchez dans vos zones, vos applications et vos dossiers personnels.'}
          </div>
        )}

        <footer className="palette-footer">
          <span><kbd>↵</kbd> ouvrir</span>
          <span><kbd>⇧↵</kbd> afficher dans l’Explorateur</span>
          {targets.length > 0 && (
            <span>
              <kbd>Ctrl↵</kbd> épingler dans
              <select className="input input-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </span>
          )}
          <span className="palette-status">{status}</span>
        </footer>
      </div>
    </div>
  );
}
