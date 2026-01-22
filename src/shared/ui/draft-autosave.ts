type DraftAutosaveOptions = {
  key: string;
  getData: () => unknown;
  debounceMs?: number;
  root?: Document | HTMLElement;
};

export function setupDraftAutosave(options: DraftAutosaveOptions): void {
  const key = String(options.key || '').trim();
  if (!key) return;
  const root = options.root || document;
  const delay = typeof options.debounceMs === 'number' ? options.debounceMs : 600;
  let timer: number | undefined;

  const save = () => {
    try {
      const payload = {
        savedAt: new Date().toISOString(),
        data: options.getData(),
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      /* ignore */
    }
  };

  const handler = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(save, delay) as unknown as number;
  };

  root.addEventListener('input', handler, true);
  root.addEventListener('change', handler, true);
}
