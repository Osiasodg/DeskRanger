import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { ENTRY_MIME } from '../../lib/drag.js';
import { relativeTime } from '../../lib/paths.js';
import Tile from '../Tile.jsx';

const REFRESH_MS = 60 * 1000;

// Zone intelligente : les derniers fichiers modifiés dans Bureau, Téléchargements et Documents.
export default function RecentBody({ fence, ctx }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.recent(30).then((list) => alive && setEntries(list ?? []));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  if (!entries) return <div className="empty"><small>Chargement…</small></div>;
  if (!entries.length) return <div className="empty"><small>Aucun fichier récent</small></div>;

  return (
    <div className="grid">
      {entries.map((entry) => (
        <Tile
          key={entry.path}
          path={entry.path}
          label={entry.name}
          sub={relativeTime(entry.mtime)}
          singleClick={ctx.singleClick}
          onOpen={() => ctx.openPath(entry.path)}
          onMenu={(e) => ctx.onItemMenu(e, { fence, path: entry.path })}
          dragData={[ENTRY_MIME, entry.path]}
        />
      ))}
    </div>
  );
}
