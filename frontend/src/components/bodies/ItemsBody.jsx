import { useRef, useState } from 'react';
import { displayName } from '../../lib/paths.js';
import { ITEM_MIME, pathsFromDrop } from '../../lib/drag.js';
import { hold } from '../../hooks/useClickThrough.js';
import Tile from '../Tile.jsx';

const labelOf = (item) => item.name ?? displayName(item.path);
const NO_SELECTION = new Set();
const LASSO_THRESHOLD = 4;

function sortItems(items, sort, usage) {
  if (sort === 'name') return [...items].sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'fr', { numeric: true }));
  if (sort === 'usage') return [...items].sort((a, b) => (usage[b.path] ?? 0) - (usage[a.path] ?? 0));
  return items;
}

// Les 3 éléments les plus ouverts (au moins 3 fois) reçoivent une pastille.
function hottest(items, usage) {
  const ranked = items.filter((it) => (usage[it.path] ?? 0) >= 3)
    .sort((a, b) => usage[b.path] - usage[a.path]);
  return new Set(ranked.slice(0, 3).map((it) => it.id));
}

const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

export default function ItemsBody({ fence, ctx }) {
  const [over, setOver] = useState(false);
  const [lasso, setLasso] = useState(null);
  const tileEls = useRef(new Map());

  const manual = fence.sort === 'manual';
  const items = sortItems(fence.items, fence.sort, ctx.usage);
  const hot = hottest(fence.items, ctx.usage);
  const mine = ctx.selection.fenceId === fence.id;
  const selected = mine ? new Set(ctx.selection.ids) : NO_SELECTION;

  const select = (e, item) => {
    const order = items.map((it) => it.id);
    const current = mine ? ctx.selection : { ids: [], anchor: null };
    let ids;
    if (e.ctrlKey || e.metaKey) {
      ids = current.ids.includes(item.id) ? current.ids.filter((id) => id !== item.id) : [...current.ids, item.id];
    } else if (e.shiftKey && order.includes(current.anchor)) {
      const a = order.indexOf(current.anchor);
      const b = order.indexOf(item.id);
      ids = order.slice(Math.min(a, b), Math.max(a, b) + 1);
    } else {
      ids = [item.id];
    }
    ctx.setSelection({ fenceId: fence.id, ids, anchor: e.shiftKey ? current.anchor : item.id });
  };

  // Lasso : glisser dans le vide de la zone sélectionne les éléments touchés.
  const startLasso = (e) => {
    if (e.button !== 0 || e.target.closest('.tile')) return;
    const additive = e.ctrlKey || e.shiftKey;
    const base = additive && mine ? ctx.selection.ids : [];
    const x0 = e.clientX;
    const y0 = e.clientY;
    let moved = false;
    hold(true);
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < LASSO_THRESHOLD) return;
      moved = true;
      const rect = {
        left: Math.min(x0, ev.clientX), top: Math.min(y0, ev.clientY),
        right: Math.max(x0, ev.clientX), bottom: Math.max(y0, ev.clientY),
      };
      setLasso(rect);
      const hit = [...tileEls.current].filter(([, el]) => intersects(rect, el.getBoundingClientRect())).map(([id]) => id);
      ctx.setSelection({ fenceId: fence.id, ids: [...new Set([...base, ...hit])], anchor: hit[0] ?? null });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      hold(false);
      setLasso(null);
      if (!moved && !additive) ctx.clearSelection();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const drop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    const moved = e.dataTransfer.getData(ITEM_MIME);
    if (moved) {
      const { fenceId, itemIds } = JSON.parse(moved);
      ctx.actions.moveItems(fenceId, itemIds, fence.id, index);
      return;
    }
    const paths = pathsFromDrop(e);
    if (paths.length) ctx.actions.addItems(fence.id, paths, index);
  };

  // Glisser un élément sélectionné emporte toute la sélection.
  const dragPayload = (item) => JSON.stringify({
    fenceId: fence.id,
    itemIds: selected.has(item.id) && selected.size > 1 ? ctx.selection.ids : [item.id],
  });

  return (
    <div
      className={`drop-area${over ? ' is-over' : ''}`}
      onPointerDown={startLasso}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
      onDrop={(e) => drop(e, fence.items.length)}
    >
      {items.length === 0 ? (
        <div className="empty">
          <small>Glissez ici vos applis, fichiers ou dossiers</small>
        </div>
      ) : (
        <div className="grid">
          {items.map((item, i) => (
            <Tile
              key={item.id}
              tileRef={(el) => (el ? tileEls.current.set(item.id, el) : tileEls.current.delete(item.id))}
              path={item.path}
              label={labelOf(item)}
              hot={hot.has(item.id)}
              selected={selected.has(item.id)}
              singleClick={ctx.singleClick}
              onOpen={() => ctx.openPath(item.path)}
              onSelect={(e) => select(e, item)}
              onMenu={(e) => ctx.onItemMenu(e, { fence, item, path: item.path })}
              dragData={[ITEM_MIME, dragPayload(item)]}
              onDrop={(e) => drop(e, manual ? i : fence.items.length)}
            />
          ))}
        </div>
      )}
      {lasso && (
        <div
          className="lasso"
          style={{ left: lasso.left, top: lasso.top, width: lasso.right - lasso.left, height: lasso.bottom - lasso.top }}
        />
      )}
    </div>
  );
}
