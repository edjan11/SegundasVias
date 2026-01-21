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

import { setupActSelect } from '../../ui/setup-ui';
import { attachAutocomplete } from '../../ui/city-autocomplete';
import { attachCityUfAutofill, attachCityIntegrationToAll } from '../../ui/city-uf-ui';
import { buildIndexFromData } from '../../shared/city-uf-resolver';

import { buildNascimentoPdfHtmlFromTemplate } from '../../prints/nascimento/printNascimentoTjTemplate';
import { openHtmlAndSavePdf } from '../../prints/shared/openAndSavePdf';

// (mantido aqui só se você realmente usa em algum lugar desse arquivo)
// import { escapeHtml, sanitizeHref, sanitizeCss } from '../../prints/shared/print-utils.js';

const NAME_MODE_KEY = 'ui.nameValidationMode';
const DRAWER_POS_KEY = 'ui.drawerPosition';
const ENABLE_CPF_KEY = 'ui.enableCpfValidation';
const ENABLE_NAME_KEY = 'ui.enableNameValidation';
const PANEL_INLINE_KEY = 'ui.panelInline';
const OUTPUT_DIR_KEY_JSON = 'outputDir.nascimento.json';
const OUTPUT_DIR_KEY_XML = 'outputDir.nascimento.xml';

let outputDirs = { json: '', xml: '' };

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
  const data = mapperHtmlToJson(document);

  const jsonEl = document.getElementById('json-output') as any;
  if (jsonEl) jsonEl.value = JSON.stringify(data, null, 2);

  const xmlEl = document.getElementById('xml-output') as any;
  if (xmlEl) xmlEl.value = '';

  if (xmlUpdateTimer) window.clearTimeout(xmlUpdateTimer);
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

function canProceed(): boolean {
  const invalids = collectInvalidFields(document);
  if (!invalids || invalids.length === 0) return true;

  setStatus(`${invalids.length} campo(s) inválido(s). Corrija antes de prosseguir.`, true);
  showToast('Existem campos inválidos — corrija antes de prosseguir');

  const invalidEl = document.getElementById('debug-invalid') as any;
  if (invalidEl) invalidEl.value = invalids.join('\n');

  return false;
}

function updateActionButtons(): void {
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

async function generateJson(): Promise<void> {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const json = JSON.stringify(data, null, 2);
  const jsonEl = document.getElementById('json-output') as any;
  if (jsonEl) jsonEl.value = json;

  const name = `NASCIMENTO_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.json`;
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

function previewXmlContent(content: string, suggestedName?: string): void {
  // Open a preview window with the XML content and print / download buttons
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!popup) {
    // Popup blocked - fallback to download
    const name = suggestedName || `NASCIMENTO_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.xml`;
    downloadText(name, content, 'application/xml');
    setStatus(`Popup bloqueado. XML baixado: ${name}`);
    return;
  }

  const safeContent = String(content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Visualizar XML</title>
    <style>body{font-family:system-ui,Segoe UI,Roboto,Arial; padding:12px} .controls{margin-bottom:8px} button{margin-right:8px} pre{white-space:pre-wrap; word-wrap:break-word; background:#f7f7f9; border:1px solid #e1e1e8; padding:12px; border-radius:6px; max-height:76vh; overflow:auto}</style></head>
    <body>
      <div class="controls">
        <button id="btn-print">Imprimir</button>
        <button id="btn-download">Baixar</button>
        <button id="btn-close">Fechar</button>
      </div>
      <pre id="xml-pre">${safeContent}</pre>
      <script>
        document.getElementById('btn-print').addEventListener('click', ()=>{ window.print(); });
        document.getElementById('btn-close').addEventListener('click', ()=>{ window.close(); });
        document.getElementById('btn-download').addEventListener('click', ()=>{
          const content = (document.getElementById('xml-pre').textContent || '');
          const blob = new Blob([content], {type: 'application/xml'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = '${suggestedName || 'NASCIMENTO.xml'}';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
      <\/script>
    </body></html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

async function generatePnasXml(): Promise<void> {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const matricula = onlyDigits(data?.registro?.matricula || '');
  const codigoCnj = matricula.slice(0, 6) || onlyDigits(data?.certidao?.cartorio_cns || '');

  try {
    const templateXml = await fetchPnasTemplate(codigoCnj);
    const pnas = buildNascimentoXmlFromJson(templateXml, data);
    const xmlEl = document.getElementById('xml-output') as any;
    if (xmlEl) xmlEl.value = pnas;

    const name = `NASCIMENTO_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.xml`;

    if (window.api && window.api.saveXml) {
      const path = await window.api.saveXml({ name, content: pnas });
      setStatus(`XML salvo: ${path || name}`);
      return;
    }

    // Open preview with print & download options. If popup blocked, fallback to download.
    previewXmlContent(pnas, name);
    setStatus(`XML pronto: ${name}`);
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
    document.querySelectorAll<HTMLInputElement>('[data-name-validate]').forEach((input) => {
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
          const s = (el.value || '').replace(/[^\p{L}'\- ]/gu, '');
          if (s !== el.value) el.value = s;
        });
      });
  } catch {
    // ignore
  }

  const fields = document.querySelectorAll<HTMLInputElement>('[data-name-validate]');
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

    const sanitize = () => {
      const v = input.value || '';
      const s = v.replace(/[^\p{L}'\- ]/gu, '');
      if (s !== v) input.value = s;
    };

    const runCheck = () => {
      sanitize();
      const value = input.value || '';
      const nameRes = validateName(value, { minWords: 2 });
      const result = validator.check(value);
      const token = (result?.token ? String(result.token).trim() : '') || '';
      const suspect = !!result?.suspicious || !!nameRes.invalid;

      input.classList.toggle('invalid', suspect);
      field?.classList.toggle('name-suspect', suspect);

      if (token) {
        input.setAttribute('data-name-token', token);
        field?.setAttribute('data-name-token', token);
      } else {
        input.removeAttribute('data-name-token');
        field?.removeAttribute('data-name-token');
      }

      if (nameRes.invalid) setFieldHint(field, 'Informe nome e sobrenome');
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
      sanitize();
      const mode = localStorage.getItem(NAME_MODE_KEY) || 'blur';
      if (mode === 'input') runCheck();
    });

    input.addEventListener('blur', () => {
      sanitize();
      const mode = localStorage.getItem(NAME_MODE_KEY) || 'blur';
      if (mode === 'blur' || mode === 'input') runCheck();
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
    if (!index || index.size === 0) return;

    const cidadeNasc = document.querySelector<HTMLInputElement>('input[data-bind="registro.municipio_nascimento"]');
    const ufNasc = document.querySelector<HTMLSelectElement | HTMLInputElement>('select[data-bind="registro.uf_nascimento"]');
    const cidadeNat = document.querySelector<HTMLInputElement>('input[data-bind="registro.municipio_naturalidade"]');
    const ufNat = document.querySelector<HTMLSelectElement | HTMLInputElement>('select[data-bind="registro.uf_naturalidade"]');

    if (cidadeNasc && ufNasc) {
      attachAutocomplete(cidadeNasc, { index, minSuggestions: 5 });
      attachCityUfAutofill(cidadeNasc, ufNasc as any, index, (res) => console.debug('autofill(nascimento):', res));
    }
    if (cidadeNat && ufNat) {
      attachAutocomplete(cidadeNat, { index, minSuggestions: 5 });
      attachCityUfAutofill(cidadeNat, ufNat as any, index, (res) => console.debug('autofill(naturalidade):', res));
    }

    await attachCityIntegrationToAll(index, { minSuggestions: 5 }).catch?.(() => {});
  } catch (e) {
    console.warn('City autocomplete bootstrap skipped:', e);
  }
}

// =========================
// Settings panel
// =========================
function setupSettingsPanel(): void {
  const select = document.getElementById('settings-drawer-position') as HTMLSelectElement | null;
  const cbCpf = document.getElementById('settings-enable-cpf') as HTMLInputElement | null;
  const cbName = document.getElementById('settings-enable-name') as HTMLInputElement | null;
  const saveBtn = document.getElementById('settings-save') as HTMLButtonElement | null;
  const applyBtn = document.getElementById('settings-apply') as HTMLButtonElement | null;

  const pos = localStorage.getItem(DRAWER_POS_KEY) || 'top';
  const enableCpf = localStorage.getItem(ENABLE_CPF_KEY) !== 'false';
  const enableName = localStorage.getItem(ENABLE_NAME_KEY) !== 'false';
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  const panelInline = panelInlineStored === null ? false : panelInlineStored === 'true';

  if (select) select.value = pos;
  if (cbCpf) cbCpf.checked = !!enableCpf;
  if (cbName) cbName.checked = !!enableName;

  const cbInline = document.getElementById('settings-panel-inline') as HTMLInputElement | null;
  if (cbInline) cbInline.checked = !!panelInline;

  applyBtn?.addEventListener('click', () => {
    const newPos = select?.value || 'top';
    const drawer = document.getElementById('drawer') as HTMLElement | null;
    if (drawer) {
      drawer.classList.remove('position-top', 'position-bottom-right', 'position-side');
      if (newPos === 'top') drawer.classList.add('position-top');
      else if (newPos === 'side') drawer.classList.add('position-side');
      else drawer.classList.add('position-bottom-right');
    }
    setStatus('Posição aplicada (não salva)', false);
  });

  saveBtn?.addEventListener('click', () => {
    const newPos = select?.value || 'top';
    localStorage.setItem(DRAWER_POS_KEY, newPos);
    localStorage.setItem(ENABLE_CPF_KEY, cbCpf?.checked ? 'true' : 'false');
    localStorage.setItem(ENABLE_NAME_KEY, cbName?.checked ? 'true' : 'false');
    localStorage.setItem(PANEL_INLINE_KEY, cbInline?.checked ? 'true' : 'false');
    setStatus('Preferências salvas. Atualizando...', false);
    setTimeout(() => window.location.reload(), 300);
  });
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
  (document.getElementById('pick-json') as HTMLElement | null)?.addEventListener('click', () => {
    void pickOutputDir('json');
  });
  (document.getElementById('pick-xml') as HTMLElement | null)?.addEventListener('click', () => {
    void pickOutputDir('xml');
  });
}

// =========================
// Bootstrap
// =========================
function ensureDefaultCartorioCns(): void {
  try {
    const cnsInput = document.querySelector('input[data-bind="certidao.cartorio_cns"]') as HTMLInputElement | null;
    if (!cnsInput) return;
    if (cnsInput.value) return;

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
      openHtmlAndSavePdf(html, 'NASCIMENTO_');
      setStatus('Gerando PDF…');
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

function setupApp(): void {
  ensureDefaultCartorioCns();

  setupValidation();
  setupFocusEmphasis();
  setupAdminPanel();
  setupSettingsPanel();
  setupOutputDirs();
  setupPrintButton();
  setupActions();

  if (localStorage.getItem('ui.enableParentNameCopy') === 'true') {
    setupNameCopy('input[data-bind="ui.mae_nome"]', 'input[data-bind="ui.pai_nome"]');
  }

  setupAutoNationality('input[name="nacionalidade"]', 'BRASILEIRO');
  setupLiveOutputs();
  setupActSelect('nascimento');
  updateActionButtons();

  void setupCityIntegration();
}

setupApp();

