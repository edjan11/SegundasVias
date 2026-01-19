
export function getFieldLabel(input) {
  const field = input?.closest?.('.field') || input?.closest?.('.campo');
  if (!field) return input?.getAttribute?.('data-bind') || input?.name || input?.id || '';
  const label = field.querySelector('label');
  const text = label?.textContent?.trim();
  return text || input?.getAttribute?.('data-bind') || input?.name || input?.id || '';
}

export function collectInvalidFields(root = document) {
  const items = new Set();
  root.querySelectorAll('.invalid').forEach((el) => {
    const label = getFieldLabel(el);
    if (label) items.add(label);
  });
  root.querySelectorAll('.field.field--error, .campo.field--error').forEach((field) => {
    const label = field.querySelector('label')?.textContent?.trim();
    if (label) items.add(label);
  });
  return Array.from(items);
}
