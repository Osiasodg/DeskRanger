import { useState } from 'react';
import { fenceGeometry } from '../lib/geometry.js';
import { ACCENTS, COLORS, FENCE_TYPES } from '../state/defaults.js';

const PANEL_W = 290;
const PANEL_H = 540;

function Swatches({ label, value, options, onChange }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="swatches">
        {options.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch${color === value ? ' is-active' : ''}`}
            style={{ background: color }}
            title={color}
            onClick={() => onChange(color)}
          />
        ))}
        <label className="swatch swatch-custom" title="Couleur personnalisée">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
      </div>
    </div>
  );
}

function Range({ label, value, min, max, step = 1, format = String, onChange }) {
  return (
    <label className="field">
      <span className="field-label">{label}<output>{format(value)}</output></span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export default function FenceSettings({ fence, actions, onPickFolder, onClear, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch) => actions.updateFence(fence.id, patch);

  const { w } = fenceGeometry(fence);
  const fitsRight = fence.x + w + 12 + PANEL_W < window.innerWidth;
  const left = fitsRight ? fence.x + w + 12 : Math.max(8, fence.x - PANEL_W - 12);
  const top = Math.min(Math.max(8, fence.y), Math.max(8, window.innerHeight - PANEL_H));

  return (
    <>
      <div className="catcher hit" onMouseDown={onClose} />
      <div className="panel settings hit" style={{ left, top, width: PANEL_W }}>
        <h3>Zone · {FENCE_TYPES[fence.type]}</h3>

        <label className="field">
          <span className="field-label">Nom</span>
          <input className="input" value={fence.title} onChange={(e) => set({ title: e.target.value })} />
        </label>

        {fence.type === 'folder' && (
          <div className="field">
            <span className="field-label">Dossier relié</span>
            <div className="path-row">
              <span className="path" title={fence.folderPath ?? ''}>{fence.folderPath ?? '—'}</span>
              <button className="btn" onClick={() => onPickFolder(fence)}>Changer…</button>
            </div>
          </div>
        )}

        {fence.type === 'items' && (
          <label className="field">
            <span className="field-label">Règles de rangement</span>
            <input className="input" placeholder=".pdf .docx facture dossier" value={fence.rules}
              onChange={(e) => set({ rules: e.target.value })} />
            <small>Extensions, mots du nom, ou « dossier ». Utilisées par « Ranger le bureau ».</small>
          </label>
        )}

        <Swatches label="Fond" value={fence.color} options={COLORS} onChange={(color) => set({ color })} />
        <Swatches label="Accent" value={fence.accent} options={ACCENTS} onChange={(accent) => set({ accent })} />

        <Range label="Opacité" value={fence.opacity} min={0} max={0.95} step={0.05}
          format={(v) => `${Math.round(v * 100)} %`} onChange={(opacity) => set({ opacity })} />
        {fence.type !== 'note' && (
          <Range label="Taille des icônes" value={fence.iconSize} min={28} max={80} step={4}
            format={(v) => `${v} px`} onChange={(iconSize) => set({ iconSize })} />
        )}
        {fence.type === 'items' && (
          <label className="field field-check">
            <input type="checkbox" checked={fence.autoSize} onChange={(e) => set({ autoSize: e.target.checked })} />
            <span>Taille automatique selon le nombre d’éléments</span>
          </label>
        )}
        {fence.type === 'items' && fence.autoSize && (
          <Range label="Éléments par ligne (max)" value={fence.maxCols} min={1} max={8}
            onChange={(maxCols) => set({ maxCols })} />
        )}
        <Range label="Arrondi" value={fence.radius} min={0} max={28}
          format={(v) => `${v} px`} onChange={(radius) => set({ radius })} />

        {fence.type === 'items' && (
          <label className="field">
            <span className="field-label">Tri</span>
            <select className="input" value={fence.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="manual">Manuel (glisser-déposer)</option>
              <option value="name">Par nom</option>
              <option value="usage">Les plus utilisés d’abord</option>
            </select>
          </label>
        )}

        <div className="settings-footer">
          {fence.type === 'items' && fence.items.length > 0 && !confirmDelete && (
            <button className="btn ghost" onClick={onClear}>Vider la zone ({fence.items.length})</button>
          )}
          {confirmDelete ? (
            <div className="confirm-row">
              <span>Supprimer « {fence.title} » ?</span>
              <button className="btn danger" onClick={() => { actions.removeFence(fence.id); onClose(); }}>Supprimer</button>
              <button className="btn" onClick={() => setConfirmDelete(false)}>Annuler</button>
            </div>
          ) : (
            <button className="btn ghost danger-text" onClick={() => setConfirmDelete(true)}>Supprimer la zone</button>
          )}
          <small>Vos fichiers ne sont jamais supprimés : seule la zone l’est.</small>
        </div>
      </div>
    </>
  );
}
