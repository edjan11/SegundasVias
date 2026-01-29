export type CertificatePayload = {
  certidao?: Record<string, unknown>;
  registro?: Record<string, unknown>;
};

export function validatePayloadBasic(obj: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    errors.push('JSON vazio ou invalido');
  } else {
    if (!obj.certidao) errors.push('certidao ausente');
    if (!obj.registro) errors.push('registro ausente');
    const tipo = obj?.certidao?.tipo_registro;
    if (!tipo) errors.push('certidao.tipo_registro ausente');
  }
  return { ok: errors.length === 0, errors };
}
