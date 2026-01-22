import { CertidaoTipo, NormalizedCertidao, SearchIndex } from '../domain';
import { stripAccents, normalizeWhitespace } from '../normalizer';

function normalizeForSearch(value: string): string {
  return stripAccents(normalizeWhitespace(value)).toLowerCase();
}

function collectValues(obj: any, out: string[]): void {
  if (!obj) return;
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    out.push(String(obj));
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectValues(item, out));
    return;
  }
  Object.values(obj).forEach((v) => collectValues(v, out));
}

// Pure indexer boundary; can be exposed via HTTP as a search preparation service later.
export function buildSearchIndex(tipo: CertidaoTipo, data: NormalizedCertidao): SearchIndex {
  const values: string[] = [];
  collectValues(data.registro, values);
  collectValues(data.certidao, values);
  const text = normalizeForSearch(values.join(' '));

  const fields: Record<string, string> = {
    matricula: normalizeForSearch(String((data.registro || {}).matricula || '')),
    cns: normalizeForSearch(String((data.certidao || {}).cartorio_cns || '')),
    data_registro: normalizeForSearch(String((data.registro || {}).data_registro || '')),
  };

  return { id: data.id, tipo, text, fields };
}

export type SearchQuery = {
  q?: string;
  termo?: string;
  livro?: string;
  matricula?: string;
  cns?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
};

export function searchItems(items: SearchIndex[], query: SearchQuery) {
  const q = normalizeForSearch(query.q || '');
  const matricula = normalizeForSearch(query.matricula || '');
  const cns = normalizeForSearch(query.cns || '');
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Math.min(200, Number(query.limit || 20)));

  let filtered = items;
  if (q) filtered = filtered.filter((i) => i.text.includes(q));
  if (matricula) filtered = filtered.filter((i) => i.fields.matricula.includes(matricula));
  if (cns) filtered = filtered.filter((i) => i.fields.cns.includes(cns));

  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  return { total, page, limit, items: filtered.slice(start, end) };
}
