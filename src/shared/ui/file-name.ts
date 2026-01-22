function normalizePart(value?: string): string {
  return String(value || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeOficio(value?: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/\d+/);
  if (match) return `${match[0]} OFICIO`;
  return normalizePart(raw);
}

export function buildCertidaoFileName(opts: {
  nome?: string;
  oficio?: string;
  ext: string;
  fallback?: string;
}): string {
  const nome = normalizePart(opts.nome);
  const oficio = normalizeOficio(opts.oficio);
  const base = [nome, oficio].filter(Boolean).join(' - ');
  const safeBase = base || normalizePart(opts.fallback || 'certidao');
  const ext = String(opts.ext || '').replace(/^\./, '') || 'txt';
  return `${safeBase}.${ext}`;
}

export function readOficioValue(select: HTMLSelectElement | null): string {
  if (!select) return '';
  const value = String(select.value || '').trim();
  if (value) return value;
  const opt = select.selectedOptions?.[0];
  return String(opt?.textContent || '').trim();
}
