export const GRID = 8;
export const HEADER_H = 36;
const MIN_W = 160;
const MIN_H = 96;

export const snap = (v) => Math.round(v / GRID) * GRID;

/** Garde une zone dans l'écran et au-dessus de sa taille minimale. */
export function clampGeometry({ x, y, w, h }) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const width = Math.min(Math.max(w, MIN_W), W);
  const height = Math.min(Math.max(h, MIN_H), H);
  return {
    x: Math.min(Math.max(x, 0), W - Math.min(width, 120)),
    y: Math.min(Math.max(y, 0), H - HEADER_H),
    w: width,
    h: height,
  };
}

// Dimensions d'une tuile (voir .tile et .grid dans styles.css).
const TILE_EXTRA_W = 36;   // marge autour de l'icône (minmax de la grille)
const TILE_EXTRA_H = 51;   // padding + espace + 2 lignes de libellé + bordure
const GRID_GAP = 2;
const BODY_PAD_X = 16;
const BODY_PAD_Y = 16;
const BORDER = 2;
const SLACK = 4;
const AUTO_MIN_W = 200;
const EMPTY_H = 64;

/**
 * Position et taille réelles d'une zone. Une zone de raccourcis en « taille automatique »
 * s'ajuste au nombre d'éléments : elle s'élargit jusqu'à `maxCols` colonnes, puis s'allonge.
 */
export function fenceGeometry(fence) {
  const { x, y } = fence;
  if (fence.type !== 'items' || !fence.autoSize) return { x, y, w: fence.w, h: fence.h };

  const tileW = fence.iconSize + TILE_EXTRA_W + GRID_GAP;
  const tileH = fence.iconSize + TILE_EXTRA_H + GRID_GAP;
  const count = fence.items.length;
  const cols = Math.max(1, Math.min(fence.maxCols, count));
  const w = Math.max(AUTO_MIN_W, cols * tileW + BODY_PAD_X + BORDER + SLACK);
  const fit = Math.max(1, Math.floor((w - BODY_PAD_X - BORDER) / tileW));
  const content = count ? Math.ceil(count / fit) * tileH : EMPTY_H;
  const maxH = Math.max(MIN_H, window.innerHeight - y - 8);
  return { x, y, w, h: Math.min(HEADER_H + BODY_PAD_Y + content + BORDER + SLACK, maxH) };
}

const overlaps =(a, b, gap = 12) =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/** Premier emplacement libre (de gauche à droite, de haut en bas) pour une nouvelle zone. */
export function findFreeSpot(fences, w, h) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  for (let y = 24; y + h <= H - 24; y += 24) {
    for (let x = 24; x + w <= W - 24; x += 24) {
      const candidate = { x, y, w, h };
      if (!fences.some((f) => overlaps(candidate, f))) return { x, y };
    }
  }
  const step = (fences.length % 8) * 24;
  return { x: 48 + step, y: 48 + step };
}
