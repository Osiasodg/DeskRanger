import { api } from './api.js';

/** Élément déjà rangé dans une zone (déplacement entre zones). */
export const ITEM_MIME = 'application/x-zones-item';
/** Fichier affiché par une zone Dossier ou Récents (copie d'un lien vers une zone). */
export const ENTRY_MIME = 'application/x-zones-entry';

/** Chemins déposés : depuis une zone Dossier/Récents ou depuis l'Explorateur Windows. */
export function pathsFromDrop(e) {
  const entry = e.dataTransfer.getData(ENTRY_MIME);
  if (entry) return [entry];
  return [...e.dataTransfer.files].map((file) => api.pathForFile(file)).filter(Boolean);
}
