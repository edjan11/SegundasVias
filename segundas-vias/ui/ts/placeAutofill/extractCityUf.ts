// @ts-nocheck
export function extractCityUfFromText(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  const patterns = [
    /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s*\/\s*([A-Za-z]{2})\s*$/u,
    /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s*-\s*([A-Za-z]{2})\s*$/u,
    /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s+([A-Za-z]{2})\s*$/u
  ];
  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) {
      const city = match[1].replace(/\s+/g, ' ').trim();
      const uf = match[2].toUpperCase();
      return { city, uf };
    }
  }
  return null;
}


