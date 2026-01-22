export function initUsability(): void {
  const page = (document.body.getAttribute('data-page') || 'page').toLowerCase();
  const storageKey = (k: string) => `${k}_${page}`;

  function applyFont(size: string) {
    document.body.classList.remove('font-sm', 'font-md', 'font-lg', 'font-xl');
    document.body.classList.add(`font-${size}`);
    localStorage.setItem(storageKey('ui_font_size'), size);
    updateFontButtons(size);
  }

  function updateFontButtons(active: string) {
    const btns = Array.from(document.querySelectorAll('#usability-card [data-font]')) as HTMLButtonElement[];
    btns.forEach(b => b.classList.toggle('active', b.dataset.font === active));
  }

  function setCompact(enabled: boolean) {
    if (enabled) {
      document.body.classList.add('compact-mode');
      document.documentElement.style.setProperty('--ui-gap', '6px');
    } else {
      document.body.classList.remove('compact-mode');
      document.documentElement.style.setProperty('--ui-gap', '8px');
    }
    localStorage.setItem(storageKey('ui_compact_mode'), enabled ? 'true' : 'false');
  }

  function setLayoutFixed(enabled: boolean) {
    document.body.classList.toggle('layout-fixed', !!enabled);
    localStorage.setItem(storageKey('ui_fixed_layout'), enabled ? 'true' : 'false');
  }

  function setFocusStrong(enabled: boolean) {
    document.body.classList.toggle('focus-strong', !!enabled);
    localStorage.setItem(storageKey('ui_focus_highlight'), enabled ? 'true' : 'false');
  }

  // restore
  try {
    const font = localStorage.getItem(storageKey('ui_font_size')) || localStorage.getItem('ui_font_size') || 'sm';
    applyFont(font);
    const compact = localStorage.getItem(storageKey('ui_compact_mode')) === 'true';
    setCompact(compact);
    const fixed = localStorage.getItem(storageKey('ui_fixed_layout')) === 'true';
    setLayoutFixed(fixed);
    const focus = localStorage.getItem(storageKey('ui_focus_highlight'));
    setFocusStrong(focus === null ? true : focus === 'true');
  } catch (e) {
    // ignore storage errors
  }

  // wire up controls
  document.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    if (!t) return;
    const font = (t as HTMLElement).closest('[data-font]') as HTMLElement | null;
    if (font && font.dataset.font) {
      applyFont(font.dataset.font);
    }
  });

  const cCompact = document.getElementById('usability-compact') as HTMLInputElement | null;
  if (cCompact) cCompact.addEventListener('change', () => setCompact(!!cCompact.checked));

  const cFixed = document.getElementById('usability-fixed') as HTMLInputElement | null;
  if (cFixed) cFixed.addEventListener('change', () => setLayoutFixed(!!cFixed.checked));

  const cFocus = document.getElementById('usability-focus') as HTMLInputElement | null;
  if (cFocus) cFocus.addEventListener('change', () => setFocusStrong(!!cFocus.checked));

  // reflect state in controls
  const setInitialControl = () => {
    const font = localStorage.getItem(storageKey('ui_font_size')) || localStorage.getItem('ui_font_size') || 'sm';
    updateFontButtons(font);
    if (cCompact) cCompact.checked = localStorage.getItem(storageKey('ui_compact_mode')) === 'true';
    if (cFixed) cFixed.checked = localStorage.getItem(storageKey('ui_fixed_layout')) === 'true';
    if (cFocus) cFocus.checked = localStorage.getItem(storageKey('ui_focus_highlight')) !== 'false';
  };

  setInitialControl();
}
