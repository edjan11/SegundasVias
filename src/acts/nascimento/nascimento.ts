
import '../../core/events';
import { mapperHtmlToJson } from './mapperHtmlToJson';
import { normalizeDate, validateDateDetailed } from '../../shared/validators/date';
import { normalizeTime } from '../../shared/validators/time';
import { normalizeCpf, isValidCpf } from '../../shared/validators/cpf';
import { validateName } from '../../shared/validators/name';
import { createNameValidator } from '../../shared/nameValidator';
import { getFieldState, applyFieldState } from '../../shared/ui/fieldState';
import { applyDateMask, applyTimeMask } from '../../shared/ui/mask';
import { collectInvalidFields } from '../../shared/ui/debug';
import {
  buildMatriculaBase30,
  calcDv2Digits,
  buildMatriculaFinal,
} from '../../shared/matricula/cnj';
import { setupNameCopy, setupAutoNationality } from '../../shared/productivity/index';
import { setupAdminPanel } from '../../shared/ui/admin';
import { setupActSelect } from '../../ui/setup-ui';
import { buildNascimentoPdfHtmlTJ } from "../../prints/nascimento/printNascimentoTj";
import { openHtmlAndSavePdf } from "../../prints/shared/openAndSavePdf";
import { escapeHtml, sanitizeHref, sanitizeCss } from '../../prints/shared/print-utils';

const NAME_MODE_KEY = 'ui.nameValidationMode';
const DRAWER_POS_KEY = 'ui.drawerPosition';
const ENABLE_CPF_KEY = 'ui.enableCpfValidation';
const ENABLE_NAME_KEY = 'ui.enableNameValidation';
const PANEL_INLINE_KEY = 'ui.panelInline';

function setStatus(text: string, isError?: boolean): void {
  const el = (document.getElementById('statusText') as HTMLElement | null);
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
  let container = (document.getElementById('toast-container') as HTMLElement | null);
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

function resolveField(input: Element): Element | null {
  return (
    input.closest('td') || input.closest('.campo') || input.closest('.field') || input.parentElement
  );
}

function setFieldHint(field: Element | null, message?: string): void {
  if (!field) return;
  let hint = (field as any).querySelector('.hint');
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
    let aria = (document.getElementById('aria-live-errors') as HTMLElement | null);
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

function setupFocusEmphasis() {
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) { void e;}
      el.classList.add('focus-emphasis');
    }
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) el.classList.remove('focus-emphasis');
  });
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

function updateDebug(data) {
  const cns = (document.querySelector('input[data-bind="certidao.cartorio_cns"]') as any)?.value || '';
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
  const final =
    base && dv
      ? base + dv
      : buildMatriculaFinal({ cns6: cns, ano, tipoAto: '1', livro, folha, termo });
  const baseEl = (document.getElementById('debug-matricula-base') as HTMLElement | null);
  if (baseEl) (baseEl as any).value = base || '';
  const dvEl = (document.getElementById('debug-matricula-dv') as HTMLElement | null);
  if (dvEl) (dvEl as any).value = dv || '';
  const finalEl = (document.getElementById('debug-matricula-final') as HTMLElement | null);
  if (finalEl) (finalEl as any).value = final || '';
  const invalids = collectInvalidFields(document);
  const invalidEl = (document.getElementById('debug-invalid') as HTMLElement | null);
  if (invalidEl) (invalidEl as any).value = invalids.join('\n');
}

function updateOutputs() {
  const data = mapperHtmlToJson(document);
  const jsonEl = (document.getElementById('json-output') as HTMLElement | null);
  if (jsonEl) (jsonEl as any).value = JSON.stringify(data, null, 2);
  const xmlEl = (document.getElementById('xml-output') as HTMLElement | null);
  if (xmlEl) (xmlEl as any).value = toXml(data, 'certidao_nascimento', 0);
  updateDebug(data);
}

function canProceed() {
  const invalids = collectInvalidFields(document);
  if (!invalids || invalids.length === 0) return true;
  setStatus(`${invalids.length} campo(s) inválido(s). Corrija antes de prosseguir.`, true);
  showToast('Existem campos inválidos — corrija antes de prosseguir');
  const invalidEl = (document.getElementById('debug-invalid') as HTMLElement | null);
  if (invalidEl) (invalidEl as any).value = invalids.join('\n');
  return false;
}

function updateActionButtons() {
  const invalids = collectInvalidFields(document);
  const disabled = !!(invalids && invalids.length > 0);
  const btnJson = (document.getElementById('btn-json') as HTMLElement | null);
  if (btnJson) (btnJson as any).disabled = disabled;
  const btnXml = (document.getElementById('btn-xml') as HTMLElement | null);
  if (btnXml) (btnXml as any).disabled = disabled;
  const btnSave = (document.getElementById('btn-save') as HTMLElement | null);
  if (btnSave) (btnSave as any).disabled = disabled;
  const statusEl = (document.getElementById('statusText') as HTMLElement | null);
  if (statusEl && !disabled) statusEl.textContent = 'Pronto';

  let summary = (document.getElementById('form-error-summary') as HTMLElement | null);
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
    const container = (document.querySelector('.container') as HTMLElement | null);
    if (container) container.appendChild(summary);
  }
  if (disabled) {
    summary.textContent = `Campos inválidos: ${invalids.join(', ')}`;
    summary.style.display = 'block';
  } else if (summary) {
    summary.style.display = 'none';
  }
  // update aria-live for assistive tech
  let aria = (document.getElementById('aria-live-errors') as HTMLElement | null);
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

function generateJson() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const json = JSON.stringify(data, null, 2);
  const out = (document.getElementById('json-output') as HTMLElement | null);
  if (out) (out as any).value = json;
  const name = `NASCIMENTO_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.json`;
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`JSON baixado: ${name}`);
  } catch (e) { void e;
    setStatus('Falha ao gerar JSON', true);
  }
}

function generateXml() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const xml = toXml(data, 'certidao_nascimento', 0);
  const out = (document.getElementById('xml-output') as HTMLElement | null);
  if (out) (out as any).value = xml;
  const name = `NASCIMENTO_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.xml`;
  try {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`XML baixado: ${name}`);
  } catch (e) { void e;
    setStatus('Falha ao gerar XML', true);
  }
}

function setupValidation() {
  // date fields (.w-date)
  document.querySelectorAll<HTMLInputElement>('input.w-date').forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute('data-required') || input.classList.contains('required');
    const onInput = () => {
      applyDateMask(input);
      clearFieldHint(field);
      const normalized = normalizeDate((input as any).value);
      const isValid = !(input as any).value || !!normalized;
      const state = getFieldState({ required, value: (input as any).value, isValid });
      applyFieldState(field as HTMLElement, state);
    };
    const onBlur = () => {
      applyDateMask(input);
      const raw = (input as any).value || '';
      const res = validateDateDetailed(raw);
      const isValid = res.ok;
      const state = getFieldState({ required, value: raw, isValid });
      applyFieldState(field as HTMLElement, state);
      if (!isValid && raw) setFieldHint(field, res.message || 'Data inválida');
      else clearFieldHint(field);
    };
    input.addEventListener('input', onInput);
    input.addEventListener('blur', onBlur);
    onInput();
  });

  // time fields (.w-time)
  document.querySelectorAll<HTMLInputElement>('input.w-time').forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute('data-required');
    const handler = () => {
      applyTimeMask(input);
      const normalized = normalizeTime((input as any).value);
      const isValid = !(input as any).value || !!normalized;
      const state = getFieldState({ required, value: (input as any).value, isValid });
      applyFieldState(field as HTMLElement, state);
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
    handler();
  });

  // CPF (id cpf)
  const cpfInput = (document.getElementById('cpf') as HTMLElement | null);
  if (cpfInput) {
    const field = resolveField(cpfInput);
    const handler = () => {
      (cpfInput as any).value = formatCpfInput((cpfInput as any).value);
      const digits = normalizeCpf((cpfInput as any).value);
      const isValid = !digits || isValidCpf(digits);
      const state = getFieldState({
        required: false,
        value: digits ? (cpfInput as any).value : '',
        isValid,
      });
      applyFieldState(field as HTMLElement, state);
    };
    cpfInput.addEventListener('input', handler);
    cpfInput.addEventListener('blur', () => {
      handler();
      const digits = normalizeCpf((cpfInput as any).value);
      if ((cpfInput as any).value && (!digits || !isValidCpf(digits))) setFieldHint(field, 'CPF inválido');
      else clearFieldHint(field);
    });
    handler();
  }

  // name validation (basic) — keep for legacy checks
  const enableName = localStorage.getItem('ui.enableNameValidation') !== 'false';
  if (enableName) {
    document.querySelectorAll<HTMLInputElement>('[data-name-validate]').forEach((input) => {
      const field = resolveField(input);
      const required = input.hasAttribute('data-required');
      const handler = () => {
        const res = validateName((input as any).value || '', { minWords: 2 });
        const state = getFieldState({
          required,
          value: (input as any).value,
          isValid: !res.invalid,
          warn: res.warn,
        });
        applyFieldState(field as HTMLElement, state);
      };
      input.addEventListener('input', handler);
      input.addEventListener('blur', handler);
      handler();
    });

    // advanced name DB-based suspicious-name checks and suggestions
    function setupNameValidationLocal() {
      const validator = (window as any)._nameValidator || createNameValidator();
      // sanitize name-like and city-like inputs globally for this act
      try {
        document.querySelectorAll('input[name*="nome"], input[name*="cidade"], input[name*="nacionalidade"], input[name*="naturalidade"], input[name*="mae"], input[name*="pai"], input[name*="avo"]').forEach((inp) => {
          try {
            const el = inp as HTMLInputElement;
            el.addEventListener('input', () => {
              const s = (el.value || '').replace(/[^A-Za-zÀ-ÿ'\- ]/g, '');
              if (s !== el.value) el.value = s;
            });
          } catch (e) { /* ignore */ }
        });
      } catch (e) { /* ignore */ }
      try { if (!(window as any)._nameValidator) (window as any)._nameValidator = validator; } catch (e) { /* ignore */ }
      const fields = document.querySelectorAll('[data-name-validate]');
      const timers = new Map();
      fields.forEach((input) => {
        const field = resolveField(input);
        if (field) field.classList.add('name-field');
        let hint = field ? (field as any).querySelector('.name-suggest') : null;
        if (field && !hint) {
          hint = document.createElement('button');
          hint.type = 'button';
          hint.className = 'name-suggest btn success';
          hint.textContent = 'Salvar nome';
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
            try { clearFieldHint(field); } catch (e) { /* ignore */ }
          });
        }
        const sanitize = () => {
          const v = (input as HTMLInputElement).value || '';
          const s = v.replace(/[^A-Za-zÀ-ÿ'\- ]/g, '');
          if (s !== v) (input as HTMLInputElement).value = s;
        };
        const runCheck = () => {
          sanitize();
          const value = (input as HTMLInputElement).value || '';
          const result = validator.check(value);
          const suspect = !!result.suspicious;
          (input as HTMLElement).classList.toggle('invalid', suspect);
          if (field) field.classList.toggle('name-suspect', suspect);
          if (suspect) {
            try { setFieldHint(field, 'Nome incorreto!'); } catch (e) { /* ignore */ }
          } else {
            try { clearFieldHint(field); } catch (e) { /* ignore */ }
          }
        };
        input.addEventListener('input', () => {
          sanitize();
          const mode = localStorage.getItem('ui.nameValidationMode') || 'blur';
          if (mode === 'input') runCheck();
        });
        input.addEventListener('blur', () => {
          sanitize();
          const mode = localStorage.getItem('ui.nameValidationMode') || 'blur';
          if (mode === 'blur' || mode === 'input') runCheck();
        });
      });
      validator.ready.then(() => {
        fields.forEach((input) => {
          const field = resolveField(input);
          if (field) field.classList.remove('name-suspect');
          const value = (input as HTMLInputElement).value || '';
          if (value) {
            const result = validator.check(value);
            const suspect = !!result.suspicious;
            (input as HTMLElement).classList.toggle('invalid', suspect);
            if (field) field.classList.toggle('name-suspect', suspect);
          }
        });
      }).catch(() => {});
    }

    setupNameValidationLocal();
  }
}

function setupLiveOutputs() {
  const form = (document.querySelector('.container') as HTMLElement | null);
  const handler = () => updateOutputs();
  document.addEventListener('input', handler);
  document.addEventListener('change', handler);
  updateOutputs();
}

function setup() {
  (document.getElementById('btn-json') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    generateJson();
  });
  (document.getElementById('btn-xml') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    generateXml();
  });

  // ensure default cartorio CNS is set on load so automatic matrícula can be generated
  (function ensureDefaultCartorioCns() {
    try {
      const cnsInput = document.querySelector('input[data-bind="certidao.cartorio_cns"]') as HTMLInputElement | null;
      if (!cnsInput) return;
      if (!cnsInput.value) {
        cnsInput.value = '163659';
        cnsInput.readOnly = true;
        // trigger bound handlers so state is updated and matrícula recalculated
        const dataReg = document.querySelector('input[data-bind="registro.data_registro"]') as HTMLInputElement | null;
        if (dataReg) {
          dataReg.dispatchEvent(new Event('input', { bubbles: true }));
          dataReg.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (typeof (window as any).updateMatricula === 'function') {
          (window as any).updateMatricula();
        }
      }
    } catch (e) { /* ignore */ }
  })();

  // Print PDF button: build printable HTML from current form data or from
  // an existing certificate fragment on the page (preferred when present).
  function buildNascimentoPrintHtml(data: any, srcDoc: Document | HTMLElement | null = document): string {
    const reg = data?.registro || {};
    const cert = data?.certidao || {};
    const name = reg.nome_completo || '';
    const matricula = reg.matricula || '';
    const dataRegistro = reg.data_registro || '';
    const dataNascimento = reg.data_nascimento || '';
    const sexo = reg.sexo || '';
    const mae = (reg.filiacao || '').split(';')[1] || '';
    const pai = (reg.filiacao || '').split(';')[0] || '';
    const cartorio = cert.cartorio_cns || '';
    const livro = ((document.getElementById('matricula-livro') as HTMLElement | null) as HTMLInputElement)?.value || '';
    const folha = ((document.getElementById('matricula-folha') as HTMLElement | null) as HTMLInputElement)?.value || '';
    const termo = ((document.getElementById('matricula-termo') as HTMLElement | null) as HTMLInputElement)?.value || '';
    const cpf = reg.cpf || '';
    const dnv = reg.numero_dnv || '';

    // If the source document already contains a rendered certificate fragment
    // (the official HTML), prefer cloning it so the PDF matches the original
    // layout and CSS.
    const candidate =
      (srcDoc as any).querySelector('center') ||
      (srcDoc as any).querySelector('.certidao') ||
      (srcDoc as any).querySelector('.container-certidao');
    if (candidate && /CERTIDÃO|CERTIDAO|CERTID/iu.test(candidate.textContent || '')) {
      // build head: copy stylesheet links and inline styles
      const links = Array.from((srcDoc as any).querySelectorAll('link[rel="stylesheet"]'))
        .map((l: unknown) => sanitizeHref((l as HTMLLinkElement).href, '').trim())
        .filter(Boolean)
        .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
        .join('\n');
      const styles = Array.from((srcDoc as any).querySelectorAll('style'))
        .map((s: unknown) => {
          const raw = (s as HTMLStyleElement).innerHTML || '';
          const clean = sanitizeCss(raw);
          return clean ? `<style>${clean}</style>` : '';
        })
        .join('\n');
      const cloned = candidate.cloneNode(true) as HTMLElement;
      // remove interactive UI and scripts from the clone
      cloned
        .querySelectorAll('script, .nao-imprimir, button, [role="button"]')
        .forEach((el) => el.remove());
      // remove fixed-position elements (common for buttons added by the page)
      Array.from((cloned as any).querySelectorAll('*')).forEach((el: unknown) => {
        try {
          const elEl = el as Element;
          const st = (elEl.getAttribute && elEl.getAttribute('style')) || '';
          if (/position\s*:\s*fixed/iu.test(st)) elEl.remove();
        } catch (e) { /* ignore */ }
      });

      // Sanitize attributes on the cloned node: remove event handlers and unsafe href/src/style values
      Array.from((cloned as any).querySelectorAll('*')).forEach((node: any) => {
        try {
          const attrs = Array.from(node.attributes || []);
          attrs.forEach((a: Attr) => {
            const name = String(a.name || '').toLowerCase();
            const val = String(a.value || '');
            if (name.startsWith('on')) {
              node.removeAttribute(a.name);
              return;
            }
            if (name === 'href' || name === 'src') {
              const safe = sanitizeHref(val, '');
              if (!safe) node.removeAttribute(a.name);
              else node.setAttribute(a.name, safe);
              return;
            }
            if (name === 'style') {
              const safeStyle = sanitizeCss(val);
              if (!safeStyle) node.removeAttribute('style');
              else node.setAttribute('style', safeStyle);
            }
          });
        } catch (e) { /* ignore */ }
      });
      return `<!doctype html><html><head><meta charset="utf-8"><title>Certidão Nascimento</title>${links}${styles}</head><body>${
        cloned.outerHTML
      }
				<script>
				(function(){
					function runHtml2Pdf(){
						try{
							const opt = {
								margin: 10,
								filename: 'NASCIMENTO_'+(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'')+'.pdf',
								image: { type: 'jpeg', quality: 0.98 },
								html2canvas: { scale: 2, useCORS: true },
								jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
							};
							// cleanup: remove any scripts/buttons/fixed UI elements
							(function cleanup(){
								try{
									document.querySelectorAll('script, button, .nao-imprimir, [role="button"]').forEach(e=>e.remove());
									Array.from(document.querySelectorAll('*')).forEach((el: unknown)=>{
										try{ const pos = window.getComputedStyle(el).position; if (pos === 'fixed') el.remove(); }catch (e) { /* ignore */ }
									});
								}catch(e){/* ignore */}
							})();
                            const el = (document.body as any).querySelector('center') || document.body.firstElementChild;
							if (window.html2pdf) {
								window.html2pdf().set(opt).from(el).save();
							} else { console.warn('html2pdf not loaded'); window.print(); }
						} catch(e){ console.error(e); window.print(); }
					}
					if (window.html2pdf) runHtml2Pdf();
					else {
						var s = document.createElement('script');
						s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js';
						s.onload = runHtml2Pdf; s.onerror = function(){ window.print(); };
						document.head.appendChild(s);
					}
				})();
				</script>
				</body></html>`;
    }

    // fallback: minimal summary layout (previous behavior)
    return `<!doctype html><html><head><meta charset="utf-8"><title>Certidão Nascimento</title>
			<style>body{font-family:Arial,Helvetica,sans-serif;padding:12px;color:#111} .h{font-size:14pt;font-weight:700;margin-bottom:6px} .label{font-size:9pt;color:#444} .val{font-weight:700;font-size:11pt;margin-bottom:8px} table{width:100%;margin-top:6px} td{vertical-align:top;padding:6px}</style>
		</head><body>
		<div class="h">CERTIDÃO DE NASCIMENTO - 2ª VIA</div>
		<div><span class="label">Nome:</span><div class="val">${escapeHtml(name)}</div></div>
		<table><tr><td><span class="label">Data de registro</span><div class="val">${escapeHtml(
      dataRegistro,
    )}</div></td>
		<td><span class="label">Data de nascimento</span><div class="val">${escapeHtml(
      dataNascimento,
    )}</div></td>
		<td><span class="label">Sexo</span><div class="val">${escapeHtml(sexo)}</div></td></tr>
		<tr><td><span class="label">Pai</span><div class="val">${escapeHtml(pai)}</div></td>
		<td><span class="label">Mãe</span><div class="val">${escapeHtml(mae)}</div></td>
		<td><span class="label">CPF</span><div class="val">${escapeHtml(cpf)}</div></td></tr>
		<tr><td colspan="3"><span class="label">Cartório/Matricula</span>
			<div class="val">Cartório CNS: ${escapeHtml(cartorio)} &nbsp; Livro: ${escapeHtml(
      livro,
    )} &nbsp; Folha: ${escapeHtml(folha)} &nbsp; Termo: ${escapeHtml(
      termo,
    )}<br/>Matrícula: ${escapeHtml(matricula)}</div>
		</td></tr>
		<tr><td><span class="label">DNV</span><div class="val">${escapeHtml(dnv)}</div></td></tr>
		</table>
		<!-- load html2pdf and trigger download -->
		<script>
			(function(){
				function runHtml2Pdf__dup_2(){
					try{
						const opt = {
							margin: 10,
							filename: 'NASCIMENTO_'+(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'')+'.pdf',
							image: { type: 'jpeg', quality: 0.98 },
							html2canvas: { scale: 2 },
							jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
						};
						// cleanup interactive UI before printing
						try{
							document.querySelectorAll('script, button, .nao-imprimir, [role="button"]').forEach(e=>e.remove());
							Array.from(document.querySelectorAll('*')).forEach((el: unknown)=>{
								try{ const pos = window.getComputedStyle(el).position; if (pos === 'fixed') el.remove(); }catch (e) { /* ignore */ }
							});
						}catch (e) { /* ignore */ }
						if (window.html2pdf) {
							window.html2pdf().set(opt).from(document.body).save();
						} else {
							console.warn('html2pdf not loaded'); window.print();
						}
					} catch(e){ console.error(e); window.print(); }
				}
				if (window.html2pdf) runHtml2Pdf();
				else {
					var s = document.createElement('script');
					s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js';
					s.onload = runHtml2Pdf; s.onerror = function(){ window.print(); };
					document.head.appendChild(s);
				}
			})();
		</script>
		</body></html>`;
  }

 (document.getElementById('btn-print') as HTMLElement | null)?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!canProceed()) return;

    const data = mapperHtmlToJson(document);
    const html = buildNascimentoPdfHtmlTJ(data, {
      cssHref: "../assets/tj/certidao.css", // você coloca o arquivo local
    });

    try {
      openHtmlAndSavePdf(html, "NASCIMENTO_");
      setStatus("Gerando PDF…");
    } catch (err) {
      showToast("Permita popups para imprimir/baixar PDF");
      setStatus("Popup bloqueado", true);
    }
  });
  setupValidation();
  setupFocusEmphasis();
  setupAdminPanel();
  setupSettingsPanel();
  if (localStorage.getItem('ui.enableParentNameCopy') === 'true') {
    setupNameCopy('input[data-bind="ui.mae_nome"]', 'input[data-bind="ui.pai_nome"]');
  }
  setupAutoNationality('input[name="nacionalidade"]', 'BRASILEIRO');
  setupLiveOutputs();
  // wire ato selector change to navigate between acts
  setupActSelect('nascimento');
  // wire action button state
  updateActionButtons();
  document.addEventListener('input', updateActionButtons);
  document.addEventListener('change', updateActionButtons);
}

function setupSettingsPanel() {
  const select = (document.getElementById('settings-drawer-position') as HTMLElement | null);
  const cbCpf = (document.getElementById('settings-enable-cpf') as HTMLElement | null);
  const cbName = (document.getElementById('settings-enable-name') as HTMLElement | null);
  const saveBtn = (document.getElementById('settings-save') as HTMLElement | null);
  const applyBtn = (document.getElementById('settings-apply') as HTMLElement | null);

  const pos = localStorage.getItem(DRAWER_POS_KEY) || 'bottom-right';
  const enableCpf = localStorage.getItem(ENABLE_CPF_KEY) !== 'false';
  const enableName = localStorage.getItem(ENABLE_NAME_KEY) !== 'false';
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  const panelInline = panelInlineStored === null ? false : panelInlineStored === 'true';

  if (select) (select as any).value = pos;
  if (cbCpf) (cbCpf as any).checked = !!enableCpf;
  if (cbName) (cbName as any).checked = !!enableName;
  const cbInline = (document.getElementById('settings-panel-inline') as HTMLElement | null);
  if (cbInline) (cbInline as any).checked = !!panelInline;

  applyBtn?.addEventListener('click', () => {
    const newPos = (select as HTMLSelectElement | null)?.value || 'bottom-right';
    // apply only (no save)
    const drawer = (document.getElementById('drawer') as HTMLElement | null);
    if (drawer) {
      drawer.classList.remove('position-top', 'position-bottom-right', 'position-side');
      if (newPos === 'top') drawer.classList.add('position-top');
      else if (newPos === 'side') drawer.classList.add('position-side');
      else drawer.classList.add('position-bottom-right');
    }
    setStatus('Posição aplicada (não salva)', false);
  });

  saveBtn?.addEventListener('click', () => {
    const newPos = (select as HTMLSelectElement | null)?.value || 'bottom-right';
    const newCpf = (cbCpf as HTMLInputElement | null)?.checked ? 'true' : 'false';
    const newName = (cbName as HTMLInputElement | null)?.checked ? 'true' : 'false';
    const newInline = (document.getElementById('settings-panel-inline') as HTMLInputElement | null)?.checked ? 'true' : 'false';
    localStorage.setItem(DRAWER_POS_KEY, newPos);
    localStorage.setItem(ENABLE_CPF_KEY, newCpf);
    localStorage.setItem(ENABLE_NAME_KEY, newName);
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
    setStatus('Preferências salvas. Atualizando...', false);
    setTimeout(() => window.location.reload(), 300);
  });
}

setup();
