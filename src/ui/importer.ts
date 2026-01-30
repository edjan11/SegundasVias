import { assertIsCertificatePayload } from './payload/apply-payload';
import { parseCasamentoXmlToPayload, parseNascimentoXmlToPayload } from './payload/xml-to-payload';
import Papa from 'papaparse';
import { mapCsvRowToPayload } from '../shared/import-export/csv-to-payload';

export type ImportResult = {
  ok: boolean;
  kind: 'nascimento' | 'casamento' | 'obito';
  sourceFormat: 'json' | 'xml' | 'csv';
  raw: string;
  payload?: any;
  errors?: string[];
};

function stripAccents(value: string): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value: string): string {
  return stripAccents(String(value || ''))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectXmlKind(xml: string): ImportResult['kind'] {
  const upper = normalizeText(xml);
  if (upper.includes('LISTAREGISTROSCASAMENTO')) return 'casamento';
  if (upper.includes('LISTAREGISTROSOBITO')) return 'obito';
  return 'nascimento';
}

export async function readImportFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  const trimmed = text.trim();
  const isXml = trimmed.startsWith('<');

  if (!isXml) {
    try {
      const parsed = JSON.parse(text);
      const payload = parsed?.payload ? parsed.payload : parsed;
      const check = assertIsCertificatePayload(payload);
      if (!check.ok) {
        return {
          ok: false,
          kind: 'nascimento',
          sourceFormat: 'json',
          raw: text,
          errors: check.errors,
        };
      }
      const kind = String(payload?.certidao?.tipo_registro || 'nascimento').toLowerCase() as ImportResult['kind'];
      return { ok: true, kind, sourceFormat: 'json', raw: text, payload };
    } catch (e) {
      // If not JSON, attempt CSV heuristic
      const looksLikeCsv = trimmed.includes(',') && trimmed.includes('\n');
      if (looksLikeCsv) {
        try {
          const parsed = Papa.parse(trimmed, { header: true, skipEmptyLines: true });
          const rows = parsed?.data || [];
          if (!rows || rows.length === 0) {
            return {
              ok: false,
              kind: 'nascimento',
              sourceFormat: 'csv',
              raw: text,
              errors: ['CSV vazio ou invalido'],
            };
          }
          const payload = mapCsvRowToPayload(rows[0]);
          const kind = String(payload?.certidao?.tipo_registro || 'nascimento').toLowerCase() as ImportResult['kind'];
          return { ok: true, kind, sourceFormat: 'csv', raw: text, payload };
        } catch (csvErr) {
          return {
            ok: false,
            kind: 'nascimento',
            sourceFormat: 'csv',
            raw: text,
            errors: ['Falha ao parsear CSV'],
          };
        }
      }

      return {
        ok: false,
        kind: 'nascimento',
        sourceFormat: 'json',
        raw: text,
        errors: ['JSON invalido'],
      };
    }
  }

  const kind = detectXmlKind(trimmed);
  let payload: any = null;
  if (kind === 'nascimento') payload = parseNascimentoXmlToPayload(text);
  if (kind === 'casamento') payload = parseCasamentoXmlToPayload(text);
  // obito currently has no XML->payload mapping
  return { ok: true, kind, sourceFormat: 'xml', raw: text, payload };
}
