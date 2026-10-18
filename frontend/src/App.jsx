import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api.js';
import { pathsFromDrop } from './lib/drag.js';
import { fenceGeometry, findFreeSpot, snap } from './lib/geometry.js';
import { baseName, displayName, extOf } from './lib/paths.js';
import { activeProfile, useAppState } from './state/useAppState.js';
import { createFence, createItem, SORT_CATEGORIES } from './state/defaults.js';
import { useClickThrough } from './hooks/useClickThrough.js';
import { useToasts } from './hooks/useToasts.js';
import Fence from './components/Fence.jsx';
import FenceSettings from './components/FenceSettings.jsx';
import SearchPalette from './components/SearchPalette.jsx';
import Dock from './components/Dock.jsx';
import ContextMenu from './components/ContextMenu.jsx';
import Dialog from './components/Dialog.jsx';
import Welcome from './components/Welcome.jsx';
import Toasts from './components/Toasts.jsx';
import QuickBar from './components/QuickBar.jsx';
import Help from './components/Help.jsx';

const NO_SELECTION = { fenceId: null, ids: [], anchor: null };

const ruleTokens =(rules) => rules.toLowerCase().split(/[\s,;]+/).filter(Boolean);

function matchesRules(entry, tokens) {
  const name = entry.name.toLowerCase();
  const ext = extOf(entry.path);
  return tokens.some((t) => {
    if (t === 'dossier') return entry.isDir;
    if (t.startsWith('.')) return !entry.isDir && ext === t;
    return name.includes(t);
  });
}

export default function App() {
  const [state, actions] = useAppState();
  const [editMode, setEditMode] = useState(false);
  const [visible, setVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [settingsFor, setSettingsFor] = useState(null);
  const [creating, setCreating] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selection, setSelection] = useState(NO_SELECTION);
  const { toasts, toast } = useToasts();

  useEffect(() => {
    const offs = [
      api.on('mode:toggle-edit', () => setEditMode((v) => !v)),
      api.on('fences:toggle', () => setVisible((v) => !v)),
      api.on('search:open', () => setSearchOpen(true)),
      api.on('help:open', () => setHelpOpen(true)),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const settingsKey = state ? JSON.stringify(state.settings) : '';
  useEffect(() => {
    if (settingsKey) api.applySettings(JSON.parse(settingsKey));
  }, [settingsKey]);

  const profile = state ? activeProfile(state) : null;
  const folderKey = profile
    ? profile.fences.filter((f) => f.type === 'folder' && f.folderPath).map((f) => f.folderPath).join('\n')
    : '';
  useEffect(() => {
    api.watchFolders(folderKey ? folderKey.split('\n') : []);
  }, [folderKey]);

  // Les éléments rangés dans une zone (tous bureaux confondus) disparaissent du bureau Windows.
  const zonedKey = state
    ? JSON.stringify([
      !!state.settings.hideZonedItems,
      ...new Set(state.profiles.flatMap((p) => p.fences.flatMap((f) => (f.type === 'items' ? f.items.map((it) => it.path) : [])))),
    ])
    : '';
  const elevationAsked = useRef(false);
  useEffect(() => {
    if (!zonedKey) return undefined;
    const [enabled, ...paths] = JSON.parse(zonedKey);
    const timer = setTimeout(async () => {
      const { failed } = await api.syncDesktop(paths, enabled);
      if (!failed.length || elevationAsked.current) return;
      // Le bureau public (partagé entre comptes) n'est modifiable qu'avec les droits administrateur.
      elevationAsked.current = true;
      const action = failed.some((f) => f.hide) ? 'masquer' : 'réafficher';
      setDialog({
        title: 'Autorisation Windows nécessaire',
        message: `${failed.length} élément${failed.length > 1 ? 's' : ''} (${failed.slice(0, 3).map((f) => displayName(f.path)).join(', ')}${failed.length > 3 ? '…' : ''}) `
          + `se trouvent sur le bureau commun à tous les comptes Windows. Pour les ${action}, Windows va demander `
          + 'votre autorisation administrateur.',
        confirmLabel: 'Autoriser',
        onSubmit: async () => {
          const result = await api.syncDesktopElevated(failed);
          toast(result.failed
            ? `${result.done} élément(s) traité(s), ${result.failed} refusé(s) par Windows`
            : `${result.done} élément${result.done > 1 ? 's' : ''} du bureau commun ${action === 'masquer' ? 'masqué' : 'réaffiché'}${result.done > 1 ? 's' : ''}`);
        },
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [zonedKey, toast]);
  // Réactiver l'option permet de redemander l'autorisation refusée plus tôt.
  useEffect(() => { elevationAsked.current = false; }, [state?.settings.hideZonedItems]);

  const captureAll = editMode || searchOpen || creating || helpOpen || !!menu || !!dialog || !!settingsFor || !!state?.firstRun;

  // F1 ouvre l'aide quand la fenêtre des zones a le focus.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'F1') return;
      e.preventDefault();
      setHelpOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (helpOpen) api.focusWindow(); }, [helpOpen]);
  useClickThrough(captureAll);

  useEffect(() => {
    if (!editMode || menu || dialog || settingsFor || searchOpen || helpOpen || selection.ids.length) return undefined;
    const onKey = (e) => e.key === 'Escape' && setEditMode(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode, menu, dialog, settingsFor, searchOpen, helpOpen, selection]);

  // Quand on clique ailleurs que dans les zones, la sélection est abandonnée.
  useEffect(() => {
    const clear = () => setSelection(NO_SELECTION);
    window.addEventListener('blur', clear);
    return () => window.removeEventListener('blur', clear);
  }, []);
  useEffect(() => setSelection(NO_SELECTION), [state?.activeProfile]);

  // Raccourcis clavier sur la sélection : Suppr, Entrée, Ctrl+A, Échap.
  const overlayOpen = !!menu || !!dialog || !!settingsFor || searchOpen || creating || helpOpen;
  useEffect(() => {
    if (!selection.ids.length || overlayOpen || !profile) return undefined;
    const fence = profile.fences.find((f) => f.id === selection.fenceId);
    if (!fence) return undefined;
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      const chosen = fence.items.filter((it) => selection.ids.includes(it.id));
      if (e.key === 'Delete') {
        actions.removeItems(fence.id, selection.ids);
        setSelection(NO_SELECTION);
        toast(`${chosen.length} élément${chosen.length > 1 ? 's' : ''} retiré${chosen.length > 1 ? 's' : ''} de « ${fence.title} »`);
      } else if (e.key === 'Enter') {
        chosen.forEach((it) => api.open(it.path).then((err) => !err && actions.bumpUsage(it.path)));
      } else if (e.key === 'a' && e.ctrlKey) {
        e.preventDefault();
        setSelection({ fenceId: fence.id, ids: fence.items.map((it) => it.id), anchor: null });
      } else if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setSelection(NO_SELECTION);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, overlayOpen, profile, actions, toast]);

  const dockActions = useMemo(() => ({
    ...actions,
    reindex: () => api.reindex().then(() => toast('Index de recherche mis à jour')),
    quit: api.quit,
  }), [actions, toast]);

  if (!state) return null;

  // ---- actions communes -------------------------------------------------

  const openMenu = (e, items) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, items });
  };
  const prompt = (title, value, onSubmit) => setDialog({ title, value, onSubmit, confirmLabel: 'Valider' });
  const confirm = (message, onSubmit, confirmLabel = 'Supprimer') =>
    setDialog({ title: 'Confirmer', message, onSubmit, confirmLabel, danger: true });

  const confirmClear = (fence) => confirm(
    `Retirer les ${fence.items.length} éléments de « ${fence.title} » ? Vos fichiers ne sont pas supprimés.`,
    () => { actions.clearFence(fence.id); setSelection(NO_SELECTION); },
    'Vider',
  );

  const openPath = async (path) => {
    const error = await api.open(path);
    if (error) toast(`Impossible d’ouvrir « ${displayName(path)} » : ${error}`, 'error');
    else actions.bumpUsage(path);
  };

  const addViaDialog = async (fence, kind) => {
    const paths = await api.pick(kind);
    if (paths.length) actions.addItems(fence.id, paths);
  };

  const pickFolder = async (fence) => {
    const [folder] = await api.pick('folder');
    if (!folder) return;
    const renamed = fence.title === 'Dossier' ? { title: baseName(folder) } : {};
    actions.updateFence(fence.id, { folderPath: folder, ...renamed });
  };

  const newFence = async (type, extra = {}) => {
    let overrides = extra;
    if (type === 'folder' && !extra.folderPath) {
      const [folder] = await api.pick('folder');
      if (!folder) return;
      overrides = { ...extra, folderPath: folder, title: baseName(folder), accent: '#22d3ee', color: '#0c4a6e' };
    }
    const fence = createFence(type, overrides);
    const { w, h } = fenceGeometry(fence);
    const spot = overrides.x === undefined ? findFreeSpot(profile.fences.map(fenceGeometry), w, h) : {};
    actions.addFence({ ...fence, ...spot });
    toast(`Zone « ${fence.title} » créée`);
  };

  // Déposer des fichiers dans le vide (mode édition) crée une zone à cet endroit.
  const dropOnDesk = (e) => {
    e.preventDefault();
    const paths = pathsFromDrop(e);
    if (!paths.length) return;
    newFence('items', {
      title: 'Nouvelle zone',
      x: snap(Math.max(0, e.clientX - 60)),
      y: snap(Math.max(0, e.clientY - 18)),
      items: paths.map(createItem),
    });
  };

  // Range tout le bureau : d'abord dans les zones dont une règle correspond, puis le reste
  // dans des zones par catégorie (réutilisées si une zone porte déjà ce nom, créées sinon).
  const autoSort = async () => {
    const itemFences = profile.fences.filter((f) => f.type === 'items');
    const ruled = itemFences
      .filter((f) => f.rules.trim())
      .map((f) => ({ fence: f, tokens: ruleTokens(f.rules) }));
    const byTitle = new Map(itemFences.map((f) => [f.title.trim().toLowerCase(), f]));
    const known = new Set(itemFences.flatMap((f) => f.items.map((it) => it.path.toLowerCase())));

    const toExisting = new Map(); // id de zone → chemins
    const toCreate = new Map();   // catégorie → chemins
    for (const entry of await api.desktopFiles()) {
      if (known.has(entry.path.toLowerCase())) continue;
      const match = ruled.find(({ tokens }) => matchesRules(entry, tokens));
      if (match) {
        toExisting.set(match.fence.id, [...(toExisting.get(match.fence.id) ?? []), entry.path]);
        continue;
      }
      const category = SORT_CATEGORIES.find((c) => !c.rules || matchesRules(entry, ruleTokens(c.rules)));
      const existing = byTitle.get(category.title.toLowerCase());
      if (existing) toExisting.set(existing.id, [...(toExisting.get(existing.id) ?? []), entry.path]);
      else toCreate.set(category, [...(toCreate.get(category) ?? []), entry.path]);
    }

    let count = 0;
    for (const [fenceId, paths] of toExisting) {
      actions.addItems(fenceId, paths);
      count += paths.length;
    }
    // Les nouvelles zones sont placées l'une après l'autre dans les espaces libres.
    const placed = profile.fences.map(fenceGeometry);
    for (const [category, paths] of toCreate) {
      const fence = createFence('items', {
        title: category.title, rules: category.rules, ...category.theme, items: paths.map(createItem),
      });
      const geo = fenceGeometry(fence);
      const spot = findFreeSpot(placed, geo.w, geo.h);
      placed.push({ ...geo, ...spot });
      actions.addFence({ ...fence, ...spot });
      count += paths.length;
    }

    const zones = toExisting.size + toCreate.size;
    toast(count
      ? `${count} élément${count > 1 ? 's' : ''} rangé${count > 1 ? 's' : ''} dans ${zones} zone${zones > 1 ? 's' : ''}`
        + (toCreate.size ? ` (${toCreate.size} créée${toCreate.size > 1 ? 's' : ''})` : '')
      : 'Tout le bureau est déjà rangé');
  };

  // ---- menus contextuels -------------------------------------------------

  const multiMenu = (e, fence, chosen) => {
    const n = chosen.length;
    const ids = chosen.map((it) => it.id);
    const targets = profile.fences.filter((f) => f.type === 'items' && f.id !== fence.id);
    openMenu(e, [
      { heading: `${n} éléments sélectionnés` },
      { label: `Ouvrir les ${n} éléments`, onClick: () => chosen.forEach((it) => openPath(it.path)) },
      targets.length > 0 && '-',
      targets.length > 0 && { heading: 'Déplacer vers' },
      ...targets.map((t) => ({
        label: t.title,
        onClick: () => { actions.moveItems(fence.id, ids, t.id); setSelection(NO_SELECTION); },
      })),
      '-',
      {
        label: `Retirer les ${n} éléments de la zone`,
        danger: true,
        onClick: () => { actions.removeItems(fence.id, ids); setSelection(NO_SELECTION); },
      },
    ]);
  };

  const itemMenu = (e, { fence, item, path }) => {
    if (item && selection.fenceId === fence.id && selection.ids.includes(item.id) && selection.ids.length > 1) {
      multiMenu(e, fence, fence.items.filter((it) => selection.ids.includes(it.id)));
      return;
    }
    if (item) setSelection({ fenceId: fence.id, ids: [item.id], anchor: item.id });
    const targets = profile.fences.filter((f) => f.type === 'items' && f.id !== fence.id);
    openMenu(e, [
      { label: 'Ouvrir', onClick: () => openPath(path) },
      { label: 'Afficher dans l’Explorateur', onClick: () => api.reveal(path) },
      item && {
        label: 'Renommer…',
        onClick: () => prompt('Renommer l’élément', item.name ?? displayName(path),
          (name) => actions.renameItem(fence.id, item.id, name === displayName(path) ? null : name)),
      },
      targets.length > 0 && '-',
      targets.length > 0 && { heading: item ? 'Déplacer vers' : 'Épingler dans' },
      ...targets.map((t) => ({
        label: t.title,
        onClick: () => (item ? actions.moveItems(fence.id, [item.id], t.id) : actions.addItems(t.id, [path])),
      })),
      item && '-',
      item && { label: 'Retirer de la zone', danger: true, onClick: () => actions.removeItems(fence.id, [item.id]) },
    ]);
  };

  const addMenu = (e, fence) => {
    e.stopPropagation();
    openMenu(e, [
      { label: 'Ajouter des fichiers ou raccourcis…', onClick: () => addViaDialog(fence, 'files') },
      { label: 'Ajouter des dossiers…', onClick: () => addViaDialog(fence, 'folders') },
      { label: 'Chercher et épingler…', onClick: () => setSearchOpen(true) },
    ]);
  };

  const fenceMenu = (e, fence) => openMenu(e, [
    fence.type === 'items' && { label: 'Ajouter des fichiers ou raccourcis…', onClick: () => addViaDialog(fence, 'files') },
    fence.type === 'items' && { label: 'Ajouter des dossiers…', onClick: () => addViaDialog(fence, 'folders') },
    fence.type === 'folder' && fence.folderPath && { label: 'Ouvrir le dossier', onClick: () => openPath(fence.folderPath) },
    fence.type === 'items' && fence.items.length > 0 && {
      label: 'Tout sélectionner',
      onClick: () => setSelection({ fenceId: fence.id, ids: fence.items.map((it) => it.id), anchor: null }),
    },
    fence.type === 'items' && fence.items.length > 0 && {
      label: 'Vider la zone…', danger: true, onClick: () => confirmClear(fence),
    },
    { label: 'Personnaliser…', onClick: () => setSettingsFor(fence.id) },
    { label: fence.collapsed ? 'Garder dépliée' : 'Replier', onClick: () => actions.updateFence(fence.id, { collapsed: !fence.collapsed }) },
    '-',
    { label: editMode ? 'Quitter le mode édition' : 'Mode édition', onClick: () => setEditMode((v) => !v) },
    { label: 'Rechercher…', onClick: () => setSearchOpen(true) },
  ]);

  const ctx = {
    actions,
    usage: state.usage,
    singleClick: state.settings.singleClick,
    selection,
    setSelection,
    clearSelection: () => setSelection(NO_SELECTION),
    openPath,
    pickFolder,
    onItemMenu: itemMenu,
    onFenceMenu: fenceMenu,
    onAddMenu: addMenu,
    onSettings: setSettingsFor,
  };

  const settingsFence = profile.fences.find((f) => f.id === settingsFor);
  const showFences = visible || editMode;

  return (
    <div className={`desk${editMode ? ' is-editing' : ''}${showFences ? '' : ' is-hidden'}`}>
      {editMode && (
        <div
          className="edit-backdrop hit"
          onDragOver={(e) => e.preventDefault()}
          onDrop={dropOnDesk}
          onContextMenu={(e) => openMenu(e, [
            { label: 'Nouvelle zone ici', onClick: () => newFence('items', { x: snap(e.clientX), y: snap(e.clientY) }) },
            { label: 'Quitter le mode édition', onClick: () => setEditMode(false) },
          ])}
        >
          <div className="edit-hint">
            Mode édition · déposez des fichiers dans le vide pour créer une zone · <kbd>Échap</kbd> pour terminer
          </div>
        </div>
      )}

      {profile.fences.map((fence) => (
        <Fence key={fence.id} fence={fence} editMode={editMode} ctx={ctx} />
      ))}

      {editMode && (
        <Dock
          state={state}
          actions={dockActions}
          openMenu={openMenu}
          prompt={prompt}
          confirm={confirm}
          onNewFence={(type) => newFence(type)}
          onAutoSort={autoSort}
          onSearch={() => setSearchOpen(true)}
          onHelp={() => setHelpOpen(true)}
          onExit={() => setEditMode(false)}
        />
      )}

      {showFences && !editMode && (
        <QuickBar
          creating={creating}
          setCreating={setCreating}
          onCreate={(overrides) => newFence('items', overrides)}
          onAutoSort={autoSort}
          onSearch={() => setSearchOpen(true)}
          onEdit={() => setEditMode(true)}
          onHelp={() => setHelpOpen(true)}
        />
      )}

      {settingsFence && (
        <FenceSettings
          fence={settingsFence}
          actions={actions}
          onPickFolder={pickFolder}
          onClear={() => confirmClear(settingsFence)}
          onClose={() => setSettingsFor(null)}
        />
      )}

      {searchOpen && (
        <SearchPalette
          profile={profile}
          usage={state.usage}
          onOpen={openPath}
          onReveal={api.reveal}
          onPin={(path, fenceId) => {
            actions.addItems(fenceId, [path]);
            const zone = profile.fences.find((f) => f.id === fenceId);
            toast(`« ${displayName(path)} » épinglé dans ${zone?.title ?? 'la zone'}`);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
      {dialog && <Dialog {...dialog} onClose={() => setDialog(null)} />}
      {state.firstRun && <Welcome onClose={actions.dismissWelcome} onHelp={() => setHelpOpen(true)} />}
      {helpOpen && <Help onClose={() => setHelpOpen(false)} />}
      <Toasts toasts={toasts} />
    </div>
  );
}
