import { useEffect, useMemo, useRef, useState } from 'react';
import { useShortcuts } from '../hooks/useShortcuts.js';
import Icon from './Icons.jsx';

// Chaque section : un titre, des mots-clés pour le filtre, et son contenu.
// `shortcut(action)` donne le raccourci réellement actif sur ce PC.
const SECTIONS = [
  {
    id: 'start',
    title: 'Premiers pas',
    keywords: 'démarrer début présentation barre notification',
    body: (shortcut) => (
      <>
        <p>DeskRanger range votre bureau Windows dans des <strong>zones</strong> : des cadres
          semi-transparents qui regroupent vos applications, fichiers et dossiers (IA, Docs, Jeux…).</p>
        <h4>La petite barre en bas à droite</h4>
        <ul>
          <li><strong>+</strong> : créer une nouvelle zone (nom + couleur).</li>
          <li><strong>✦</strong> : ranger automatiquement tout le bureau dans des zones.</li>
          <li><strong>Loupe</strong> : rechercher une appli, un fichier ou un dossier.</li>
          <li><strong>Crayon</strong> : passer en mode édition (organiser les zones).</li>
          <li><strong>?</strong> : ouvrir cette aide (ou touche <kbd>F1</kbd>).</li>
        </ul>
        <h4>L’icône dans la zone de notification</h4>
        <p>À côté de l’horloge, l’icône DeskRanger (quatre carrés) donne accès à la recherche, au mode
          édition, au masquage des zones, à l’aide et permet de quitter. Un clic simple ouvre le mode édition.</p>
        <p>Les zones vivent sur le bureau, derrière vos fenêtres. Elles restent visibles même avec
          <kbd>Win</kbd> + <kbd>D</kbd> (« Afficher le bureau »). Pour toutes les masquer d’un coup :
          <kbd>{shortcut('toggle')}</kbd>.</p>
      </>
    ),
  },
  {
    id: 'zones',
    title: 'Créer et organiser les zones',
    keywords: 'créer déplacer redimensionner renommer replier dérouler taille automatique colonnes',
    body: () => (
      <>
        <h4>Créer une zone</h4>
        <p>Cliquez sur <strong>+</strong> en bas à droite, tapez un nom (ex. « IA »), choisissez une
          couleur, puis « Créer ». La zone apparaît dans un espace libre. Vous pouvez en créer autant que vous voulez.</p>
        <p>En mode édition, vous pouvez aussi <strong>déposer des fichiers dans le vide</strong> :
          une nouvelle zone est créée à cet endroit avec ces fichiers.</p>
        <h4>Déplacer</h4>
        <p>Attrapez la zone par sa <strong>barre de titre</strong> et faites-la glisser. Elle s’aligne
          sur une grille invisible pour rester bien rangée.</p>
        <h4>Renommer</h4>
        <p><strong>Double-cliquez sur le titre</strong>, tapez le nouveau nom, puis <kbd>Entrée</kbd>
          (<kbd>Échap</kbd> pour annuler).</p>
        <h4>Taille</h4>
        <p>Par défaut, une zone de raccourcis a une <strong>taille automatique</strong> : elle grandit
          à chaque élément ajouté, jusqu’à 4 éléments par ligne, puis s’allonge. Le maximum par ligne se
          règle dans <strong>⋯ → Éléments par ligne</strong>.</p>
        <p>Pour choisir la taille vous-même, tirez le <strong>coin en bas à droite</strong>. La taille
          automatique se désactive alors ; recochez-la dans ⋯ pour la retrouver.</p>
        <h4>Replier / dérouler</h4>
        <p>La flèche <strong>⌄</strong> du titre replie la zone : il ne reste que sa barre de titre.
          Une zone repliée se <strong>déroule au survol</strong> de la souris, puis se replie quand
          vous la quittez. Recliquez sur la flèche pour la garder ouverte.</p>
      </>
    ),
  },
  {
    id: 'style',
    title: 'Personnaliser une zone (⋯)',
    keywords: 'couleur opacité transparence icônes arrondi tri règles apparence personnaliser',
    body: () => (
      <>
        <p>Le bouton <strong>⋯</strong> du titre (ou clic droit → « Personnaliser… ») ouvre les réglages de la zone :</p>
        <ul>
          <li><strong>Nom</strong> de la zone.</li>
          <li><strong>Règles de rangement</strong> : ce que « Ranger le bureau » doit mettre dans cette zone
            (voir la section dédiée).</li>
          <li><strong>Fond</strong> et <strong>Accent</strong> : couleurs prédéfinies ou personnalisées
            (pastille arc-en-ciel). L’accent colore le point du titre, le liseré et la sélection.</li>
          <li><strong>Opacité</strong> : de totalement transparent (0 %) à presque opaque (95 %).</li>
          <li><strong>Taille des icônes</strong> : de 28 à 80 pixels.</li>
          <li><strong>Taille automatique</strong> et <strong>Éléments par ligne</strong>.</li>
          <li><strong>Arrondi</strong> des coins.</li>
          <li><strong>Tri</strong> : manuel (l’ordre que vous choisissez par glisser-déposer), par nom,
            ou les plus utilisés d’abord.</li>
        </ul>
        <p>Chaque changement s’applique et s’enregistre immédiatement.</p>
      </>
    ),
  },
  {
    id: 'add',
    title: 'Ajouter des applis, fichiers et dossiers',
    keywords: 'ajouter glisser déposer drag raccourci icône épingler disparaît bureau caché masquer',
    body: () => (
      <>
        <h4>Par glisser-déposer</h4>
        <p>Faites glisser des éléments depuis le bureau ou l’Explorateur Windows et lâchez-les sur une zone.
          Si le dépôt ne réagit pas, passez d’abord en <strong>mode édition</strong> (crayon) : la fenêtre
          accepte alors les dépôts partout.</p>
        <h4>Par le bouton + d’une zone</h4>
        <p>Le <strong>+</strong> dans le titre d’une zone propose : ajouter des fichiers ou raccourcis,
          ajouter des dossiers, ou chercher et épingler.</p>
        <h4>Depuis la recherche</h4>
        <p>Dans la recherche, le bouton <strong>punaise</strong> d’un résultat (ou <kbd>Ctrl</kbd> + <kbd>Entrée</kbd>)
          l’épingle dans la zone choisie en bas de la fenêtre.</p>
        <h4>Ce que contient une zone</h4>
        <p>Une zone contient des <strong>liens</strong> vers vos éléments : rien n’est déplacé sur le disque,
          et retirer un élément d’une zone ne supprime jamais le fichier. Chaque élément garde sa
          <strong> vraie icône Windows</strong> en haute définition ; les images affichent un aperçu.
          Un même élément n’est jamais ajouté deux fois dans la même zone.</p>
        <h4>L’élément disparaît du bureau</h4>
        <p>Un élément du bureau rangé dans une zone <strong>n’apparaît plus sur le bureau Windows</strong> :
          il n’est visible que dans sa zone. Le fichier n’est pas déplacé, DeskRanger le marque simplement
          comme « caché ». Dès que vous le retirez de toutes les zones, il réapparaît sur le bureau.
          Les éléments rangés dans aucune zone restent visibles normalement.</p>
        <p>Certains raccourcis (souvent les navigateurs, Acrobat, Zoom…) sont sur le <strong>bureau commun
          à tous les comptes Windows</strong> : pour ceux-là, Windows demande une fois votre autorisation administrateur.
          Si vous refusez, ils restent simplement visibles sur le bureau.</p>
      </>
    ),
  },
  {
    id: 'items',
    title: 'Ouvrir et gérer les éléments',
    keywords: 'ouvrir double clic clic droit renommer déplacer retirer explorateur pastille',
    body: () => (
      <>
        <p><strong>Double-cliquez</strong> sur un élément pour l’ouvrir (ou un seul clic si vous avez activé
          « Ouvrir en un seul clic » dans les réglages).</p>
        <h4>Clic droit sur un élément</h4>
        <ul>
          <li><strong>Ouvrir</strong>.</li>
          <li><strong>Afficher dans l’Explorateur</strong> : ouvre le dossier qui le contient, élément sélectionné.</li>
          <li><strong>Renommer…</strong> : change le nom affiché dans la zone (le vrai fichier garde son nom).</li>
          <li><strong>Déplacer vers</strong> une autre zone.</li>
          <li><strong>Retirer de la zone</strong>.</li>
        </ul>
        <h4>Réorganiser</h4>
        <p>Faites glisser un élément sur un autre pour le placer avant lui, ou sur une autre zone pour l’y déplacer
          (en tri « manuel »).</p>
        <h4>Pastille colorée</h4>
        <p>Les 3 éléments que vous ouvrez le plus (au moins 3 fois) portent une petite pastille. Ils remontent aussi
          en tête de la recherche et du tri « les plus utilisés ».</p>
      </>
    ),
  },
  {
    id: 'select',
    title: 'Sélection multiple',
    keywords: 'sélectionner plusieurs ctrl maj lasso tout supprimer',
    body: () => (
      <>
        <table className="help-table">
          <tbody>
            <tr><td><strong>Clic</strong></td><td>sélectionne un élément</td></tr>
            <tr><td><kbd>Ctrl</kbd> + clic</td><td>ajoute ou retire un élément de la sélection</td></tr>
            <tr><td><kbd>Maj</kbd> + clic</td><td>sélectionne tout entre deux éléments</td></tr>
            <tr><td><strong>Lasso</strong></td><td>cliquez dans le vide d’une zone et glissez pour encadrer des éléments
              (avec <kbd>Ctrl</kbd> : ajoute à la sélection)</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>A</kbd></td><td>sélectionne toute la zone (ou clic droit → « Tout sélectionner »)</td></tr>
          </tbody>
        </table>
        <h4>Avec une sélection</h4>
        <table className="help-table">
          <tbody>
            <tr><td><kbd>Suppr</kbd></td><td>retire les éléments de la zone</td></tr>
            <tr><td><kbd>Entrée</kbd></td><td>ouvre tous les éléments</td></tr>
            <tr><td><strong>Glisser</strong></td><td>déplace toute la sélection vers une autre zone</td></tr>
            <tr><td><strong>Clic droit</strong></td><td>ouvrir, déplacer vers…, retirer</td></tr>
            <tr><td><kbd>Échap</kbd></td><td>annule la sélection</td></tr>
          </tbody>
        </table>
        <p>Le compteur du titre affiche alors « sélectionnés / total ». La sélection s’efface quand vous cliquez ailleurs.</p>
      </>
    ),
  },
  {
    id: 'clear',
    title: 'Vider ou supprimer une zone',
    keywords: 'vider effacer supprimer zone retirer tout',
    body: () => (
      <>
        <h4>Vider une zone</h4>
        <p>Clic droit sur la zone → <strong>« Vider la zone… »</strong>, ou ⋯ → « Vider la zone ». Après confirmation,
          tous ses éléments sont retirés ; la zone reste en place, vide.</p>
        <h4>Supprimer une zone</h4>
        <p>⋯ → <strong>« Supprimer la zone »</strong>, puis confirmez.</p>
        <p className="help-note">Dans les deux cas, <strong>vos fichiers ne sont jamais supprimés</strong> :
          seuls les liens de la zone disparaissent.</p>
      </>
    ),
  },
  {
    id: 'sort',
    title: 'Ranger le bureau automatiquement',
    keywords: 'ranger trier automatique règles catégories bureau',
    body: () => (
      <>
        <p>Le bouton <strong>✦</strong> (petite barre, ou « Ranger le bureau » en mode édition) place
          <strong> tous</strong> les éléments du bureau qui ne sont encore dans aucune zone :</p>
        <ol>
          <li>d’abord dans <strong>vos zones dont une règle correspond</strong> ;</li>
          <li>sinon dans une zone de sa <strong>catégorie</strong> : Applications, Dossiers, Documents, Images,
            Médias, Archives, ou Autres pour tout le reste. Si une zone porte déjà ce nom, elle est réutilisée ;
            sinon elle est créée.</li>
        </ol>
        <h4>Écrire des règles (⋯ → Règles de rangement)</h4>
        <ul>
          <li>une <strong>extension</strong> : <code>.pdf .docx .xlsx</code></li>
          <li>un <strong>mot du nom</strong> : <code>facture</code> prend « Facture EDF.pdf »</li>
          <li><code>dossier</code> : prend tous les dossiers</li>
        </ul>
        <p>Exemple : une zone « Cours » avec la règle <code>cours td examen</code> récupère tous les fichiers dont le
          nom contient l’un de ces mots.</p>
        <p className="help-note">Rien n’est déplacé sur le disque : les zones contiennent des liens, et les éléments
          rangés disparaissent simplement du bureau Windows (ils y reviennent si vous les retirez des zones).
          Après un rangement complet, votre bureau est donc propre.</p>
      </>
    ),
  },
  {
    id: 'search',
    title: 'Rechercher',
    keywords: 'recherche chercher trouver index applications fichiers épingler',
    body: (shortcut) => (
      <>
        <p>Ouvrez la recherche avec <kbd>{shortcut('search')}</kbd>, la loupe de la petite barre, ou l’icône de
          notification. Tapez quelques lettres : pas besoin du nom exact (« vsc » trouve « Visual Studio Code »).</p>
        <h4>Où DeskRanger cherche</h4>
        <ul>
          <li>dans <strong>vos zones</strong> (en premier) ;</li>
          <li>les <strong>applications du menu Démarrer</strong> ;</li>
          <li>vos dossiers <strong>Bureau, Documents, Téléchargements, Images, Musique et Vidéos</strong>.</li>
        </ul>
        <table className="help-table">
          <tbody>
            <tr><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>choisir un résultat</td></tr>
            <tr><td><kbd>Entrée</kbd></td><td>ouvrir</td></tr>
            <tr><td><kbd>Maj</kbd> + <kbd>Entrée</kbd></td><td>afficher dans l’Explorateur</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>Entrée</kbd></td><td>épingler dans la zone choisie en bas</td></tr>
            <tr><td><kbd>Échap</kbd></td><td>fermer</td></tr>
          </tbody>
        </table>
        <p>Sans rien taper, la recherche propose vos <strong>éléments les plus utilisés</strong>. L’index se met à jour
          tout seul toutes les 15 minutes ; pour le forcer : mode édition → ⚙ → « Réindexer la recherche ».</p>
      </>
    ),
  },
  {
    id: 'special',
    title: 'Zones spéciales',
    keywords: 'dossier en direct récents note pense-bête portail',
    body: () => (
      <>
        <p>En plus des zones de raccourcis, le mode édition → <strong>+ Zone</strong> propose trois zones particulières :</p>
        <h4>Dossier en direct</h4>
        <p>Affiche le contenu réel d’un dossier de votre PC, comme une petite fenêtre de l’Explorateur posée sur le
          bureau. Si un fichier est ajouté au dossier, il apparaît tout seul. Double-cliquez sur un sous-dossier pour y
          entrer, la flèche ‹ pour revenir. Clic droit sur un élément → « Épingler dans » pour le copier dans une zone.</p>
        <h4>Fichiers récents</h4>
        <p>Se remplit automatiquement avec les 30 derniers fichiers modifiés dans Bureau, Téléchargements et Documents,
          avec l’heure de modification. Mise à jour chaque minute.</p>
        <h4>Note</h4>
        <p>Un bloc-notes posé sur le bureau : liste de tâches, numéro, mot de passe Wi-Fi… Le texte est enregistré
          automatiquement.</p>
      </>
    ),
  },
  {
    id: 'edit',
    title: 'Mode édition et bureaux multiples',
    keywords: 'mode édition dock profils bureaux travail jeux',
    body: (shortcut) => (
      <>
        <p>Le <strong>mode édition</strong> (crayon, <kbd>{shortcut('edit')}</kbd>, ou clic sur l’icône de notification)
          assombrit légèrement l’écran et affiche une grille. Il sert à organiser : la fenêtre accepte les dépôts de
          fichiers partout, et un <strong>dock</strong> apparaît en bas de l’écran. <kbd>Échap</kbd> ou « Terminer » pour en sortir.</p>
        <h4>Le dock</h4>
        <ul>
          <li><strong>Bureaux</strong> (pastilles à gauche) : chaque bureau a ses propres zones, par exemple
            « Travail » et « Jeux ». Cliquez pour changer de bureau, <strong>+</strong> pour en créer un,
            double-clic pour renommer, clic droit pour supprimer.</li>
          <li><strong>+ Zone</strong> : zone de raccourcis ou zone spéciale.</li>
          <li><strong>Ranger le bureau</strong>, <strong>Rechercher</strong>, <strong>Aide</strong>.</li>
          <li><strong>⚙</strong> : réglages (section suivante).</li>
        </ul>
        <p>Clic droit dans le vide en mode édition → « Nouvelle zone ici ».</p>
      </>
    ),
  },
  {
    id: 'settings',
    title: 'Réglages',
    keywords: 'réglages paramètres premier plan clic démarrage windows icônes masquer quitter',
    body: () => (
      <>
        <p>Mode édition → <strong>⚙</strong> :</p>
        <ul>
          <li><strong>Retirer du bureau les éléments rangés</strong> (activé par défaut) : un élément placé dans une
            zone disparaît du bureau Windows ; les autres restent visibles. Décochez pour que tout réapparaisse.</li>
          <li><strong>Masquer toutes les icônes du bureau</strong> : cache d’un coup <em>toutes</em> les icônes Windows,
            même celles rangées dans aucune zone (comme le clic droit → Affichage de Windows). Elles réapparaissent
            quand vous quittez DeskRanger.</li>
          <li><strong>Toujours au premier plan</strong> : les zones restent au-dessus de toutes les fenêtres.</li>
          <li><strong>Ouvrir en un seul clic</strong> au lieu du double-clic.</li>
          <li><strong>Lancer avec Windows</strong> (version installée uniquement).</li>
          <li><strong>Réindexer la recherche</strong>.</li>
          <li><strong>Quitter DeskRanger</strong>.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'keys',
    title: 'Raccourcis clavier',
    keywords: 'raccourcis clavier touches',
    body: (shortcut) => (
      <>
        <table className="help-table">
          <tbody>
            <tr><td><kbd>{shortcut('search')}</kbd></td><td>Rechercher (partout dans Windows)</td></tr>
            <tr><td><kbd>{shortcut('edit')}</kbd></td><td>Mode édition (partout dans Windows)</td></tr>
            <tr><td><kbd>{shortcut('toggle')}</kbd></td><td>Masquer / afficher les zones (partout dans Windows)</td></tr>
            <tr><td><kbd>F1</kbd></td><td>Cette aide</td></tr>
            <tr><td><kbd>Échap</kbd></td><td>Fermer un panneau, annuler la sélection, quitter le mode édition</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>A</kbd></td><td>Tout sélectionner dans une zone</td></tr>
            <tr><td><kbd>Suppr</kbd></td><td>Retirer les éléments sélectionnés</td></tr>
            <tr><td><kbd>Entrée</kbd></td><td>Ouvrir les éléments sélectionnés</td></tr>
          </tbody>
        </table>
        <p>Les trois premiers raccourcis fonctionnent même quand DeskRanger est en arrière-plan. Si une combinaison est
          déjà prise par un autre logiciel, DeskRanger choisit automatiquement la suivante : ceux affichés ici sont ceux
          actifs sur votre PC.</p>
      </>
    ),
  },
  {
    id: 'faq',
    title: 'Questions fréquentes',
    keywords: 'problème dépannage aide sauvegarde données sécurité disparu',
    body: (shortcut) => (
      <>
        <h4>Mes zones ont disparu</h4>
        <p>Vérifiez qu’elles ne sont pas masquées : <kbd>{shortcut('toggle')}</kbd>. Vérifiez aussi le bureau actif
          dans le dock du mode édition. Si DeskRanger est fermé, relancez-le depuis le menu Démarrer.</p>
        <h4>Un élément ne s’ouvre plus</h4>
        <p>Le fichier a sans doute été déplacé ou supprimé. Retirez-le de la zone et ajoutez-le à nouveau.</p>
        <h4>Est-ce que DeskRanger peut supprimer mes fichiers ?</h4>
        <p>Non. Il ne déplace, ne renomme et ne supprime jamais rien sur le disque : les zones ne contiennent que des liens.
          Il se contente de marquer comme « cachés » les éléments du bureau rangés dans une zone.</p>
        <h4>Un fichier a disparu de mon bureau</h4>
        <p>Il est rangé dans une zone : cherchez-le avec la recherche. Pour le remettre sur le bureau, retirez-le de la zone,
          ou décochez « Retirer du bureau les éléments rangés » (mode édition → ⚙) pour tout faire réapparaître.
          Si vous avez activé « Afficher les éléments masqués » dans l’Explorateur, les éléments rangés restent visibles
          en semi-transparent.</p>
        <h4>Où sont enregistrées mes zones ?</h4>
        <p>Dans <code>%APPDATA%\DeskRanger\layout.json</code>, enregistré automatiquement à chaque changement.</p>
        <h4>Les icônes du bureau ne réapparaissent pas</h4>
        <p>Si DeskRanger a été fermé brutalement alors qu’il masquait les icônes : clic droit sur le bureau →
          Affichage → cochez « Afficher les icônes du bureau ».</p>
        <h4>Windows affiche « Windows a protégé votre ordinateur » à l’installation</h4>
        <p>C’est normal pour une application sans certificat payant : « Informations complémentaires » → « Exécuter quand même ».</p>
      </>
    ),
  },
];

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Help({ onClose }) {
  const shortcut = useShortcuts();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(SECTIONS[0].id);
  const contentRef = useRef();

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return q ? SECTIONS.filter((s) => normalize(`${s.title} ${s.keywords}`).includes(q)) : SECTIONS;
  }, [query]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const goTo = (id) => {
    setActive(id);
    contentRef.current?.querySelector(`#help-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Le sommaire suit la section en cours de lecture.
  const onScroll = () => {
    const box = contentRef.current;
    const top = box.getBoundingClientRect().top;
    const current = [...box.querySelectorAll('section[data-id]')]
      .filter((el) => el.getBoundingClientRect().top - top < 80)
      .pop();
    if (current) setActive(current.dataset.id);
  };

  return (
    <div className="modal-backdrop hit help-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel help" role="dialog" aria-label="Aide de DeskRanger">
        <header className="help-head">
          <h2>Aide de DeskRanger</h2>
          <label className="help-filter">
            <Icon name="search" size={14} />
            <input
              autoFocus
              placeholder="Filtrer : couleur, lasso, ranger…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button className="icon-btn" title="Fermer (Échap)" onClick={onClose}>✕</button>
        </header>
        <div className="help-main">
          <nav className="help-nav" aria-label="Sommaire">
            {visible.map((s) => (
              <button key={s.id} className={s.id === active ? 'is-active' : ''} onClick={() => goTo(s.id)}>
                {s.title}
              </button>
            ))}
          </nav>
          <div className="help-content" ref={contentRef} onScroll={onScroll}>
            {visible.length === 0 && <p className="muted">Aucune section ne correspond à « {query} ».</p>}
            {visible.map((s) => (
              <section key={s.id} id={`help-${s.id}`} data-id={s.id}>
                <h3>{s.title}</h3>
                {s.body(shortcut)}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
