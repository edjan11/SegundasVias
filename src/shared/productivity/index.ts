import {
  resolveCasamentoTipo,
  shouldAutoCopyTermoToCasamento,
  shouldSkipDataCasamentoTab,
} from './casamento-rules.js';
import { shouldAutofillFromSource, recordAutofill, recordUserEdit } from '../ui/autofill.js';

function lockInput(input: any) {
  if (!input) return;
  input.readOnly = true;
  input.tabIndex = -1;
  input.classList.add('input-locked');
}

function unlockInput(input: any) {
  if (!input) return;
  input.readOnly = false;
  input.tabIndex = 0;
  input.classList.remove('input-locked');
}

export function setupPrimaryShortcut(getPrimary: () => HTMLElement | null) {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      const target = typeof getPrimary === 'function' ? getPrimary() : null;
      target?.click();
    }
  });
}

export function setupNameCopy(sourceSelector: string, targetSelector: string) {
  const source = document.querySelector(sourceSelector) as HTMLInputElement | null;
  const target = document.querySelector(targetSelector) as HTMLInputElement | null;
  if (!source || !target) return;
  let lastAuto = '';
  const applyCopy = () => {
    const value = String(source.value || '').trim();
    if (!value) return;
    if (!target.value || target.value === lastAuto) {
      target.value = value;
      lastAuto = value;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
  source.addEventListener('blur', applyCopy);
  source.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      applyCopy();
    }
  });
}

export function setupAutoNationality(selector: string, value: string) {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  if (!input) return;
  if (String(input.value || '').trim()) return;
  input.value = value;
  lockInput(input);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function setupCasamentoDates(opts: any = {}) {
  const dataTermo = document.querySelector(
    opts.dataTermoSelector || 'input[name="dataTermo"]',
  ) as HTMLInputElement | null;
  const tipo = document.querySelector(
    opts.tipoSelector || 'select[name="tipoCasamento"]',
  ) as HTMLSelectElement | null;
  const dataCasamento = document.querySelector(
    opts.dataCasamentoSelector || 'input[name="dataCasamento"]',
  ) as HTMLInputElement | null;
  if (!dataTermo || !tipo || !dataCasamento) return;

  let lastAuto = '';
  let dirty = false;

  const markUserEdit = () => {
    const current = String(dataCasamento.value || '').trim();
    if (!current) {
      dirty = false;
      lastAuto = '';
      return;
    }
    if (current !== lastAuto) dirty = true;
  };

  const applyAutoCopy = () => {
    const tipoVal = resolveCasamentoTipo(tipo.value);
    if (!shouldAutoCopyTermoToCasamento(tipoVal)) return;
    const src = String(dataTermo.value || '').trim();
    if (!src) return;
    if (!dataCasamento.value || dataCasamento.value === lastAuto || !dirty) {
      dataCasamento.value = src;
      lastAuto = src;
      dirty = false;
      dataCasamento.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const applyTabPolicy = () => {
    const tipoVal = resolveCasamentoTipo(tipo.value);
    const skip = shouldSkipDataCasamentoTab(tipoVal);
    dataCasamento.tabIndex = skip ? -1 : 0;
  };

  const applyTipoChange = () => {
    const tipoVal = resolveCasamentoTipo(tipo.value);
    applyTabPolicy();
    if (tipoVal === 'religioso') {
      dataCasamento.focus();
      try {
        dataCasamento.select();
      } catch (e) {
        /* ignore */
      }
      return;
    }
    applyAutoCopy();
  };

  const focusTipo = () => {
    if (!tipo) return;
    if (tipo.disabled || tipo.getAttribute('tabindex') === '-1') return;
    tipo.focus();
  };

  const onTabFromTermo = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    const tipoVal = resolveCasamentoTipo(tipo.value);
    if (!shouldSkipDataCasamentoTab(tipoVal)) return;
    // Explicitly move focus to tipo when dataCasamento is skipped.
    e.preventDefault();
    focusTipo();
  };

  const onTabFromCasamento = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    // Ensure tipo receives focus even if dataCasamento is not in tab order.
    e.preventDefault();
    focusTipo();
  };

  dataCasamento.addEventListener('input', markUserEdit);
  dataTermo.addEventListener('input', applyAutoCopy);
  dataTermo.addEventListener('keydown', onTabFromTermo);
  dataCasamento.addEventListener('keydown', onTabFromCasamento);
  tipo.addEventListener('change', applyTipoChange);
  tipo.addEventListener('input', applyTipoChange);

  applyTabPolicy();
  applyAutoCopy();
}

export function setupAutofillWithDirty(
  sourceSelector: string,
  targetSelector: string,
  opts: { onAutofill?: (value: string) => void } = {},
) {
  const source = document.querySelector(sourceSelector) as HTMLInputElement | null;
  const target = document.querySelector(targetSelector) as HTMLInputElement | null;
  if (!source || !target) return;
  let state = { lastAuto: '', dirty: false };

  const apply = () => {
    const nextValue = String(source.value || '').trim();
    if (!shouldAutofillFromSource({ sourceValue: nextValue, targetValue: target.value, state }))
      return;
    target.value = nextValue;
    state = recordAutofill(state, nextValue);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    if (opts.onAutofill) opts.onAutofill(nextValue);
  };

  const onTargetInput = () => {
    state = recordUserEdit(state, target.value);
  };

  source.addEventListener('input', apply);
  source.addEventListener('blur', apply);
  target.addEventListener('input', onTargetInput);
}

export function setupDefaultValueWithDirty(selector: string, value: string) {
  const target = document.querySelector(selector) as HTMLInputElement | null;
  if (!target) return;
  let state = { lastAuto: '', dirty: false };

  const applyDefault = () => {
    const current = String(target.value || '').trim();
    if (current || state.dirty) return;
    target.value = value;
    state = recordAutofill(state, value);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };

  target.addEventListener('input', () => {
    state = recordUserEdit(state, target.value);
    if (!String(target.value || '').trim()) applyDefault();
  });

  applyDefault();
}
