/**
 * API boundary: inferir o ato (nascimento/casamento/obito) a partir do payload.
 * Essa função é pura e pode ser exposta futuramente via API backend.
 */
export type ActKind = 'nascimento' | 'casamento' | 'obito' | '';

function normalizeKind(value: unknown): ActKind {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'nascimento') return 'nascimento';
  if (raw === 'casamento') return 'casamento';
  if (raw === 'obito') return 'obito';
  return '';
}

export function inferActFromPayload(payload: any): ActKind {
  if (!payload || typeof payload !== 'object') return '';

  const direct = normalizeKind(payload?.certidao?.tipo_registro);
  if (direct) return direct;

  const registro = payload?.registro || payload;
  if (!registro || typeof registro !== 'object') return '';

  if (Array.isArray((registro as any).conjuges)) return 'casamento';
  if ((registro as any).data_celebracao || (registro as any).regime_bens) return 'casamento';

  if ((registro as any).data_falecimento || (registro as any).falecido || (registro as any).causa_morte) {
    return 'obito';
  }

  if ((registro as any).data_nascimento || (registro as any).numero_dnv) return 'nascimento';

  return '';
}
