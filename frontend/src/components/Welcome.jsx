import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const ACTIONS = [
  ['search', 'Rechercher partout (applis, fichiers, zones)'],
  ['edit', 'Mode édition : glisser des fichiers, créer et ranger des zones'],
  ['toggle', 'Masquer / afficher toutes les zones'],
];

const KEY_NAMES = { Control: 'Ctrl', Space: 'Espace' };
const formatAccelerator = (accel) => accel.split('+').map((k) => KEY_NAMES[k] ?? k).join(' + ');

export default function Welcome({ onClose }) {
  const [shortcuts, setShortcuts] = useState({});

  useEffect(() => { api.shortcuts().then(setShortcuts); }, []);

  return (
    <div className="modal-backdrop hit">
      <div className="panel welcome">
        <h2>Bienvenue dans Zones</h2>
        <p>Créez vos zones avec le bouton <strong>+</strong> en bas à droite, puis glissez-y vos applis,
          fichiers et dossiers. Déplacez une zone par son titre, renommez-la d’un double-clic.</p>
        <ul className="shortcut-list">
          {ACTIONS.map(([action, label]) => (
            <li key={action}>
              <kbd>{shortcuts[action] ? formatAccelerator(shortcuts[action]) : 'indisponible'}</kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <p className="muted">Astuce : en mode édition, déposez des fichiers dans le vide pour créer une zone,
          et utilisez « Ranger le bureau » pour classer automatiquement vos icônes. L’icône Zones dans la zone
          de notification donne accès à tout.</p>
        <div className="dialog-actions">
          <button className="btn primary" autoFocus onClick={onClose}>C’est parti</button>
        </div>
      </div>
    </div>
  );
}
