export type RegistrationType = 'nascimento' | 'civil' | 'religioso' | 'obito' | 'unknown';

function digitsOnly(value: string) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * API boundary: parse the registration type digit from a matricula string.
 * This is pure logic and can be exposed as a backend validation endpoint later.
 */
export function parseRegistrationTypeDigit(matricula: string): RegistrationType {
  const digits = digitsOnly(matricula);
  if (digits.length < 15) return 'unknown';
  const digit = digits.charAt(14);
  if (digit === '1') return 'nascimento';
  if (digit === '2') return 'civil';
  if (digit === '3') return 'religioso';
  if (digit === '4') return 'obito';
  return 'unknown';
}

/**
 * API boundary: infer the act type (nascimento/casamento/obito) from a matricula.
 * Pure logic that can be exposed later as a backend validation endpoint.
 */
export function inferActFromMatricula(matricula: string): 'nascimento' | 'casamento' | 'obito' | '' {
  const regType = parseRegistrationTypeDigit(matricula);
  if (regType === 'nascimento') return 'nascimento';
  if (regType === 'obito') return 'obito';
  if (regType === 'civil' || regType === 'religioso') return 'casamento';
  return '';
}

/**
 * API boundary: validate if a matricula matches the expected registration type.
 * Returns a non-blocking result that can be surfaced in UI or API responses.
 */
export function validateMatriculaType(
  matricula: string,
  expected: 'nascimento' | 'civil' | 'religioso' | 'obito',
) {
  const digits = digitsOnly(matricula);
  if (!digits) return { ok: true };
  if (digits.length < 15) {
    return { ok: false, reason: 'Matricula incompleta: digito do tipo nao encontrado.' };
  }
  const actual = parseRegistrationTypeDigit(matricula);
  if (actual === 'unknown') {
    return { ok: false, reason: 'Matricula com digito de tipo desconhecido.' };
  }
  if (actual !== expected) {
    const expectedDigit =
      expected === 'nascimento'
        ? '1'
        : expected === 'civil'
          ? '2'
          : expected === 'religioso'
            ? '3'
            : '4';
    const label =
      expected === 'nascimento'
        ? 'nascimento'
        : expected === 'civil'
        ? 'casamento civil'
        : expected === 'religioso'
          ? 'casamento religioso'
          : 'obito';
    return { ok: false, reason: `Matricula incompativel: esperado digito ${expectedDigit} para ${label}.` };
  }
  return { ok: true };
}
