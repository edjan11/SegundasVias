export function parseIrmaos(raw: string | undefined): { nome: string; matricula: string }[] {
  if (!raw || typeof raw !== 'string') return [];
  // Simple parser: split by semicolon or newline; ensure matricula is always a string (may be empty)
  return raw.split(/\r?\n|;/)
    .map(s => ({ nome: s.trim(), matricula: '' }))
    .filter(x => x.nome.length > 0);
}
