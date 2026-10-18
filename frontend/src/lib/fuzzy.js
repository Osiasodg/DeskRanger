// Même logique de score que backend/search.cjs : début de mot > milieu > lettres dans l'ordre.
function tokenScore(text, token) {
  const at = text.indexOf(token);
  if (at === 0) return 100;
  if (at > 0) return /[\s._\-()]/.test(text[at - 1]) ? 80 : 55;
  let j = 0;
  for (const ch of text) if (ch === token[j]) j++;
  return j === token.length ? 25 : -1;
}

/** Score ≥ 0 si tous les mots de la requête correspondent, -1 sinon. */
export function matchScore(text, query) {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const token of tokens) {
    const s = tokenScore(text, token);
    if (s < 0) return -1;
    score += s;
  }
  return score - text.length * 0.15;
}
