const PATHS = {
  plus: 'M12 5v14M5 12h14',
  chevron: 'M6 9l6 6 6-6',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  back: 'M15 18l-6-6 6-6',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  pin: 'M9 4h6l-1 6 4 3v2H6v-2l4-3zM12 15v6',
  check: 'M5 12l5 5 9-10',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
};

/** Icône de dossier façon Windows 11, utilisée pour tous les dossiers. */
export function FolderGlyph() {
  return (
    <svg className="folder-glyph" viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
      <path d="M4 12a4 4 0 0 1 4-4h11.5l4 5H40a4 4 0 0 1 4 4v3H4z" fill="#e8a317" />
      <path d="M4 18h40v20a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#ffc83d" />
      <path d="M4 18h40v2H4z" fill="#ffd970" />
    </svg>
  );
}

/** Icône d'un fichier : data URL, dossier dessiné, ou première lettre en repli. */
export function FileIcon({ icon, label }) {
  if (icon === 'folder') return <FolderGlyph />;
  if (icon) return <img src={icon} alt="" draggable={false} />;
  return <span className="tile-fallback">{label.slice(0, 1).toUpperCase()}</span>;
}

export default function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={name === 'dots' ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
