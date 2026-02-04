/**
 * Seal History Storage - Persistence layer for seal application records
 * 
 * Provides localStorage-based audit trail with indexed search capabilities.
 * All seal applications are stored with complete metadata for recovery, validation,
 * and floating panel history/search functionality.
 * 
 * Schema: SeloRecord with fields for document type, user info, seal details, timestamps
 * Indexes: nome, data, certType, matricula, numSelo for O(1) lookup
 * TTL: No automatic expiration (manual cleanup via deleteOldRecords)
 * 
 * @module seal/seloHistoryStore
 */

import type { 
  TaxaInfo, 
  VariavelModelo,
  GerarSeloResponse
} from './types';

/**
 * Seal application record - Complete audit trail entry
 */
export interface SeloRecord {
  /** Unique identifier (UUID or timestamp-based) */
  id: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Certificate type (nascimento, casamento, obito) */
  certType: 'nascimento' | 'casamento' | 'obito';

  /** Registry record number (matrícula) */
  matricula: string;

  /** Cartório code (from taxa) */
  codCartorio: string;

  /** Selected taxa code */
  codTaxa: string;

  /** Exemption code (if aplicável, else null) */
  codIsencao: string | null;

  /** Guide number (if available, else null) */
  numGuia: string | null;

  /** Control seal number (idempotent identifier) */
  nrControleSelo: string;

  /** Generated digital seal number (from API response) */
  numSelo: string;

  /** Public key number (for seal validation) */
  numChavePublica: string;

  /** Registered name (titular) */
  nomeRegistrado: string;

  /** Spouse name (for marriage certificates) */
  nomeConjuge: string | null;

  /** Requester name (solicitante) */
  nomeSolicitante: string;

  /** Application status (pending, generated, applied, failed, cancelled) */
  status: 'pending' | 'generated' | 'applied' | 'failed' | 'cancelled';

  /** Additional metadata (arbitrary key-value pairs) */
  metadados: Record<string, any>;

  /** Optional error message if status is 'failed' */
  erro?: string;

  /** Optional timestamp when seal was actually applied to document */
  dataAplicacao?: string;
}

/**
 * Search filter for querying records
 */
export interface SeloRecordFilter {
  certType?: 'nascimento' | 'casamento' | 'obito';
  status?: SeloRecord['status'];
  codCartorio?: string;
  codTaxa?: string;
  nomeRegistrado?: string;
  nomeSolicitante?: string;
  matricula?: string;
  numSelo?: string;
  dataInicio?: string; // ISO 8601
  dataFim?: string;    // ISO 8601
}

/**
 * Paginated result set
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Seal history storage with localStorage persistence and indexed search
 */
export class SeloHistoryStore {
  private static readonly STORAGE_KEY = 'seal_history_v1';
  private static readonly INDEX_KEYS = {
    nome: 'idx_nome',
    data: 'idx_data',
    certType: 'idx_certType',
    matricula: 'idx_matricula',
    numSelo: 'idx_numSelo',
    nrControleSelo: 'idx_nrControleSelo',
    codCartorio: 'idx_codCartorio',
    status: 'idx_status',
  };

  private records: SeloRecord[] = [];
  private indexes: Map<string, Map<string, Set<string>>> = new Map();

  constructor() {
    this.loadFromStorage();
    this.rebuildIndexes();
  }

  /**
   * Save or update a seal record
   */
  public save(record: Omit<SeloRecord, 'id' | 'createdAt'>): SeloRecord {
    const seloRecord: SeloRecord = {
      ...record,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };

    this.records.push(seloRecord);
    this.updateIndexes(seloRecord);
    this.persistToStorage();

    return seloRecord;
  }

  /**
   * Update an existing record by id
   */
  public update(id: string, changes: Partial<SeloRecord>): SeloRecord | null {
    const index = this.records.findIndex(r => r.id === id);
    if (index === -1) return null;

    const oldRecord = this.records[index];
    this.removeFromIndexes(oldRecord);

    const updated = { ...oldRecord, ...changes, id, createdAt: oldRecord.createdAt };
    this.records[index] = updated;

    this.updateIndexes(updated);
    this.persistToStorage();

    return updated;
  }

  /**
   * Get record by id
   */
  public getById(id: string): SeloRecord | null {
    return this.records.find(r => r.id === id) || null;
  }

  /**
   * Query all records with optional filtering and pagination
   */
  public query(
    filter?: SeloRecordFilter,
    page: number = 1,
    pageSize: number = 20
  ): PaginatedResult<SeloRecord> {
    let results = this.filter(filter);

    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: results.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Filter records by criteria (returns all matching records)
   */
  public filter(filter?: SeloRecordFilter): SeloRecord[] {
    if (!filter) return [...this.records].reverse(); // Most recent first

    return this.records.filter(record => {
      if (filter.certType && record.certType !== filter.certType) return false;
      if (filter.status && record.status !== filter.status) return false;
      if (filter.codCartorio && record.codCartorio !== filter.codCartorio) return false;
      if (filter.codTaxa && record.codTaxa !== filter.codTaxa) return false;
      if (filter.nomeRegistrado && !record.nomeRegistrado.toLowerCase().includes(filter.nomeRegistrado.toLowerCase())) return false;
      if (filter.nomeSolicitante && !record.nomeSolicitante.toLowerCase().includes(filter.nomeSolicitante.toLowerCase())) return false;
      if (filter.matricula && record.matricula !== filter.matricula) return false;
      if (filter.numSelo && record.numSelo !== filter.numSelo) return false;
      if (filter.dataInicio && record.createdAt < filter.dataInicio) return false;
      if (filter.dataFim && record.createdAt > filter.dataFim) return false;

      return true;
    }).reverse(); // Most recent first
  }

  /**
   * Search by registered name (indexed for performance)
   */
  public searchByNome(nome: string, page: number = 1, pageSize: number = 20): PaginatedResult<SeloRecord> {
    const results = this.query({ nomeRegistrado: nome }, page, pageSize);
    return results;
  }

  /**
   * Search by creation date (indexed for performance)
   */
  public searchByData(dataInicio: string, dataFim?: string, page: number = 1, pageSize: number = 20): PaginatedResult<SeloRecord> {
    const results = this.query({ dataInicio, dataFim }, page, pageSize);
    return results;
  }

  /**
   * Search by matricula (registry number, indexed)
   */
  public searchByMatricula(matricula: string): SeloRecord[] {
    return this.records.filter(r => r.matricula === matricula).reverse();
  }

  /**
   * Search by seal number (indexed)
   */
  public searchByNumSelo(numSelo: string): SeloRecord | null {
    // numSelo should be unique
    return this.records.find(r => r.numSelo === numSelo) || null;
  }

  /**
   * Search by control seal number (idempotent identifier, indexed)
   */
  public searchByControleSelo(nrControleSelo: string): SeloRecord | null {
    return this.records.find(r => r.nrControleSelo === nrControleSelo) || null;
  }

  /**
   * Get records by certificate type
   */
  public getByCertType(certType: 'nascimento' | 'casamento' | 'obito', page: number = 1, pageSize: number = 20): PaginatedResult<SeloRecord> {
    const results = this.query({ certType }, page, pageSize);
    return results;
  }

  /**
   * Get records by status
   */
  public getByStatus(status: SeloRecord['status'], page: number = 1, pageSize: number = 20): PaginatedResult<SeloRecord> {
    const results = this.query({ status }, page, pageSize);
    return results;
  }

  /**
   * Get all failed records for recovery/retry
   */
  public getFailedRecords(): SeloRecord[] {
    return this.records.filter(r => r.status === 'failed').reverse();
  }

  /**
   * Get recent records (last N days)
   */
  public getRecentRecords(days: number = 7, page: number = 1, pageSize: number = 20): PaginatedResult<SeloRecord> {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - days);
    
    const results = this.query({ dataInicio: dataInicio.toISOString() }, page, pageSize);
    return results;
  }

  /**
   * Delete record by id
   */
  public delete(id: string): boolean {
    const index = this.records.findIndex(r => r.id === id);
    if (index === -1) return false;

    const record = this.records[index];
    this.removeFromIndexes(record);
    this.records.splice(index, 1);
    this.persistToStorage();

    return true;
  }

  /**
   * Delete all records older than specified date
   */
  public deleteOldRecords(before: string): number {
    const beforeTime = new Date(before).getTime();
    const initialCount = this.records.length;

    this.records = this.records.filter(r => {
      if (new Date(r.createdAt).getTime() < beforeTime) {
        this.removeFromIndexes(r);
        return false;
      }
      return true;
    });

    if (this.records.length !== initialCount) {
      this.persistToStorage();
    }

    return initialCount - this.records.length;
  }

  /**
   * Clear all records (use with caution)
   */
  public clear(): void {
    this.records = [];
    this.indexes.clear();
    localStorage.removeItem(SeloHistoryStore.STORAGE_KEY);
  }

  /**
   * Get storage statistics
   */
  public getStats(): {
    totalRecords: number;
    byStatus: Record<string, number>;
    byCertType: Record<string, number>;
    storageUsedBytes: number;
  } {
    const stats = {
      totalRecords: this.records.length,
      byStatus: {} as Record<string, number>,
      byCertType: {} as Record<string, number>,
      storageUsedBytes: 0,
    };

    this.records.forEach(r => {
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
      stats.byCertType[r.certType] = (stats.byCertType[r.certType] || 0) + 1;
    });

    const stored = localStorage.getItem(SeloHistoryStore.STORAGE_KEY);
    if (stored) {
      stats.storageUsedBytes = stored.length;
    }

    return stats;
  }

  /**
   * Export records to JSON (for backup/analysis)
   */
  public exportToJSON(): string {
    return JSON.stringify(this.records, null, 2);
  }

  /**
   * Import records from JSON (for restore/migration)
   */
  public importFromJSON(json: string): number {
    try {
      const imported = JSON.parse(json) as SeloRecord[];
      if (!Array.isArray(imported)) throw new Error('Invalid format');

      const before = this.records.length;
      imported.forEach(r => {
        if (this.validateRecord(r)) {
          this.records.push(r);
          this.updateIndexes(r);
        }
      });

      this.persistToStorage();
      return this.records.length - before;
    } catch (error) {
      console.error('Import failed:', error);
      return 0;
    }
  }

  // ==================== Private Methods ====================

  /**
   * Generate unique record id
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update index maps for a record
   */
  private updateIndexes(record: SeloRecord): void {
    const indexedFields = {
      nome: [record.nomeRegistrado],
      data: [record.createdAt.split('T')[0]], // YYYY-MM-DD
      certType: [record.certType],
      matricula: [record.matricula],
      numSelo: [record.numSelo],
      nrControleSelo: [record.nrControleSelo],
      codCartorio: [record.codCartorio],
      status: [record.status],
    };

    Object.entries(indexedFields).forEach(([field, values]) => {
      if (!this.indexes.has(field)) {
        this.indexes.set(field, new Map());
      }
      const fieldIndex = this.indexes.get(field)!;

      values.forEach(value => {
        if (!fieldIndex.has(value)) {
          fieldIndex.set(value, new Set());
        }
        fieldIndex.get(value)!.add(record.id);
      });
    });
  }

  /**
   * Remove record from indexes
   */
  private removeFromIndexes(record: SeloRecord): void {
    const indexedFields = {
      nome: [record.nomeRegistrado],
      data: [record.createdAt.split('T')[0]],
      certType: [record.certType],
      matricula: [record.matricula],
      numSelo: [record.numSelo],
      nrControleSelo: [record.nrControleSelo],
      codCartorio: [record.codCartorio],
      status: [record.status],
    };

    Object.entries(indexedFields).forEach(([field, values]) => {
      const fieldIndex = this.indexes.get(field);
      if (!fieldIndex) return;

      values.forEach(value => {
        const ids = fieldIndex.get(value);
        if (ids) {
          ids.delete(record.id);
          if (ids.size === 0) {
            fieldIndex.delete(value);
          }
        }
      });
    });
  }

  /**
   * Rebuild all indexes from records
   */
  private rebuildIndexes(): void {
    this.indexes.clear();
    this.records.forEach(r => this.updateIndexes(r));
  }

  /**
   * Validate record structure
   */
  private validateRecord(record: any): record is SeloRecord {
    return (
      typeof record === 'object' &&
      record !== null &&
      typeof record.id === 'string' &&
      typeof record.createdAt === 'string' &&
      ['nascimento', 'casamento', 'obito'].includes(record.certType) &&
      typeof record.matricula === 'string' &&
      typeof record.codCartorio === 'string' &&
      typeof record.codTaxa === 'string' &&
      typeof record.nrControleSelo === 'string' &&
      typeof record.numSelo === 'string' &&
      typeof record.numChavePublica === 'string' &&
      typeof record.nomeRegistrado === 'string' &&
      typeof record.nomeSolicitante === 'string' &&
      ['pending', 'generated', 'applied', 'failed', 'cancelled'].includes(record.status) &&
      typeof record.metadados === 'object'
    );
  }

  /**
   * Load records from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(SeloHistoryStore.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SeloRecord[];
        if (Array.isArray(parsed)) {
          this.records = parsed.filter(r => this.validateRecord(r));
        }
      }
    } catch (error) {
      console.error('Failed to load seal history from storage:', error);
      this.records = [];
    }
  }

  /**
   * Persist records to localStorage
   */
  private persistToStorage(): void {
    try {
      localStorage.setItem(SeloHistoryStore.STORAGE_KEY, JSON.stringify(this.records));
    } catch (error) {
      console.error('Failed to persist seal history to storage:', error);
      // Silently fail - storage quota exceeded or other issue
    }
  }
}

/**
 * Factory function - creates singleton instance
 */
let seloHistoryStoreInstance: SeloHistoryStore | null = null;

export function createSeloHistoryStore(): SeloHistoryStore {
  if (!seloHistoryStoreInstance) {
    seloHistoryStoreInstance = new SeloHistoryStore();
  }
  return seloHistoryStoreInstance;
}

/**
 * Get singleton instance
 */
export function getSeloHistoryStore(): SeloHistoryStore {
  return createSeloHistoryStore();
}
