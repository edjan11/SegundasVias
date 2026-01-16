// @ts-nocheck
export function isRequiredFilled(value) {
  return String(value || '').trim().length > 0;
}
