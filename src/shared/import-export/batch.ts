import { NascimentoDomainSchema } from '../../core/schemas/NascimentoDomainSchema';
import { CasamentoDomainSchema } from '../../core/schemas/CasamentoDomainSchema';
import { ObitoDomainSchema } from '../../core/schemas/ObitoDomainSchema';
import { detectXmlKind } from './detect-xml-kind';
import { validatePayloadBasic } from './payload-validate';
import { parseCasamentoXmlToPayload, parseNascimentoXmlToPayload } from '../../ui/payload/xml-to-payload';
import { stableStringify } from './stable-json';
import { insertLocalRecords, loadLocalDb, LocalDbRecord } from './local-json-db';

export type ImportMode = 'strict' | 'safe';
export type ImportSourceFormat = 'json' | 'xml';
export type ImportKind = 'nascimento' | 'casamento' | 'obito';

export type ImportItem = {
  index: number;
  sourceName: string;
  sourceFormat: ImportSourceFormat;
  kind: ImportKind;
  payload: any;
  raw: string;
};

export type ImportLog = {
  index: number;
  sourceName: string;
  kind: ImportKind;
  status: 'ok' | 'error' | 'skipped';
  message: string;
  errors?: string[];
};

export type ImportBatchResult = {
  ok: boolean;
  mode: ImportMode;
  total: number;
  imported: number;
  failed: number;
  skipped: number;
  logs: ImportLog[];
  firstPayload?: {
    kind: ImportKind;
    payload: any;
    sourceName: string;
    sourceFormat: ImportSourceFormat;
  } | null;
};

const SchemaByKind: Record<ImportKind, any> = {
  nascimento: NascimentoDomainSchema,
  casamento: CasamentoDomainSchema,
  obito: ObitoDomainSchema,
};

function deriveKind(payload: any, fallback: ImportKind): ImportKind {
  const type = String(payload?.certidao?.tipo_registro || '').toLowerCase();
  if (type === 'casamento') return 'casamento';
  if (type === 'obito') return 'obito';
  if (type === 'nascimento') return 'nascimento';
  return fallback;
}

function extractRecordsFromJson(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.records)) return parsed.records;
    if (Array.isArray(parsed.items)) return parsed.items;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (parsed.payload) return [parsed.payload];
    return [parsed];
  }
  return [];
}

export async function parseImportFile(file: File): Promise<ImportItem[]> {
  const text = await file.text();
  const trimmed = text.trim();
  const isXml = trimmed.startsWith('<');

  if (!isXml) {
    const parsed = JSON.parse(text);
    const records = extractRecordsFromJson(parsed);
    return records.map((payload, idx) => {
      const kind = deriveKind(payload, 'nascimento');
      return {
        index: idx,
        sourceName: `${file.name}#${idx + 1}`,
        sourceFormat: 'json',
        kind,
        payload,
        raw: stableStringify(payload),
      };
    });
  }

  const kind = detectXmlKind(trimmed);
  let payload: any = null;
  if (kind === 'nascimento') payload = parseNascimentoXmlToPayload(text);
  if (kind === 'casamento') payload = parseCasamentoXmlToPayload(text);
  if (kind === 'obito') payload = null;
  return [
    {
      index: 0,
      sourceName: file.name,
      sourceFormat: 'xml',
      kind,
      payload,
      raw: text,
    },
  ];
}

export function validateRecord(kind: ImportKind, record: any): { ok: boolean; errors: string[] } {
  const schema = SchemaByKind[kind];
  if (!schema) return { ok: false, errors: ['Schema inexistente'] };
  const result = schema.safeParse(record);
  if (result.success) return { ok: true, errors: [] };
  // fallback: aceitar payload minimo (certidao + registro) para compatibilidade com JSON da UI
  const fallback = validatePayloadBasic(record);
  if (fallback.ok) return { ok: true, errors: [] };
  const errors = result.error.errors.map((e) => `${e.path.join('.')} ${e.message}`.trim());
  return { ok: false, errors: [...errors, ...fallback.errors] };
}

function buildRecordId(kind: ImportKind, payload: any): string {
  const basis = stableStringify(payload);
  let hash = 0;
  for (let i = 0; i < basis.length; i++) {
    hash = (hash * 33 + basis.charCodeAt(i)) >>> 0;
  }
  return `${kind}-${hash.toString(16)}`;
}

export async function importBatchFiles(
  files: FileList,
  mode: ImportMode,
): Promise<ImportBatchResult> {
  const logs: ImportLog[] = [];
  let items: ImportItem[] = [];

  for (const file of Array.from(files)) {
    try {
      const parsed = await parseImportFile(file);
      items = items.concat(parsed);
    } catch (e) {
      logs.push({
        index: 0,
        sourceName: file.name,
        kind: 'nascimento',
        status: 'error',
        message: 'Falha ao ler arquivo',
        errors: ['Arquivo invalido'],
      });
    }
  }

  const total = items.length;
  const validItems: ImportItem[] = [];
  let failed = 0;

  items.forEach((item) => {
    if (!item.payload) {
      failed += 1;
      logs.push({
        index: item.index,
        sourceName: item.sourceName,
        kind: item.kind,
        status: 'error',
        message: 'Sem payload valido',
        errors: ['XML sem mapeamento'],
      });
      return;
    }
    const v = validateRecord(item.kind, item.payload);
    if (!v.ok) {
      failed += 1;
      logs.push({
        index: item.index,
        sourceName: item.sourceName,
        kind: item.kind,
        status: 'error',
        message: 'Registro invalido',
        errors: v.errors,
      });
      return;
    }
    validItems.push(item);
  });

  if (mode === 'strict' && failed > 0) {
    return {
      ok: false,
      mode,
      total,
      imported: 0,
      failed,
      skipped: 0,
      logs,
      firstPayload: null,
    };
  }

  const firstPayload =
    validItems.length > 0
      ? {
          kind: validItems[0].kind,
          payload: validItems[0].payload,
          sourceName: validItems[0].sourceName,
          sourceFormat: validItems[0].sourceFormat,
        }
      : null;

  const now = new Date().toISOString();
  const existingIds = new Set(loadLocalDb().records.map((r) => r.id));
  const toPersist: LocalDbRecord[] = [];
  let skipped = 0;

  validItems.forEach((item) => {
    const id = buildRecordId(item.kind, item.payload);
    if (existingIds.has(id)) {
      skipped += 1;
      logs.push({
        index: item.index,
        sourceName: item.sourceName,
        kind: item.kind,
        status: 'skipped',
        message: `Duplicado (id: ${id})`,
      });
      return;
    }
    existingIds.add(id);
    toPersist.push({
      id,
      kind: item.kind,
      payload: item.payload,
      sourceFormat: item.sourceFormat,
      sourceName: item.sourceName,
      importedAt: now,
    });
  });

  const { inserted } = insertLocalRecords(toPersist);
  toPersist.forEach((rec) => {
    logs.push({
      index: 0,
      sourceName: rec.sourceName,
      kind: rec.kind,
      status: 'ok',
      message: `Importado (id: ${rec.id})`,
    });
  });

  return {
    ok: failed === 0,
    mode,
    total,
    imported: inserted,
    failed,
    skipped,
    logs,
    firstPayload,
  };
}
