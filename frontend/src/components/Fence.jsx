import { useRef, useState } from 'react';
import { hexToRgba } from '../lib/color.js';
import { clampGeometry, fenceGeometry, HEADER_H, snap } from '../lib/geometry.js';
import { hold } from '../hooks/useClickThrough.js';
import Icon from './Icons.jsx';
import ItemsBody from './bodies/ItemsBody.jsx';
import FolderBody from './bodies/FolderBody.jsx';
import RecentBody from './bodies/RecentBody.jsx';
import NoteBody from './bodies/NoteBody.jsx';

const BODIES = { items: ItemsBody, folder: FolderBody, recent: RecentBody, note: NoteBody };

function TitleInput({ value, onDone }) {
  return (
    <input
      className="title-input"
      autoFocus
      defaultValue={value}
      onFocus={(e) => e.target.select()}
      onBlur={(e) => onDone(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { e.currentTarget.value = value; e.currentTarget.blur(); }
      }}
    />
  );
}

export default function Fence({ fence, editMode, ctx }) {
  const [live, setLive] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [peek, setPeek] = useState(false);
  const leaveTimer = useRef();

  const actual = fenceGeometry(fence);
  const geo = live ?? actual;
  const open = !fence.collapsed || peek || editMode || !!live;
  const Body = BODIES[fence.type] ?? ItemsBody;

  function track(e, compute, extraPatch = {}) {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    const base = actual;
    let last = null;
    hold(true);
    const move = (ev) => {
      last = clampGeometry(compute(base, ev.clientX - start.x, ev.clientY - start.y));
      setLive(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      hold(false);
      setLive(null);
      if (last) ctx.actions.updateFence(fence.id, { ...last, ...extraPatch });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const onHeadDown = (e) => {
    if (renaming || e.target.closest('button, input')) return;
    ctx.actions.bringToFront(fence.id);
    track(e, (b, dx, dy) => ({ ...b, x: snap(b.x + dx), y: snap(b.y + dy) }));
  };
  // Redimensionner à la main désactive la taille automatique (réactivable dans ⋯).
  const onResizeDown = (e) => {
    e.stopPropagation();
    track(e, (b, dx, dy) => ({ ...b, w: snap(b.w + dx), h: snap(b.h + dy) }), { autoSize: false });
  };

  const finishRename = (value) => {
    setRenaming(false);
    const title = value.trim();
    if (title && title !== fence.title) ctx.actions.updateFence(fence.id, { title });
  };

  // « Roll-up » : une zone repliée se déroule au survol.
  const onEnter = () => {
    clearTimeout(leaveTimer.current);
    if (fence.collapsed) setPeek(true);
  };
  const onLeave = () => {
    leaveTimer.current = setTimeout(() => setPeek(false), 300);
  };

  const style = {
    left: geo.x,
    top: geo.y,
    width: geo.w,
    height: open ? geo.h : HEADER_H,
    '--fence-bg': hexToRgba(fence.color, fence.opacity),
    '--accent': fence.accent,
    '--radius': `${fence.radius}px`,
    '--icon': `${fence.iconSize}px`,
  };

  const classes = ['fence', 'hit', `fence-${fence.type}`];
  if (!open) classes.push('is-collapsed');
  if (live) classes.push('is-moving');

  return (
    <section
      className={classes.join(' ')}
      style={style}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onContextMenu={(e) => ctx.onFenceMenu(e, fence)}
    >
      <header
        className="fence-head"
        onPointerDown={onHeadDown}
        onDoubleClick={(e) => !e.target.closest('button') && setRenaming(true)}
        title="Glisser pour déplacer · double-clic pour renommer"
      >
        <span className="fence-dot" />
        {renaming
          ? <TitleInput value={fence.title} onDone={finishRename} />
          : <h2>{fence.title}</h2>}
        {fence.type === 'items' && (
          <span className="fence-count">
            {ctx.selection.fenceId === fence.id && ctx.selection.ids.length > 1
              ? `${ctx.selection.ids.length} / ${fence.items.length}`
              : fence.items.length}
          </span>
        )}
        {fence.type === 'items' && (
          <button className="icon-btn" title="Ajouter des éléments" onClick={(e) => ctx.onAddMenu(e, fence)}>
            <Icon name="plus" size={14} />
          </button>
        )}
        <button
          className={`icon-btn chevron${fence.collapsed ? ' is-up' : ''}`}
          title={fence.collapsed ? 'Garder déplié' : 'Replier (se déroule au survol)'}
          onClick={() => ctx.actions.updateFence(fence.id, { collapsed: !fence.collapsed })}
        >
          <Icon name="chevron" size={14} />
        </button>
        <button className="icon-btn" title="Personnaliser" onClick={() => ctx.onSettings(fence.id)}>
          <Icon name="dots" size={14} />
        </button>
      </header>

      {open && (
        <div className="fence-body">
          <Body fence={fence} ctx={ctx} />
        </div>
      )}
      {open && <div className="resize" onPointerDown={onResizeDown} title="Redimensionner" />}
    </section>
  );
}
