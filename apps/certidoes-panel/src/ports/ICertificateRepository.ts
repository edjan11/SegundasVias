import { CertidaoRecord } from '../core/domain';
import { SearchQuery } from '../core/search/indexer';

export type FindResult = {
  total: number;
  page: number;
  limit: number;
  items: CertidaoRecord[];
};

// Repository boundary; can be exposed via HTTP, RPC or message broker later.
export interface ICertificateRepository {
  save(record: CertidaoRecord): Promise<void>;
  getById(id: string): Promise<CertidaoRecord | null>;
  find(query: SearchQuery): Promise<FindResult>;
  listAll(): Promise<CertidaoRecord[]>;
}
