export type XmlKind = 'nascimento' | 'casamento' | 'obito';

function stripAccents(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value: string): string {
  return stripAccents(String(value || ''))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectXmlKind(xml: string): XmlKind {
  const upper = normalizeText(xml);
  if (upper.includes('LISTAREGISTROSCASAMENTO')) return 'casamento';
  if (upper.includes('LISTAREGISTROSOBITO')) return 'obito';
  return 'nascimento';
}
