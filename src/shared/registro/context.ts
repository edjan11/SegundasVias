type RegistroContextMode = 'include' | 'edit';

type RegistroContext = {
  mode: RegistroContextMode;
  recordId?: string;
};

const DEFAULT_CONTEXT: RegistroContext = { mode: 'include' };

function getWindowContext(): RegistroContext {
  const w = window as Window & { __registroContext?: RegistroContext };
  if (w.__registroContext && w.__registroContext.mode) return w.__registroContext;
  w.__registroContext = { ...DEFAULT_CONTEXT };
  return w.__registroContext;
}

export function updateButtonsVisibility(): void {
  const btnIncluir = document.getElementById('btn-incluir-assento') as HTMLElement | null;
  const btnSave = document.getElementById('btn-save') as HTMLButtonElement | null;
  const ctx = getWindowContext();

  if (ctx.mode === 'include') {
    if (btnIncluir) btnIncluir.style.display = 'inline-flex';
    if (btnSave) {
      btnSave.style.display = 'inline-flex';
      btnSave.disabled = true;
      btnSave.setAttribute('aria-disabled', 'true');
    }
    return;
  }

  if (btnIncluir) btnIncluir.style.display = 'none';
  if (btnSave) {
    btnSave.style.display = 'inline-flex';
    btnSave.disabled = false;
    btnSave.removeAttribute('aria-disabled');
  }
}

export function getRegistroContext(): RegistroContext {
  return getWindowContext();
}

export function setRegistroContext(mode: RegistroContextMode, recordId?: string): RegistroContext {
  const ctx = getWindowContext();
  ctx.mode = mode;
  ctx.recordId = recordId || undefined;
  updateButtonsVisibility();
  return ctx;
}

export function ensureRegistroContext(): void {
  getWindowContext();
  updateButtonsVisibility();
}

export function exposeRegistroContextToWindow(): void {
  const w = window as Window & {
    __setRegistroContext?: (mode: RegistroContextMode, recordId?: string) => void;
    __getRegistroContext?: () => RegistroContext;
    __updateButtonsVisibility?: () => void;
  };
  w.__setRegistroContext = (mode, recordId) => {
    setRegistroContext(mode, recordId);
  };
  w.__getRegistroContext = () => getRegistroContext();
  w.__updateButtonsVisibility = () => updateButtonsVisibility();
}
