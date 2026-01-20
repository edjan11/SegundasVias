import { resolveCityToUf, loadIndexFromProjectData, buildIndexFromData } from '../shared/city-uf-resolver.js';
import { attachAutocomplete } from './city-autocomplete.js';

/**
 * Attach city→UF autofill behavior between cityInput and ufInput
 * - resolverIndex: prebuilt index (pass loadIndexFromProjectData())
 * - onAutofilled callback receives ({ uf, status, reason }) for instrumentation
 */
export function attachCityUfAutofill(
  cityInput: HTMLInputElement,
  ufInput: HTMLInputElement | HTMLSelectElement,
  resolverIndex: Map<string, any>,
  onAutofilled?: (res: any) => void
) {
  let lastAutoFilled = false;

  async function handleCityConfirm() {
    const city = cityInput.value;
    const currentUf = (ufInput as any).value;
    const res = resolveCityToUf(city, currentUf ? currentUf : null, resolverIndex);

    if (res.status === 'inferred' || res.status === 'ok') {
      // Autofill UF and set temporary readonly-ish state
      const ufValue = (res as any).uf || '';
      if ((ufInput as HTMLInputElement).tagName === 'SELECT') {
        (ufInput as HTMLSelectElement).value = ufValue;
        (ufInput as HTMLElement).setAttribute('data-auto-filled', 'true');
        (ufInput as HTMLElement).classList.add('auto-filled');
        (ufInput as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
        (ufInput as HTMLElement).dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        (ufInput as HTMLInputElement).value = ufValue;
        (ufInput as HTMLInputElement).setAttribute('readonly', 'true');
        (ufInput as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
        (ufInput as HTMLElement).dispatchEvent(new Event('change', { bubbles: true }));
      }

      lastAutoFilled = true;

      // Move focus forward (like TAB). Use focus on next tabbable element.
      // Prefer nextElementSibling, if it exists and is focusable.
      const next = findNextTabbable(cityInput);
      if (next) next.focus();
    }

    if (typeof onAutofilled === 'function') onAutofilled(res);
  }

  function findNextTabbable(el: HTMLElement): HTMLElement | null {
    // Simple approach: query the form's tab order — walk to nextElementSibling until focusable
    let node: HTMLElement | null = el.nextElementSibling as HTMLElement | null;
    while (node) {
      if (isFocusable(node)) return node;
      node = node.nextElementSibling as HTMLElement | null;
    }
    // fallback: try document.activeElement's nextElementSibling
    return null;
  }

  function isFocusable(el: HTMLElement) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (['input', 'select', 'textarea', 'button', 'a'].includes(tag)) {
      return !(el as HTMLInputElement).disabled && el.getAttribute('tabindex') !== '-1';
    }
    return el.hasAttribute('tabindex');
  }

  function removeReadonlyIfUserFocused(e: FocusEvent) {
    // If user Shift+Tabs into UF or clicks it, allow editing
    if (lastAutoFilled) {
      if ((ufInput as HTMLInputElement).tagName === 'SELECT') {
        (ufInput as HTMLElement).removeAttribute('data-auto-filled');
        (ufInput as HTMLElement).classList.remove('auto-filled');
      } else {
        (ufInput as HTMLInputElement).removeAttribute('readonly');
      }
      lastAutoFilled = false;
    }
  }

  // When city is confirmed (blur or Enter), try to autofill
  cityInput.addEventListener('blur', () => {
    // Slight delay for selection events
    setTimeout(handleCityConfirm, 0);
  });

  cityInput.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === 'Tab') {
      // If user presses Enter while in city, confirm then allow natural Tab behaviour
      handleCityConfirm();
    }
  });

  // If user goes back (Shift+Tab) or clicks UF, allow editing and remove readonly
  ufInput.addEventListener('focus', removeReadonlyIfUserFocused as any);
  ufInput.addEventListener('mousedown', () => {
    // allow click to edit
    if (lastAutoFilled) {
      if ((ufInput as HTMLInputElement).tagName === 'SELECT') {
        (ufInput as HTMLElement).removeAttribute('data-auto-filled');
        (ufInput as HTMLElement).classList.remove('auto-filled');
      } else {
        (ufInput as HTMLInputElement).removeAttribute('readonly');
      }
      lastAutoFilled = false;
    }
  });

  // Return an detach function so caller can remove listeners
  return function detach() {
    cityInput.removeEventListener('blur', handleCityConfirm as any);
    cityInput.removeEventListener('keydown', handleCityConfirm as any);
    ufInput.removeEventListener('focus', removeReadonlyIfUserFocused as any);
    ufInput.removeEventListener('mousedown', removeReadonlyIfUserFocused as any);
  };
}

/**
 * Attach city autocomplete + city→UF autofill to all fields that look like cities.
 * - If `resolverIndex` is not provided, tries to fetch project JSON and falls back to local loader.
 * - Heuristics to find UF element:
 *    1) matching data-bind replacing `_cidade` → `_uf`
 *    2) matching name replacing `cidade` → `uf`
 *    3) nearest `select.w-uf` or select in same field container
 * Marks inputs with `data-city-integrated` to avoid duplicate attaching.
 * Returns a detach function that removes all handlers.
 */
export async function attachCityIntegrationToAll(
  resolverIndex?: Map<string, any>,
  opts: { minSuggestions?: number } = {},
) {
  // Diagnostic log: entry
  try {
    if (typeof console !== 'undefined') console.info('city-uf: attachCityIntegrationToAll called', { providedIndex: !!resolverIndex, size: resolverIndex?.size });
  } catch (e) {
    /* ignore */
  }

  // try to lazy-load JSON index if none provided
  if (!resolverIndex || (resolverIndex && resolverIndex.size === 0)) {
    async function tryFetch(filename: string) {
      // Try multiple candidate URLs to be resilient to different hosting roots
      const candidates: string[] = [];
      try {
        if (typeof window !== 'undefined') {
          const origin = (window.location && window.location.origin) ? window.location.origin : '';
          candidates.push(`/data/jsonCidades/${filename}`);
          candidates.push(`/public/data/jsonCidades/${filename}`);
          candidates.push(`./data/jsonCidades/${filename}`);
          candidates.push(`./public/data/jsonCidades/${filename}`);
          candidates.push(`../data/jsonCidades/${filename}`);
          candidates.push(`../public/data/jsonCidades/${filename}`);
          candidates.push(`data/jsonCidades/${filename}`);
          candidates.push(`public/data/jsonCidades/${filename}`);
          if (origin) {
            candidates.push(`${origin}/data/jsonCidades/${filename}`);
            candidates.push(`${origin}/public/data/jsonCidades/${filename}`);
            candidates.push(`${origin}/../data/jsonCidades/${filename}`);
          }
        } else {
          candidates.push(`/data/jsonCidades/${filename}`);
          candidates.push(`/public/data/jsonCidades/${filename}`);
        }
      } catch (e) {
        // fallback
        candidates.push(`/data/jsonCidades/${filename}`);
        candidates.push(`/public/data/jsonCidades/${filename}`);
      }

      for (const url of candidates) {
        try {
          if (typeof console !== 'undefined') console.info('city-uf: trying fetch for', url);
          const res = await fetch(url);
          if (!res.ok) {
            if (typeof console !== 'undefined') console.info('city-uf: fetch not ok for', url, res.status);
            continue;
          }
          const json = await res.json();
          if (typeof console !== 'undefined') console.info('city-uf: fetch succeeded for', url);
          return json;
        } catch (e) {
          // continue to next candidate
          try {
            if (typeof console !== 'undefined' && console.debug) console.debug('city-uf: fetch failed for', url, e && e.message ? e.message : e);
          } catch (ie) {
            /* ignore */
          }
          continue;
        }
      }

      return null;
    }

    const raw1 = await tryFetch('estados-cidades.json');
    const raw2 = raw1 ? null : await tryFetch('estados-cidades2.json');
    resolverIndex = raw1 ? buildIndexFromData(raw1) : raw2 ? buildIndexFromData(raw2) : loadIndexFromProjectData();

    try {
      if (typeof console !== 'undefined') console.info('city-uf: resolverIndex size after load', resolverIndex ? resolverIndex.size : 0);
    } catch (e) {
      /* ignore */
    }
  }

  if (!resolverIndex || resolverIndex.size === 0) {
    try {
      if (typeof console !== 'undefined' && console.debug) console.debug('city-uf: no index available - continuing with on-demand fetch support');
    } catch (e) {}
    // NOTE: Do not abort here; allow attachAutocomplete to do on-demand fetch of index
  }

  // Match city-like fields: explicit '_cidade' data-bind OR names containing 'cidade', 'municipio' or 'naturalidade' (case-insensitive)
  const sel = 'input[data-bind$="_cidade"], input[name*="cidade" i], input[name*="municipio" i], input[name*="naturalidade" i]';
  const nodes = Array.from(document.querySelectorAll<HTMLInputElement>(sel));

  // Explicitly include known exceptional field names to ensure coverage
  const extraNames = ['municipioObito', 'cidadeNascimentoNoivo', 'cidadeNascimentoNoiva'];
  for (const nm of extraNames) {
    try {
      const el = document.querySelector<HTMLInputElement>(`input[name="${nm}"]`);
      if (el && !nodes.includes(el)) nodes.push(el);
    } catch (e) {
      /* ignore */
    }
  }
  const detaches: Array<() => void> = [];

  for (const node of nodes) {
    try {
      if (node.getAttribute('data-city-integrated') === '1') continue;
      // find candidate UF element
      let ufEl: HTMLSelectElement | HTMLInputElement | null = null;
      const dataBind = node.getAttribute('data-bind');
      if (dataBind && (dataBind.includes('_cidade') || dataBind.includes('_municipio') || dataBind.includes('_naturalidade'))) {
        // support _cidade, _municipio and _naturalidade patterns
        const candidate = `select[data-bind="${dataBind.replace('_cidade', '_uf').replace('_municipio', '_uf').replace('_naturalidade', '_uf')}"]`;
        ufEl = document.querySelector(candidate) as any;
        if (!ufEl) ufEl = document.querySelector(`input[data-bind="${dataBind.replace('_cidade', '_uf').replace('_municipio', '_uf').replace('_naturalidade', '_uf')}"]`) as any;
      }

      const name = node.getAttribute('name');
      if (!ufEl && name) {
        // handle a variety of naming conventions, try multiple candidate patterns so both
        // 'ufMunicipioObito' and 'ufObito' and 'ufNascimentoNoivo' are found.
        const candidates = new Set<string>();

        // 1) replace token with 'uf' (ex: municipioObito -> ufObito)
        candidates.add(name.replace(/cidade/i, 'uf').replace(/municipio/i, 'uf').replace(/naturalidade/i, 'uf'));

        // 2) prefix 'uf' to original name (ex: municipioObito -> ufMunicipioObito)
        candidates.add('uf' + name.charAt(0).toUpperCase() + name.slice(1));

        // 3) uf + suffix after token (ex: municipioObito -> ufObito)
        const suffix = name.replace(/^.*?(cidade|municipio|naturalidade)/i, '');
        if (suffix && suffix !== name) candidates.add('uf' + suffix);

        // 4) uf + tokenCapitalized + suffix (ex: municipioObito -> ufMunicipioObito)
        const m = name.match(/(cidade|municipio|naturalidade)(.*)/i);
        if (m) {
          const token = m[1];
          const rest = m[2] || '';
          const tokenCap = token.charAt(0).toUpperCase() + token.slice(1);
          candidates.add('uf' + tokenCap + rest);
        }

        // Try each candidate name (case-sensitive match via querySelector)
        for (const cand of candidates) {
          if (!cand) continue;
          ufEl = document.querySelector(`select[name="${cand}"]`) as any;
          if (ufEl) break;
          ufEl = document.querySelector(`input[name="${cand}"]`) as any;
          if (ufEl) break;
        }
      }

      // fallback: nearest select.w-uf or select in field container
      if (!ufEl) {
        const container = node.closest('.field') || node.parentElement;
        if (container) {
          ufEl = container.querySelector('select.w-uf, input.w-uf') as any;
        }
      }

      // last resort: global select.w-uf (avoid noisy matches)
      if (!ufEl) ufEl = document.querySelector('select.w-uf') as any;

      // Attach autocompletion + autofill
      try {
        const detachAuto = attachAutocomplete(node, { index: resolverIndex, minSuggestions: opts.minSuggestions || 5 });
        // mark integrated even if UF not found so subsequent attempts are not duplicated
        node.setAttribute('data-city-integrated', '1');

        if (!ufEl) {
          // log for diagnosis
          try {
            if (typeof console !== 'undefined') console.info('city-uf: uf element not found for', node.getAttribute('name') || node);
          } catch (e) {}
        } else {
          try {
            const detachFill = attachCityUfAutofill(node, ufEl as any, resolverIndex, () => {});
            detaches.push(() => {
              try {
                (detachFill as any)();
              } catch (e) {}
            });
          } catch (e) {
            /* ignore */
          }
        }

        detaches.push(() => {
          try {
            (detachAuto as any)();
          } catch (e) {}
          try {
            node.removeAttribute('data-city-integrated');
          } catch (e) {}
        });

        try {
          if (typeof console !== 'undefined' && console.debug) console.debug('city-uf: attached autocomplete to', node.getAttribute('name'));
        } catch (e) {}
      } catch (e) {
        // ignore per-element attach failures
        try {
          if (typeof console !== 'undefined' && console.debug) console.debug('city-uf: failed to attach for', node.getAttribute('name'), e && e.message ? e.message : e);
        } catch (ie) {}
      }
    } catch (e) {
      /* ignore per-element failures */
    }
  }

  return function detachAll() {
    for (const d of detaches) {
      try {
        d();
      } catch (e) {
        /* ignore */
      }
    }
  };
}

