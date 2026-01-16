// @ts-nocheck
const NAME_RE = /^[A-Za-zÀ-ÿ' -]+$/;

export function normalizeName(raw) {
  return String(raw || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateName(raw, opts = {}) {
  const minWords = opts.minWords || 2;
  const value = normalizeName(raw);
  if (!value) return { value: '', invalid: false, warn: false };
  if (!NAME_RE.test(value)) return { value, invalid: true, warn: false };
  const words = value.split(' ').filter(Boolean);
  const warn = words.length < minWords;
  return { value, invalid: false, warn };
}
