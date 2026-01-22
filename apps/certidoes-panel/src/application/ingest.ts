import { CertidaoInput, CertidaoRecord } from '../core/domain';
import { validateInput } from '../core/validators';
import { normalizeInput } from './normalization';
import { buildSearchIndex } from '../core/search/indexer';
import { emitXml } from '../core/xml/emitter';
import { ICertificateRepository } from '../ports/ICertificateRepository';

export type IngestResult = {
  ok: boolean;
  id?: string;
  warnings?: string[];
  errors?: ReturnType<typeof validateInput>['errors'];
};

// Use case boundary; can be exposed via HTTP (POST /certidoes) later.
export async function ingestCertidao(
  repo: ICertificateRepository,
  input: CertidaoInput,
  referenceXml: string,
): Promise<IngestResult> {
  const validation = validateInput(input);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }
  const normalized = normalizeInput(input);
  const { xml, warnings } = emitXml(normalized.tipo, normalized, referenceXml);
  const searchIndex = buildSearchIndex(normalized.tipo, normalized);
  const record: CertidaoRecord = {
    id: normalized.id,
    tipo: normalized.tipo,
    createdAt: normalized.createdAt,
    canonical: normalized,
    xml,
    searchIndex,
  };
  await repo.save(record);
  return { ok: true, id: record.id, warnings };
}
