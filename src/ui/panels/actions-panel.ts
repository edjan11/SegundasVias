import { createRegistroState } from '../../shared/ui/registro-state';
import { downloadBlob } from '../../shared/ui/download';
import { jsonToXml } from '../../shared/ui/json-to-xml';

type ActionPanelOptions = {
  root?: Document | HTMLElement;
  getJson: () => any;
  buildXml?: (json: any) => Promise<string> | string;
  buildFileName?: (ext: 'json' | 'xml' | 'pdf', json?: any) => string;
  validate?: () => boolean;
  onStatus?: (msg: string, isError?: boolean) => void;
  onPdf?: () => void;
};

const PREVIEW_JSON_NAME = 'registro-preview.json';
const PREVIEW_XML_NAME = 'registro-preview.xml';

export function setupActionsPanel(options: ActionPanelOptions): void {
  const root = options.root || document;
  const q = <T extends HTMLElement>(selector: string): T | null =>
    (root as Document).querySelector
      ? ((root as Document).querySelector(selector) as T | null)
      : ((root as HTMLElement).querySelector(selector) as T | null);

  const panel = q<HTMLElement>('#op-actions');
  if (!panel) return;
  if (panel.getAttribute('data-bound') === '1') return;
  panel.setAttribute('data-bound', '1');

  const state = createRegistroState();

  const badgeJson = q<HTMLElement>('#status-json');
  const badgeXml = q<HTMLElement>('#status-xml');
  const badgeDb = q<HTMLElement>('#status-db');
  const statusEl = q<HTMLElement>('#actions-status');

  const btnSave = q<HTMLElement>('#actions-save');
  const btnJson = q<HTMLElement>('#actions-export-json');
  const btnXml = q<HTMLElement>('#actions-export-xml');
  const btnPdf = q<HTMLElement>('#actions-export-pdf');

  const jsonOutput = q<HTMLTextAreaElement>('#json-output');
  const xmlOutput = q<HTMLTextAreaElement>('#xml-output');
  const btnSaveTop = q<HTMLElement>('#btn-save');

  const setStatus = (msg: string, isError?: boolean) => {
    if (typeof options.onStatus === 'function') {
      options.onStatus(msg, isError);
      return;
    }
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', !!isError);
    statusEl.classList.toggle('visible', !!msg);
  };

  const setBadge = (el: HTMLElement | null, ok: boolean, okLabel = 'OK', emptyLabel = '—') => {
    if (!el) return;
    el.textContent = ok ? okLabel : emptyLabel;
    el.classList.toggle('ok', ok);
  };

  const updateOutputs = () => {
    const current = state.get();
    if (jsonOutput) {
      jsonOutput.value = current.json ? JSON.stringify(current.json, null, 2) : '';
    }
    if (xmlOutput) {
      xmlOutput.value = current.xml || '';
    }
  };

  const updateBadges = () => {
    const current = state.get();
    setBadge(badgeJson, !!current.json);
    setBadge(badgeXml, !!current.xml);
    if (badgeDb) badgeDb.textContent = current.linked ? 'SIM' : 'NAO';
    if (btnSaveTop) btnSaveTop.classList.toggle('dirty', !!current.dirty);
  };

  const safeGetJson = (): any | null => {
    try {
      return options.getJson();
    } catch (e) {
      console.error('getJson failed', e);
      return null;
    }
  };

  const buildXmlSafe = async (json: any): Promise<string> => {
    if (typeof options.buildXml === 'function') {
      return await options.buildXml(json);
    }
    return jsonToXml(json, 'registro', 0);
  };

  const buildFileName = (ext: 'json' | 'xml' | 'pdf', json?: any, fallback?: string) => {
    if (typeof options.buildFileName === 'function') return options.buildFileName(ext, json);
    return fallback || `registro-preview.${ext}`;
  };

  const markDirty = () => {
    state.markDirty();
    state.clearXml();
    updateBadges();
  };

  const syncState = () => {
    const json = safeGetJson();
    if (json === null) return;
    state.setJson(json);
    markDirty();
  };

  let syncTimer: number | null = null;
  const scheduleSync = () => {
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncState, 350);
  };
  try {
    (root as Document).addEventListener?.('input', scheduleSync, true);
    (root as Document).addEventListener?.('change', scheduleSync, true);
  } catch {
    /* ignore */
  }

  const handleSave = async () => {
    if (options.validate && !options.validate()) {
      setStatus('Existem campos invalidos. Corrija antes de salvar.', true);
      return;
    }
    const json = safeGetJson();
    if (!json) {
      setStatus('Falha ao montar JSON', true);
      return;
    }
    state.setJson(json);
    state.markSaved();
    try {
      const xml = await buildXmlSafe(json);
      if (xml) state.setXml(xml);
    } catch (e) {
      console.error('buildXml failed', e);
      setStatus('Falha ao gerar XML', true);
    }
    updateOutputs();
    updateBadges();
    setStatus('Preview atualizado');
  };

  const handleExportJson = (forcePreviewName?: boolean) => {
    const json = safeGetJson();
    if (!json) {
      setStatus('Falha ao montar JSON', true);
      return;
    }
    state.setJson(json);
    const filename = forcePreviewName ? PREVIEW_JSON_NAME : buildFileName('json', json, PREVIEW_JSON_NAME);
    const ok = downloadBlob(filename, 'application/json', JSON.stringify(json, null, 2));
    if (ok) setStatus(`JSON baixado: ${filename}`);
    else setStatus('Falha ao baixar JSON', true);
    updateBadges();
  };

  const handleExportXml = async () => {
    let xml = state.get().xml;
    let json = state.get().json;
    if (!xml) {
      if (!json) json = safeGetJson();
      if (!json) {
        setStatus('Falha ao montar JSON', true);
        return;
      }
      state.setJson(json);
      try {
        xml = await buildXmlSafe(json);
      } catch (e) {
        console.error('buildXml failed', e);
        setStatus('Falha ao gerar XML', true);
        return;
      }
      if (xml) state.setXml(xml);
    }
    if (!xml) {
      setStatus('XML vazio', true);
      return;
    }
    const filename = buildFileName('xml', json, PREVIEW_XML_NAME);
    const ok = downloadBlob(filename, 'application/xml', xml);
    if (ok) setStatus(`XML baixado: ${filename}`);
    else setStatus('Falha ao baixar XML', true);
    updateBadges();
    updateOutputs();
  };

  const handleExportPdf = () => {
    if (typeof options.onPdf === 'function') {
      options.onPdf();
      return;
    }
    const btn = q<HTMLElement>('#btn-print');
    if (btn) btn.click();
  };


  btnSave?.addEventListener('click', (e) => {
    e.preventDefault();
    void handleSave();
  });
  if (btnSaveTop) {
    btnSaveTop.addEventListener('click', (e) => {
      e.preventDefault();
      void handleSave();
    });
  }
  btnJson?.addEventListener('click', (e) => {
    e.preventDefault();
    handleExportJson(false);
  });
  btnXml?.addEventListener('click', (e) => {
    e.preventDefault();
    void handleExportXml();
  });
  btnPdf?.addEventListener('click', (e) => {
    e.preventDefault();
    handleExportPdf();
  });
  // Importacao fica no painel de configuracoes (drawer). Aqui mantemos apenas exportacao/atalhos.

  const w = window as Window & { _actionsShortcutsBound?: boolean };
  if (!w._actionsShortcutsBound) {
    w._actionsShortcutsBound = true;
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'p') {
        e.preventDefault();
        setStatus('Use Ctrl+Alt+P para exportar PDF');
        return;
      }
      if (e.ctrlKey && (e.code === 'Space' || key === ' ')) {
        e.preventDefault();
        handleExportJson(true);
        return;
      }
      if (e.ctrlKey && (e.altKey || e.shiftKey) && key === 'p') {
        e.preventDefault();
        handleExportPdf();
      }
    });
  }

  updateBadges();
}
