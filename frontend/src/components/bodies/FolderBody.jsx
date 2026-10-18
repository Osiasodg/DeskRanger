import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { ENTRY_MIME } from '../../lib/drag.js';
import { baseName, parentDir } from '../../lib/paths.js';
import Icon from '../Icons.jsx';
import Tile from '../Tile.jsx';

// « Portail » : la zone affiche en direct le contenu d'un vrai dossier,
// et on peut naviguer dans ses sous-dossiers sans ouvrir l'Explorateur.
export default function FolderBody({ fence, ctx }) {
  const [sub, setSub] = useState(null);
  const [entries, setEntries] = useState(undefined);
  const [reload, setReload] = useState(0);
  const current = sub ?? fence.folderPath;

  useEffect(() => { setSub(null); }, [fence.folderPath]);

  useEffect(() => {
    if (!current) return undefined;
    let alive = true;
    const load = () => api.listFolder(current).then((list) => alive && setEntries(list));
    load();
    const off = api.on('folder:changed', (p) => p === current && load());
    return () => { alive = false; off(); };
  }, [current, reload]);

  if (!fence.folderPath) {
    return (
      <div className="empty">
        <p>Aucun dossier relié</p>
        <button className="btn" onClick={() => ctx.pickFolder(fence)}>Choisir un dossier…</button>
      </div>
    );
  }

  const goUp = () => {
    const up = parentDir(current);
    setSub(up.length <= fence.folderPath.length ? null : up);
  };

  return (
    <>
      <div className="crumbs">
        {sub && (
          <button className="icon-btn" title="Dossier parent" onClick={goUp}><Icon name="back" size={14} /></button>
        )}
        <span className="crumbs-name" title={current}>{baseName(current)}</span>
        <span className="crumbs-count">{entries ? entries.length : ''}</span>
        <button className="icon-btn" title="Actualiser" onClick={() => setReload((n) => n + 1)}>
          <Icon name="refresh" size={13} />
        </button>
      </div>
      {entries === undefined && <div className="empty"><small>Chargement…</small></div>}
      {entries === null && <div className="empty"><p>Dossier introuvable</p><small>{current}</small></div>}
      {entries?.length === 0 && <div className="empty"><small>Dossier vide</small></div>}
      {entries?.length > 0 && (
        <div className="grid">
          {entries.map((entry) => (
            <Tile
              key={entry.path}
              path={entry.path}
              label={entry.name}
              singleClick={ctx.singleClick}
              onOpen={() => (entry.isDir ? setSub(entry.path) : ctx.openPath(entry.path))}
              onMenu={(e) => ctx.onItemMenu(e, { fence, path: entry.path })}
              dragData={[ENTRY_MIME, entry.path]}
            />
          ))}
        </div>
      )}
    </>
  );
}
