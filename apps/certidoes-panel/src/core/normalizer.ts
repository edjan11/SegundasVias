export function stripAccents(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeWhitespace(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeUpper(value: string): string {
  return normalizeWhitespace(stripAccents(value)).toUpperCase();
}

export function digitsOnly(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}

export function normalizeCpf(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  return digits;
}

export function normalizeDate(value: string): string {
  const v = normalizeWhitespace(value);
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[1]}/${m[2]}/${m[3]}`;
}

export function safeLower(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}
