// @ts-nocheck
export function buildSuggestionLabel(entry) {
  if (!entry) return '';
  const city = (entry.cityBirth || '').trim();
  const uf = (entry.ufBirth || '').trim();
  if (!city && !uf) return '';
  if (city && uf) return `${city}/${uf}`;
  return city || uf;
}
