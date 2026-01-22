import fs from 'fs';
import path from 'path';
import { CertidaoRecord } from '../../core/domain';
import { SearchQuery, searchItems } from '../../core/search/indexer';
import { FindResult, ICertificateRepository } from '../../ports/ICertificateRepository';

type DbFile = { schemaVersion: number; items: CertidaoRecord[] };

export class JsonFileRepository implements ICertificateRepository {
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  private readDb(): DbFile {
    try {
      const raw = fs.readFileSync(this.dbPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return { schemaVersion: 1, items: [] };
      return parsed;
    } catch {
      return { schemaVersion: 1, items: [] };
    }
  }

  private writeDb(db: DbFile): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.dbPath, JSON.stringify(db, null, 2), 'utf-8');
  }

  async save(record: CertidaoRecord): Promise<void> {
    const db = this.readDb();
    const idx = db.items.findIndex((i) => i.id === record.id);
    if (idx >= 0) db.items[idx] = record;
    else db.items.push(record);
    this.writeDb(db);
  }

  async getById(id: string): Promise<CertidaoRecord | null> {
    const db = this.readDb();
    return db.items.find((i) => i.id === id) || null;
  }

  async listAll(): Promise<CertidaoRecord[]> {
    const db = this.readDb();
    return db.items;
  }

  async find(query: SearchQuery): Promise<FindResult> {
    const db = this.readDb();
    const indexItems = db.items.map((i) => i.searchIndex);
    const result = searchItems(indexItems, query);
    const ids = new Set(result.items.map((i) => i.id));
    const items = db.items.filter((i) => ids.has(i.id));
    return { total: result.total, page: result.page, limit: result.limit, items };
  }
}
