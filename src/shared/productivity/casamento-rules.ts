export type CasamentoTipo = 'civil' | 'religioso' | 'unknown';

/**
 * API boundary: normalize casamento tipo values from UI or API payloads.
 * Keeps the rules in one place to avoid duplicated interpretations.
 */
export function resolveCasamentoTipo(value: string | null | undefined): CasamentoTipo {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (raw === '3' || raw === 'religioso' || raw === 'r') return 'religioso';
  if (raw === '2' || raw === 'civil' || raw === 'c') return 'civil';
  return 'unknown';
}

/**
 * API boundary: civil inherits data do termo; religioso nao copia automaticamente.
 */
export function shouldAutoCopyTermoToCasamento(tipo: CasamentoTipo): boolean {
  return tipo === 'civil';
}

/**
 * API boundary: when civil, TAB should skip dataCasamento.
 */
export function shouldSkipDataCasamentoTab(tipo: CasamentoTipo): boolean {
  return tipo === 'civil';
}
