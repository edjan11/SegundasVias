import { ICertificateRepository } from '../ports/ICertificateRepository';
import { SearchQuery } from '../core/search/indexer';

// Use case boundary; can be exposed via HTTP (GET /certidoes) later.
export async function searchCertidoes(repo: ICertificateRepository, query: SearchQuery) {
  return repo.find(query);
}

// Use case boundary; can be exposed via HTTP (GET /certidoes/{id}) later.
export async function getCertidaoById(repo: ICertificateRepository, id: string) {
  return repo.getById(id);
}

// Use case boundary; can be exposed via HTTP (GET /certidoes/{id}/xml) later.
export async function getCertidaoXml(repo: ICertificateRepository, id: string) {
  const item = await repo.getById(id);
  return item?.xml || null;
}
