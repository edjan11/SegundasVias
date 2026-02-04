import '../../core/events';
import mapperHtmlToJson from './mapperHtmlToJsonNascimento';
import { buildNascimentoPdfDataFromForm } from './printNascimentoPdfMapper';
import { buildNascimentoXmlFromJson } from './printNascimentoXmlFromJson';

import { normalizeDate, validateDateDetailed } from '../../shared/validators/date';
import { normalizeTime } from '../../shared/validators/time';
import { normalizeCpf, isValidCpf } from '../../shared/validators/cpf';
import { validateName } from '../../shared/validators/name';
import { createNameValidator } from '../../shared/nameValidator';

import { getFieldState, applyFieldState } from '../../shared/ui/fieldState';
import { applyDateMask, applyTimeMask } from '../../shared/ui/mask';
import { collectInvalidFields } from '../../shared/ui/debug';

import { buildMatriculaBase30, calcDv2Digits, buildMatriculaFinal } from '../../shared/matricula/cnj';

import { setupNameCopy, setupAutoNationality } from '../../shared/productivity/index';
import { setupAdminPanel } from '../../shared/ui/admin';
import { buildCertidaoFileName, readOficioValue } from '../../shared/ui/file-name';
import { setupOutputDirControls } from '../../ui/output-dirs.js';
import { setupDraftAutosave } from '../../shared/ui/draft-autosave';
import { applyFontFamily, applyTheme } from '../../shared/ui/theme';

import { setupActSelect, setupDrawerTabs, setupOpsPanel } from '../../ui/setup-ui';
import { attachAutocomplete } from '../../ui/city-autocomplete';
import { attachCityUfAutofill, attachCityIntegrationToAll } from '../../ui/city-uf-ui';
import { buildIndexFromData } from '../../shared/city-uf-resolver';

import { buildNascimentoPdfHtmlFromTemplate } from '../../prints/nascimento/printNascimentoTjTemplate';
import { openHtmlAndSavePdf } from '../../prints/shared/openAndSavePdf';
import { runSealFlowBeforePrint } from '../../prints/shared/printSealFlow';
import { setupSearchPanel } from '../../ui/panels/search-panel';
import { ensureDrawerLoaded } from '../../ui/panels/drawer-loader';
import { setupSettingsPanelBase } from '../../ui/panels/settings-panel';
import { applyCertificatePayloadToSecondCopy, consumePendingPayload } from '../../ui/payload/apply-payload';
import { setupActionsPanel } from '../../ui/panels/actions-panel';
import { autoExportJsonXml, buildDateFolderFromValue } from '../../shared/registro/auto-export';
import { persistRegistro } from '../../shared/registro/persist';
import { ensureRegistroContext, getRegistroContext, setRegistroContext } from '../../shared/registro/context';
import { isAutoSaveEnabled } from '../../shared/ui/auto-save-toggle';

// (mantido aqui só se você realmente usa em algum lugar desse arquivo)
// import { escapeHtml, sanitizeHref, sanitizeCss } from '../../prints/shared/print-utils.js';

const NAME_MODE_KEY = 'ui.nameValidationMode';
const DRAWER_POS_KEY = 'ui.drawerPosition';
const ENABLE_CPF_KEY = 'ui.enableCpfValidation';
const ENABLE_NAME_KEY = 'ui.enableNameValidation';
const PANEL_INLINE_KEY = 'ui.panelInline';
const FIXED_LAYOUT_KEY = 'ui.fixedLayout';
const INTERNAL_ZOOM_KEY = 'ui.internalZoom';
const FONT_FAMILY_KEY = 'ui.fontFamily';
const THEME_KEY = 'ui.theme';
const AUTO_JSON_KEY = 'ui.autoGenerateJson';
const AUTO_XML_KEY = 'ui.autoGenerateXml';
const FIXED_CARTORIO_CNS = '163659';

// =========================
// UI helpers
// =========================
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

function applyFixedLayout(enabled: boolean): void {
  document.body.classList.toggle('ui-fixed-layout', !!enabled);
}

function applyInternalZoom(value: number): void {
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

function updateZoomLabel(label: HTMLElement | null, value: number): void {
  if (!label) return;
  const raw = Math.round(Number(value || 100));
  label.textContent = `${raw}%`;
}

function showToast(message: string): void {
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

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

function resolveField(input: Element): Element | null {
  return input.closest('td') || input.closest('.campo') || input.closest('.field') || input.parentElement;
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
  icon.textContent = '⚠';
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
      // ignore
    }
    el.classList.add('focus-emphasis');
  });

  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) el.classList.remove('focus-emphasis');
  });
}

// =========================
// Formatters
// =========================
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

function toXml(obj: any, nodeName: string, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== 'object') return `${pad}<${nodeName}>${String(obj || '')}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => toXml(item, nodeName, indent)).join('\n');
  const children = Object.keys(obj)
    .map((key) => toXml(obj[key], key, indent + 1))
    .join('\n');
  return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}

function withFixedCartorioCns<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  const certidao = (data as any).certidao || {};
  return {
    ...(data as any),
    certidao: { ...certidao, cartorio_cns: FIXED_CARTORIO_CNS },
  } as T;
}

function getNameValidationInputs(): HTMLInputElement[] {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-name-validate]'));
  [
    'input[data-bind="ui.mae_nome"]',
    'input[data-bind="ui.pai_nome"]',
    'input[data-bind="ui.mae_avo_materna"]',
    'input[data-bind="ui.mae_avo_materno"]',
    'input[data-bind="ui.pai_avo_paterna"]',
    'input[data-bind="ui.pai_avo_paterno"]',
  ].forEach((selector) => {
    const el = document.querySelector<HTMLInputElement>(selector);
    if (el && !inputs.includes(el)) {
      el.setAttribute('data-name-validate', '');
      inputs.push(el);
    }
  });
  return inputs;
}

// =========================
// Debug / outputs
// =========================
function updateDebug(): void {
  // tenta achar CNS do cartório
  let cns =
    (document.querySelector('input[data-bind="certidao.cartorio_cns"]') as any)?.value ||
    (document.querySelector('[data-bind="certidao.cartorio_cns"]') as any)?.value ||
    '';

  if (!cns) {
    const cartSel = document.getElementById('cartorio-oficio') as HTMLSelectElement | null;
    if (cartSel) {
      cns = (window as any).CNS_CARTORIOS?.[cartSel.value] || '';
      if (!cns && typeof (window as any).applyCartorioChange === 'function') {
        try {
          (window as any).applyCartorioChange();
          cns = (document.querySelector('[data-bind="certidao.cartorio_cns"]') as any)?.value || '';
        } catch {
          // ignore
        }
      }
    }
  }

  cns = String(cns || '').replace(/\D+/g, '').slice(0, 6);

  const ano = ((document.getElementById('data-reg') as HTMLInputElement | null)?.value || '').slice(-4);
  const livro = (document.getElementById('matricula-livro') as HTMLInputElement | null)?.value || '';
  const folha = (document.getElementById('matricula-folha') as HTMLInputElement | null)?.value || '';
  const termo = (document.getElementById('matricula-termo') as HTMLInputElement | null)?.value || '';

  const base = buildMatriculaBase30({
    cns6: cns,
    ano,
    tipoAto: '1',
    acervo: '01',
    servico: '55',
    livro,
    folha,
    termo,
  });

  const dv = base ? calcDv2Digits(base) : '';
  const final = base && dv ? base + dv : buildMatriculaFinal({ cns6: cns, ano, tipoAto: '1', livro, folha, termo });

  const baseEl = document.getElementById('debug-matricula-base') as any;
  if (baseEl) baseEl.value = base || '';

  const dvEl = document.getElementById('debug-matricula-dv') as any;
  if (dvEl) dvEl.value = dv || '';

  const finalEl = document.getElementById('debug-matricula-final') as any;
  if (finalEl) finalEl.value = final || '';

  const invalids = collectInvalidFields(document);
  const invalidEl = document.getElementById('debug-invalid') as any;
  if (invalidEl) invalidEl.value = invalids.join('\n');
}

let pnasRenderToken = 0;
let xmlUpdateTimer: number | null = null;

function updateOutputs(): void {
  const autoJson = localStorage.getItem(AUTO_JSON_KEY) !== 'false';
  const autoXml = localStorage.getItem(AUTO_XML_KEY) !== 'false';
  const data = mapperHtmlToJson(document);
  const jsonData = withFixedCartorioCns(data);

  const jsonEl = document.getElementById('json-output') as any;
  if (jsonEl && autoJson) jsonEl.value = JSON.stringify(jsonData, null, 2);

  const xmlEl = document.getElementById('xml-output') as any;
  if (xmlEl && autoXml) xmlEl.value = '';

  if (xmlUpdateTimer) window.clearTimeout(xmlUpdateTimer);
  if (!autoXml) {
    updateDebug();
    return;
  }
  xmlUpdateTimer = window.setTimeout(() => {
    const token = ++pnasRenderToken;
    void (async () => {
      try {
        const matricula = onlyDigits(data?.registro?.matricula || '');
        const codigoCnj = matricula.slice(0, 6) || onlyDigits(data?.certidao?.cartorio_cns || '');
        const template = await fetchPnasTemplate(codigoCnj);
        const p = buildNascimentoXmlFromJson(template, data);
        const xmlOut = document.getElementById('xml-output') as any;
        if (xmlOut && token === pnasRenderToken) xmlOut.value = p;
      } catch {
        // ignore
      }
    })();
  }, 300);

  updateDebug();
}

function shouldSkipGenericRequiredValidation(
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): boolean {
  if (input.classList.contains('w-date') || input.classList.contains('w-time')) return true;
  if ((input as HTMLElement).hasAttribute('data-name-validate')) return true;
  return false;
}

function reconcileRequiredFields(root: Document | HTMLElement = document): void {
  const requiredFields = Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-required]'),
  );

  requiredFields.forEach((input) => {
    const type = (input as HTMLInputElement).type || '';
    if (type === 'checkbox' || type === 'radio') return;
    if (shouldSkipGenericRequiredValidation(input)) return;

    const field = resolveField(input);
    const value = String((input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value || '');
    const state = getFieldState({ required: true, value, isValid: true });
    applyFieldState(field as HTMLElement, state);

    if (value.trim()) {
      input.classList.remove('invalid');
    }
  });
}

function canProceed(): boolean {
  reconcileRequiredFields(document);
  const invalids = collectInvalidFields(document);
  if (!invalids || invalids.length === 0) return true;

  setStatus(`${invalids.length} campo(s) inválido(s). Corrija antes de prosseguir.`, true);
  showToast('Existem campos inválidos — corrija antes de prosseguir');

  const invalidEl = document.getElementById('debug-invalid') as any;
  if (invalidEl) invalidEl.value = invalids.join('\n');

  return false;
}

function updateActionButtons(): void {
  reconcileRequiredFields(document);
  const invalids = collectInvalidFields(document);
  const disabled = !!(invalids && invalids.length > 0);

  (document.getElementById('btn-json') as any)?.toggleAttribute?.('disabled', disabled);
  (document.getElementById('btn-xml') as any)?.toggleAttribute?.('disabled', disabled);
  (document.getElementById('btn-save') as any)?.toggleAttribute?.('disabled', disabled);

  const statusEl = document.getElementById('statusText');
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
    document.querySelector('.container')?.appendChild(summary);
  }

  if (disabled) {
    summary.textContent = `Campos inválidos: ${invalids.join(', ')}`;
    summary.style.display = 'block';
  } else {
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
  aria.textContent = disabled ? `Existem ${invalids.length} campos inválidos: ${invalids.join(', ')}` : '';
}

// =========================
// Exporters (download)
// =========================
function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildJsonData(): any {
  const data = mapperHtmlToJson(document);
  return withFixedCartorioCns(data);
}

function buildJsonString(data: any): string {
  return JSON.stringify(data || {}, null, 2);
}

function buildFileNameForData(ext: 'json' | 'xml' | 'pdf', data?: any): string {
  const payload = data || buildJsonData();
  return buildCertidaoFileName({
    nome: resolveRegisteredName(payload),
    oficio: resolveOficioLabel(),
    ext,
    fallback: 'NASCIMENTO',
  });
}

async function generateJson(): Promise<void> {
  if (!canProceed()) return;
  const data = buildJsonData();
  const json = buildJsonString(data);
  const jsonEl = document.getElementById('json-output') as any;
  if (jsonEl) jsonEl.value = json;

  const name = buildFileNameForData('json', data);
  try {
    if (window.api && window.api.saveJson) {
      const path = await window.api.saveJson({ name, content: json });
      setStatus(`JSON salvo: ${path || name}`);
      return;
    }
    downloadText(name, json, 'application/json');
    setStatus(`JSON baixado: ${name}`);
  } catch {
    setStatus('Falha ao gerar JSON', true);
  }
}

function generateXml(): void {
  void generatePnasXml();
}

function onlyDigits(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}

const TEMPLATE_CACHE = new Map<string, string>();

async function fetchPnasTemplate(codigoCnj?: string): Promise<string> {
  const bases = ['/templates'];
  const candidates: string[] = [];
  for (const base of bases) {
    candidates.push(`${base}/nascimento-modelo-110742.xml`);
    if (codigoCnj) candidates.push(`${base}/nascimento-modelo-${codigoCnj}.xml`);
    candidates.push(`${base}/nascimento-modelo-crc.xml`);
    candidates.push(`${base}/nascimento-modelo.xml`);
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

  // fallback mínimo embutido
  return `<?xml version="1.0" encoding="UTF-8"?><ListaRegistrosNascimento><PNAS><CodigoCNJ></CodigoCNJ><DataRegistro></DataRegistro><Nome></Nome><CPF></CPF><Sexo></Sexo><DataNascimento></DataNascimento><HoraNascimento></HoraNascimento><DescricaoLocalNascimento></DescricaoLocalNascimento><CodigoLocalDoNascimento></CodigoLocalDoNascimento><NomeLivro></NomeLivro><NumeroLivro></NumeroLivro><NumeroPagina></NumeroPagina><NumeroRegistro></NumeroRegistro><CartorioCNS></CartorioCNS><Transcricao></Transcricao><Participantes></Participantes><ObservacaoCertidao></ObservacaoCertidao></PNAS></ListaRegistrosNascimento>`;
}

async function buildXmlString(data?: any): Promise<string> {
  const payload = data || buildJsonData();
  const matricula = onlyDigits(payload?.registro?.matricula || '');
  const codigoCnj = matricula.slice(0, 6) || onlyDigits(payload?.certidao?.cartorio_cns || '');
  const templateXml = await fetchPnasTemplate(codigoCnj);
  return buildNascimentoXmlFromJson(templateXml, payload);
}

async function generatePnasXml(): Promise<void> {
  if (!canProceed()) return;
  const data = buildJsonData();

  try {
    const pnas = await buildXmlString(data);
    const xmlEl = document.getElementById('xml-output') as any;
    if (xmlEl) xmlEl.value = pnas;

    const name = buildFileNameForData('xml', data);

    if (window.api && window.api.saveXml) {
      const path = await window.api.saveXml({ name, content: pnas });
      setStatus(`XML salvo: ${path || name}`);
      return;
    }

    downloadText(name, pnas, 'application/xml');
    setStatus(`XML baixado: ${name}`);
  } catch (e) {
    console.error('generatePnasXml error', e);
    setStatus('Falha ao gerar XML', true);
  }
}

// =========================
// Validation
// =========================
function setupValidation(): void {
  // Dates
  document.querySelectorAll<HTMLInputElement>('input.w-date').forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute('data-required') || input.classList.contains('required');

    const onInput = () => {
      applyDateMask(input);
      clearFieldHint(field);

      const normalized = normalizeDate(input.value);
      const isValid = !input.value || !!normalized;
      applyFieldState(field as HTMLElement, getFieldState({ required, value: input.value, isValid }));
    };

    const onBlur = () => {
      applyDateMask(input);
      const res = validateDateDetailed(input.value || '');
      applyFieldState(field as HTMLElement, getFieldState({ required, value: input.value, isValid: res.ok }));
      if (!res.ok && input.value) setFieldHint(field, res.message || 'Data inválida');
      else clearFieldHint(field);
    };

    input.addEventListener('input', onInput);
    input.addEventListener('blur', onBlur);
    onInput();
  });

  // Times
  document.querySelectorAll<HTMLInputElement>('input.w-time').forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute('data-required');

    const handler = () => {
      applyTimeMask(input);
      const normalized = normalizeTime(input.value);
      const isValid = !input.value || !!normalized;
      applyFieldState(field as HTMLElement, getFieldState({ required, value: input.value, isValid }));
    };

    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
    handler();
  });

  // CPF
  const cpfInput = document.getElementById('cpf') as HTMLInputElement | null;
  if (cpfInput) {
    const field = resolveField(cpfInput);
    const handler = () => {
      cpfInput.value = formatCpfInput(cpfInput.value);
      const digits = normalizeCpf(cpfInput.value);
      const isValid = !digits || isValidCpf(digits);
      applyFieldState(field as HTMLElement, getFieldState({ required: false, value: digits ? cpfInput.value : '', isValid }));
    };

    cpfInput.addEventListener('input', handler);
    cpfInput.addEventListener('blur', () => {
      handler();
      const digits = normalizeCpf(cpfInput.value);
      if (cpfInput.value && (!digits || !isValidCpf(digits))) setFieldHint(field, 'CPF inválido');
      else clearFieldHint(field);
    });

    handler();
  }

  // Name validation
  const enableName = localStorage.getItem(ENABLE_NAME_KEY) !== 'false';
  if (enableName) {
    getNameValidationInputs().forEach((input) => {
      const field = resolveField(input);
      const required = input.hasAttribute('data-required');

      const handler = () => {
        const res = validateName(input.value || '', { minWords: 2 });
        applyFieldState(
          field as HTMLElement,
          getFieldState({ required, value: input.value, isValid: !res.invalid, warn: res.warn }),
        );
      };

      input.addEventListener('input', handler);
      input.addEventListener('blur', handler);
      handler();
    });

    setupNameValidationLocal();
  }

  const requiredInputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-required]'),
  );
  requiredInputs.forEach((input) => {
    const type = (input as HTMLInputElement).type || '';
    if (type === 'checkbox' || type === 'radio') return;
    if (shouldSkipGenericRequiredValidation(input)) return;

    const handler = () => reconcileRequiredFields(document);
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
    input.addEventListener('blur', handler);
    handler();
  });
}

function setupNameValidationLocal(): void {
  const validator = (window as any)._nameValidator || createNameValidator();
  if (!(window as any)._nameValidator) (window as any)._nameValidator = validator;

  // sanitização simples
  try {
    document
      .querySelectorAll(
        'input[name*="nome"], input[name*="cidade"], input[name*="nacionalidade"], input[name*="naturalidade"], input[name*="mae"], input[name*="pai"], input[name*="avo"]',
      )
      .forEach((inp) => {
        const el = inp as HTMLInputElement;
        el.addEventListener('input', () => {
          // try Unicode property escape first, fallback to common Latin ranges for older environments
          let s = el.value || '';
          try {
            s = s.replace(/[^\p{L}'\- ]/gu, '');
          } catch (e) {
            s = s.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' \-]/g, '');
          }
          if (s !== el.value) el.value = s;
        });
      });
  } catch {
    // ignore
  }

  const fields = getNameValidationInputs();
  fields.forEach((input) => {
    const field = resolveField(input);
    if (field) field.classList.add('name-field');
    // controle sutil para adicionar ao banco (checkbox)
    let suggest = field ? (field as any).querySelector('.name-suggest') : null;
    if (field && !suggest) {
      const label = document.createElement('label');
      label.className = 'name-suggest';
      label.setAttribute('title', 'Adicionar nome ao banco');
      label.setAttribute('data-tooltip', 'Adicionar nome ao banco (quando estiver correto)');

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'name-suggest-check';
      check.setAttribute('aria-label', 'Adicionar nome ao banco');

      const text = document.createElement('span');
      text.className = 'name-suggest-label';
      text.textContent = 'Adicionar ao banco';

      label.appendChild(check);
      label.appendChild(text);
      field.appendChild(label);
      suggest = label;
    }

    const sanitize = (trimEdges = true, collapseSpaces = true) => {
      const v = input.value || '';
      let s = v;
      try {
        s = v.replace(/[^\p{L}'\- ]/gu, '');
      } catch (e) {
        s = v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' \-]/g, '');
      }
      if (collapseSpaces) s = s.replace(/\s+/g, ' ');
      if (trimEdges) s = s.trim();
      if (s !== v) input.value = s;
    };

    const runCheck = (trimEdges = true, collapseSpaces = true) => {
      sanitize(trimEdges, collapseSpaces);
      const value = input.value || '';
      const nameRes = validateName(value, { minWords: 2 });
      const result = validator.check(value);
      const token = (result?.token ? String(result.token).trim() : '') || '';
      const invalidByStructure = !!nameRes.invalid;
      const suspect = !!result?.suspicious;

      // Suspeita do banco de nomes nao deve bloquear export/salvamento.
      input.classList.toggle('invalid', invalidByStructure);
      field?.classList.toggle('name-suspect', suspect || invalidByStructure);

      if (token) {
        input.setAttribute('data-name-token', token);
        field?.setAttribute('data-name-token', token);
      } else {
        input.removeAttribute('data-name-token');
        field?.removeAttribute('data-name-token');
      }

      if (invalidByStructure) setFieldHint(field, 'Informe nome e sobrenome');
      else if (suspect) setFieldHint(field, 'Nome incorreto!');
      else clearFieldHint(field);
    };
    const toggle = suggest?.querySelector('.name-suggest-check') as HTMLInputElement | null;
    toggle?.addEventListener('change', (e: Event) => {
      e.preventDefault();
      if (!toggle.checked) {
        suggest?.classList.remove('name-suggest-checked');
        field?.removeAttribute('data-name-marked');
        return;
      }
      const value = input.value || '';
      const token =
        input.getAttribute('data-name-token') ||
        field?.getAttribute('data-name-token') ||
        validator.check(value).token ||
        '';

      if (!token) {
        toggle.checked = false;
        return;
      }
      validator.repo.addException(token);
      input.classList.remove('invalid');
      field?.classList.remove('name-suspect');
      field?.setAttribute('data-name-marked', 'true');
      suggest?.classList.add('name-suggest-checked');
      clearFieldHint(field);
    });

    input.addEventListener('input', () => {
      sanitize(false, false);
      const mode = localStorage.getItem(NAME_MODE_KEY) || 'blur';
      if (mode === 'input') runCheck(false, false);
    });

    input.addEventListener('blur', () => {
      sanitize(true, true);
      const mode = localStorage.getItem(NAME_MODE_KEY) || 'blur';
      if (mode === 'blur' || mode === 'input') runCheck(true, true);
    });
  });

  validator.ready?.catch?.(() => {});
}

// =========================
// Live outputs
// =========================
function setupLiveOutputs(): void {
  const handler = () => updateOutputs();
  document.addEventListener('input', handler);
  document.addEventListener('change', handler);
  updateOutputs();
}

function setupApplyCompleteRevalidation(): void {
  const w = window as any;
  if (w.__nascimentoApplyRevalidationBound) return;
  w.__nascimentoApplyRevalidationBound = true;

  window.addEventListener('app:apply-complete', () => {
    window.setTimeout(() => {
      reconcileRequiredFields(document);
      updateOutputs();
      updateActionButtons();
    }, 0);
  });
}

function setupLocalDraftAutosave(): void {
  setupDraftAutosave({
    key: 'draft.nascimento',
    getData: () => mapperHtmlToJson(document),
    root: document,
    debounceMs: 600,
  });
}

// =========================
// City autocomplete bootstrap
// =========================
async function setupCityIntegration(): Promise<void> {
  try {
    async function tryFetch(filename: string) {
      const candidates = [
        `/data/jsonCidades/${filename}`,
        `./data/jsonCidades/${filename}`,
        `../data/jsonCidades/${filename}`,
        `data/jsonCidades/${filename}`,
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          return await res.json();
        } catch {
          // next
        }
      }
      return null;
    }

    const raw1 = await tryFetch('estados-cidades.json');
    const raw2 = raw1 ? null : await tryFetch('estados-cidades2.json');

    const index = raw1 ? buildIndexFromData(raw1) : raw2 ? buildIndexFromData(raw2) : new Map();
    if (!index || index.size === 0) {
      try {
        if (typeof console !== 'undefined') console.info('city-uf: no local index found, continuing with on-demand fetch support');
      } catch (e) {
        /* ignore */
      }
    }

    const cidadeNasc = document.querySelector<HTMLInputElement>('input[data-bind="registro.municipio_nascimento"]');
    const ufNasc = document.querySelector<HTMLSelectElement | HTMLInputElement>('select[data-bind="registro.uf_nascimento"]');
    const cidadeNat = document.querySelector<HTMLInputElement>('input[data-bind="registro.municipio_naturalidade"]');
    const ufNat = document.querySelector<HTMLSelectElement | HTMLInputElement>('select[data-bind="registro.uf_naturalidade"]');

    if (cidadeNasc && ufNasc) {
      attachAutocomplete(cidadeNasc, { index, minSuggestions: 5 });
      attachCityUfAutofill(cidadeNasc, ufNasc as any, index, (res) => {
        console.debug('autofill(nascimento):', res);
        try {
          if (res && res.status === 'inferred') {
            const target = document.querySelector('input[data-bind="ui.mae_nome"]') as HTMLInputElement | null;
            if (target) setTimeout(() => target.focus(), 0);
          }
        } catch (e) {}
      });
    }
    if (cidadeNat && ufNat) {
      attachAutocomplete(cidadeNat, { index, minSuggestions: 5 });
      attachCityUfAutofill(cidadeNat, ufNat as any, index, (res) => {
        console.debug('autofill(naturalidade):', res);
        try {
          if (res && res.status === 'inferred') {
            const target = document.querySelector('input[data-bind="ui.mae_nome"]') as HTMLInputElement | null;
            if (target) setTimeout(() => target.focus(), 0);
          }
        } catch (e) {}
      });
    }

    await attachCityIntegrationToAll(index, { minSuggestions: 5 }).catch?.(() => {});
    // Accessibility: skip some checkboxes from tab order per UX request
    try {
      setupCheckboxTabSkips();
    } catch (e) {
      /* ignore */
    }
  } catch (e) {
    console.warn('City autocomplete bootstrap skipped:', e);
  }
}

function setupCheckboxTabSkips(): void {
  const skipIds = ['dn-ign', 'hn-ign', 'naturalidade-diferente', 'cpf-sem'];
  for (const id of skipIds) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el && el.type === 'checkbox') {
      el.setAttribute('tabindex', '-1');
      el.setAttribute('data-skip-tab', '1');
    }
  }
}

// =========================
// Settings panel
// =========================
function applyDrawerPosition(pos: string): void {
  const drawer = document.getElementById('drawer') as HTMLElement | null;
  if (!drawer) return;
  drawer.classList.remove('position-top', 'position-bottom-right', 'position-side');
  if (pos === 'top') drawer.classList.add('position-top');
  else if (pos === 'side') drawer.classList.add('position-side');
  else drawer.classList.add('position-bottom-right');
}

function setupSettingsPanel(): void {
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
}

function resolveRegisteredName(data: any): string {
  const fromPayload = String(data?.registro?.nome_completo || '').trim();
  if (fromPayload) return fromPayload;
  const fromDom =
    String((document.querySelector('[data-bind="registro.nome_completo"]') as HTMLInputElement | null)?.value || '').trim();
  if (fromDom) return fromDom;
  return '';
}

function resolveOficioLabel(): string {
  const select = document.getElementById('cartorio-oficio') as HTMLSelectElement | null;
  return readOficioValue(select);
}

function setupOutputDirs(): void {
  setupOutputDirControls({
    getDocument: () => document,
    onStatus: setStatus,
  });
}

async function autoSaveFiles(data: any): Promise<void> {
  if (!isAutoSaveEnabled()) return;
  try {
    const json = buildJsonString(data);
    const xml = await buildXmlString(data);
    const subdir = buildDateFolderFromValue(data?.registro?.data_registro);
    await autoExportJsonXml(
      {
        json,
        xml,
        jsonName: buildFileNameForData('json', data),
        xmlName: buildFileNameForData('xml', data),
        subdir,
        allowDownloadFallback: true,
      },
      {
        saveJson: window.api?.saveJson ? ((payload) => window.api!.saveJson!(payload)) as any : undefined,
        saveXml: window.api?.saveXml ? ((payload) => window.api!.saveXml!(payload)) as any : undefined,
        download: (name, content, mime) => {
          try {
            downloadText(name, content, mime);
            return true;
          } catch {
            return false;
          }
        },
        onStatus: setStatus,
      },
    );
  } catch (err) {
    console.error('autoSaveFiles error', err);
    setStatus('Falha no auto salvar', true);
  }
}

async function persistRegistroFromForm(mode: 'include' | 'edit'): Promise<void> {
  if (!canProceed()) return;
  const ctx = getRegistroContext();
  if (mode === 'edit' && !ctx.recordId) {
    setStatus('Use “Incluir Assento” antes de salvar.', true);
    return;
  }

  const data = buildJsonData();
  try {
    const res = await persistRegistro(
      {
        data,
        kind: 'nascimento',
        mode,
        recordId: mode === 'edit' ? ctx.recordId : null,
        sourceFormat: 'manual',
      },
      {
        dbSaveDraft: window.api?.dbSaveDraft as any,
        fallbackSave: async (payload) => {
          localStorage.setItem('draft_certidao', JSON.stringify(payload.data || {}));
          return { id: payload.id || `local-${Date.now()}` };
        },
      },
    );
    setRegistroContext(res.mode, res.recordId);
    setStatus(mode === 'include' ? 'Incluido' : 'Salvo');
    await autoSaveFiles(data);
  } catch (err) {
    console.error('persistRegistro failed', err);
    setStatus('Falha ao salvar no banco', true);
  }
}

function setupRegistroActions(): void {
  ensureRegistroContext();
  const btnInclude = document.getElementById('btn-incluir-assento') as HTMLElement | null;
  const btnSave = document.getElementById('btn-save') as HTMLElement | null;

  if (btnInclude && btnInclude.getAttribute('data-bound') !== '1') {
    btnInclude.setAttribute('data-bound', '1');
    btnInclude.addEventListener('click', (e) => {
      e.preventDefault();
      void persistRegistroFromForm('include');
    });
  }

  if (btnSave && btnSave.getAttribute('data-bound') !== '1') {
    btnSave.setAttribute('data-bound', '1');
    btnSave.addEventListener('click', (e) => {
      e.preventDefault();
      void persistRegistroFromForm('edit');
    });
  }
}

// =========================
// Bootstrap
// =========================
function ensureDefaultCartorioCns(): void {
  try {
    const cnsInput = document.querySelector('input[data-bind="certidao.cartorio_cns"]') as HTMLInputElement | null;
    if (!cnsInput) return;
    // Skip if value already present or if marked as imported from file
    if (cnsInput.value || cnsInput.dataset.imported === 'true') return;

    cnsInput.value = '163659';
    cnsInput.readOnly = true;

    const dataReg = document.querySelector('input[data-bind="registro.data_registro"]') as HTMLInputElement | null;
    if (dataReg) {
      dataReg.dispatchEvent(new Event('input', { bubbles: true }));
      dataReg.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (typeof (window as any).updateMatricula === 'function') {
      (window as any).updateMatricula();
    }
  } catch {
    // ignore
  }
}

function setupPrintButton(): void {
  (document.getElementById('btn-print') as HTMLElement | null)?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!canProceed()) return;

    const data = buildNascimentoPdfDataFromForm(document);
    let html = '';
    try {
      html = await buildNascimentoPdfHtmlFromTemplate(data, { cssHref: '/assets/pdfElementsNascimento/pdf.css' });
    } catch (err) {
      console.error('PDF template load error', err);
      setStatus('Falha ao carregar template do PDF', true);
      return;
    }

    try {
      openHtmlAndSavePdf(html, 'NASCIMENTO_', undefined, {
        beforePrint: async (popupWindow) =>
          await runSealFlowBeforePrint({
            certType: 'nascimento',
            payload: data,
            popupWindow,
          }),
      });
      setStatus('PDF aberto. Analise e use Selagem (Ctrl+Espaco) no popup.');
    } catch {
      showToast('Permita popups para imprimir/baixar PDF');
      setStatus('Popup bloqueado', true);
    }
  });
}

function setupActions(): void {
  const attachExclusiveClick = (el: HTMLElement | null, handler: () => void) => {
    if (!el) return;
    // mark this element as handled by a per-act exclusive handler so global UI handlers skip it
    try {
      (el as HTMLElement & { dataset?: any }).dataset = (el as HTMLElement & { dataset?: any }).dataset || {};
      (el as HTMLElement & { dataset?: any }).dataset.exclusive = 'true';
    } catch (e) {
      /* ignore */
    }

    el.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        handler();
      },
      true,
    );
  };

  // Attach to all btns on this page (toolbar + panel) so both trigger the per-act generators
  document.querySelectorAll('#btn-json, #btn-json-manual')
    .forEach((el) => attachExclusiveClick(el as HTMLElement, () => { void generateJson(); }));
  document.querySelectorAll('#btn-xml, #btn-xml-manual')
    .forEach((el) => attachExclusiveClick(el as HTMLElement, generateXml));
  document.querySelectorAll('#btn-pnas, #btn-pnas-manual')
    .forEach((el) => attachExclusiveClick(el as HTMLElement, () => { void generatePnasXml(); }));

  document.addEventListener('input', updateActionButtons);
  document.addEventListener('change', updateActionButtons);

}

async function setupApp(): Promise<void> {
  await ensureDrawerLoaded();
  ensureDefaultCartorioCns();

  setupValidation();
  setupFocusEmphasis();
  setupAdminPanel();
  setupSettingsPanel();
  setupDrawerTabs();
  setupOpsPanel();
  setupOutputDirs();
  setupRegistroActions();
  setupPrintButton();
  setupActionsPanel({
    getJson: buildJsonData,
    buildXml: buildXmlString,
    buildFileName: buildFileNameForData,
    validate: canProceed,
    onStatus: setStatus,
    onPdf: () => {
      const btn = document.getElementById('btn-print') as HTMLElement | null;
      if (btn) btn.click();
    },
  });
  setupActions();

  if (localStorage.getItem('ui.enableParentNameCopy') === 'true') {
    setupNameCopy('input[data-bind="ui.mae_nome"]', 'input[data-bind="ui.pai_nome"]');
  }

  setupAutoNationality('input[name="nacionalidade"]', 'BRASILEIRO');
  setupLiveOutputs();
  setupApplyCompleteRevalidation();
  setupActSelect('nascimento');
  updateActionButtons();
  setupSearchPanel();
  setupLocalDraftAutosave();

  void setupCityIntegration();

  // Payload application moved to layout-router to ensure proper URL state
  // consumePendingPayload() will be checked AFTER route navigation completes
  console.log('[nascimento] setup() complete - payload will be applied via layout-router after navigation');
}

// FIX 4.2: Guard to prevent nascimento from running on wrong page
// FIX 4.2: Guard to prevent nascimento from running on wrong page
// This fixes the dual-bundle loading issue where nascimento would overwrite casamento fields
const currentUrl = window.location.href.toLowerCase();
const currentPath = window.location.pathname.toLowerCase();

// Only run on nascimento pages:
// 1. Path contains 'nascimento' (e.g., /2via/nascimento, Nascimento2Via.html)
// 2. Base2ViaLayout with act=nascimento query param
// 3. Base2ViaLayout WITHOUT any act param (default is nascimento)
const hasActParam = currentUrl.includes('act=');
const isOnNascimentoPage = 
  currentPath.includes('nascimento') || 
  (currentPath.includes('base2vialayout') && currentUrl.includes('act=nascimento')) ||
  (currentPath.includes('base2vialayout') && !hasActParam);

console.log('[nascimento] module loaded, checking page guard', { 
  currentUrl, 
  currentPath,
  hasActParam,
  isOnNascimentoPage 
});

if (!isOnNascimentoPage) {
  console.warn('[nascimento] GUARD BLOCKED: Not on nascimento page, skipping setupApp()', {
    reason: 'Detected wrong page (act param points elsewhere) - preventing field overwrite',
    path: currentPath,
    url: currentUrl
  });
} else {
  console.log('[nascimento] module loaded, calling setupApp()');
  void setupApp();
}

// Exposed unmount for SPA shell to clean up listeners and timers when switching acts
export function unmount(): void {
  try {
    // Prevent double unmount
    if ((window as any).__nascimento_destroyed) return;
    (window as any).__nascimento_destroyed = true;

    // clear timers
    if (xmlUpdateTimer) {
      window.clearTimeout(xmlUpdateTimer);
      xmlUpdateTimer = null;
    }

    // remove transient UI elements added by this module
    const toast = document.getElementById('toast-container');
    if (toast) toast.remove();
    const aria = document.getElementById('aria-live-errors');
    if (aria) aria.remove();
    const summary = document.getElementById('form-error-summary');
    if (summary) summary.remove();

    // remove outputs (to avoid duplicates)
    const jsonOut = document.getElementById('json-output'); if (jsonOut) jsonOut.remove();
    const xmlOut = document.getElementById('xml-output'); if (xmlOut) xmlOut.remove();

    // replace some interactive elements to remove attached listeners
    ['btn-print', 'btn-json', 'btn-xml', 'pick-json', 'pick-xml'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentNode) {
        const cloned = el.cloneNode(true);
        el.parentNode.replaceChild(cloned, el);
      }
    });

    // remove per-act markers
    document.querySelectorAll('[data-name-marked]').forEach((el) => el.removeAttribute('data-name-marked'));

    // hint cleanup
    document.querySelectorAll('.hint').forEach((el) => el.remove());

    // attempt to clear draft-autosave hooks if provided
    try { if ((window as any).clearDraftAutosave) (window as any).clearDraftAutosave(); } catch (e) {}

  } catch (e) {
    console.warn('unmount erro', e);
  }
}


