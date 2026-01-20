import {
  findCitySuggestions,
  incrementFrequency,
  loadIndexFromProjectData,
  fetchIndexFromPublicData,
} from '../shared/city-uf-resolver.js';

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

  // Accessibility: mark input as a combobox
  cityInput.setAttribute('role', 'combobox');
  cityInput.setAttribute('aria-autocomplete', 'list');
  cityInput.setAttribute('aria-expanded', 'false');
  cityInput.setAttribute('aria-controls', container.id);
  cityInput.setAttribute('autocomplete', cityInput.getAttribute('autocomplete') || 'off');

  // Insert after cityInput
  cityInput.parentElement?.appendChild(container);

  let items: HTMLElement[] = [];
  let activeIndex = -1;

  // keep a lazy index reference so we can fetch data on-demand if empty
  let lazyIndex = index;

  async function renderSuggestions(q: string) {
    // If no index data, try to fetch remote index on-demand (best-effort)
    if ((!lazyIndex || lazyIndex.size === 0) && typeof fetchIndexFromPublicData === 'function') {
      try {
        // Show loading indicator
        container.innerHTML = '<div class="city-autocomplete-loading">Loading...</div>';
        container.hidden = false;
        cityInput.setAttribute('aria-expanded', 'true');
        const fetched = await fetchIndexFromPublicData();
        if (fetched && fetched.size > 0) {
          lazyIndex = fetched;
        }
      } catch (e) {
        // ignore fetch failures and proceed with empty index
      }
    }

    const matches = findCitySuggestions(lazyIndex, q, minSuggestions);
    container.innerHTML = '';
    items = [];

    if (matches.length === 0) {
      // collapse and update ARIA
      container.hidden = true;
      cityInput.setAttribute('aria-expanded', 'false');
      cityInput.removeAttribute('aria-activedescendant');
      activeIndex = -1;
      return;
    }

    // populate
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

      // use pointerdown for broader input device support and mousedown as fallback
      const onSelect = (ev: Event) => {
        // prevent blur of input before click happens
        ev.preventDefault();
        selectSuggestion(i);
      };
      el.addEventListener('pointerdown', onSelect as any);
      el.addEventListener('mousedown', onSelect as any);

      // hover with mouse sets the active item for keyboard parity
      el.addEventListener('mouseenter', () => setActive(i));

      container.appendChild(el);
      items.push(el);
    }

    positionContainer();
    container.hidden = false;

    // Accessibility: mark expanded and set initial active item
    cityInput.setAttribute('aria-expanded', 'true');
    // start with first item active (improves keyboard UX)
    setActive(0);
  }

  function positionContainer() {
    const rect = cityInput.getBoundingClientRect();
    // ensure dropdown width matches input exactly and is positioned absolutely
    container.style.width = `${rect.width}px`;
    container.style.minWidth = `${rect.width}px`;
    container.style.left = `${cityInput.offsetLeft}px`;
    container.style.top = `${cityInput.offsetTop + cityInput.offsetHeight}px`;
  }

  function setActive(idx: number) {
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].classList.remove('active');
      items[activeIndex].setAttribute('aria-selected', 'false');
    }
    activeIndex = idx;
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].classList.add('active');
      items[activeIndex].setAttribute('aria-selected', 'true');
      // announce for screen readers via aria-activedescendant
      cityInput.setAttribute('aria-activedescendant', items[activeIndex].id || '');
      // Keep focus on input, but ensure the active item is visually focused for keyboard users
      try {
        (items[activeIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      } catch (e) {
        /* ignore */
      }
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

    // increment frequency locally (best-effort, non-blocking)
    try {
      incrementFrequency(city, uf);
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
    // call async renderer but don't await it (fire-and-forget)
    renderSuggestions(q).catch(() => {});
  });

  // Consolidated keyboard handler on input element
  cityInput.addEventListener('keydown', (ev) => {
    const key = ev.key;

    // When closed, ArrowDown opens and focuses first item
    if (container.hidden) {
      if (key === 'ArrowDown') {
        //Open suggestions (async). We do not await here to avoid blocking key handling
        renderSuggestions(cityInput.value || '').catch(() => {});
        ev.preventDefault();
      }
      return;
    }

    // When open, handle navigation and actions
    if (key === 'ArrowDown') {
      ev.preventDefault();
      // if no active yet, go to first
      const next = Math.min(items.length - 1, Math.max(0, activeIndex + 1));
      setActive(next);
    } else if (key === 'ArrowUp') {
      ev.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      setActive(prev);
    } else if (key === 'Enter') {
      // only intercept if an item is active
      if (activeIndex >= 0 && items[activeIndex]) {
        ev.preventDefault();
        ev.stopPropagation();
        selectSuggestion(activeIndex);
      }
      // otherwise allow default (e.g., form submission)
    } else if (key === 'Escape') {
      ev.preventDefault();
      hideSuggestions();
      cityInput.focus();
    } else if (key === 'Tab') {
      // close suggestions and allow focus change
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
