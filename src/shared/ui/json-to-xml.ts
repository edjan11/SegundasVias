function escapeXml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function jsonToXml(obj: unknown, nodeName: string, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== 'object') return `${pad}<${nodeName}>${escapeXml(String(obj))}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => jsonToXml(item, nodeName, indent)).join('\n');
  const children = Object.keys(obj as Record<string, unknown>)
    .map((key) => jsonToXml((obj as Record<string, unknown>)[key], key, indent + 1))
    .join('\n');
  return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}
