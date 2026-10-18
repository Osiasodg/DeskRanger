export const baseName = (p) => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

// Les raccourcis s'affichent sans leur extension, comme sur le bureau Windows.
export const displayName = (p) => baseName(p).replace(/\.(lnk|url)$/i, '');

export const extOf = (p) => {
  const match = /\.([^.\\/]+)$/.exec(p);
  return match ? `.${match[1].toLowerCase()}` : '';
};

export const parentDir = (p) => p.replace(/[\\/][^\\/]+[\\/]?$/, '');

export function relativeTime(ms) {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hier' : `il y a ${days} j`;
}
