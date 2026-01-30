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

export function findBoundElements(root: Document | HTMLElement, path: string): HTMLElement[] {
  const selector = `[data-bind="${path}"], [name="${path}"]`;
  try {
    const list = (root as Document).querySelectorAll?.(selector);
    const els = list ? Array.from(list) as HTMLElement[] : [];
    try { console.debug('[bind] findBoundElements', { path, selector, count: els.length, scope: (root as Document).location ? 'document' : 'element' }); } catch {}
    return els;
  } catch (e) {
    try { console.debug('[bind] findBoundElements error', { path, selector, error: e }); } catch {}
    return [];
  }
}

export function setElementValue(el: HTMLElement, value: unknown): void {
  const str = value === null || value === undefined ? '' : String(value);

  try { console.debug('[bind] setElementValue called', { tag: el.tagName, isInput: (typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement), isTextArea: (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement), isSelect: (typeof HTMLSelectElement !== 'undefined' && el instanceof HTMLSelectElement) }); } catch {}

  const verifyAndSnapshot = (label: string) => {
    try {
      setTimeout(() => {
        try {
          const actual = (typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement) || (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement) || (typeof HTMLSelectElement !== 'undefined' && el instanceof HTMLSelectElement)
            ? (el as HTMLInputElement).value
            : (el.textContent || '').trim();

          try { (window as any).__domSnapshots = (window as any).__domSnapshots || []; (window as any).__domSnapshots.push({ label, time: Date.now(), target: str, actual, outer: (el as HTMLElement).outerHTML }); } catch (e) {}

          if (actual !== str) {
            console.warn('[bind] setElementValue mismatch after dispatch', { label, target: str, actual, tag: el.tagName, outer: (el as HTMLElement).outerHTML });
          }
        } catch (e) {
          console.warn('[bind] setElementValue verify error', e);
        }
      }, 0);
    } catch {}
  };

  // Use tagName checks instead of instanceof to be robust across JSDOM vm boundaries
  const tag = (el && (el.tagName || '')).toUpperCase();

  if (tag === 'INPUT') {
    const input = el as HTMLInputElement;
    if (input.type === 'checkbox') {
      input.checked = !!value;
      dispatchInputEvents(el);
      verifyAndSnapshot('input-checkbox');
      return;
    }
    if (input.type === 'radio') {
      const name = input.name;
      if (name) {
        const radios = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
        radios.forEach((r) => {
          r.checked = normalizeText(r.value) === normalizeText(str);
          if (r.checked) dispatchInputEvents(r);
        });
        verifyAndSnapshot('input-radio-group');
        return;
      }
    }
    input.value = str;
    try { console.debug('[bind] input applied', { tag: el.tagName, value: (input as HTMLInputElement).value }); } catch {}
    dispatchInputEvents(el);
    verifyAndSnapshot('input-text');
    return;
  }

  if (tag === 'TEXTAREA') {
    const ta = el as HTMLTextAreaElement;
    ta.value = str;
    dispatchInputEvents(el);
    verifyAndSnapshot('textarea');
    return;
  }

  if (tag === 'SELECT') {
    const sel = el as HTMLSelectElement;
    const options = Array.from(sel.options || []) as HTMLOptionElement[];
    let matched = options.find((o) => String(o.value) === str);
    if (!matched && str) {
      matched = options.find((o) => normalizeText(o.textContent || '') === normalizeText(str));
    }
    if (matched) {
      // Clear previous selection
      try { options.forEach((o) => { o.selected = false; o.defaultSelected = false; try { o.removeAttribute('selected'); } catch {} }); } catch {}

      // Mark the matched option as selected in multiple ways
      try { matched.selected = true; matched.defaultSelected = true; matched.setAttribute && matched.setAttribute('selected', 'selected'); } catch {}

      // Set selectedIndex and select value
      const idx = options.findIndex((o) => String(o.value) === String(matched!.value));
      try { sel.selectedIndex = idx; } catch {}
      try { sel.value = String(matched!.value); sel.setAttribute && sel.setAttribute('value', String(matched!.value)); } catch {}

      // Dispatch events (twice: immediate and microtask) to ensure listeners and JSDOM update
      dispatchInputEvents(sel);
      setTimeout(() => { try { dispatchInputEvents(sel); } catch {} }, 0);

      // Final verification: re-apply if needed (some environments require explicit selectedIndex/value pairs)
      try {
        if (String(sel.value) !== String(matched!.value)) {
          try { matched.selected = true; matched.defaultSelected = true; } catch {}
          try { sel.selectedIndex = idx; } catch {}
          try { sel.value = String(matched!.value); } catch {}
          try { sel.setAttribute && sel.setAttribute('value', String(matched!.value)); } catch {}
          // attempt a final event
          try { dispatchInputEvents(sel); } catch {}
        }
      } catch (e) {}

      verifyAndSnapshot('select');
      return;
    }

    // If no matching option and we have a non-empty value, create a temporary option
    if (str) {
      try {
        const opt = document.createElement('option') as HTMLOptionElement;
        opt.value = str;
        opt.text = String(str);
        opt.setAttribute('data-temporary', 'true');
        try { opt.selected = true; opt.defaultSelected = true; opt.setAttribute && opt.setAttribute('selected', 'selected'); } catch {}
        sel.appendChild(opt);

        const idx = Array.from(sel.options || []).findIndex((o) => String(o.value) === String(opt.value));
        try { sel.selectedIndex = idx; } catch {}
        try { sel.value = String(opt.value); sel.setAttribute && sel.setAttribute('value', String(opt.value)); } catch {}

        dispatchInputEvents(sel);
        setTimeout(() => { try { dispatchInputEvents(sel); } catch {} }, 0);

        // Double-check and reapply synchronously if needed
        try {
          if (String(sel.value) !== String(opt.value)) {
            try { sel.selectedIndex = idx; } catch {}
            try { sel.value = String(opt.value); } catch {}
            try { opt.selected = true; opt.defaultSelected = true; } catch {}
            try { dispatchInputEvents(sel); } catch {}
          }
        } catch (e) {}

        verifyAndSnapshot('select-created-temp');
      } catch (e) {
        try { console.debug('[bind] failed to create temporary option', e); } catch {}
      }
    }
    return;
  }

  // fallback: set textContent if editable
  try {
    if ((el as HTMLElement).isContentEditable) {
      (el as HTMLElement).innerText = str;
      dispatchInputEvents(el as HTMLElement);
      verifyAndSnapshot('contenteditable');
    }
  } catch (e) {
    // ignore
  }
}

export function setBoundValue(
  path: string,
  value: unknown,
  root: Document | HTMLElement,
  warnings: BindWarning[],
): void {
  const els = findBoundElements(root, path);
  if (!els.length) {
    try { console.debug('[bind] setBoundValue - missing elements for', path); } catch {}
    warnings.push({ type: 'missing-bind', path });
    return;
  }
  try {
    try {
      const first = els[0];
      const summary = first
        ? {
            tag: first.tagName,
            name: first.getAttribute && first.getAttribute('name'),
            databind: first.getAttribute && first.getAttribute('data-bind'),
            type: (first as HTMLInputElement).type || null,
            contenteditable: first.getAttribute && first.getAttribute('contenteditable'),
            value: ((typeof HTMLInputElement !== 'undefined' && first instanceof HTMLInputElement) || (typeof HTMLTextAreaElement !== 'undefined' && first instanceof HTMLTextAreaElement) || (typeof HTMLSelectElement !== 'undefined' && first instanceof HTMLSelectElement)) ? (first as HTMLInputElement).value : (first.textContent || '').trim().slice(0, 200),
          }
        : null;
      try { console.debug('[bind] setBoundValue - applying to', path, `count=${els.length}`, `first=${JSON.stringify(summary)}`); } catch {}

      // capture DOM snapshot before applying
      try {
        try { (window as any).__domSnapshots = (window as any).__domSnapshots || []; (window as any).__domSnapshots.push({ label: `setBoundValue-before:${path}`, time: Date.now(), first: summary, outer: first ? summary : null }); } catch (e) {}
      } catch (e) {}

    } catch {}
  } catch {}
  els.forEach((el) => setElementValue(el, value));

  // after applying, capture snapshot
  try {
    try { (window as any).__domSnapshots = (window as any).__domSnapshots || []; (window as any).__domSnapshots.push({ label: `setBoundValue-after:${path}`, time: Date.now(), count: els.length }); } catch (e) {}
  } catch (e) {}
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
  const list = (root as Document).querySelectorAll?.(selector);
  if (!list || list.length === 0) return;
  Array.from(list).forEach((el) => setElementValue(el as HTMLElement, value));
}

export function normalizeSpaces(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function onlyDigits(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}
