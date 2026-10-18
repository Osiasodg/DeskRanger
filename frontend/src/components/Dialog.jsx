import { useState } from 'react';

/** Boîte de saisie (si `value` est fourni) ou de confirmation. */
export default function Dialog({ title, message, value, confirmLabel = 'Valider', danger, onSubmit, onClose }) {
  const [text, setText] = useState(value ?? '');
  const withInput = value !== undefined;

  const submit = (e) => {
    e.preventDefault();
    if (withInput && !text.trim()) return;
    onSubmit(text.trim());
    onClose();
  };

  return (
    <div className="modal-backdrop hit" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="panel dialog" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        {withInput && (
          <input className="input" autoFocus value={text} onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.target.select()} />
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button type="submit" className={`btn ${danger ? 'danger' : 'primary'}`} autoFocus={!withInput}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
