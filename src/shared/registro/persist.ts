export type RegistroSaveMode = 'include' | 'edit';

export type RegistroSaveRequest = {
  data: unknown;
  kind: string;
  mode: RegistroSaveMode;
  recordId?: string | null;
  sourceFormat?: 'manual' | 'imported';
};

export type RegistroSaveDeps = {
  dbSaveDraft?: (payload: Record<string, unknown>) => Promise<unknown> | unknown;
  fallbackSave?: (payload: Record<string, unknown>) => Promise<unknown> | unknown;
};

export type RegistroSaveResult = {
  recordId?: string;
  mode: RegistroSaveMode;
};

/**
 * API boundary: persiste um registro usando uma função injetada (dbSaveDraft/fallback).
 * Pode ser exposto via HTTP futuramente com os mesmos campos de entrada/saída.
 */
export async function persistRegistro(req: RegistroSaveRequest, deps: RegistroSaveDeps): Promise<RegistroSaveResult> {
  const payload = {
    id: req.mode === 'edit' ? req.recordId || null : null,
    data: req.data,
    sourceFormat: req.sourceFormat || 'manual',
    kind: req.kind || 'registro',
  } as Record<string, unknown>;

  const saver = deps.dbSaveDraft || deps.fallbackSave;
  if (!saver) {
    throw new Error('Nenhum provedor de persistencia disponível');
  }

  const res = await Promise.resolve(saver(payload));
  let nextId = req.recordId ? String(req.recordId) : '';
  if (res && typeof res === 'object' && 'id' in (res as Record<string, unknown>)) {
    const idVal = (res as Record<string, unknown>).id;
    if (idVal) nextId = String(idVal);
  }
  const nextMode: RegistroSaveMode = nextId ? 'edit' : req.mode;
  return { recordId: nextId || undefined, mode: nextMode };
}
