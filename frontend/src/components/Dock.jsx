import Icon from './Icons.jsx';

export default function Dock({ state, actions, openMenu, prompt, confirm, onNewFence, onAutoSort, onSearch, onExit }) {
  const { settings } = state;
  const check = (on) => (on ? '✓  ' : '      ');

  const profileMenu = (e, profile) => {
    e.preventDefault();
    openMenu(e, [
      { label: 'Renommer…', onClick: () => prompt('Renommer le bureau', profile.name, (name) => actions.renameProfile(profile.id, name)) },
      state.profiles.length > 1 && {
        label: 'Supprimer…',
        danger: true,
        onClick: () => confirm(`Supprimer le bureau « ${profile.name} » et ses zones ?`, () => actions.removeProfile(profile.id)),
      },
    ]);
  };

  const newMenu = (e) => openMenu(e, [
    { heading: 'Nouvelle zone' },
    { label: 'Zone de raccourcis — vos applis, fichiers, dossiers', onClick: () => onNewFence('items') },
    { heading: 'Zones spéciales' },
    { label: 'Dossier en direct — montre le contenu d’un dossier', onClick: () => onNewFence('folder') },
    { label: 'Fichiers récents — se remplit tout seul', onClick: () => onNewFence('recent') },
    { label: 'Note — un bloc-notes sur le bureau', onClick: () => onNewFence('note') },
  ]);

  const settingsMenu = (e) => openMenu(e, [
    { label: `${check(settings.hideDesktopIcons)}Masquer les icônes Windows du bureau`, onClick: () => actions.updateSettings({ hideDesktopIcons: !settings.hideDesktopIcons }) },
    { label: `${check(settings.alwaysOnTop)}Toujours au premier plan`, onClick: () => actions.updateSettings({ alwaysOnTop: !settings.alwaysOnTop }) },
    { label: `${check(settings.singleClick)}Ouvrir en un seul clic`, onClick: () => actions.updateSettings({ singleClick: !settings.singleClick }) },
    { label: `${check(settings.openAtLogin)}Lancer avec Windows`, onClick: () => actions.updateSettings({ openAtLogin: !settings.openAtLogin }) },
    '-',
    { label: 'Réindexer la recherche', onClick: () => actions.reindex() },
    { label: 'Quitter DeskRanger', danger: true, onClick: () => actions.quit() },
  ]);

  return (
    <div className="dock hit">
      <div className="dock-group" role="tablist" aria-label="Bureaux">
        {state.profiles.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === state.activeProfile}
            className={`chip${p.id === state.activeProfile ? ' is-active' : ''}`}
            onClick={() => actions.switchProfile(p.id)}
            onDoubleClick={() => prompt('Renommer le bureau', p.name, (name) => actions.renameProfile(p.id, name))}
            onContextMenu={(e) => profileMenu(e, p)}
          >
            {p.name}
          </button>
        ))}
        <button className="chip chip-add" title="Nouveau bureau (ex. Travail, Jeux)"
          onClick={() => prompt('Nouveau bureau', '', (name) => actions.addProfile(name))}>
          <Icon name="plus" size={13} />
        </button>
      </div>
      <span className="dock-sep" />
      <button className="btn" onClick={newMenu}><Icon name="plus" size={14} /> Zone</button>
      <button className="btn" onClick={onAutoSort} title="Range les fichiers du bureau selon les règles des zones">
        <Icon name="sparkle" size={14} /> Ranger le bureau
      </button>
      <button className="btn" onClick={onSearch}><Icon name="search" size={14} /> Rechercher</button>
      <button className="btn icon-only" onClick={settingsMenu} title="Réglages"><Icon name="gear" size={15} /></button>
      <button className="btn primary" onClick={onExit}><Icon name="check" size={14} /> Terminer</button>
    </div>
  );
}
