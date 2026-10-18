# DeskRanger

Zones semi-transparentes pour organiser le bureau Windows, dans l'esprit de Fences.
Electron + React + Vite.

## Lancer

```bash
npm install
npm run dev     # développement (rechargement à chaud)
npm start       # version compilée
npm run dist    # installateur Windows (.exe) dans release/
```

Sous Windows, on peut aussi double-cliquer sur `lancer.bat`.

> npm 11+ demande d'autoriser les scripts d'installation : `electron`, `koffi` et `esbuild`
> sont déjà approuvés dans `package.json` (`allowScripts`).

## Fonctionnalités

> Une **aide complète** est intégrée à l'application : touche **F1**, bouton **?** en bas à droite,
> ou menu de l'icône de notification → « Aide ».

- **Zones** déplaçables (par le titre), redimensionnables (coin bas-droit), renommables (double-clic),
  repliables : une zone repliée se déroule au survol.
- **Personnalisation** (bouton ⋯) : couleur de fond, couleur d'accent, opacité, taille des icônes, arrondi, tri.
- **4 types de zones**
  - *Raccourcis* : applis, fichiers, dossiers. Ajout par glisser-déposer (mode édition) ou bouton +.
    Réorganisation et déplacement entre zones par glisser-déposer.
  - *Portail vers un dossier* : affiche en direct le contenu d'un vrai dossier, navigation dans les sous-dossiers.
  - *Récents* : derniers fichiers modifiés dans Bureau, Téléchargements et Documents.
  - *Note* : pense-bête directement sur le bureau.
- **Recherche globale** : applications du menu Démarrer, fichiers des dossiers personnels et éléments des zones.
  `Entrée` ouvre, `Maj+Entrée` affiche dans l'Explorateur, `Ctrl+Entrée` épingle dans une zone.
- **Ranger le bureau** : classe les fichiers du bureau dans les zones selon leurs règles
  (extensions `.pdf`, mots du nom, ou `dossier`). Les fichiers ne sont jamais déplacés ni supprimés.
- **Bureaux multiples** (Travail, Jeux…) : chaque bureau a ses propres zones, on bascule depuis le dock.
- **Usage intelligent** : pastille sur les éléments les plus ouverts, tri « les plus utilisés », priorité en recherche.
- **Sélection multiple** : Ctrl+clic, Maj+clic, lasso (glisser dans le vide d'une zone), Ctrl+A.
  Puis Suppr (retirer), Entrée (ouvrir), glisser vers une autre zone, ou clic droit.
- **Vider une zone** : clic droit sur la zone ou ⋯ → « Vider la zone » (les fichiers restent intacts).
- **Reste visible avec Win+D** (« Afficher le bureau ») : la fenêtre est rattachée au bureau Windows.
- **Masquer les icônes Windows du bureau** (⚙ en mode édition) : seules les zones restent ;
  les icônes réapparaissent quand on quitte DeskRanger.
- Vraies icônes Windows en haute définition, identiques à l'Explorateur (`backend/shellIcon.cjs`),
  et vignettes pour les images.

## Raccourcis

| Action | Raccourci (le premier libre est retenu) |
| --- | --- |
| Rechercher | Ctrl+Alt+Espace, sinon Ctrl+Maj+Espace, sinon Ctrl+Alt+F |
| Mode édition | Ctrl+Alt+E, sinon Ctrl+Maj+E |
| Masquer / afficher | Ctrl+Alt+H, sinon Ctrl+Maj+H |

L'icône dans la zone de notification donne aussi accès à tout (clic = mode édition).

## Architecture

Le **backend** est le processus principal d'Electron (Node.js : fichiers, Windows, fenêtre).
Le **frontend** est l'interface React affichée dans la fenêtre. Ils communiquent par IPC
via `backend/preload.cjs`, qui expose `window.api` à l'interface.

```
backend/                  processus Electron (Node.js)
  main.cjs                fenêtre transparente plein écran, icône de notification, raccourcis, IPC
  preload.cjs             pont sécurisé window.api vers le frontend
  desktop.cjs             intégration au bureau (arrière-plan, masquage des icônes) via koffi
  shellIcon.cjs           icônes Windows haute définition
  files.cjs               ouverture, listing et surveillance de dossiers, fichiers récents
  search.cjs              index de recherche (menu Démarrer + dossiers personnels)
  store.cjs               sauvegarde de la disposition (%APPDATA%/DeskRanger/layout.json)
frontend/                 interface React (Vite)
  index.html
  src/
    App.jsx               orchestration, menus, rangement auto
    components/           zones, tuiles, recherche, dock, panneaux
    components/bodies/    contenu selon le type de zone
    hooks/                clic traversant, icônes, notifications
    lib/                  utilitaires (chemins, géométrie, recherche floue…)
    state/                état de l'application et valeurs par défaut
scripts/run-electron.cjs  lance Electron (utilisé par npm run dev / start)
```

La fenêtre couvre l'écran mais laisse passer les clics (`setIgnoreMouseEvents`). Elle ne les capte
qu'au-dessus des éléments marqués `.hit`.

## Limites connues

- Écran principal uniquement pour l'instant.
- Le flou d'arrière-plan du fond d'écran n'est pas possible par zone avec Electron :
  on joue sur l'opacité et l'ombre.
