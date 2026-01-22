import { resolveCityToUf, loadIndexFromProjectData, buildIndexFromData } from '../shared/city-uf-resolver.js';
import { attachAutocomplete } from './city-autocomplete.js';

const CITY_UF_WARNING_CLASS = 'city-uf-warning';
const UF_TAB_SKIP_ATTR = 'data-uf-tab-skip';

function trimValue(value?: string | null): string {
  return String(value || '').trim();
}

function getFieldContainer(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  return (el.closest('.field') || el.closest('.campo') || el.parentElement) as HTMLElement | null;
}

function isTabbable(el: HTMLElement): boolean {
  if (!el) return false;
  // Avoid `instanceof` checks since they may not be available in some test environments
  if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'hidden') return false;
  if ((el as HTMLInputElement).disabled) return false;
  if (el.getAttribute('tabindex') === '-1') return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  return true;
}

function findNextTabbable(from: HTMLElement): HTMLElement | null {
  const root = (from.closest('form') as HTMLElement | null) || document.body;
  const selector = 'input, select, textarea, button, a[href], [tabindex]';
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(isTabbable);
  const idx = nodes.indexOf(from);
  if (idx === -1) return null;
  for (let i = idx + 1; i < nodes.length; i += 1) {
    if (isTabbable(nodes[i])) return nodes[i];
  }
  return null;
}

/**
 * Attach city->UF autofill behavior between cityInput and ufInput
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
  let skipBlur = false;

  const ufEl = ufInput as HTMLElement;
  const cityField = getFieldContainer(cityInput);
  const ufField = getFieldContainer(ufEl);

  function setWarningState(active: boolean) {
    cityInput.classList.toggle(CITY_UF_WARNING_CLASS, active);
    ufEl.classList.toggle(CITY_UF_WARNING_CLASS, active);
    if (cityField) cityField.classList.toggle(CITY_UF_WARNING_CLASS, active);
    if (ufField) ufField.classList.toggle(CITY_UF_WARNING_CLASS, active);
  }

  function clearAutoFilled() {
    if ((ufInput as HTMLInputElement).tagName === 'SELECT') {
      ufEl.removeAttribute('data-auto-filled');
      ufEl.classList.remove('auto-filled');
    } else {
      (ufInput as HTMLInputElement).removeAttribute('readonly');
    }
    lastAutoFilled = false;
  }

  function ensureTabSkip() {
    if (!ufEl.getAttribute(UF_TAB_SKIP_ATTR)) {
      ufEl.setAttribute('tabindex', '-1');
      ufEl.setAttribute(UF_TAB_SKIP_ATTR, '1');
    }
  }

  function maybeAdvanceFocus() {
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== cityInput && active !== document.body && active !== document.documentElement)
      return;
    const next = findNextTabbable(cityInput);
    if (next) next.focus();
  }

  function resolveAndValidate() {
    const city = trimValue(cityInput.value);
    if (!city) {
      setWarningState(false);
      clearAutoFilled();
      return null;
    }
    if (!resolverIndex || resolverIndex.size === 0) {
      setWarningState(false);
      return null;
    }

    const currentUf = trimValue((ufInput as any).value);
    const res = resolveCityToUf(city, currentUf ? currentUf : null, resolverIndex);
    const warn = res.status === 'invalid' || res.status === 'ambiguous' || res.status === 'divergent';
    setWarningState(warn);
    return res;
  }

  async function handleCityConfirm(options: { advanceFocus?: boolean } = {}) {
    const res = resolveAndValidate();
    if (!res) return;

    if (res.status === 'inferred') {
      // Autofill UF and set temporary readonly-ish state
      const ufValue = (res as any).uf || '';
      if ((ufInput as HTMLInputElement).tagName === 'SELECT') {
        (ufInput as HTMLSelectElement).value = ufValue;
        ufEl.setAttribute('data-auto-filled', 'true');
        ufEl.classList.add('auto-filled');
        ufEl.dispatchEvent(new Event('input', { bubbles: true }));
        ufEl.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        (ufInput as HTMLInputElement).value = ufValue;
        (ufInput as HTMLInputElement).setAttribute('readonly', 'true');
        ufEl.dispatchEvent(new Event('input', { bubbles: true }));
        ufEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      lastAutoFilled = true;
    } else if (res.status === 'divergent' || res.status === 'invalid' || res.status === 'ambiguous') {
      clearAutoFilled();
    }

    if (options.advanceFocus) maybeAdvanceFocus();
    if (typeof onAutofilled === 'function') onAutofilled(res);
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

  ensureTabSkip();

  // When city is confirmed (blur/Enter/autocomplete), try to autofill
  cityInput.addEventListener('blur', () => {
    // Slight delay for selection events
    setTimeout(() => {
      if (skipBlur) {
        skipBlur = false;
        return;
      }
      handleCityConfirm({ advanceFocus: true });
    }, 0);
  });

  cityInput.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      skipBlur = true;
      handleCityConfirm({ advanceFocus: true });
    } else if (ev.key === 'Tab') {
      skipBlur = true;
      handleCityConfirm();
    }
  });

  cityInput.addEventListener('city-autocomplete:select', () => {
    skipBlur = true;
    handleCityConfirm({ advanceFocus: true });
  });

  cityInput.addEventListener('input', () => {
    setWarningState(false);
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
  ufInput.addEventListener('change', () => {
    resolveAndValidate();
  });
  ufInput.addEventListener('input', () => {
    resolveAndValidate();
  });

  // Return an detach function so caller can remove listeners
  return function detach() {
    cityInput.removeEventListener('blur', handleCityConfirm as any);
    cityInput.removeEventListener('keydown', handleCityConfirm as any);
    cityInput.removeEventListener('city-autocomplete:select', handleCityConfirm as any);
    ufInput.removeEventListener('focus', removeReadonlyIfUserFocused as any);
    ufInput.removeEventListener('mousedown', removeReadonlyIfUserFocused as any);
    ufInput.removeEventListener('change', resolveAndValidate as any);
    ufInput.removeEventListener('input', resolveAndValidate as any);
  };
}

/**
 * Attach city autocomplete + city->UF autofill to all fields that look like cities.
 * - If `resolverIndex` is not provided, tries to fetch project JSON and falls back to local loader.
 * - Heuristics to find UF element:
 *    1) matching data-bind replacing `_cidade` -> `_uf`
 *    2) matching name replacing `cidade` -> `uf`
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
          candidates.push(`../data/jsonCidades/${filename}`);
          candidates.push(`./data/jsonCidades/${filename}`);
          candidates.push(`data/jsonCidades/${filename}`);
          if (origin) {
            candidates.push(`${origin}/data/jsonCidades/${filename}`);
            candidates.push(`${origin}/../data/jsonCidades/${filename}`);
          }
        } else {
          candidates.push(`/data/jsonCidades/${filename}`);
        }
      } catch (e) {
        // fallback
        candidates.push(`/data/jsonCidades/${filename}`);
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
            const detachFill = attachCityUfAutofill(node, ufEl as any, resolverIndex, (res) => {
              try {
                const dataBind = node.getAttribute('data-bind') || '';
                if (res && res.status === 'inferred') {
                  // When parents' city autofills, jump to maternal grandmother
                  if (dataBind && (dataBind.includes('pai') || dataBind.includes('mae'))) {
                    const target = document.querySelector('input[data-bind="ui.mae_avo_materna"]') as HTMLInputElement | null;
                    if (target) setTimeout(() => target.focus(), 0);
                  }
                }
              } catch (e) {}
            });
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

