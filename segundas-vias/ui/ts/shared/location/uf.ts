// @ts-nocheck
const UF_LIST = new Set([
  'AC','AL','AP','AM','BA','BR','CE','DF','ES','ET','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO','IG'
]);

export function normalizeUf(raw, opts = {}) {
  const forceIg = !!opts.forceIg;
  const allowIg = opts.allowIg !== false;
  const value = String(raw || '').trim().toUpperCase();
  if (!value) return forceIg ? 'IG' : '';
  if (UF_LIST.has(value)) return value;
  if (allowIg && value === 'IG') return 'IG';
  return forceIg ? 'IG' : '';
}
