import '../../core/events';
import { mapperHtmlToJson } from './mapperHtmlToJson';
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
import { setupPrimaryShortcut, setupNameCopy, setupAutoNationality, setupCasamentoDates, } from '../../shared/productivity/index';
import { setupAdminPanel } from '../../shared/ui/admin';
import { setupActSelect } from '../../ui/setup-ui';
import { createNameValidator } from '../../shared/nameValidator';
import { updateActionButtons } from '../../ui';

const NAME_MODE_KEY = 'ui.nameValidationMode';
let nameValidationMode = localStorage.getItem(NAME_MODE_KEY) || 'input';
const PANEL_INLINE_KEY = 'ui.panelInline';

function setupSettingsPanelCasamento(): void {
  const select = document.getElementById('settings-drawer-position') as HTMLSelectElement | null;
  const cbCpf = document.getElementById('settings-enable-cpf') as HTMLInputElement | null;
  const cbName = document.getElementById('settings-enable-name') as HTMLInputElement | null;
  const saveBtn = document.getElementById('settings-save') as HTMLElement | null;
  const applyBtn = document.getElementById('settings-apply') as HTMLElement | null;
  const pos = localStorage.getItem('ui.drawerPosition') || 'bottom-right';
  const enableCpf = localStorage.getItem('ui.enableCpfValidation') !== 'false';
  const enableName = localStorage.getItem('ui.enableNameValidation') !== 'false';
  if (select) select.value = pos;
  if (cbCpf) cbCpf.checked = !!enableCpf;
  if (cbName) cbName.checked = !!enableName;
  saveBtn?.addEventListener('click', () => {
    const newPos = select?.value || 'bottom-right';
    const newCpf = cbCpf?.checked ? 'true' : 'false';
    const newName = cbName?.checked ? 'true' : 'false';
    const newInline = (document.getElementById('settings-panel-inline') as HTMLInputElement | null)?.checked ? 'true' : 'false';
    localStorage.setItem('ui.drawerPosition', newPos);
    localStorage.setItem('ui.enableCpfValidation', newCpf);
    localStorage.setItem('ui.enableNameValidation', newName);
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
    setStatus('Preferências salvas. Atualizando...', false);
    setTimeout(() => window.location.reload(), 300);
  });
  applyBtn?.addEventListener('click', () => {
    const newPos = select?.value || 'bottom-right';
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
  const drawer = (document.getElementById('drawer') as HTMLElement | null);
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
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function buildFileName(ext: string): string {
  return `CASAMENTO_${makeTimestamp()}.${ext}`;
}

function generateJson(): void {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document as any);
  const json = JSON.stringify(data, null, 2);
  const out = document.getElementById('json-output') as any;
  if (out) out.value = json;
  const name = buildFileName('json');
  if (downloadFile(name, json, 'application/json')) setStatus(`JSON baixado: ${name}`);
  else setStatus('Falha ao gerar JSON', true);
}

function generateXml(): void {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document as any);
  const xml = toXml(data, 'certidao_casamento', 0);
  const name = buildFileName('xml');
  if (downloadFile(name, xml, 'application/xml')) setStatus(`XML baixado: ${name}`);
  else setStatus('Falha ao gerar XML', true);
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
  if (cbInline) cbInline.checked = panelInlineStored === null ? false : panelInlineStored === 'true';
  document.getElementById('config-save')?.addEventListener('click', () => {
    const selected = document.querySelector('input[name="name-validation-mode"]:checked') as HTMLInputElement | null;
    if (selected && selected.value) {
      nameValidationMode = selected.value;
      localStorage.setItem(NAME_MODE_KEY, nameValidationMode);
    }
    const newInline = (document.getElementById('settings-panel-inline') as HTMLInputElement | null)?.checked ? 'true' : 'false';
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
  });
  setupAdminPanel();
}

function setFieldHint(field: Element | null, message: string): void {
  if (!field) return;
  let hint = field.querySelector('.hint') as HTMLElement | null;
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'hint';
    field.appendChild(hint);
  }
  if (message) {
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
  } else {
    hint.innerHTML = '';
    hint.classList.remove('visible');
  }
}

function clearFieldHint(field: Element | null): void {
  setFieldHint(field, '');
}

function setupFocusEmphasis(): void {
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    if (!el) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) { void e; }
      el.classList.add('focus-emphasis');
    }
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target as HTMLElement;
    if (!el) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) el.classList.remove('focus-emphasis');
  });
}



function yearFromDate(value: string): string {
  const normalized = normalizeDate(value);
  const match = (normalized || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] : '';
}

function dateToTime(value: string): number | null {
  const normalized = normalizeDate(value);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt.getTime();
}

function updateDebug(data: any): void {
  const cns = (document.querySelector('input[name="certidao.cartorio_cns"]') as HTMLInputElement | null)?.value || '';
  const ano = yearFromDate((document.querySelector('input[name="dataTermo"]') as HTMLInputElement | null)?.value || '');
  const tipo = (document.querySelector('select[name="tipoCasamento"]') as HTMLSelectElement | null)?.value || '';
  const tipoAto = tipo === 'R' ? '3' : tipo === 'C' ? '2' : '';
  const livro = (document.querySelector('input[name="livro"]') as HTMLInputElement | null)?.value || '';
  const folha = (document.querySelector('input[name="folha"]') as HTMLInputElement | null)?.value || '';
  const termo = (document.querySelector('input[name="termo"]') as HTMLInputElement | null)?.value || '';
  const base = buildMatriculaBase30({
    cns6: cns,
    ano,
    tipoAto,
    acervo: '01',
    servico: '55',
    livro,
    folha,
    termo,
  });
  const dv = base ? calcDv2Digits(base) : '';
  const final = base && dv ? base + dv : buildMatriculaFinal({ cns6: cns, ano, tipoAto, livro, folha, termo });
  const baseEl = document.getElementById('debug-matricula-base') as HTMLInputElement | null;
  if (baseEl) baseEl.value = base || '';
  const dvEl = document.getElementById('debug-matricula-dv') as HTMLInputElement | null;
  if (dvEl) dvEl.value = dv || '';
  const finalEl = document.getElementById('debug-matricula-final') as HTMLInputElement | null;
  if (finalEl) finalEl.value = final || '';
  const invalids = collectInvalidFields(document as any) || [];
  const invalidEl = document.getElementById('debug-invalid') as HTMLInputElement | null;
  if (invalidEl) invalidEl.value = invalids.join('\n');
  const alerts: string[] = [];
  const termoDate = dateToTime(data?.registro?.data_registro || '');
  const casamentoDate = dateToTime(data?.registro?.data_celebracao || '');
  if (termoDate && casamentoDate && termoDate < casamentoDate) {
    alerts.push('Data do termo menor que data do casamento.');
  }
  const alertsEl = document.getElementById('debug-alerts') as HTMLInputElement | null;
  if (alertsEl) alertsEl.value = alerts.join('\n');
}

function updateOutputs(): void {
  const data = mapperHtmlToJson(document as any);
  const jsonEl = document.getElementById('json-output') as HTMLInputElement | null;
  if (jsonEl) jsonEl.value = JSON.stringify(data, null, 2);
  const xmlEl = document.getElementById('xml-output') as HTMLInputElement | null;
  if (xmlEl) xmlEl.value = toXml(data, 'certidao_casamento', 0);
  updateDebug(data);
}

function setupLiveOutputs(): void {
  const form = document.getElementById('form-casamento');
  const drawer = document.getElementById('drawer');
  const handler = () => updateOutputs();
  form?.addEventListener('input', handler);
  form?.addEventListener('change', handler);
  drawer?.addEventListener('input', handler);
  drawer?.addEventListener('change', handler);
  updateOutputs();
}

function setupNameValidation(): void {
  const validator = createNameValidator();
  const fields = document.querySelectorAll('[data-name-validate]');
  const timers = new Map<any, number>();
  fields.forEach((input) => {
    const field = (input as Element).closest('.campo');
    if (field) field.classList.add('name-field');
    let hint = field ? (field.querySelector('.name-suggest') as HTMLButtonElement | null) : null;
    if (field && !hint) {
      hint = document.createElement('button');
      hint.type = 'button';
      hint.className = 'name-suggest';
      hint.textContent = 'Parece incorreto - adicionar ao dicionario?';
      field.appendChild(hint);
    }
    if (hint) {
      hint.addEventListener('click', (e) => {
        e.preventDefault();
        const value = (input as HTMLInputElement).value;
        if (!value) return;
        validator.repo.addException(value);
        (input as HTMLElement).classList.remove('invalid');
        if (field) field.classList.remove('name-suspect');
        const t = timers.get(input as any);
        if (t) clearInterval(t);
        timers.delete(input as any);
      });
    }
    const runCheck = () => {
      const value = (input as HTMLInputElement).value || '';
      const result = validator.check(value);
      const suspect = !!result.suspicious;
      (input as HTMLElement).classList.toggle('invalid', suspect);
      if (field) field.classList.toggle('name-suspect', suspect);
      if (suspect) {
        showToast('Nome possivelmente incorreto');
        if (!timers.has(input as any)) {
          const id = window.setInterval(() => {
            if ((input as HTMLElement).classList.contains('invalid')) showToast('Nome possivelmente incorreto');
          }, 180000) as unknown as number;
          timers.set(input as any, id);
        }
      } else {
        const t = timers.get(input as any);
        if (t) clearInterval(t);
        timers.delete(input as any);
      }
    };
    input.addEventListener('input', () => {
      if (nameValidationMode === 'input') runCheck();
    });
    input.addEventListener('blur', () => {
      if (nameValidationMode === 'blur' || nameValidationMode === 'input') runCheck();
    });
  });
  validator.ready.then(() => {
    fields.forEach((input) => {
      const field = (input as Element).closest('.campo');
      if (field) field.classList.remove('name-suspect');
      const value = (input as HTMLInputElement).value || '';
      if (value) {
        const result = validator.check(value);
        const suspect = !!result.suspicious;
        (input as HTMLElement).classList.toggle('invalid', suspect);
        if (field) field.classList.toggle('name-suspect', suspect);
      }
    });
  });
}

function setup(): void {
  function triggerMatricula() {
    try {
      if (typeof (window as any).updateMatricula === 'function') (window as any).updateMatricula();
    } catch (e) {
      void e;
    }
  }
  const elTipo = document.querySelector('select[name="tipoCasamento"]') as HTMLSelectElement | null;
  const elDataTermo = document.querySelector('input[name="dataTermo"]') as HTMLInputElement | null;
  const elDataCasamento = document.querySelector('input[name="dataCasamento"]') as HTMLInputElement | null;
  const elRegimeBens = document.querySelector('select[name="regimeBens"]') as HTMLSelectElement | null;
  function syncDataCasamentoState() {
    if (!elTipo || !elDataTermo || !elDataCasamento) return;
    if (elTipo.value === '3') {
      elDataCasamento.removeAttribute('readonly');
      elDataCasamento.style.background = '';
      elDataCasamento.tabIndex = 0;
      if (elDataCasamento.value === elDataTermo.value || elDataCasamento.hasAttribute('readonly')) {
        elDataCasamento.value = '';
        setTimeout(() => elDataCasamento.focus(), 10);
      }
      elDataCasamento.style.outline = '2px solid #22c55e';
      elDataCasamento.title = 'readonly: ' + elDataCasamento.hasAttribute('readonly');
    } else {
      elDataCasamento.setAttribute('readonly', 'readonly');
      elDataCasamento.style.background = '#ddd';
      elDataCasamento.tabIndex = -1;
      elDataCasamento.value = elDataTermo.value;
      elDataCasamento.style.outline = '';
      elDataCasamento.title = '';
      if (document.activeElement === elDataCasamento && elRegimeBens) elRegimeBens.focus();
    }
    triggerMatricula();
  }
  elTipo?.addEventListener('change', syncDataCasamentoState);
  try { if (elTipo) elTipo.required = true; } catch (e) { /* ignore */ }
  elDataTermo?.addEventListener('input', () => {
    if (elTipo?.value !== '3') {
      if (elDataCasamento) elDataCasamento.value = elDataTermo?.value || '';
      if (elTipo?.value === '3') startEnforceUnlock(); else stopEnforceUnlock();
      triggerMatricula();
    }
  });
  elDataCasamento?.addEventListener('input', () => {
    if (elTipo?.value === '3' && elDataCasamento.value.length === 10 && elRegimeBens) elRegimeBens.focus();
    triggerMatricula();
  });
  let enforceInterval: number | null = null;
  const dataCasamentoObserver = new MutationObserver((mutations) => {
    const tipoVal = elTipo?.value || '';
    if (tipoVal === '3') {
      if (elDataCasamento.hasAttribute('readonly') || elDataCasamento.tabIndex === -1 || elDataCasamento.classList.contains('input-locked')) {
        unlockDataCasamento();
      }
    } else {
      if (!elDataCasamento.hasAttribute('readonly')) {
        lockDataCasamento();
      }
    }
  });
  function startEnforceUnlock() {
    if (enforceInterval != null) return;
    enforceInterval = window.setInterval(() => {
      if (elTipo?.value === '3') unlockDataCasamento(); else lockDataCasamento();
    }, 350) as unknown as number;
  }
  function stopEnforceUnlock() {
    if (enforceInterval != null) { clearInterval(enforceInterval as unknown as number); enforceInterval = null; }
  }
  function lockDataCasamento() {
    try {
      elDataCasamento.setAttribute('readonly', 'readonly');
      elDataCasamento.tabIndex = -1;
      elDataCasamento.style.background = '#ddd';
      if (!elDataCasamento.classList.contains('input-locked')) elDataCasamento.classList.add('input-locked');
    } catch (e) { /* ignore */ }
  }
  function unlockDataCasamento() {
    try {
      elDataCasamento.removeAttribute('readonly');
      elDataCasamento.tabIndex = 0;
      elDataCasamento.style.background = '';
      elDataCasamento.classList.remove('input-locked');
    } catch (e) { /* ignore */ }
  }
  function findMatriculaFieldLocal(): HTMLInputElement | null {
    const byId = document.getElementById('matricula') as HTMLInputElement | null;
    if (byId) return byId;
    const byName = document.querySelector('input[name*="matricula"], input[id*="matricula"]') as HTMLInputElement | null;
    if (byName) return byName;
    const byDataBind = Array.from(document.querySelectorAll('input[data-bind]')).find((i) => ((i.getAttribute('data-bind') || '').toLowerCase().includes('matricula'))) as HTMLInputElement | undefined;
    return byDataBind || null;
  }
  function fixMatriculaField(mEl: HTMLInputElement | null) {
    if (!mEl) return;
    const val = (mEl.value || '').trim();
    if (!val || !/^\d+$/.test(val)) return;
    if (val.length <= 14) return;
    const tipo = elTipo?.value || '';
    const desired = tipo === '3' ? '3' : tipo === '2' ? '2' : null;
    if (!desired) return;
    if (val[14] === desired) return;
    const newVal = val.slice(0, 14) + desired + val.slice(15);
    mEl.value = newVal;
    try { mEl.dispatchEvent(new Event('input', { bubbles: true })); mEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* ignore */ }
  }
  function observeMatricula() {
    const mEl = findMatriculaFieldLocal();
    if (!mEl) return;
    mEl.addEventListener('input', () => fixMatriculaField(mEl));
    mEl.addEventListener('change', () => fixMatriculaField(mEl));
    try {
      const mo = new MutationObserver(() => fixMatriculaField(mEl));
      mo.observe(mEl, { attributes: true, attributeFilter: ['value'] });
    } catch (e) { /* ignore */ }
    let last = mEl.value;
    let blockInterval: number | null = null;
    function startBlockingUntilTipo() {
      if (blockInterval != null) return;
      blockInterval = window.setInterval(() => {
        if ((elTipo?.value || '').trim() === '') {
          if (mEl.value) { mEl.value = ''; try { mEl.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { /* ignore */ } }
          mEl.setAttribute('readonly', 'readonly');
          mEl.placeholder = 'Selecione o tipo antes';
        } else {
          if (blockInterval != null) { clearInterval(blockInterval as unknown as number); blockInterval = null; }
          try { mEl.removeAttribute('readonly'); } catch (e) { /* ignore */ }
          mEl.placeholder = '';
          fixMatriculaField(mEl);
        }
      }, 300) as unknown as number;
    }
    if ((elTipo?.value || '').trim() === '') startBlockingUntilTipo();
    setInterval(() => {
      if (mEl.value !== last) { last = mEl.value; fixMatriculaField(mEl); }
    }, 500);
  }
  ['cartorio-oficio', 'matricula-livro', 'matricula-folha', 'matricula-termo'].forEach((id) => {
    const el = document.getElementById(id) as HTMLElement | null;
    if (el) el.addEventListener('input', triggerMatricula);
    if (el) el.addEventListener('change', triggerMatricula);
  });
  setTimeout(() => {
    syncDataCasamentoState();
    try {
      dataCasamentoObserver.observe(elDataCasamento as Element, {
        attributes: true,
        attributeFilter: ['readonly', 'class', 'tabindex', 'disabled', 'style'],
      });
    } catch (e) { /* ignore */ }
    observeMatricula();
  }, 50);
  document.getElementById('btn-json')?.addEventListener('click', (e) => { e.preventDefault(); generateJson(); });
  document.getElementById('btn-xml')?.addEventListener('click', (e) => { e.preventDefault(); generateXml(); });
  setupValidation();
  setupNameValidation();
  setupConfigPanel();
  // drawer setup intentionally skipped; drawer controls handled elsewhere
  setupSettingsPanelCasamento();
  (function () {
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
    const btn = document.getElementById('drawer-toggle');
    if (btn) btn.addEventListener('click', () => { const d = document.getElementById('drawer'); if (!d) return; d.classList.toggle('open'); });
  })();
  setupActSelect('casamento');
  setupPrimaryShortcut(() => document.getElementById('btn-json') || document.getElementById('btn-xml'));
  setupNameCopy('input[name="nomeSolteiro"]', 'input[name="nomeCasado"]');
  setupNameCopy('input[name="nomeSolteira"]', 'input[name="nomeCasada"]');
  setupAutoNationality('input[name="nacionalidadeNoivo"]', 'BRASILEIRO');
  setupAutoNationality('input[name="nacionalidadeNoiva"]', 'BRASILEIRA');
  setupCasamentoDates();
  setupFocusEmphasis();
  setupLiveOutputs();
  updateActionButtons();
  document.getElementById('form-casamento')?.addEventListener('input', updateActionButtons);
  document.getElementById('form-casamento')?.addEventListener('change', updateActionButtons);
}

function setupValidation(): void {
  document.querySelectorAll('input[data-date]').forEach((input) => {
    const field = (input as Element).closest('.campo');
    const required = (input as HTMLElement).hasAttribute('data-required');
    const onInput = () => {
      applyDateMask(input as HTMLInputElement);
      clearFieldHint(field);
      const normalized = normalizeDate((input as HTMLInputElement).value);
      const isValid = !( (input as HTMLInputElement).value ) || !!normalized;
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
      if (!isValid && raw) setFieldHint(field, res.message || 'Data inválida'); else clearFieldHint(field);
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
      const state = getFieldState({ required, value: (input as HTMLInputElement).value, isValid: !res.invalid, warn: res.warn });
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
      const state = getFieldState({ required, value: digits ? (input as HTMLInputElement).value : '', isValid });
      applyFieldState(field as HTMLElement | null, state);
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', () => {
      handler();
      const digits = normalizeCpf((input as HTMLInputElement).value);
      if ((input as HTMLInputElement).value && (!digits || !isValidCpf(digits))) setFieldHint(field, 'CPF inválido'); else clearFieldHint(field);
    });
    handler();
  });
}

function canProceed(): boolean {
  const invalids = collectInvalidFields(document as any);
  if (!invalids || invalids.length === 0) return true;
  setStatus(`Existem ${invalids.length} campos inválidos: ${invalids.join(', ')}`, true);
  return false;
}

// Expose setup for the page
export { setup };
export {};

// ...restante do código do arquivo original...
