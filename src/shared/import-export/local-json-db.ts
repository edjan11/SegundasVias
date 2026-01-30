import { stableStringify } from './stable-json';

export type LocalDbRecord = {
  id: string;
  kind: 'nascimento' | 'casamento' | 'obito';
  payload: any;
  sourceFormat: 'json' | 'xml';
  sourceName: string;
  importedAt: string;
};

export type LocalDb = {
  version: 1;
  records: LocalDbRecord[];
};

export const LOCAL_DB_STORAGE_KEY = 'certidoes.mockDb';

export function loadLocalDb(): LocalDb {
  try {
    const raw = localStorage.getItem(LOCAL_DB_STORAGE_KEY);
    if (!raw) return { version: 1, records: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.records)) {
      return { version: 1, records: [] };
    }
    return { version: 1, records: parsed.records };
  } catch {
    return { version: 1, records: [] };
  }
}

export function saveLocalDb(db: LocalDb): void {
  localStorage.setItem(LOCAL_DB_STORAGE_KEY, stableStringify(db));
}

export function clearLocalDb(): void {
  saveLocalDb({ version: 1, records: [] });
}

export function insertLocalRecords(records: LocalDbRecord[]): { inserted: number } {
  const db = loadLocalDb();
  db.records.push(...records);
  saveLocalDb(db);
  return { inserted: records.length };
}

export function exportLocalDb(): string {
  const db = loadLocalDb();
  const sorted = [...db.records].sort((a, b) => {
    const t = a.importedAt.localeCompare(b.importedAt);
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
  return stableStringify({ version: db.version, records: sorted });
}
