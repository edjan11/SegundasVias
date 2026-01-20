export function getFieldLabel(input: HTMLElement): string {
  const field = (input as any)?.closest?.('.field') || (input as any)?.closest?.('.campo');
  if (!field)
    return (
      (input as any)?.getAttribute?.('data-bind') ||
      (input as any)?.name ||
      (input as any)?.id ||
      ''
    );
  const label = field.querySelector('label');
  const text = label?.textContent?.trim();
  return (
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
