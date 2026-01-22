export type BindWarning = {
  type: 'missing-bind' | 'invalid-target';
  path: string;
};

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function dispatchInputEvents(el: HTMLElement): void {
  try {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {
    // ignore
  }
}

export function findBoundElement(root: Document | HTMLElement, path: string): HTMLElement | null {
  const selector = `[data-bind="${path}"], [name="${path}"]`;
  return (root as Document).querySelector?.(selector) as HTMLElement | null;
}

export function setElementValue(el: HTMLElement, value: unknown): void {
  const str = value === null || value === undefined ? '' : String(value);

  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox') {
      el.checked = !!value;
      dispatchInputEvents(el);
      return;
    }
    if (el.type === 'radio') {
      const name = el.name;
      if (name) {
        const radios = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
        radios.forEach((r) => {
          r.checked = normalizeText(r.value) === normalizeText(str);
          if (r.checked) dispatchInputEvents(r);
        });
        return;
      }
    }
    el.value = str;
    dispatchInputEvents(el);
    return;
  }

  if (el instanceof HTMLTextAreaElement) {
    el.value = str;
    dispatchInputEvents(el);
    return;
  }

  if (el instanceof HTMLSelectElement) {
    const options = Array.from(el.options || []);
    let matched = options.find((o) => String(o.value) === str);
    if (!matched && str) {
      matched = options.find((o) => normalizeText(o.textContent || '') === normalizeText(str));
    }
    if (matched) {
      el.value = matched.value;
      dispatchInputEvents(el);
    }
    return;
  }
}

export function setBoundValue(
  path: string,
  value: unknown,
  root: Document | HTMLElement,
  warnings: BindWarning[],
): void {
  const el = findBoundElement(root, path);
  if (!el) {
    warnings.push({ type: 'missing-bind', path });
    return;
  }
  setElementValue(el, value);
}

export function applyObjectToBinds(
  prefix: string,
  obj: Record<string, unknown> | undefined,
  root: Document | HTMLElement,
  warnings: BindWarning[],
): void {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach((key) => {
    const value = (obj as any)[key];
    const path = `${prefix}.${key}`;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      applyObjectToBinds(path, value as Record<string, unknown>, root, warnings);
      return;
    }
    if (Array.isArray(value)) return;
    setBoundValue(path, value, root, warnings);
  });
}

export function setBySelector(
  root: Document | HTMLElement,
  selector: string,
  value: unknown,
): void {
  const el = (root as Document).querySelector?.(selector) as HTMLElement | null;
  if (!el) return;
  setElementValue(el, value);
}

export function normalizeSpaces(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function onlyDigits(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}
