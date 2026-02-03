import mapperHtmlToJson from './mapperHtmlToJsonObito';
import { normalizeDate } from '../../shared/validators/date';
import { validateDateDetailed } from '../../shared/validators/date';
import { normalizeTime } from '../../shared/validators/time';
import { normalizeCpf, isValidCpf } from '../../shared/validators/cpf';
import { validateName } from '../../shared/validators/name';
import { getFieldState, applyFieldState } from '../../shared/ui/fieldState';
import { applyDateMask, applyTimeMask } from '../../shared/ui/mask';
import { collectInvalidFields } from '../../shared/ui/debug';
import {
  buildMatriculaBase30,
  calcDv2Digits,
  buildMatriculaFinal,
  adjustMatricula,
} from '../../shared/matricula/cnj';
import { setupPrimaryShortcut, setupAutoNationality } from '../../shared/productivity/index';
import { setupAdminPanel } from '../../shared/ui/admin';
import { setupActSelect, disableBrowserAutofill, setupDrawerTabs, setupOpsPanel } from '../../ui/setup-ui';
import { buildCertidaoFileName, readOficioValue } from '../../shared/ui/file-name';
import { setupDraftAutosave } from '../../shared/ui/draft-autosave';
import { attachCityIntegrationToAll } from '../../ui/city-uf-ui';
import { createNameValidator } from '../../shared/nameValidator';
import { buildObitoPrintHtml } from './printTemplate';
import { setupSearchPanel } from '../../ui/panels/search-panel';
import { ensureDrawerLoaded } from '../../ui/panels/drawer-loader';
import { validateMatriculaType } from '../../shared/matricula/type';
import { setupSettingsPanelBase } from '../../ui/panels/settings-panel';
import { applyCertificatePayloadToSecondCopy, consumePendingPayload } from '../../ui/payload/apply-payload';
import { applyFontFamily, applyTheme } from '../../shared/ui/theme';
import { setupActionsPanel } from '../../ui/panels/actions-panel';

const NAME_MODE_KEY = 'ui.nameValidationMode';
let nameValidationMode = localStorage.getItem(NAME_MODE_KEY) || 'blur';
const DRAWER_POS_KEY = 'ui.drawerPosition';
const ENABLE_CPF_KEY = 'ui.enableCpfValidation';
const ENABLE_NAME_KEY = 'ui.enableNameValidation';
const PANEL_INLINE_KEY = 'ui.panelInline';
const OUTPUT_DIR_KEY_JSON = 'outputDir.obito.json';
const OUTPUT_DIR_KEY_XML = 'outputDir.obito.xml';
const FIXED_CARTORIO_CNS = '110742';
const FIXED_LAYOUT_KEY = 'ui.fixedLayout';
const INTERNAL_ZOOM_KEY = 'ui.internalZoom';
const FONT_FAMILY_KEY = 'ui.fontFamily';
const THEME_KEY = 'ui.theme';
const AUTO_JSON_KEY = 'ui.autoGenerateJson';
const AUTO_XML_KEY = 'ui.autoGenerateXml';

let outputDirs = { json: '', xml: '' };

function applyDrawerPosition(pos) {
  const drawer = document.getElementById('drawer') as HTMLElement | null;
  if (!drawer) return;
  drawer.classList.remove('position-top', 'position-bottom-right', 'position-side');
  if (pos === 'top') drawer.classList.add('position-top');
  else if (pos === 'side') drawer.classList.add('position-side');
  else drawer.classList.add('position-bottom-right');
}

function setStatus(text, isError?) {
  const el = document.getElementById('statusText') as HTMLElement | null;
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#dc2626' : '#64748b';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = 'Pronto';
    el.style.color = '#64748b';
  }, 2000);
}

function applyFixedLayout(enabled) {
  document.body.classList.toggle('ui-fixed-layout', !!enabled);
}

function applyInternalZoom(value) {
  const container = document.querySelector('.container') as HTMLElement | null;
  if (!container) return;
  const raw = Number(value || 100);
  const scale = Math.min(1.1, Math.max(0.8, raw / 100));
  if (scale === 1) {
    container.classList.remove('ui-zoomed');
    container.style.transform = '';
    container.style.width = '';
    return;
  }
  container.classList.add('ui-zoomed');
  container.style.transform = `scale(${scale})`;
  container.style.width = `${100 / scale}%`;
}

function updateZoomLabel(label, value) {
  if (!label) return;
  const raw = Math.round(Number(value || 100));
  label.textContent = `${raw}%`;
}

// helper to prevent actions when there are invalid fields (module-level)
function canProceed() {
  const invalids = collectInvalidFields(document);
  if (!invalids || invalids.length === 0) return true;
  setStatus(`${invalids.length} campo(s) inválido(s). Corrija antes de prosseguir.`, true);
  showToast('Existem campos inválidos — corrija antes de prosseguir');
  const invalidEl = document.getElementById('debug-invalid') as HTMLElement | null;
  if (invalidEl) (invalidEl as any).value = invalids.join('\n');
  return false;
}

function updateActionButtons() {
  const invalids = collectInvalidFields(document);
  const disabled = !!(invalids && invalids.length > 0);
  const btnJson = document.getElementById('btn-json') as HTMLElement | null;
  if (btnJson) (btnJson as any).disabled = disabled;
  const btnXml = document.getElementById('btn-xml') as HTMLElement | null;
  if (btnXml) (btnXml as any).disabled = disabled;
  const btnPrint = document.getElementById('btn-print') as HTMLElement | null;
  if (btnPrint) (btnPrint as any).disabled = disabled;
  const statusEl = document.getElementById('statusText') as HTMLElement | null;
  if (statusEl && !disabled) statusEl.textContent = 'Pronto';
  let summary = document.getElementById('form-error-summary') as HTMLElement | null;
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'form-error-summary';
    summary.style.margin = '6px 0 0 0';
    summary.style.padding = '6px 8px';
    summary.style.borderRadius = '6px';
    summary.style.background = 'transparent';
    summary.style.border = 'none';
    summary.style.color = '#6b7280';
    summary.style.fontSize = '12px';
    summary.style.opacity = '0.85';
    const container = document.querySelector('.container') as HTMLElement | null;
    if (container) container.appendChild(summary);
  }
  if (disabled) {
    summary.textContent = `Campos inválidos: ${invalids.join(', ')}`;
    summary.style.display = 'block';
  } else if (summary) {
    summary.style.display = 'none';
  }
  let aria = document.getElementById('aria-live-errors') as HTMLElement | null;
  if (!aria) {
    aria = document.createElement('div');
    aria.id = 'aria-live-errors';
    aria.className = 'sr-only';
    aria.setAttribute('aria-live', 'assertive');
    aria.setAttribute('role', 'status');
    document.body.appendChild(aria);
  }
  aria.textContent = disabled
    ? `Existem ${invalids.length} campos inválidos: ${invalids.join(', ')}`
    : '';
}

function formatCpfInput(value) {
  const digits = normalizeCpf(value).slice(0, 11);
  if (!digits) return '';
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toXml(obj, nodeName, indent = 0) {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== 'object') return `${pad}<${nodeName}>${escapeXml(obj)}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => toXml(item, nodeName, indent)).join('\n');
  const children = Object.keys(obj)
    .map((key) => toXml(obj[key], key, indent + 1))
    .join('\n');
  return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}

function downloadFile(name, content, mime) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    void e;
    return false;
  }
}

function makeTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}${pad(d.getSeconds())}`;
}

function resolveRegisteredName(data: any): string {
  return String(
    data?.registro?.nome_completo ||
      data?.registro?.nome_falecido ||
      data?.registro?.nome ||
      '',
  ).trim();
}

function resolveOficioLabel(): string {
  const select = document.getElementById('cartorio-oficio') as HTMLSelectElement | null;
  return readOficioValue(select);
}

function buildFileName(data: any, ext: string): string {
  return buildCertidaoFileName({
    nome: resolveRegisteredName(data),
    oficio: resolveOficioLabel(),
    ext,
    fallback: `OBITO_${makeTimestamp()}`,
  });
}

function withFixedCartorioCns(data) {
  if (!data || typeof data !== 'object') return data;
  const certidao = data.certidao || {};
  return { ...data, certidao: { ...certidao, cartorio_cns: FIXED_CARTORIO_CNS } };
}

function buildJsonData(): any {
  const data = mapperHtmlToJson(document);
  return withFixedCartorioCns(data);
}

function buildJsonString(data: any): string {
  return JSON.stringify(data || {}, null, 2);
}

function buildXmlString(data?: any): string {
  const payload = data || buildJsonData();
  return toXml(payload, 'certidao_obito', 0);
}

async function generateJson() {
  if (!canProceed()) return;
  const data = buildJsonData();
  const json = buildJsonString(data);
  const out = document.getElementById('json-output') as HTMLElement | null;
  if (out) (out as any).value = json;
  const name = buildFileName(data, 'json');
  try {
    if (window.api && window.api.saveJson) {
      const path = await window.api.saveJson({ name, content: json });
      setStatus(`JSON salvo: ${path || name}`);
      return;
    }
    if (downloadFile(name, json, 'application/json')) setStatus(`JSON baixado: ${name}`);
    else setStatus('Falha ao gerar JSON', true);
  } catch {
    setStatus('Falha ao gerar JSON', true);
  }
}

async function generateXml() {
  if (!canProceed()) return;
  const data = buildJsonData();
  const xml = buildXmlString(data);
  const out = document.getElementById('xml-output') as HTMLElement | null;
  if (out) (out as any).value = xml;
  const name = buildFileName(data, 'xml');
  try {
    if (window.api && window.api.saveXml) {
      const path = await window.api.saveXml({ name, content: xml });
      setStatus(`XML salvo: ${path || name}`);
      return;
    }
    if (downloadFile(name, xml, 'application/xml')) setStatus(`XML baixado: ${name}`);
    else setStatus('Falha ao gerar XML', true);
  } catch {
    setStatus('Falha ao gerar XML', true);
  }
}

function openPrintPreview() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const assinante =
    document.querySelector('select[name="idAssinante"] option:checked')?.textContent || '';
  const tituloLivro = (document.querySelector('input[name="tituloLivro"]') as any)?.value || '';
  const cidadeMatch = /COMARCA DE\s+(.+)$/i.exec(tituloLivro);
  const cidadeCartorio =
    (cidadeMatch ? cidadeMatch[1] : '') ||
    (document.querySelector('input[name="municipioObito"]') as any)?.value ||
    '';
  const ufCartorio =
    (document.querySelector('select[name="ufMunicipioObito"]') as any)?.value || '';
  const html = buildObitoPrintHtml(data, {
    assinante: assinante.trim(),
    cidadeCartorio: cidadeCartorio.trim(),
    ufCartorio,
  });
  const out = document.getElementById('print-html') as HTMLElement | null;
  if (out) (out as any).value = html;
  const win = window.open('', '_blank');
  if (!win) {
    setStatus('Popup bloqueado. Libere para imprimir.', true);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function showToast(message) {
  let container = document.getElementById('toast-container') as HTMLElement | null;
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

function setupConfigPanel() {
  const radios = document.querySelectorAll('input[name="name-validation-mode"]');
  radios.forEach((radio) => {
    (radio as any).checked = (radio as any).value === nameValidationMode;
  });
  (document.getElementById('config-save') as HTMLElement | null)?.addEventListener('click', () => {
    const selected = document.querySelector('input[name="name-validation-mode"]:checked');
    if (selected && (selected as any).value) {
      nameValidationMode = (selected as any).value;
      localStorage.setItem(NAME_MODE_KEY, nameValidationMode);
    }
  });
}

function updateOutputDirUi() {
  const badge = document.getElementById('outputDirBadge') as HTMLElement | null;
  if (badge) badge.textContent = `JSON: ${outputDirs.json || '...'} | XML: ${outputDirs.xml || '...'}`;
  const jsonEl = document.getElementById('json-dir') as HTMLInputElement | null;
  const xmlEl = document.getElementById('xml-dir') as HTMLInputElement | null;
  if (jsonEl) (jsonEl as any).value = outputDirs.json || '';
  if (xmlEl) (xmlEl as any).value = outputDirs.xml || '';
}

async function pickOutputDir(kind: 'json' | 'xml') {
  if (!window.api || (kind === 'json' && !window.api.pickJsonDir) || (kind === 'xml' && !window.api.pickXmlDir)) {
    setStatus('API indisponivel para escolher pastas', true);
    return;
  }
  const dir = kind === 'json'
    ? await window.api.pickJsonDir()
    : await window.api.pickXmlDir();
  if (!dir || typeof dir !== 'string') return;
  const dirStr = String(dir);
  if (kind === 'json') {
    outputDirs.json = dirStr;
    localStorage.setItem(OUTPUT_DIR_KEY_JSON, dirStr);
  } else {
    outputDirs.xml = dirStr;
    localStorage.setItem(OUTPUT_DIR_KEY_XML, dirStr);
  }
  updateOutputDirUi();
}

function setupOutputDirs() {
  outputDirs = {
    json: localStorage.getItem(OUTPUT_DIR_KEY_JSON) || '',
    xml: localStorage.getItem(OUTPUT_DIR_KEY_XML) || '',
  };
  updateOutputDirUi();
  document.getElementById('pick-json')?.addEventListener('click', () => {
    void pickOutputDir('json');
  });
  document.getElementById('pick-xml')?.addEventListener('click', () => {
    void pickOutputDir('xml');
  });
}

function setupCpfIgnoreToggle(): void {
  const input = document.querySelector<HTMLInputElement>('input[name="CPFPessoa"], input[name="cpfFalecido"]');
  const checkbox = document.getElementById('cpf-falecido-ign') as HTMLInputElement | null;
  if (!input || !checkbox) return;
  const field = (input as HTMLElement).closest('.campo') as HTMLElement | null;

  const apply = () => {
    const ignored = !!checkbox.checked;
    input.disabled = ignored;
    if (ignored) {
      input.value = '';
      input.classList.remove('invalid');
      clearFieldHint(field);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  checkbox.addEventListener('change', apply);
  apply();
}

function setupSettingsPanel() {
  setupSettingsPanelBase({
    drawerPositionKey: DRAWER_POS_KEY,
    enableCpfKey: ENABLE_CPF_KEY,
    enableNameKey: ENABLE_NAME_KEY,
    panelInlineKey: PANEL_INLINE_KEY,
    fontFamilyKey: FONT_FAMILY_KEY,
    themeKey: THEME_KEY,
    defaultFontFamily: '"Times New Roman", "Times", "Georgia", serif',
    defaultTheme: 'light',
    applyFontFamily,
    applyTheme,
    autoJsonKey: AUTO_JSON_KEY,
    autoXmlKey: AUTO_XML_KEY,
    fixedLayoutKey: FIXED_LAYOUT_KEY,
    internalZoomKey: INTERNAL_ZOOM_KEY,
    defaultDrawerPosition: 'side',
    defaultPanelInline: false,
    applyDrawerPosition,
    applyFixedLayout,
    applyInternalZoom,
    updateZoomLabel,
    onAfterApply: () => setStatus('Posicao aplicada (nao salva)', false),
    onAfterSave: () => {
      setStatus('Preferencias salvas. Atualizando...', false)
      setTimeout(() => (window as any).safeReload(300), 300)
    },
  });

  // Output buttons (JSON / XML / Print) - top toolbar buttons (if present) will be bound
  (document.getElementById('btn-json') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    void generateJson();
  });
  (document.getElementById('btn-xml') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    void generateXml();
  });
  (document.getElementById('btn-print') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    openPrintPreview();
  });
}

function ensureDrawer() {
  let drawer = document.getElementById('drawer') as HTMLElement | null;
  if (drawer) return drawer;
  drawer = document.createElement('div');
  drawer.id = 'drawer';
  drawer.className = 'drawer';
  const header = document.createElement('div');
  header.className = 'drawer-header';
  const title = document.createElement('div');
  title.className = 'drawer-title';
  title.textContent = 'Painel';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn secondary';
  closeBtn.textContent = 'Fechar';
  closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
  header.appendChild(title);
  header.appendChild(closeBtn);
  const body = document.createElement('div');
  body.className = 'drawer-body';
  // build tabbar + panes (config, json, xml, debug)
  const tabbar = document.createElement('div');
  tabbar.className = 'tabbar';
  const makeTabBtn = (label, tab) => {
    const b = document.createElement('button');
    b.className = 'tab-btn';
    b.setAttribute('data-tab', tab);
    b.textContent = label;
    return b;
  };
  const btnConfig = makeTabBtn('Configuracoes', 'tab-config');
  btnConfig.classList.add('active');
  const btnJson = makeTabBtn('JSON', 'tab-json');
  const btnXml = makeTabBtn('XML', 'tab-xml');
  const btnDebug = makeTabBtn('Debug', 'tab-debug');
  tabbar.appendChild(btnConfig);
  tabbar.appendChild(btnJson);
  tabbar.appendChild(btnXml);
  tabbar.appendChild(btnDebug);

  const paneConfig = document.createElement('div');
  paneConfig.id = 'tab-config';
  paneConfig.className = 'tab-pane active';
  const paneJson = document.createElement('div');
  paneJson.id = 'tab-json';
  paneJson.className = 'tab-pane';
  const paneXml = document.createElement('div');
  paneXml.id = 'tab-xml';
  paneXml.className = 'tab-pane';
  const paneDebug = document.createElement('div');
  paneDebug.id = 'tab-debug';
  paneDebug.className = 'tab-pane';

  body.appendChild(tabbar);
  body.appendChild(paneConfig);
  body.appendChild(paneJson);
  body.appendChild(paneXml);
  body.appendChild(paneDebug);

  // tab switching
  tabbar.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    if (!t || !(t instanceof Element)) return;
    const btn = t.closest('.tab-btn') as HTMLElement | null;
    if (!btn) return;
    const tab = btn.getAttribute('data-tab');
    (tabbar as any).querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    [paneConfig, paneJson, paneXml, paneDebug].forEach((p) => p.classList.remove('active'));
    const target = (body as any).querySelector(`#${tab}`);
    if (target) target.classList.add('active');
  });

  drawer.appendChild(header);
  drawer.appendChild(body);
  document.body.appendChild(drawer);
  return drawer;
}

function arrangePanel() {
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  // default to floating drawer as primary
  const useInline = panelInlineStored === null ? false : panelInlineStored === 'true';
  const inline = document.getElementById('panel-inline') as HTMLElement | null;
  if (!inline) return;
  const drawerPos = localStorage.getItem(DRAWER_POS_KEY) || 'top';
  const existingDrawer = document.getElementById('drawer') as HTMLElement | null;

  if (useInline) {
    // ensure content is inline
    if (existingDrawer) {
      const body = (existingDrawer as any).querySelector('.drawer-body');
      if (body) {
        while (body.firstChild) inline.appendChild(body.firstChild);
      }
      existingDrawer.remove();
    }
    const toggle = document.getElementById('drawer-toggle') as HTMLElement | null;
    if (toggle) toggle.style.display = 'none';
  } else {
    // move inline content into drawer
    const drawer = ensureDrawer();
    applyDrawerPosition(drawerPos);
    const body = (drawer as any).querySelector('.drawer-body');
    if (body) {
      // distribute inline children into appropriate tab panes inside drawer
      const paneConfig = (body as any).querySelector('#tab-config');
      const paneJson = (body as any).querySelector('#tab-json');
      const paneXml = (body as any).querySelector('#tab-xml');
      const paneDebug = (body as any).querySelector('#tab-debug');
      while (inline.firstChild) {
        const node = inline.firstChild;
        // inspect node for known outputs
        const hasJson = (node as any).querySelector && (node as any).querySelector('#json-output');
        const hasXml = (node as any).querySelector && (node as any).querySelector('#xml-output');
        const hasPrint = (node as any).querySelector && (node as any).querySelector('#print-html');
        const hasDebug =
          (node as any).querySelector &&
          ((node as any).querySelector('#debug-invalid') ||
            (node as any).querySelector('#debug-alerts') ||
            (node as any).querySelector('#debug-matricula-base'));
        if (hasJson && paneJson) paneJson.appendChild(node);
        else if (hasXml && paneXml) paneXml.appendChild(node);
        else if (hasPrint && paneXml) paneXml.appendChild(node);
        else if (hasDebug && paneDebug) paneDebug.appendChild(node);
        else if (paneConfig) paneConfig.appendChild(node);
        else body.appendChild(node);
      }
    }
    const toggle = document.getElementById('drawer-toggle') as HTMLElement | null;
    if (toggle) toggle.style.display = 'inline-flex';
  }
}

function arrangePanel__dup_2() {
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  // default to floating drawer as primary
  const useInline = panelInlineStored === null ? false : panelInlineStored === 'true';
  const inline = document.getElementById('panel-inline') as HTMLElement | null;
  if (!inline) return;
  const drawerPos = localStorage.getItem(DRAWER_POS_KEY) || 'top';
  const existingDrawer = document.getElementById('drawer') as HTMLElement | null;

  if (useInline) {
    // ensure content is inline
    if (existingDrawer) {
      const body = (existingDrawer as any).querySelector('.drawer-body');
      if (body) {
        while (body.firstChild) inline.appendChild(body.firstChild);
      }
      existingDrawer.remove();
    }
    const toggle = document.getElementById('drawer-toggle') as HTMLElement | null;
    if (toggle) toggle.style.display = 'none';
  } else {
    // move inline content into drawer
    const drawer = ensureDrawer();
    applyDrawerPosition(drawerPos);
    const body = (drawer as any).querySelector('.drawer-body');
    if (body) {
      // distribute inline children into appropriate tab panes inside drawer
      const paneConfig = (body as any).querySelector('#tab-config');
      const paneJson = (body as any).querySelector('#tab-json');
      const paneXml = (body as any).querySelector('#tab-xml');
      const paneDebug = (body as any).querySelector('#tab-debug');
      while (inline.firstChild) {
        const node = inline.firstChild;
        // inspect node for known outputs
        const hasJson = (node as any).querySelector && (node as any).querySelector('#json-output');
        const hasXml = (node as any).querySelector && (node as any).querySelector('#xml-output');
        const hasPrint = (node as any).querySelector && (node as any).querySelector('#print-html');
        const hasDebug =
          (node as any).querySelector &&
          ((node as any).querySelector('#debug-invalid') ||
            (node as any).querySelector('#debug-alerts') ||
            (node as any).querySelector('#debug-matricula-base'));
        if (hasJson && paneJson) paneJson.appendChild(node);
        else if (hasXml && paneXml) paneXml.appendChild(node);
        else if (hasPrint && paneXml) paneXml.appendChild(node);
        else if (hasDebug && paneDebug) paneDebug.appendChild(node);
        else if (paneConfig) paneConfig.appendChild(node);
        else body.appendChild(node);
      }
    }
    const toggle = document.getElementById('drawer-toggle') as HTMLElement | null;
    if (toggle) toggle.style.display = 'inline-flex';
  }
}


function populateOrgaoAndUf() {
  // opções de órgãos (copiado do template HTML)
  const orgaos = [
    ['', ''],
    ['7', 'CONSELHO REGIONAL DE ADMINISTRACAO'],
    ['8', 'CONSELHO REGIONAL DE ASSISTENCIA SOCIAL'],
    ['9', 'CONSELHO REGIONAL DE BIBLIOTECONOMIA'],
    ['28', 'CONSELHO REGIONAL DE BIOLOGIA'],
    ['10', 'CONSELHO REGIONAL DE CONTABILIDADE'],
    ['11', 'CONSELHO REGIONAL DE CORRETORES IMOVEIS'],
    ['12', 'CONSELHO REGIONAL de ECONOMIA'],
    ['13', 'CONSELHO REGIONAL DE ENFERMAGEM'],
    ['14', 'CONSELHO REGIONAL DE ENGENHARIA E ARQUITETURA'],
    ['15', 'CONSELHO REGIONAL DE ESTATISTICA'],
    ['16', 'CONSELHO REGIONAL DE FARMACIA'],
    ['17', 'CONSELHO REGIONAL DE FISIOTERAPIA E TERAPIA'],
    ['29', 'CONSELHO REGIONAL DE FONAUDIOLOGIA'],
    ['18', 'CONSELHO REGIONAL DE MEDICINA'],
    ['19', 'CONSELHO REGIONAL DE MEDICINA VETERINÁRIA'],
    ['21', 'CONSELHO REGIONAL DE NUTRICAO'],
    ['22', 'CONSELHO REGIONAL DE ODONTOLOGIA'],
    ['24', 'CONSELHO REGIONAL DE PSICOLOGIA'],
    ['25', 'CONSELHO REGIONAL DE QUIMICA'],
    ['23', 'CONSELHO REGIONAL DE RELACOES PUBLICAS'],
    ['30', 'CONSELHO REGIONAL DE SERVICO SOCIAL'],
    ['31', 'CONSELHO REGIONAL DE TECNICOS EM RADIOLOGIA'],
    ['26', 'CONSELHO REGIONAL DOS ESCRITORES'],
    ['34', 'CORPO DE BOMBEIROS'],
    ['32', 'DEPARTAMENTO ESTADUAL DE TRANSITO'],
    ['4', 'MINISTERIO DA AERONATICA'],
    ['3', 'MINISTERIO DA DEFESA'],
    ['5', 'MINISTERIO DA MARINHA'],
    ['1', 'NAO INFORMADO'],
    ['27', 'ORDEM DOS ADVOGADOS DO BRASIL'],
    ['20', 'ORDEM DOS MUSICOS DO BRASIL'],
    ['36', 'POLICIA CIVIL'],
    ['6', 'POLICIA FEDERAL'],
    ['33', 'POLICIA MILITAR'],
    ['38', 'SECRETARIA DE DEFESA SOCIAL'],
    ['37', 'SECRETARIA DE ESTADO DA DEFESA SOCIAL/AL'],
    ['2', 'SECRETARIA DE SEGURANCA PUBLICA'],
    ['35', 'SECRETARIA DO ESTADO DA CASA CIVIL'],
  ];

  const orgIds = [
    'orgaoExpedidorRG',
    'orgaoExpedidorPIS',
    'orgaoExpedidorPassaporte',
    'orgaoExpedidorCNS',
  ];
  orgIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    // limpamos possíveis opções duplicadas antes de popular
    el.innerHTML = '';
    orgaos.forEach((pair) => {
      const o = document.createElement('option');
      (o as any).value = pair[0];
      o.textContent = pair[1];
      el.appendChild(o);
    });
  });

  // popular ufTitulo
  const ufSelect = document.getElementById('ufTitulo') as HTMLElement | null;
  if (ufSelect) {
    ufSelect.innerHTML = '';
    const ufs = [
      '',
      'AC',
      'AL',
      'AP',
      'AM',
      'BA',
      'BR',
      'CE',
      'DF',
      'ES',
      'ET',
      'GO',
      'IG',
      'MA',
      'MT',
      'MS',
      'MG',
      'PA',
      'PB',
      'PR',
      'PE',
      'PI',
      'RJ',
      'RN',
      'RS',
      'RO',
      'RR',
      'SC',
      'SP',
      'SE',
      'TO',
    ];
    ufs.forEach((u) => {
      const o = document.createElement('option');
      (o as any).value = u;
      o.textContent = u;
      ufSelect.appendChild(o);
    });
  }
}

function yearFromDate(value) {
  const normalized = normalizeDate(value);
  const match = (normalized || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] : '';
}

function updateDebug(data) {
  const cns = (document.querySelector('input[name="certidao.cartorio_cns"]') as any)?.value || '';
  const ano = yearFromDate((document.querySelector('input[name="dataTermo"]') as any)?.value || '');
  const livro = (document.querySelector('input[name="livro"]') as any)?.value || '';
  const folha = (document.querySelector('input[name="folha"]') as any)?.value || '';
  const termo = (document.querySelector('input[name="termo"]') as any)?.value || '';
  const base = buildMatriculaBase30({
    cns6: cns,
    ano,
    tipoAto: '4',
    acervo: '01',
    servico: '55',
    livro,
    folha,
    termo,
  });
  const dv = base ? calcDv2Digits(base) : '';
  const candidate =
    base && dv
      ? base + dv
      : buildMatriculaFinal({ cns6: cns, ano, tipoAto: '4', livro, folha, termo });
  const final = candidate
    ? adjustMatricula(
        candidate,
        (document.querySelector('textarea[name="observacoes"]') as HTMLTextAreaElement | null)
          ?.value,
      ) || candidate
    : '';

  const baseEl = document.getElementById('debug-matricula-base') as HTMLElement | null;
  if (baseEl) (baseEl as any).value = base || '';
  const dvEl = document.getElementById('debug-matricula-dv') as HTMLElement | null;
  if (dvEl) (dvEl as any).value = dv || '';
  const finalEl = document.getElementById('debug-matricula-final') as HTMLElement | null;
  if (finalEl) (finalEl as any).value = final || '';

  const invalids = collectInvalidFields(document);
  const invalidEl = document.getElementById('debug-invalid') as HTMLElement | null;
  if (invalidEl) (invalidEl as any).value = invalids.join('\n');

  const alertsEl = document.getElementById('debug-alerts') as HTMLElement | null;
  if (alertsEl) (alertsEl as any).value = '';
}

function updateOutputs() {
  const data = mapperHtmlToJson(document);
  const jsonData = withFixedCartorioCns(data);
  const autoJson = localStorage.getItem(AUTO_JSON_KEY) !== 'false';
  const autoXml = localStorage.getItem(AUTO_XML_KEY) !== 'false';
  const jsonEl = document.getElementById('json-output') as HTMLElement | null;
  if (jsonEl && autoJson) (jsonEl as any).value = JSON.stringify(jsonData, null, 2);
  const xmlEl = document.getElementById('xml-output') as HTMLElement | null;
  if (xmlEl && autoXml) (xmlEl as any).value = toXml(data, 'certidao_obito', 0);
  const printEl = document.getElementById('print-html') as HTMLElement | null;
  if (printEl) {
    const assinante =
      document.querySelector('select[name="idAssinante"] option:checked')?.textContent || '';
    const tituloLivro = (document.querySelector('input[name="tituloLivro"]') as any)?.value || '';
    const cidadeMatch = /COMARCA DE\s+(.+)$/i.exec(tituloLivro);
    const cidadeCartorio =
      (cidadeMatch ? cidadeMatch[1] : '') ||
      (document.querySelector('input[name="municipioObito"]') as any)?.value ||
      '';
    const ufCartorio =
      (document.querySelector('select[name="ufMunicipioObito"]') as any)?.value || '';
    (printEl as any).value = buildObitoPrintHtml(data, {
      assinante: assinante.trim(),
      cidadeCartorio: cidadeCartorio.trim(),
      ufCartorio,
    });
  }
  updateDebug(data);
}

function setupLiveOutputs() {
  const form = document.getElementById('form-obito') as HTMLElement | null;
  const handler = () => updateOutputs();
  form?.addEventListener('input', handler);
  form?.addEventListener('change', handler);
  updateOutputs();
}

function setupLocalDraftAutosave(): void {
  setupDraftAutosave({
    key: 'draft.obito',
    getData: () => mapperHtmlToJson(document),
    root: document,
    debounceMs: 600,
  });
}

function setupTogglePanels() {
  document.querySelectorAll('[data-toggle]').forEach((toggle) => {
    const key = toggle.getAttribute('data-toggle');
    const panel = document.querySelector(`[data-toggle-panel="${key}"]`) as HTMLElement | null;
    if (!panel) return;
    toggle.addEventListener('click', () => {
      const isHidden = panel.style.display === 'none' || !panel.style.display;
      panel.style.display = isHidden ? 'block' : 'none';
    });
  });
}

function resolveField(input) {
  return (
    input.closest('td') || input.closest('.campo') || input.closest('.field') || input.parentElement
  );
}

function setFieldHint(field, message) {
  if (!field) return;
  let hint = field.querySelector('.hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'hint';
    field.appendChild(hint);
  }
  if (!message) {
    hint.innerHTML = '';
    hint.classList.remove('visible');
    return;
  }
  hint.innerHTML = '';
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = '?';
  icon.setAttribute('aria-hidden', 'true');
  hint.appendChild(icon);
  const txt = document.createElement('span');
  txt.className = 'hint-text';
  txt.textContent = message;
  hint.appendChild(txt);
  hint.classList.add('visible');
  let aria = document.getElementById('aria-live-errors');
  if (!aria) {
    aria = document.createElement('div');
    aria.id = 'aria-live-errors';
    aria.className = 'sr-only';
    aria.setAttribute('aria-live', 'assertive');
    aria.setAttribute('role', 'status');
    document.body.appendChild(aria);
  }
  aria.textContent = message;
}

function clearFieldHint(field) {
  setFieldHint(field, '');
}

function setupFocusEmphasis() {
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      /* ignore */
    }
    el.classList.add('focus-emphasis');
  });

  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) el.classList.remove('focus-emphasis');
  });
}

function getFieldContainer(el) {
  if (!el) return null;
  return el.closest('.campo') || el.closest('.field') || el.closest('td') || el.parentElement;
}

function setupValidation() {
  document.querySelectorAll<HTMLInputElement>('input[data-date]').forEach((input) => {
    const field = getFieldContainer(input);
    const required = input.hasAttribute('data-required');
    const onInput = () => {
      applyDateMask(input);
      clearFieldHint(field);
      const normalized = normalizeDate(input.value);
      const isValid = !input.value || !!normalized;
      applyFieldState(field, getFieldState({ required, value: input.value, isValid }));
    };
    const onBlur = () => {
      applyDateMask(input);
      const raw = input.value || '';
      const res = validateDateDetailed(raw);
      applyFieldState(field, getFieldState({ required, value: raw, isValid: res.ok }));
      if (!res.ok && raw) setFieldHint(field, res.message || 'Data invalida');
      else clearFieldHint(field);
    };
    input.addEventListener('input', onInput);
    input.addEventListener('blur', onBlur);
    onInput();
  });

  document.querySelectorAll<HTMLInputElement>('input[data-time]').forEach((input) => {
    const field = getFieldContainer(input);
    const required = input.hasAttribute('data-required');
    const handler = () => {
      applyTimeMask(input);
      const normalized = normalizeTime(input.value);
      const isValid = !input.value || !!normalized;
      applyFieldState(field, getFieldState({ required, value: input.value, isValid }));
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
    handler();
  });

  document.querySelectorAll<HTMLInputElement>('input[data-cpf]').forEach((input) => {
    const field = getFieldContainer(input);
    const handler = () => {
      const digits = normalizeCpf(input.value);
      const isValid = !digits || isValidCpf(digits);
      applyFieldState(field, getFieldState({ required: false, value: input.value, isValid }));
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', () => {
      handler();
      const digits = normalizeCpf(input.value);
      if (input.value && (!digits || !isValidCpf(digits))) setFieldHint(field, 'CPF invalido');
      else clearFieldHint(field);
    });
    handler();
  });
}

function setupMatriculaTypeValidation() {
  const matricula = document.getElementById('matricula') as HTMLInputElement | null;
  if (!matricula) return;
  const field = getFieldContainer(matricula);
  const run = () => {
    const value = String(matricula.value || '').trim();
    if (!value) {
      if (field) applyFieldState(field, 'valid');
      clearFieldHint(field);
      return;
    }
    const res = validateMatriculaType(value, 'obito');
    if (!res.ok) {
      if (field) applyFieldState(field, 'invalid');
      setFieldHint(field, res.reason || 'Matricula incompativel');
    } else {
      if (field) applyFieldState(field, 'valid');
      clearFieldHint(field);
    }
  };
  matricula.addEventListener('input', run);
  matricula.addEventListener('blur', run);
  run();
}

function setupNameValidation() {
  const validator = (window)._nameValidator || createNameValidator();
  try {
    if (!(window)._nameValidator) (window)._nameValidator = validator;
  } catch (e) {
    /* ignore */
  }
  const fields = document.querySelectorAll('[data-name-validate]');
  const timers = new Map();

  // sanitize name-like and city-like inputs globally for this act
  try {
    document
      .querySelectorAll(
        'input[name*="nome"], input[name*="cidade"], input[name*="nacionalidade"], input[name*="naturalidade"], input[name*="mae"], input[name*="pai"], input[name*="avo"]',
      )
      .forEach((inp) => {
        try {
          const el = inp as HTMLInputElement;
          el.addEventListener('input', () => {
            const s = (el.value || '').replace(/[^\p{L}'\- ]/gu, '');
            if (s !== el.value) el.value = s;
          });
        } catch (e) {
          /* ignore */
        }
      });
  } catch (e) {
    /* ignore */
  }

  fields.forEach((input) => {
    const inputEl = input as HTMLInputElement;
    const field = resolveField(inputEl);
    if (field) field.classList.add('name-field');
    let hint = field ? field.querySelector('.name-suggest') : null;
    if (field && !hint) {
      const label = document.createElement('label');
      label.className = 'name-suggest';
      label.setAttribute('title', 'Adicionar nome ao banco');
      label.setAttribute('data-tooltip', 'Adicionar nome ao banco (quando estiver correto)');

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'name-suggest-check';
      check.setAttribute('aria-label', 'Adicionar nome ao banco');

      const textSpan = document.createElement('span');
      textSpan.className = 'name-suggest-label';
      textSpan.textContent = 'Adicionar ao banco';

      label.appendChild(check);
      label.appendChild(textSpan);
      field.appendChild(label);
      hint = label;
    }

    const toggle = hint ? hint.querySelector('.name-suggest-check') as HTMLInputElement | null : null;
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        e.preventDefault();
        if (!toggle.checked) {
          hint.classList.remove('name-suggest-checked');
          field && field.removeAttribute('data-name-marked');
          return;
        }
        const value = inputEl.value || '';
        const token =
          inputEl.getAttribute('data-name-token') ||
          (field && field.getAttribute('data-name-token')) ||
          validator.check(value).token ||
          '';
        if (!token) {
          toggle.checked = false;
          return;
        }
        validator.repo.addException(token);
        inputEl.classList.remove('invalid');
        if (field) field.classList.remove('name-suspect');
        field && field.setAttribute('data-name-marked', 'true');
        hint.classList.add('name-suggest-checked');
        const t = timers.get(inputEl);
        if (t) clearInterval(t);
        timers.delete(inputEl);
      });
    }

    const sanitize = () => {
      const v = inputEl.value || '';
      const s = v.replace(/[^\p{L}'\- ]/gu, '');
      if (s !== v) inputEl.value = s;
    };

    const runCheck = () => {
      sanitize();
      const value = inputEl.value || '';
      const nameRes = validateName(value, { minWords: 2 });
      const result = validator.check(value);
      const token = result && result.token ? String(result.token).trim() : '';
      const suspect = !!result.suspicious || !!nameRes.invalid;
      inputEl.classList.toggle('invalid', suspect);
      if (field) field.classList.toggle('name-suspect', suspect);
      if (token) {
        inputEl.setAttribute('data-name-token', token);
        if (field) field.setAttribute('data-name-token', token);
      } else {
        inputEl.removeAttribute('data-name-token');
        if (field) field.removeAttribute('data-name-token');
      }
      if (nameRes.invalid) {
        try {
          setFieldHint(field, 'Informe nome e sobrenome');
        } catch (e) {
          /* ignore */
        }
      } else if (suspect) {
        try {
          setFieldHint(field, 'Nome incorreto!');
        } catch (e) {
          /* ignore */
        }
      } else {
        try {
          clearFieldHint(field);
        } catch (e) {
          /* ignore */
        }
      }
    };
    inputEl.addEventListener('input', () => {
      sanitize();
      if (nameValidationMode === 'input') runCheck();
    });
    inputEl.addEventListener('blur', () => {
      sanitize();
      if (nameValidationMode === 'blur' || nameValidationMode === 'input') runCheck();
    });
  });
  validator.ready.then(() => {
    fields.forEach((input) => {
      const inputEl = input as HTMLInputElement;
      const field = resolveField(inputEl);
      if (field) field.classList.remove('name-suspect');
      const value = inputEl.value || '';
      if (value) {
        const nameRes = validateName(value, { minWords: 2 });
        const result = validator.check(value);
        const suspect = !!result.suspicious || !!nameRes.invalid;
        inputEl.classList.toggle('invalid', suspect);
        if (field) field.classList.toggle('name-suspect', suspect);
        const token = result && result.token ? String(result.token).trim() : '';
        if (token) {
          inputEl.setAttribute('data-name-token', token);
          if (field) field.setAttribute('data-name-token', token);
        } else {
          inputEl.removeAttribute('data-name-token');
          if (field) field.removeAttribute('data-name-token');
        }
      }
    });
  });
}

async function setup() {
  await ensureDrawerLoaded();
  (document.getElementById('btn-json') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    void generateJson();
  });
  (document.getElementById('btn-xml') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    void generateXml();
  });
  (document.getElementById('btn-print') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    openPrintPreview();
  });
  setupValidation();
  setupCpfIgnoreToggle();
  setupMatriculaTypeValidation();
  // popular selects dependentes (órgãos, UF título)
  populateOrgaoAndUf();
  setupNameValidation();
  setupConfigPanel();
  setupOutputDirs();
  setupAdminPanel();
  // prefill nacionalidade do falecido com padrão CRC (BRASILEIRO)
  try {
    setupAutoNationality('input[name="nacionalidade"]', 'BRASILEIRO');
  } catch (e) {
    /* ignore */
  }
  // drawer removed for inline layout; no setupDrawer call
  // apply persisted drawer position and wire settings
  applyDrawerPosition(localStorage.getItem(DRAWER_POS_KEY) || 'side');
  setupSettingsPanel();
  setupDrawerTabs();
  setupOpsPanel();
  setupActionsPanel({
    getJson: buildJsonData,
    buildXml: buildXmlString,
    buildFileName: (ext, json) => buildFileName(json || buildJsonData(), ext),
    validate: canProceed,
    onStatus: setStatus,
    onPdf: () => {
      const btn = document.getElementById('btn-print') as HTMLElement | null;
      if (btn) btn.click();
    },
  });
  // arrange panel according to saved preference (inline vs floating)
  arrangePanel();
  setupActSelect('obito');
  setupPrimaryShortcut(
    () =>
      (document.getElementById('btn-json') as HTMLElement | null) ||
      (document.getElementById('btn-xml') as HTMLElement | null),
  );
  setupTogglePanels();
  setupLiveOutputs();
  setupLocalDraftAutosave();
  setupFocusEmphasis();
  setupSearchPanel();
  // ensure action buttons reflect current validity
  updateActionButtons();
  (document.getElementById('form-obito') as HTMLElement | null)?.addEventListener(
    'input',
    updateActionButtons,
  );
  (document.getElementById('form-obito') as HTMLElement | null)?.addEventListener(
    'change',
    updateActionButtons,
  );

  // Attach generic city integration for mother/father and other city-like fields
  try {
    attachCityIntegrationToAll().catch?.(() => {});
  } catch (e) {
    /* ignore */
  }

  // Payload application moved to layout-router to ensure proper URL state
  // consumePendingPayload() will be checked AFTER route navigation completes
  console.log('[obito] setup() complete - payload will be applied via layout-router after navigation');

  // Disable browser autofill heuristics on form fields
  try {
    const root = document.getElementById('form-obito');
    if (root) disableBrowserAutofill(root);
  } catch (e) {
    /* ignore */
  }
}

// FIX 4.2: Guard to prevent obito from running on wrong page
// This prevents the bundle from executing if loaded on the wrong page
const currentUrl = window.location.href.toLowerCase();
const currentPath = window.location.pathname.toLowerCase();
const isOnObitoPage = 
  currentPath.includes('obito') || 
  (currentPath.includes('base2vialayout') && currentUrl.includes('act=obito'));

console.log('[obito] module loaded, checking page guard', { 
  currentUrl, 
  currentPath, 
  isOnObitoPage 
});

if (!isOnObitoPage) {
  console.warn('[obito] GUARD BLOCKED: Not on obito page, skipping setup()', {
    reason: 'Detected wrong page - preventing incorrect initialization',
    path: currentPath
  });
} else {
  console.log('[obito] module loaded, calling setup()');
  setup();
}

// Expose unmount for SPA shell
export function unmount(): void {
  try {
    if ((window as any).__obito_destroyed) return;
    (window as any).__obito_destroyed = true;

    // remove transient UI elements
    const toast = document.getElementById('toast-container'); if (toast) toast.remove();
    const aria = document.getElementById('aria-live-errors'); if (aria) aria.remove();
    const summary = document.getElementById('form-error-summary'); if (summary) summary.remove();

    // replace interactive elements to remove attached listeners
    ['btn-print', 'btn-json', 'btn-xml', 'pick-json', 'pick-xml'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentNode) {
        const cloned = el.cloneNode(true);
        el.parentNode.replaceChild(cloned, el);
      }
    });

  } catch (e) {
    console.warn('obito unmount erro', e);
  }
}
