export function replaceTagValue(xml: string, tag: string, value: string): string {
  const safeValue = value ?? '';
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g');
  if (!re.test(xml)) return xml;
  return xml.replace(re, `<${tag}>${safeValue}</${tag}>`);
}

export function ensureXmlHeader(xml: string): string {
  const trimmed = String(xml || '');
  if (trimmed.trim().startsWith('<?xml')) return trimmed;
  return `<?xml version="1.0"?>` + trimmed;
}

export function normalizeXmlWhitespace(xml: string): string {
  return String(xml || '')
    .replace(/>\\s+</g, '><')
    .trim();
}
