import { useIcon } from '../hooks/useIcon.js';
import { FileIcon } from './Icons.jsx';

export default function Tile({
  path, label, sub, hot, selected, singleClick, onOpen, onSelect, onMenu, dragData, onDrop, tileRef,
}) {
  const icon = useIcon(path);

  // Ctrl/Maj + clic : sélection multiple. En mode double-clic, un clic simple sélectionne.
  const onClick = (e) => {
    if (onSelect && (e.ctrlKey || e.shiftKey || !singleClick)) onSelect(e);
    else if (singleClick) onOpen();
  };

  return (
    <button
      type="button"
      ref={tileRef}
      className={`tile${selected ? ' is-selected' : ''}`}
      title={path}
      aria-pressed={onSelect ? !!selected : undefined}
      onClick={onClick}
      onDoubleClick={singleClick ? undefined : onOpen}
      onContextMenu={(e) => { e.stopPropagation(); onMenu(e); }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(dragData[0], dragData[1]);
        e.dataTransfer.effectAllowed = 'copyMove';
      }}
      onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
      onDrop={onDrop}
    >
      <span className="tile-icon">
        <FileIcon icon={icon} label={label} />
        {hot && <i className="tile-hot" title="Souvent utilisé" />}
      </span>
      <span className="tile-label">{label}</span>
      {sub && <span className="tile-sub">{sub}</span>}
    </button>
  );
}
