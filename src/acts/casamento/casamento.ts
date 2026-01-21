import '../../core/events';
import mapperHtmlToJson from './mapperHtmlToJsonCasamento';
import { normalizeDate, validateDateDetailed } from '../../shared/validators/date';
import { normalizeCpf, isValidCpf } from '../../shared/validators/cpf';
import { validateName } from '../../shared/validators/name';
import { getFieldState, applyFieldState } from '../../shared/ui/fieldState';
import { applyDateMask } from '../../shared/ui/mask';
import { collectInvalidFields } from '../../shared/ui/debug';
import {
  buildMatriculaBase30,
  calcDv2Digits,
  buildMatriculaFinal,
} from '../../shared/matricula/cnj';
import {
  setupPrimaryShortcut,
  setupAutofillWithDirty,
  setupDefaultValueWithDirty,
  setupCasamentoDates,
} from '../../shared/productivity/index';
import { setupAdminPanel } from '../../shared/ui/admin';
import { setupActSelect, disableBrowserAutofill } from '../../ui/setup-ui';
import { attachCityIntegrationToAll } from '../../ui/city-uf-ui';
import { createNameValidator } from '../../shared/nameValidator';
import { updateActionButtons } from '../../ui';
import { resolveCasamentoTipo } from '../../shared/productivity/casamento-rules';
import { validateMatriculaType } from '../../shared/matricula/type';
import { buildCasamentoXmlFromJson } from './printCasamentoXml';
import { buildCasamentoPdfHtmlFromTemplate } from '../../prints/casamento/printCasamentoTjTemplate';
import { openHtmlAndSavePdf } from '../../prints/shared/openAndSavePdf';

const NAME_MODE_KEY = 'ui.nameValidationMode';
let nameValidationMode = localStorage.getItem(NAME_MODE_KEY) || 'blur';
const PANEL_INLINE_KEY = 'ui.panelInline';
const OUTPUT_DIR_KEY_JSON = 'outputDir.casamento.json';
const OUTPUT_DIR_KEY_XML = 'outputDir.casamento.xml';
const FIXED_CARTORIO_CNS = '110742';

let outputDirs = { json: '', xml: '' };
const TEMPLATE_CACHE = new Map<string, string>();
let templatePromise: Promise<string | null> | null = null;

function setupSettingsPanelCasamento(): void {
  const select = document.getElementById('settings-drawer-position') as HTMLSelectElement | null;
  const cbCpf = document.getElementById('settings-enable-cpf') as HTMLInputElement | null;
  const cbName = document.getElementById('settings-enable-name') as HTMLInputElement | null;
  const saveBtn = document.getElementById('settings-save') as HTMLElement | null;
  const applyBtn = document.getElementById('settings-apply') as HTMLElement | null;
  const pos = localStorage.getItem('ui.drawerPosition') || 'top';
  const enableCpf = localStorage.getItem('ui.enableCpfValidation') !== 'false';
  const enableName = localStorage.getItem('ui.enableNameValidation') !== 'false';
  if (select) select.value = pos;
  if (cbCpf) cbCpf.checked = !!enableCpf;
  if (cbName) cbName.checked = !!enableName;
  saveBtn?.addEventListener('click', () => {
    const newPos = select?.value || 'top';
    const newCpf = cbCpf?.checked ? 'true' : 'false';
    const newName = cbName?.checked ? 'true' : 'false';
    const newInline = (document.getElementById('settings-panel-inline') as HTMLInputElement | null)
      ?.checked
      ? 'true'
      : 'false';
    localStorage.setItem('ui.drawerPosition', newPos);
    localStorage.setItem('ui.enableCpfValidation', newCpf);
    localStorage.setItem('ui.enableNameValidation', newName);
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
    setStatus('Preferências salvas. Atualizando...', false);
    setTimeout(() => window.location.reload(), 300);
  });
  applyBtn?.addEventListener('click', () => {
    const newPos = select?.value || 'top';
    applyDrawerPosition(newPos);
    setStatus('Posição aplicada (não salva)', false);
  });
}

function setStatus(text: string, isError?: boolean): void {
  const el = document.getElementById('statusText') as any;
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#dc2626' : '#64748b';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = 'Pronto';
    el.style.color = '#64748b';
  }, 2000);
}

function applyDrawerPosition(pos: string) {
  const drawer = document.getElementById('drawer') as HTMLElement | null;
  if (!drawer) return;
  drawer.classList.remove('position-top', 'position-bottom-right', 'position-side');
  if (pos === 'top') drawer.classList.add('position-top');
  else if (pos === 'side') drawer.classList.add('position-side');
  else drawer.classList.add('position-bottom-right');
}

function formatCpfInput(value: string): string {
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

function escapeXml(str: any): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toXml(obj: any, nodeName: string, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== 'object') return `${pad}<${nodeName}>${escapeXml(obj)}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => toXml(item, nodeName, indent)).join('\n');
  const children = Object.keys(obj)
    .map((key) => toXml(obj[key], key, indent + 1))
    .join('\n');
  return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}

function sanitizeNameLikeValue(value: string): string {
  return String(value || '').replace(/[^\p{L}'\- ]/gu, '');
}

function downloadFile(name: string, content: string, mime: string): boolean {
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

function makeTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}${pad(d.getSeconds())}`;
}

function buildFileName(ext: string): string {
  return `CASAMENTO_${makeTimestamp()}.${ext}`;
}

function onlyDigits(value?: string): string {
  return String(value || '').replace(/\D+/g, '');
}

function withFixedCartorioCns<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  const certidao = (data as any).certidao || {};
  return {
    ...(data as any),
    certidao: { ...certidao, cartorio_cns: FIXED_CARTORIO_CNS },
  } as T;
}

async function fetchCasamentoTemplate(cns?: string): Promise<string | null> {
  const bases = ['/templates', '/pages/templates'];
  const candidates: string[] = [];
  for (const base of bases) {
    if (cns) candidates.push(`${base}/casamento-modelo-${cns}.xml`);
    candidates.push(`${base}/casamento-modelo.xml`);
  }

  for (const url of candidates) {
    try {
      const cached = TEMPLATE_CACHE.get(url);
      if (cached) return cached;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const text = await res.text();
      TEMPLATE_CACHE.set(url, text);
      return text;
    } catch {
      // next
    }
  }
  return null;
}

function isValidCasamentoXml(xml: string): boolean {
  const trimmed = String(xml || '').trim();
  return trimmed.startsWith('<') && trimmed.includes('<ListaRegistrosCasamento');
}

async function generateJson(): Promise<void> {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document as any);
  const json = JSON.stringify(withFixedCartorioCns(data), null, 2);
  const out = document.getElementById('json-output') as any;
  if (out) out.value = json;
  const name = buildFileName('json');
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

async function generateXml(): Promise<void> {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document as any);
  const cns = onlyDigits(data?.certidao?.cartorio_cns) || onlyDigits(data?.registro?.matricula).slice(0, 6);
  const template = await fetchCasamentoTemplate(cns);
  if (!template) {
    setStatus('Falha ao carregar template XML de casamento', true);
    return;
  }
  const result = buildCasamentoXmlFromJson(template, data);
  const xml = result.xml;
  if (!isValidCasamentoXml(xml)) {
    setStatus('XML invalido. Verifique o template.', true);
    return;
  }
  if (result.warnings.length) console.warn('[XML casamento warnings]', result.warnings);
  const name = buildFileName('xml');
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

function showToast(message: string): void {
  let container = document.getElementById('toast-container');
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

function setupConfigPanel(): void {
  const radios = document.querySelectorAll('input[name="name-validation-mode"]');
  radios.forEach((radio) => {
    (radio as HTMLInputElement).checked = (radio as HTMLInputElement).value === nameValidationMode;
  });
  const cbInline = document.getElementById('settings-panel-inline') as HTMLInputElement | null;
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  if (cbInline)
    cbInline.checked = panelInlineStored === null ? false : panelInlineStored === 'true';
  document.getElementById('config-save')?.addEventListener('click', () => {
    const selected = document.querySelector(
      'input[name="name-validation-mode"]:checked',
    ) as HTMLInputElement | null;
    if (selected && selected.value) {
      nameValidationMode = selected.value;
      localStorage.setItem(NAME_MODE_KEY, nameValidationMode);
    }
    const newInline = (document.getElementById('settings-panel-inline') as HTMLInputElement | null)
      ?.checked
      ? 'true'
      : 'false';
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
  });
  setupAdminPanel();
}

function updateOutputDirUi(): void {
  const badge = document.getElementById('outputDirBadge') as HTMLElement | null;
  if (badge) badge.textContent = `JSON: ${outputDirs.json || '...'} | XML: ${outputDirs.xml || '...'}`;
  const jsonEl = document.getElementById('json-dir') as HTMLInputElement | null;
  const xmlEl = document.getElementById('xml-dir') as HTMLInputElement | null;
  if (jsonEl) jsonEl.value = outputDirs.json || '';
  if (xmlEl) xmlEl.value = outputDirs.xml || '';
}

async function pickOutputDir(kind: 'json' | 'xml'): Promise<void> {
  if (!window.api || (kind === 'json' && !window.api.pickJsonDir) || (kind === 'xml' && !window.api.pickXmlDir)) {
    setStatus('API indisponivel para escolher pastas', true);
    return;
  }
  const dir = kind === 'json'
    ? await window.api.pickJsonDir()
    : await window.api.pickXmlDir();
  if (!dir) return;
  if (kind === 'json') {
    outputDirs.json = dir;
    localStorage.setItem(OUTPUT_DIR_KEY_JSON, dir);
  } else {
    outputDirs.xml = dir;
    localStorage.setItem(OUTPUT_DIR_KEY_XML, dir);
  }
  updateOutputDirUi();
}

function setupOutputDirs(): void {
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

function setFieldHint(field: Element | null, message?: string): void {
  if (!field) return;
  let hint = (field as any).querySelector('.hint') as HTMLElement | null;
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

  let aria = document.getElementById('aria-live-errors') as HTMLElement | null;
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

function clearFieldHint(field: Element | null): void {
  setFieldHint(field, '');
}

function setupFocusEmphasis(): void {
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

function setupLiveOutputs(): void {
  const form = document.getElementById('form-casamento');
  const drawer = document.getElementById('drawer');
  const updateXml = async (data: any) => {
    const xmlEl = document.getElementById('xml-output') as HTMLInputElement | null;
    if (!xmlEl) return;
    if (!templatePromise) {
      const cns = onlyDigits(data?.certidao?.cartorio_cns) || onlyDigits(data?.registro?.matricula).slice(0, 6);
      templatePromise = fetchCasamentoTemplate(cns);
    }
    const template = await templatePromise;
    if (!template) {
      templatePromise = null;
      xmlEl.value = '';
      return;
    }
    const result = buildCasamentoXmlFromJson(template, data);
    xmlEl.value = isValidCasamentoXml(result.xml) ? result.xml : '';
  };
  const handler = () => {
    try {
      const data = mapperHtmlToJson(document as any);
      const jsonEl = document.getElementById('json-output') as HTMLInputElement | null;
      if (jsonEl) jsonEl.value = JSON.stringify(withFixedCartorioCns(data), null, 2);
      void updateXml(data);
    } catch {
      /* ignore */
    }
  };
  form?.addEventListener('input', handler);
  form?.addEventListener('change', handler);
  drawer?.addEventListener('input', handler);
  drawer?.addEventListener('change', handler);
  handler();
}

function setupNameValidation(): void {
  const validator = (window as any)._nameValidator || createNameValidator();
  try {
    if (!(window as any)._nameValidator) (window as any)._nameValidator = validator;
  } catch (e) {
    /* ignore */
  }
  const fields = document.querySelectorAll('[data-name-validate]');
  const timers = new Map<any, number>();
  fields.forEach((input) => {
    const field = (input as Element).closest('.campo');
    if (field) field.classList.add('name-field');
    let hint = field ? (field.querySelector('.name-suggest') as HTMLElement | null) : null;
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

    const toggle = hint?.querySelector('.name-suggest-check') as HTMLInputElement | null;
    toggle?.addEventListener('change', (e) => {
      e.preventDefault();
      if (!toggle.checked) {
        hint?.classList.remove('name-suggest-checked');
        field?.removeAttribute('data-name-marked');
        return;
      }
      const value = (input as HTMLInputElement).value || '';
      const token =
        (input as HTMLElement).getAttribute('data-name-token') ||
        (field && field.getAttribute('data-name-token')) ||
        validator.check(value).token ||
        '';
      if (!token) {
        toggle.checked = false;
        return;
      }
      validator.repo.addException(token);
      (input as HTMLElement).classList.remove('invalid');
      if (field) field.classList.remove('name-suspect');
      field?.setAttribute('data-name-marked', 'true');
      hint?.classList.add('name-suggest-checked');
      const t = timers.get(input as any);
      if (t) clearInterval(t);
      timers.delete(input as any);
    });

    const sanitize = () => {
      const v = (input as HTMLInputElement).value || '';
      const s = sanitizeNameLikeValue(v);
      if (s !== v) (input as HTMLInputElement).value = s;
    };
    const runCheck = () => {
      sanitize();
      const value = (input as HTMLInputElement).value || '';
      const nameRes = validateName(value, { minWords: 2 });
      const result = validator.check(value);
      const token = result && result.token ? String(result.token).trim() : '';
      const suspect = !!result.suspicious || !!nameRes.invalid;
      (input as HTMLElement).classList.toggle('invalid', suspect);
      if (field) field.classList.toggle('name-suspect', suspect);
      if (token) {
        (input as HTMLElement).setAttribute('data-name-token', token);
        if (field) field.setAttribute('data-name-token', token);
      } else {
        (input as HTMLElement).removeAttribute('data-name-token');
        if (field) field.removeAttribute('data-name-token');
      }
      if (nameRes.invalid) {
        try {
          setFieldHint(field as Element | null, 'Informe nome e sobrenome');
        } catch (e) {
          /* ignore */
        }
      } else if (suspect) {
        try {
          setFieldHint(field as Element | null, 'Nome incorreto!');
        } catch (e) {
          /* ignore */
        }
      } else {
        try {
          clearFieldHint(field as Element | null);
        } catch (e) {
          /* ignore */
        }
      }
    };
    input.addEventListener('input', () => {
      sanitize();
      if (nameValidationMode === 'input') runCheck();
    });
    input.addEventListener('blur', () => {
      sanitize();
      if (nameValidationMode === 'blur' || nameValidationMode === 'input') runCheck();
    });
  });
  validator.ready.then(() => {
    fields.forEach((input) => {
      const field = (input as Element).closest('.campo');
      if (field) field.classList.remove('name-suspect');
      const value = (input as HTMLInputElement).value || '';
      if (value) {
        const nameRes = validateName(value, { minWords: 2 });
        const result = validator.check(value);
        const suspect = !!result.suspicious || !!nameRes.invalid;
        (input as HTMLElement).classList.toggle('invalid', suspect);
        if (field) field.classList.toggle('name-suspect', suspect);
        const token = result && result.token ? String(result.token).trim() : '';
        if (token) {
          (input as HTMLElement).setAttribute('data-name-token', token);
          if (field) field.setAttribute('data-name-token', token);
        } else {
          (input as HTMLElement).removeAttribute('data-name-token');
          if (field) field.removeAttribute('data-name-token');
        }
      }
    });
  });
}

function getFieldContainer(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  return (el.closest('.campo') as HTMLElement | null) || (el.closest('.field') as HTMLElement | null);
}

function setupMatriculaTypeValidation(): void {
  const tipo = document.querySelector('select[name="tipoCasamento"]') as HTMLSelectElement | null;
  const matricula = document.getElementById('matricula') as HTMLInputElement | null;
  if (!tipo || !matricula) return;
  const field = getFieldContainer(matricula);

  const run = () => {
    const expected = resolveCasamentoTipo(tipo.value);
    const value = String(matricula.value || '').trim();
    if (!value) {
      if (field) applyFieldState(field, 'valid');
      clearFieldHint(field);
      return;
    }
    if (expected === 'unknown') {
      if (field) applyFieldState(field, 'valid');
      clearFieldHint(field);
      return;
    }
    const res = validateMatriculaType(value, expected);
    if (!res.ok) {
      if (field) applyFieldState(field, 'warn');
      setFieldHint(field, res.reason || 'Matricula incompativel com o tipo selecionado.');
      return;
    }
    if (field) applyFieldState(field, 'valid');
    clearFieldHint(field);
  };

  tipo.addEventListener('change', run);
  tipo.addEventListener('input', run);
  matricula.addEventListener('input', run);
  matricula.addEventListener('blur', run);
}

function setupCasamentoNameAutofill(): void {
  setupAutofillWithDirty('input[name="nomeSolteiro"]', 'input[name="nomeCasado"]');
  setupAutofillWithDirty('input[name="nomeSolteira"]', 'input[name="nomeCasada"]');
}

function setupCasamentoNationalityDefaults(): void {
  setupDefaultValueWithDirty('input[name="nacionalidadeNoivo"]', 'BRASILEIRO');
  setupDefaultValueWithDirty('input[name="nacionalidadeNoiva"]', 'BRASILEIRA');
}

function setupOutputButtons(): void {
  document.getElementById('btn-json')?.addEventListener('click', (e) => {
    e.preventDefault();
    void generateJson();
  });
  document.getElementById('btn-xml')?.addEventListener('click', (e) => {
    e.preventDefault();
    void generateXml();
  });
}

function setupMatriculaFieldTriggers(triggerMatricula: () => void): void {
  ['cartorio-oficio', 'matricula-livro', 'matricula-folha', 'matricula-termo'].forEach((id) => {
    const el = document.getElementById(id) as HTMLElement | null;
    if (el) el.addEventListener('input', triggerMatricula);
    if (el) el.addEventListener('change', triggerMatricula);
  });
}

function setupMatriculaDateTriggers(triggerMatricula: () => void): void {
  document.querySelector('input[name="dataTermo"]')?.addEventListener('input', triggerMatricula);
  document
    .querySelector('input[name="dataCasamento"]')
    ?.addEventListener('input', triggerMatricula);
}

function setupDrawerInlineToggle(): void {
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  const useInline = panelInlineStored === null ? false : panelInlineStored === 'true';
  const inline = document.getElementById('panel-inline');
  const drawer = document.getElementById('drawer');
  const body = drawer?.querySelector('.drawer-body');
  if (!inline) return;
  if (useInline) {
    if (body) while (body.firstChild) inline.appendChild(body.firstChild);
    const toggle = document.getElementById('drawer-toggle');
    if (toggle) toggle.style.display = 'none';
  } else {
    const toggle = document.getElementById('drawer-toggle');
    if (toggle) toggle.style.display = 'inline-flex';
  }
}

function setupActionButtonsListeners(): void {
  const form = document.getElementById('form-casamento');
  form?.addEventListener('input', updateActionButtons);
  form?.addEventListener('change', updateActionButtons);
}

function setupAutofillDefaults(): void {
  setupCasamentoNameAutofill();
  setupCasamentoNationalityDefaults();
  setupCasamentoDates();
}

function setupCityIntegration(): void {
  // Attach city integration for all city-like fields (same flow as obito)
  try {
    attachCityIntegrationToAll().catch?.(() => {});
  } catch (e) {
    /* ignore */
  }
}

function setupDisableAutofill(): void {
  // Disable browser autofill heuristics on form fields
  try {
    const root = document.getElementById('form-casamento');
    if (root) disableBrowserAutofill(root);
  } catch (e) {
    /* ignore */
  }
}

function setup(): void {
  function triggerMatricula() {
    try {
      if (typeof (window as any).updateMatricula === 'function') (window as any).updateMatricula();
    } catch (e) {
      void e;
    }
  }
  setupMatriculaFieldTriggers(triggerMatricula);
  setupOutputButtons();
  setupValidation();
  setupNameValidation();
  setupConfigPanel();
  setupOutputDirs();
  // drawer setup intentionally skipped; drawer controls handled elsewhere
  setupSettingsPanelCasamento();
  setupDrawerInlineToggle();
  setupActSelect('casamento');
  setupPrimaryShortcut(
    () => document.getElementById('btn-json') || document.getElementById('btn-xml'),
  );
  setupAutofillDefaults();
  setupMatriculaTypeValidation();
  setupMatriculaDateTriggers(triggerMatricula);
  setupFocusEmphasis();
  setupLiveOutputs();
  updateActionButtons();

  setupCityIntegration();
  setupDisableAutofill();
  setupPrintButton();
  setupActionButtonsListeners();

function setupPrintButton(): void {
  (document.getElementById('btn-print') as HTMLElement | null)?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!canProceed()) return;

    const data = mapperHtmlToJson(document as any);
    let html = '';
    try {
      html = await buildCasamentoPdfHtmlFromTemplate(data, { cssHref: '/assets/pdfElementsCasamento/pdf-casamento.css' });
    } catch (err) {
      console.error('PDF template load error', err);
      setStatus('Falha ao carregar template do PDF', true);
      return;
    }

    try {
      openHtmlAndSavePdf(html, 'CASAMENTO_');
      setStatus('Gerando PDF…');
    } catch {
      showToast('Permita popups para imprimir/baixar PDF');
      setStatus('Popup bloqueado', true);
    }
  });
}
}

function setupValidation(): void {
  document.querySelectorAll('input[data-date]').forEach((input) => {
    const field = (input as Element).closest('.campo');
    const required = (input as HTMLElement).hasAttribute('data-required');
    const onInput = () => {
      applyDateMask(input as HTMLInputElement);
      clearFieldHint(field);
      const normalized = normalizeDate((input as HTMLInputElement).value);
      const isValid = !(input as HTMLInputElement).value || !!normalized;
      const state = getFieldState({ required, value: (input as HTMLInputElement).value, isValid });
      applyFieldState(field as HTMLElement | null, state);
    };
    const onBlur = () => {
      applyDateMask(input as HTMLInputElement);
      const raw = (input as HTMLInputElement).value || '';
      const res = validateDateDetailed(raw);
      setupActSelect('casamento');
      const isValid = res.ok;
      const state = getFieldState({ required, value: raw, isValid });
      applyFieldState(field as HTMLElement | null, state);
      if (!isValid && raw) setFieldHint(field, res.message || 'Data inválida');
      else clearFieldHint(field);
    };
    input.addEventListener('input', onInput);
    input.addEventListener('blur', onBlur);
    onInput();
  });
  document.querySelectorAll('[data-name-validate]').forEach((input) => {
    const field = (input as Element).closest('.campo');
    const required = (input as HTMLElement).hasAttribute('data-required');
    const handler = () => {
      const res = validateName((input as HTMLInputElement).value, { minWords: 2 });
      const state = getFieldState({
        required,
        value: (input as HTMLInputElement).value,
        isValid: !res.invalid,
        warn: res.warn,
      });
      applyFieldState(field as HTMLElement | null, state);
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
    handler();
  });
  document.querySelectorAll('input[data-cpf]').forEach((input) => {
    const field = (input as Element).closest('.campo');
    const required = (input as HTMLElement).hasAttribute('data-required');
    const handler = () => {
      (input as HTMLInputElement).value = formatCpfInput((input as HTMLInputElement).value);
      const digits = normalizeCpf((input as HTMLInputElement).value);
      const isValid = !digits || isValidCpf(digits);
      const state = getFieldState({
        required,
        value: digits ? (input as HTMLInputElement).value : '',
        isValid,
      });
      applyFieldState(field as HTMLElement | null, state);
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', () => {
      handler();
      const digits = normalizeCpf((input as HTMLInputElement).value);
      if ((input as HTMLInputElement).value && (!digits || !isValidCpf(digits)))
        setFieldHint(field, 'CPF inválido');
      else clearFieldHint(field);
    });
    handler();
  });

  // sanitize name-like and city-like inputs (prevent digits and invalid chars)
  document
    .querySelectorAll(
      'input[name*="nome"], input[name*="cidade"], input[name*="nacionalidade"], input[name*="naturalidade"], input[name*="mae"], input[name*="pai"], input[name*="avo"]',
    )
    .forEach((inp) => {
      try {
        const el = inp as HTMLInputElement;
        el.addEventListener('input', () => {
          const s = sanitizeNameLikeValue(el.value || '');
          if (s !== el.value) el.value = s;
        });
      } catch (e) {
        /* ignore */
      }
    });
}

function canProceed(): boolean {
  const invalids = collectInvalidFields(document as any);
  if (!invalids || invalids.length === 0) return true;
  setStatus(`Existem ${invalids.length} campos inválidos: ${invalids.join(', ')}`, true);
  return false;
}

// Boot the page
setup();

// Expose setup for potential manual calls
export { setup };
export {};

// ...restante do código do arquivo original...
