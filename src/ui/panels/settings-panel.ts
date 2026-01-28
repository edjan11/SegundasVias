type SettingsPanelOptions = {
  drawerPositionKey: string;
  enableCpfKey: string;
  enableNameKey: string;
  panelInlineKey: string;
  fontFamilyKey?: string;
  themeKey?: string;
  defaultFontFamily?: string;
  defaultTheme?: 'light' | 'dark';
  applyFontFamily?: (fontFamily: string) => void;
  applyTheme?: (mode: 'light' | 'dark') => void;
  autoJsonKey?: string;
  autoXmlKey?: string;
  fixedLayoutKey?: string;
  internalZoomKey?: string;
  defaultDrawerPosition?: string;
  defaultPanelInline?: boolean;
  applyDrawerPosition?: (pos: string) => void;
  applyFixedLayout?: (enabled: boolean) => void;
  applyInternalZoom?: (value: number) => void;
  updateZoomLabel?: (label: HTMLElement | null, value: number) => void;
  onAfterSave?: () => void;
  onAfterApply?: () => void;
};

export function setupSettingsPanelBase(options: SettingsPanelOptions): void {
  const select = document.getElementById('settings-drawer-position') as HTMLSelectElement | null;
  const cbCpf = document.getElementById('settings-enable-cpf') as HTMLInputElement | null;
  const cbName = document.getElementById('settings-enable-name') as HTMLInputElement | null;
  const cbAutoJson = document.getElementById('settings-auto-json') as HTMLInputElement | null;
  const cbAutoXml = document.getElementById('settings-auto-xml') as HTMLInputElement | null;
  const cbFixed = document.getElementById('settings-fixed-layout') as HTMLInputElement | null;
  const zoomRange = document.getElementById('settings-zoom') as HTMLInputElement | null;
  const zoomValue = document.getElementById('settings-zoom-value') as HTMLElement | null;
  const cbInline = document.getElementById('settings-panel-inline') as HTMLInputElement | null;
  const fontSelect = document.getElementById('settings-font-family') as HTMLSelectElement | null;
  const themeToggle = document.getElementById('settings-theme-dark') as HTMLInputElement | null;
  const saveBtn = document.getElementById('settings-save') as HTMLElement | null;
  const applyBtn = document.getElementById('settings-apply') as HTMLElement | null;

  const pos =
    localStorage.getItem(options.drawerPositionKey) ||
    options.defaultDrawerPosition ||
    'side';
  const enableCpf = localStorage.getItem(options.enableCpfKey) !== 'false';
  const enableName = localStorage.getItem(options.enableNameKey) !== 'false';
  const panelInlineStored = localStorage.getItem(options.panelInlineKey);
  const panelInline =
    panelInlineStored === null
      ? !!options.defaultPanelInline
      : panelInlineStored === 'true';
  const fontStored = options.fontFamilyKey
    ? localStorage.getItem(options.fontFamilyKey) || options.defaultFontFamily || ''
    : '';
  const themeStored = options.themeKey
    ? (localStorage.getItem(options.themeKey) as 'light' | 'dark' | null) ||
      options.defaultTheme ||
      'light'
    : 'light';
  const fixedLayout = options.fixedLayoutKey
    ? localStorage.getItem(options.fixedLayoutKey) === 'true'
    : false;
  const zoomStored = options.internalZoomKey
    ? Number(localStorage.getItem(options.internalZoomKey) || '100') || 100
    : 100;

  if (select) select.value = pos;
  if (options.applyDrawerPosition) options.applyDrawerPosition(pos);
  if (cbCpf) cbCpf.checked = !!enableCpf;
  if (cbName) cbName.checked = !!enableName;
  if (cbAutoJson && options.autoJsonKey) {
    cbAutoJson.checked = localStorage.getItem(options.autoJsonKey) !== 'false';
  }
  if (cbAutoXml && options.autoXmlKey) {
    cbAutoXml.checked = localStorage.getItem(options.autoXmlKey) !== 'false';
  }
  if (cbFixed) cbFixed.checked = !!fixedLayout;
  if (zoomRange) zoomRange.value = String(zoomStored);
  if (options.updateZoomLabel) options.updateZoomLabel(zoomValue, zoomStored);
  if (options.applyFixedLayout) options.applyFixedLayout(fixedLayout);
  if (options.applyInternalZoom) options.applyInternalZoom(zoomStored);
  if (cbInline) cbInline.checked = !!panelInline;
  if (fontSelect && fontStored) fontSelect.value = fontStored;
  if (options.applyFontFamily && fontStored) options.applyFontFamily(fontStored);
  if (themeToggle) themeToggle.checked = themeStored === 'dark';
  if (options.applyTheme) options.applyTheme(themeStored === 'dark' ? 'dark' : 'light');

  cbFixed?.addEventListener('change', () => {
    const enabled = !!cbFixed.checked;
    if (options.applyFixedLayout) options.applyFixedLayout(enabled);
    if (options.fixedLayoutKey) {
      localStorage.setItem(options.fixedLayoutKey, enabled ? 'true' : 'false');
    }
  });

  zoomRange?.addEventListener('input', () => {
    const value = Number(zoomRange.value || '100') || 100;
    if (options.updateZoomLabel) options.updateZoomLabel(zoomValue, value);
    if (options.applyInternalZoom) options.applyInternalZoom(value);
    if (options.internalZoomKey) {
      localStorage.setItem(options.internalZoomKey, String(value));
    }
  });

  fontSelect?.addEventListener('change', () => {
    const value = fontSelect.value || '';
    if (options.applyFontFamily) options.applyFontFamily(value);
    if (options.fontFamilyKey) localStorage.setItem(options.fontFamilyKey, value);
  });

  themeToggle?.addEventListener('change', () => {
    const mode = themeToggle.checked ? 'dark' : 'light';
    if (options.applyTheme) options.applyTheme(mode);
    if (options.themeKey) localStorage.setItem(options.themeKey, mode);
  });

  applyBtn?.addEventListener('click', () => {
    const newPos = select?.value || pos;
    if (options.applyDrawerPosition) options.applyDrawerPosition(newPos);
    if (options.onAfterApply) options.onAfterApply();
  });

  saveBtn?.addEventListener('click', () => {
    const newPos = select?.value || pos;
    localStorage.setItem(options.drawerPositionKey, newPos);
    localStorage.setItem(options.enableCpfKey, cbCpf?.checked ? 'true' : 'false');
    localStorage.setItem(options.enableNameKey, cbName?.checked ? 'true' : 'false');
    if (cbInline) localStorage.setItem(options.panelInlineKey, cbInline.checked ? 'true' : 'false');
    if (fontSelect && options.fontFamilyKey) {
      localStorage.setItem(options.fontFamilyKey, fontSelect.value || '');
    }
    if (themeToggle && options.themeKey) {
      localStorage.setItem(options.themeKey, themeToggle.checked ? 'dark' : 'light');
    }
    if (cbAutoJson && options.autoJsonKey) {
      localStorage.setItem(options.autoJsonKey, cbAutoJson.checked ? 'true' : 'false');
    }
    if (cbAutoXml && options.autoXmlKey) {
      localStorage.setItem(options.autoXmlKey, cbAutoXml.checked ? 'true' : 'false');
    }
    if (cbFixed && options.fixedLayoutKey) {
      localStorage.setItem(options.fixedLayoutKey, cbFixed.checked ? 'true' : 'false');
    }
    if (zoomRange && options.internalZoomKey) {
      localStorage.setItem(options.internalZoomKey, String(zoomRange.value || '100'));
    }
    if (options.onAfterSave) options.onAfterSave();
  });
}
