// helpers to set up listeners in a way that keeps implementations testable and isolated
// All functions accept callbacks rather than relying on outer-scope functions.

import { normalizeCpf, formatCpf } from '../shared/validators/cpf';
import { normalizeDate } from '../shared/validators/date';
import { normalizeTime } from '../shared/validators/time';

export function initMatriculaAutoListeners(opts: {
  updateMatricula: () => void;
  applyCartorioChange: () => void;
  getDocument: () => Document;
  logger?: { warn?: (...args: any[]) => void; debug?: (...args: any[]) => void };
}) {
  const { updateMatricula, applyCartorioChange, getDocument, logger } = opts;
  const doc = getDocument();
  // Inputs with explicit ids (used in nascimento)
  const fields = ['matricula-livro', 'matricula-folha', 'matricula-termo'];
  fields.forEach((id) => {
    const el = doc.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.addEventListener('input', () => {
      const sanitized = (el.value || '').replace(/\D/g, '');
      if (sanitized !== el.value) el.value = sanitized;
      updateMatricula();
    });
  });

  // Inputs by name (used in casamento and some pages)
  const namedInputs = Array.from(
    doc.querySelectorAll('input[name="livro"], input[name="folha"], input[name="termo"]'),
  ) as HTMLInputElement[];
  namedInputs.forEach((ni) => {
    ni.addEventListener('input', () => {
      const sanitized = (ni.value || '').replace(/\D/g, '');
      if (sanitized !== ni.value) ni.value = sanitized;
      updateMatricula();
    });
  });

  const cartSelect = doc.getElementById('cartorio-oficio') as HTMLSelectElement | null;
  if (cartSelect) {
    cartSelect.addEventListener('change', () => applyCartorioChange());

    // Quick numeric entry logic
    let buffer = '' as string;
    let timer: number | null = null;

    const clearBuffer = () => {
      buffer = '';
      if (timer) window.clearTimeout(timer);
      timer = null;
    };

    cartSelect.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key;
      if (key >= '0' && key <= '9') {
        e.preventDefault();
        buffer += key;
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          buffer = '';
        }, 700);

        const match = Array.from(cartSelect.options).find((opt) => (opt as any).value === buffer);
        if (match) {
          (cartSelect as any).value = buffer;
          cartSelect.dispatchEvent(new Event('input', { bubbles: true }));
          cartSelect.dispatchEvent(new Event('change', { bubbles: true }));
          clearBuffer();
        }
        return;
      }
      if (key === 'Backspace') {
        e.preventDefault();
        buffer = buffer.slice(0, -1);
        return;
      }
    });
  }

  const dateEls = Array.from(
    doc.querySelectorAll(
      'input[name="dataRegistro"], input[name="dataTermo"], input[data-bind="registro.data_registro"]',
    ),
  ) as HTMLInputElement[];
  dateEls.forEach((d) => d.addEventListener('input', () => updateMatricula()));

  const tipoInput = doc.querySelector('input[data-bind="certidao.tipo_registro"]') as HTMLInputElement | null;
  if (tipoInput) tipoInput.addEventListener('change', () => {
    try {
      // keep previous behavior: try/catch without breaking
    } catch (e) {
      logger?.warn?.('initMatriculaAutoListeners: error handling tipo change', e);
    }
    updateMatricula();
  });

  // compute once at setup
  updateMatricula();
}

export function initActions(opts: {
  saveDraft: () => void;
  generateFile: (f: string) => void;
  setTipoRegistro: (t: string) => void;
  getDocument: () => Document;
  navigateToAct?: (kind: string) => void;
}) {
  const { saveDraft, generateFile, setTipoRegistro, getDocument, navigateToAct } = opts;
  const doc = getDocument();
  (doc.getElementById('btn-save') as HTMLElement | null)?.addEventListener('click', saveDraft);
  (doc.getElementById('btn-json') as HTMLElement | null)?.addEventListener('click', () =>
    generateFile('json'),
  );
  const globalBtnXml = doc.getElementById('btn-xml') as HTMLElement | null;
  if (globalBtnXml) {
    globalBtnXml.addEventListener('click', (e) => {
      if ((globalBtnXml as HTMLElement & { dataset?: any }).dataset?.exclusive === 'true') return;
      generateFile('xml');
    });
  }

  // Buttons now also trigger optional navigation when clicked
  doc.getElementById('btn-nascimento')?.addEventListener('click', () => {
    setTipoRegistro('nascimento');
    navigateToAct?.('nascimento');
  });

  doc.getElementById('btn-casamento')?.addEventListener('click', () => {
    setTipoRegistro('casamento');
    navigateToAct?.('casamento');
  });

  (doc.getElementById('btn-obito') as HTMLElement | null)?.addEventListener('click', () => {
    setTipoRegistro('obito');
    navigateToAct?.('obito');
  });
}

export function initConfigModal(opts: { refreshConfig: () => Promise<void>; updateBadge: () => void; getDocument: () => Document }) {
  const { refreshConfig, updateBadge, getDocument } = opts;
  const doc = getDocument();

  const modal = doc.getElementById('config-modal') as HTMLElement | null;
  const open = async () => {
    await refreshConfig();
    if (modal) modal.classList.remove('hidden');
  };
  const close = () => {
    if (modal) modal.classList.add('hidden');
  };

  (doc.getElementById('btn-config') as HTMLElement | null)?.addEventListener('click', open);
  (doc.getElementById('config-close') as HTMLElement | null)?.addEventListener('click', close);
  (doc.getElementById('config-save') as HTMLElement | null)?.addEventListener('click', () => {
    updateBadge();
    close();
  });
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  const tabs = Array.from(doc.querySelectorAll('.tab-btn')) as HTMLElement[];
  const panes = Array.from(doc.querySelectorAll('.tab-pane')) as HTMLElement[];
  const activateTab = (id: string) => {
    tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === id));
    panes.forEach((pane) => pane.classList.toggle('active', pane.id === id));
  };
  tabs.forEach((btn) => btn.addEventListener('click', () => activateTab(btn.dataset.tab || 'tab-pastas')));

  (doc.getElementById('pick-json') as HTMLElement | null)?.addEventListener('click', async () => {
    const w = window as Window & { api?: { pickJsonDir?: () => Promise<string> }; currentDirs?: { jsonDir?: string; xmlDir?: string } };
    let dir = '';
    if (w.api && w.api.pickJsonDir) {
      dir = String(await w.api.pickJsonDir());
    } else {
      const wAny = window as any;
      if (typeof wAny.showDirectoryPicker === 'function') {
        const handle = await wAny.showDirectoryPicker();
        dir = handle?.name ? String(handle.name) : '';
        (w as any).currentDirs = { ...(w as any).currentDirs, jsonHandle: handle };
      } else {
        window.alert('No navegador nao e possivel selecionar pasta. Use o download automatico.');
        return;
      }
    }
    const jsonEl = doc.getElementById('json-dir') as HTMLInputElement | null;
    if (jsonEl) jsonEl.value = dir;
    w.currentDirs = { ...(w.currentDirs || {}), jsonDir: dir };
    updateBadge();
  });

  (doc.getElementById('pick-xml') as HTMLElement | null)?.addEventListener('click', async () => {
    const w = window as Window & { api?: { pickXmlDir?: () => Promise<string> }; currentDirs?: { jsonDir?: string; xmlDir?: string } };
    let dir = '';
    if (w.api && w.api.pickXmlDir) {
      dir = String(await w.api.pickXmlDir());
    } else {
      const wAny = window as any;
      if (typeof wAny.showDirectoryPicker === 'function') {
        const handle = await wAny.showDirectoryPicker();
        dir = handle?.name ? String(handle.name) : '';
        (w as any).currentDirs = { ...(w as any).currentDirs, xmlHandle: handle };
      } else {
        window.alert('No navegador nao e possivel selecionar pasta. Use o download automatico.');
        return;
      }
    }
    const xmlEl = doc.getElementById('xml-dir') as HTMLInputElement | null;
    if (xmlEl) xmlEl.value = dir;
    w.currentDirs = { ...(w.currentDirs || {}), xmlDir: dir };
    updateBadge();
  });
}

export function initShortcuts(opts: { saveDraft: () => void; getWindow: () => Window }) {
  const { saveDraft, getWindow } = opts;
  const w = getWindow();
  w.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      saveDraft();
    }
  });
}

export function initBeforeUnload(opts: { getIsDirty: () => boolean; getWindow: () => Window }) {
  const { getIsDirty, getWindow } = opts;
  const w = getWindow();
  w.addEventListener('beforeunload', (e) => {
    if (!getIsDirty()) return;
    e.preventDefault();
    (e as any).returnValue = '';
  });
}

// Extracted bindings initializer from src/ui.ts (was bindInputs)
export function initBindings(opts: {
  getDocument: () => Document;
  setState: (path: string, value: unknown) => void;
  updateSexoOutros: () => void;
  updateIgnoreFields: () => void;
  updateCpfState: () => void;
  updateCpfFromToggle: () => void;
  applyCartorioChange: () => void;
  updateMatricula: () => void;
  updateNaturalidadeVisibility: (fromToggle: boolean) => void;
  rememberNaturalidadeEdit: () => void;
  syncNaturalidadeLockedToBirth: () => void;
  validateLiveField: (path: string, input: HTMLInputElement | HTMLSelectElement) => void;
  updateDirty: () => void;
}) {
  const { getDocument } = opts;
  const doc = getDocument();
  const setFilled = (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
    const tag = (el as HTMLElement).tagName || '';
    const type = (el as HTMLInputElement).type || '';
    if (type === 'checkbox' || type === 'radio') return;
    const hasValue = !!String((el as any).value || '').trim();
    (el as HTMLElement).classList.toggle('is-filled', hasValue);
  };
  doc.querySelectorAll('[data-bind]').forEach((el) => {
    const path = (el as Element).getAttribute('data-bind') || '';
    const handler = () => {
      const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const tag = (input as HTMLElement).tagName || '';
      const isTextArea = tag === 'TEXTAREA';
      const isSelect = tag === 'SELECT';
      const type = !isTextArea && !isSelect ? (input as HTMLInputElement).type || '' : '';
      if (!isSelect && !['checkbox', 'radio', 'password', 'number'].includes(type)) {
        const val = (input as HTMLInputElement).value;
        const upper = (val && (val as string).toUpperCase) ? (val as string).toUpperCase() : val;
        if (upper !== val) {
          const start = (input as HTMLInputElement).selectionStart;
          const end = (input as HTMLInputElement).selectionEnd;
          (input as HTMLInputElement).value = upper as string;
          if (start !== null && end !== null && typeof (input as HTMLInputElement).setSelectionRange === 'function') {
            (input as HTMLInputElement).setSelectionRange(start, end);
          }
        }
      }
      if ((input as HTMLInputElement).type === 'checkbox') {
        opts.setState(path, (input as HTMLInputElement).checked);
      } else if (path === 'registro.cpf') {
        const digits = normalizeCpf((input as HTMLInputElement).value);
        opts.setState(path, digits);
        (input as HTMLInputElement).value = formatCpf(digits);
      } else if (path === 'registro.data_registro' || path === 'registro.data_nascimento') {
        const raw = (input as HTMLInputElement).value;
        const formatted = normalizeDate(raw);
        opts.setState(path, formatted || raw);
        if (formatted) (input as HTMLInputElement).value = formatted;
      } else if (path === 'registro.hora_nascimento') {
        const raw = (input as HTMLInputElement).value;
        const formatted = normalizeTime(raw);
        opts.setState(path, formatted || raw);
        if (formatted) (input as HTMLInputElement).value = formatted;
      } else {
        opts.setState(path, (input as HTMLInputElement).value);
      }
      setFilled(input);
      if (path === 'registro.sexo') opts.updateSexoOutros();
      if (
        path === 'registro.data_nascimento_ignorada' ||
        path === 'registro.hora_nascimento_ignorada'
      ) {
        opts.updateIgnoreFields();
      }
      if (path === 'registro.cpf') opts.updateCpfState();
      if (path === 'registro.cpf_sem_inscricao') opts.updateCpfFromToggle();
      if (path === 'ui.cartorio_oficio') opts.applyCartorioChange();
      if (path === 'registro.data_registro') opts.updateMatricula();
      if (
        path === 'ui.casamento_tipo' ||
        path === 'ui.matricula_livro' ||
        path === 'ui.matricula_folha' ||
        path === 'ui.matricula_termo'
      ) {
        opts.updateMatricula();
      }
      if (path === 'ui.naturalidade_diferente') opts.updateNaturalidadeVisibility(true);
      if (path === 'registro.municipio_naturalidade' || path === 'registro.uf_naturalidade') {
        opts.rememberNaturalidadeEdit();
      }
      if (path === 'registro.municipio_nascimento' || path === 'registro.uf_nascimento') {
        opts.syncNaturalidadeLockedToBirth();
      }
      opts.validateLiveField(path, input as HTMLInputElement | HTMLSelectElement);
      opts.updateDirty();
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
    setFilled(el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement);
  });
}
