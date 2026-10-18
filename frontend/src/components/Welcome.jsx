import { useShortcuts } from '../hooks/useShortcuts.js';

const ACTIONS = [
  ['search', 'Rechercher partout (applis, fichiers, zones)'],
  ['edit', 'Mode édition : glisser des fichiers, créer et ranger des zones'],
  ['toggle', 'Masquer / afficher toutes les zones'],
];

export default function Welcome({ onClose, onHelp }) {
  const shortcut = useShortcuts();

  return (
    <div className="modal-backdrop hit">
      <div className="panel welcome">
        <h2>Bienvenue dans DeskRanger</h2>
        <p>Créez vos zones avec le bouton <strong>+</strong> en bas à droite, puis glissez-y vos applis,
          fichiers et dossiers. Déplacez une zone par son titre, renommez-la d’un double-clic.</p>
        <ul className="shortcut-list">
          {ACTIONS.map(([action, label]) => (
            <li key={action}><kbd>{shortcut(action)}</kbd><span>{label}</span></li>
          ))}
          <li><kbd>F1</kbd><span>Aide complète, à tout moment (ou bouton ? en bas à droite)</span></li>
        </ul>
        <p className="muted">Astuce : le bouton ✦ range automatiquement tout votre bureau dans des zones.
          L’icône DeskRanger dans la zone de notification donne accès à tout.</p>
        <div className="dialog-actions">
          <button className="btn" onClick={() => { onClose(); onHelp(); }}>Lire l’aide</button>
          <button className="btn primary" autoFocus onClick={onClose}>C’est parti</button>
        </div>
      </div>
    </div>
  );
}
