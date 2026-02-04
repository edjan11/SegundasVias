const AUTO_SAVE_KEY = 'ui.autoSaveFiles';

export function isAutoSaveEnabled(): boolean {
  return localStorage.getItem(AUTO_SAVE_KEY) === 'true';
}

export function setAutoSaveEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_SAVE_KEY, enabled ? 'true' : 'false');
  updateAutoSaveUi(enabled);
}

export function updateAutoSaveUi(forceState?: boolean): void {
  const enabled = typeof forceState === 'boolean' ? forceState : isAutoSaveEnabled();
  const btn = document.getElementById('btn-auto-save') as HTMLButtonElement | null;
  if (btn) {
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    btn.classList.toggle('active', enabled);
    btn.textContent = enabled ? 'Auto ON' : 'Auto OFF';
  }
  const checkbox = document.getElementById('settings-auto-save-files') as HTMLInputElement | null;
  if (checkbox) checkbox.checked = enabled;
}

export function setupAutoSaveToggle(): void {
  const btn = document.getElementById('btn-auto-save') as HTMLButtonElement | null;
  const checkbox = document.getElementById('settings-auto-save-files') as HTMLInputElement | null;

  updateAutoSaveUi();

  if (btn && btn.getAttribute('data-bound') !== '1') {
    btn.setAttribute('data-bound', '1');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const next = !isAutoSaveEnabled();
      setAutoSaveEnabled(next);
    });
  }

  if (checkbox && checkbox.getAttribute('data-bound') !== '1') {
    checkbox.setAttribute('data-bound', '1');
    checkbox.addEventListener('change', () => {
      setAutoSaveEnabled(!!checkbox.checked);
    });
  }
}
