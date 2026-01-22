export type CasamentoTipoValidationResult = {
  ok: boolean;
  message?: string;
};

// Pure validator boundary; can be exposed via HTTP later as a simple POST/GET validator.
export function validateCasamentoTipo(value: string): CasamentoTipoValidationResult {
  const v = String(value || '').trim();
  if (!v) return { ok: false, message: 'Tipo de casamento obrigatorio' };
  if (v !== '2' && v !== '3') return { ok: false, message: 'Tipo de casamento invalido' };
  return { ok: true };
}
