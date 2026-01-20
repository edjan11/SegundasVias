import { findCitySuggestions, loadIndexFromProjectData } from '../shared/city-uf-resolver';

/**
 * Accessible city autocomplete UI component.
 * Usage: attachAutocomplete(cityInputElement, options?);
 * - shows suggestions as "CITY - UF" (uppercase display)
 * - keyboard: ArrowDown/ArrowUp to navigate, Enter to select, Esc to close
 * - clicking an item selects it
 * - on select: set input value and trigger blur (so the attachCityUfAutofill can run)
 */

export function attachAutocomplete(
  cityInput: HTMLInputElement,
  opts: { index?: Map<string, any>; minSuggestions?: number } = {}
) {
  const index = opts.index || loadIndexFromProjectData();
  const minSuggestions = opts.minSuggestions || 5;

  // Create suggestions container
  const container = document.createElement('div');
  container.className = 'city-autocomplete-list';
  container.style.position = 'absolute';
  container.style.zIndex = '9999';
  container.setAttribute('role', 'listbox');
  container.id = `city-autocomplete-${Math.random().toString(36).substr(2, 9)}`;
  container.hidden = true;

  // Insert after cityInput
  cityInput.parentElement?.appendChild(container);

  let items: HTMLElement[] = [];
  let activeIndex = -1;

  function renderSuggestions(q: string) {
    const matches = findCitySuggestions(index, q, minSuggestions);
    container.innerHTML = '';
    items = [];
    activeIndex = -1;

    if (matches.length === 0) {
      container.hidden = true;
      return;
    }

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const el = document.createElement('div');
      el.className = 'city-autocomplete-item';
      el.setAttribute('role', 'option');
      el.setAttribute('data-city', m.city);
      el.setAttribute('data-uf', m.uf);
      el.id = `${container.id}-opt-${i}`;
      el.tabIndex = -1;
      el.textContent = `${m.city.toUpperCase()} - ${m.uf}`;
      el.addEventListener('mousedown', (ev) => {
        // prevent blur of input before click happens
        ev.preventDefault();
        selectSuggestion(i);
      });
      container.appendChild(el);
      items.push(el);
    }

    positionContainer();
    container.hidden = false;
  }

  function positionContainer() {
    const rect = cityInput.getBoundingClientRect();
    container.style.minWidth = `${rect.width}px`;
    container.style.left = `${cityInput.offsetLeft}px`;
    container.style.top = `${cityInput.offsetTop + cityInput.offsetHeight}px`;
  }

  function getOrCreateSessionId() {
    try {
      const cookieName = 'sessionId';
      const cookies = document.cookie.split(';').map((c) => c.trim());
      for (const c of cookies) {
        if (c.startsWith(`${cookieName}=`)) return c.split('=')[1];
      }
      const id = `s_${Math.random().toString(36).slice(2, 10)}`;
      // set cookie for 30 days
      document.cookie = `${cookieName}=${id}; Path=/; Max-Age=${30 * 24 * 60 * 60}`;
      return id;
    } catch (e) {
      return 'anon';
    }
  }

  function setActive(idx: number) {
    if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].classList.remove('active');
    activeIndex = idx;
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].classList.add('active');
      // announce for screen readers via aria-activedescendant
      cityInput.setAttribute('aria-activedescendant', items[activeIndex].id || '');
      items[activeIndex].focus();
    } else {
      cityInput.removeAttribute('aria-activedescendant');
    }
  }

  async function selectSuggestion(idx: number) {
    if (!items[idx]) return;
    const el = items[idx];
    const city = el.getAttribute('data-city') || '';
    const uf = el.getAttribute('data-uf') || '';
    // set input value and trigger input event
    cityInput.value = city;
    cityInput.dispatchEvent(new Event('input'));

    // increment frequency via server-side store (best-effort, non-blocking)
    try {
      const scopeId = getOrCreateSessionId();
      fetch('/api/frequency/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeId, city, uf }),
      }).catch(() => {
        /* swallow errors, fail-safe */
      });
    } catch (e) {
      // ignore
    }

    // hide list and blur to trigger attachCityUfAutofill's blur handler
    hideSuggestions();
    setTimeout(() => cityInput.blur(), 0);
  }

  function hideSuggestions() {
    container.hidden = true;
    activeIndex = -1;
    items = [];
  }

  cityInput.addEventListener('input', (ev) => {
    const q = (ev.target as HTMLInputElement).value;
    if (!q || q.trim().length === 0) {
      hideSuggestions();
      return;
    }
    renderSuggestions(q);
  });

  cityInput.addEventListener('keydown', (ev) => {
    if (container.hidden) return;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      const next = Math.min(items.length - 1, activeIndex + 1);
      setActive(next);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      setActive(prev);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      if (activeIndex >= 0) selectSuggestion(activeIndex);
      else {
        // if no active, choose first suggestion
        if (items.length > 0) selectSuggestion(0);
      }
    } else if (ev.key === 'Escape') {
      hideSuggestions();
    }
  });

  // close if clicking outside
  document.addEventListener('click', (ev) => {
    if (container.contains(ev.target as Node) || cityInput.contains(ev.target as Node)) return;
    hideSuggestions();
  });

  return function detach() {
    container.remove();
  };
}
