const NAME_RE = /^[A-Z' \-]+$/;

function stripAccents(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function validateName(
  raw: string,
  opts: { minWords?: number } = {},
): { value: string; invalid: boolean; warn: boolean } {
  const minWords = opts.minWords || 2;
  const value = normalizeName(raw);
  if (!value) return { value: '', invalid: false, warn: false };
  const normalized = stripAccents(value).toUpperCase();
  if (!NAME_RE.test(normalized)) return { value, invalid: true, warn: false };
  const words = value.split(' ').filter(Boolean);
  const warn = words.length < minWords;
  return { value, invalid: false, warn };
}

// Validação e normalização de nomes

export function normalizeName(raw: string): string {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidName(name: string): boolean {
  // Nome deve ter pelo menos 2 palavras e cada uma com pelo menos 2 letras
  const n = normalizeName(name);
  const parts = n.split(' ').filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((p) => {
    if (p.length < 2) return false;
    const normalized = stripAccents(p).toUpperCase();
    return NAME_RE.test(normalized);
  });
}
