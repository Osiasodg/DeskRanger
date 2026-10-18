import { useState } from 'react';
import { THEMES } from '../state/defaults.js';
import Icon from './Icons.jsx';

function CreatePanel({ onCreate, onClose }) {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState(THEMES[0]);

  const submit = (e) => {
    e.preventDefault();
    onCreate({ title: title.trim() || 'Nouvelle zone', ...theme });
    onClose();
  };

  return (
    <>
      <div className="catcher hit" onMouseDown={onClose} />
      <form className="panel create-panel hit" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <h3>Nouvelle zone</h3>
        <input
          className="input"
          autoFocus
          placeholder="Nom : IA, Docs, Jeux…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="swatches" role="radiogroup" aria-label="Couleur">
          {THEMES.map((t) => (
            <button
              key={t.accent}
              type="button"
              role="radio"
              aria-checked={t === theme}
              className={`swatch${t === theme ? ' is-active' : ''}`}
              style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.color})` }}
              onClick={() => setTheme(t)}
            />
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn primary">Créer</button>
        </div>
        <small>Glissez-y ensuite vos applis, fichiers ou dossiers.</small>
      </form>
    </>
  );
}

/** Petite barre toujours visible en bas à droite : créer une zone, ranger, rechercher, mode édition. */
export default function QuickBar({ creating, setCreating, onCreate, onAutoSort, onSearch, onEdit }) {
  return (
    <>
      {creating && <CreatePanel onCreate={onCreate} onClose={() => setCreating(false)} />}
      <div className="quickbar hit">
        <button className="qb-btn qb-main" title="Nouvelle zone" onClick={() => setCreating(!creating)}>
          <Icon name="plus" size={18} />
        </button>
        <button className="qb-btn" title="Ranger le bureau dans les zones" onClick={onAutoSort}>
          <Icon name="sparkle" size={16} />
        </button>
        <button className="qb-btn" title="Rechercher" onClick={onSearch}>
          <Icon name="search" size={16} />
        </button>
        <button className="qb-btn" title="Mode édition (organiser les zones)" onClick={onEdit}>
          <Icon name="edit" size={16} />
        </button>
      </div>
    </>
  );
}
