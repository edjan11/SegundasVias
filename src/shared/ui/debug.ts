export function getFieldLabel(input: HTMLElement): string {
  const normalizeLabel = (raw: string): string =>
    String(raw || '')
      .replace(/Adicionar ao banco/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const field = (input as any)?.closest?.('.field') || (input as any)?.closest?.('.campo');
  if (!field)
    return normalizeLabel(
      (input as any)?.getAttribute?.('data-bind') ||
      (input as any)?.name ||
      (input as any)?.id ||
      ''
    );
  const label = field.querySelector('label');
  const text = normalizeLabel(label?.textContent || '');
  return normalizeLabel(
    text ||
    (input as any)?.getAttribute?.('data-bind') ||
    (input as any)?.name ||
    (input as any)?.id ||
    ''
  );
}

export function collectInvalidFields(root: Document | HTMLElement = document): string[] {
  const items = new Set<string>();
  root.querySelectorAll('.invalid').forEach((el) => {
    const label = getFieldLabel(el as HTMLElement);
    if (label) items.add(label);
  });
  root.querySelectorAll('.field.field--error, .campo.field--error').forEach((field) => {
    const label = field.querySelector('label')?.textContent?.trim();
    if (label) items.add(label);
  });
  return Array.from(items);
}
