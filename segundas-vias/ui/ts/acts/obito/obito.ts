// @ts-nocheck
import { mapperHtmlToJson } from './mapperHtmlToJson.js';
import { normalizeDate } from '../../shared/validators/date.js';
import { validateDateDetailed } from '../../shared/validators/date.js';
import { normalizeTime } from '../../shared/validators/time.js';
import { normalizeCpf, isValidCpf } from '../../shared/validators/cpf.js';
import { validateName } from '../../shared/validators/name.js';
import { getFieldState, applyFieldState } from '../../shared/ui/fieldState.js';
import { applyDateMask, applyTimeMask } from '../../shared/ui/mask.js';
import { collectInvalidFields } from '../../shared/ui/debug.js';
import { buildMatriculaBase30, calcDv2Digits, buildMatriculaFinal } from '../../shared/matricula/cnj.js';
import { setupPrimaryShortcut } from '../../shared/productivity/index.js';
import { setupAdminPanel } from '../../shared/ui/admin.js';
import { createNameValidator } from '../../nameValidator.js';
import { buildObitoPrintHtml } from './printTemplate.js';

const NAME_MODE_KEY = 'ui.nameValidationMode';
let nameValidationMode = localStorage.getItem(NAME_MODE_KEY) || 'input';
const DRAWER_POS_KEY = 'ui.drawerPosition';
const ENABLE_CPF_KEY = 'ui.enableCpfValidation';
const ENABLE_NAME_KEY = 'ui.enableNameValidation';
const PANEL_INLINE_KEY = 'ui.panelInline';

function applyDrawerPosition(pos) {
  const drawer = document.getElementById('drawer');
  if (!drawer) return;
  drawer.classList.remove('position-top', 'position-bottom-right', 'position-side');
  if (pos === 'top') drawer.classList.add('position-top');
  else if (pos === 'side') drawer.classList.add('position-side');
  else drawer.classList.add('position-bottom-right');
}

function setStatus(text, isError) {
  const el = document.getElementById('statusText');
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#dc2626' : '#64748b';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = 'Pronto';
    el.style.color = '#64748b';
  }, 2000);
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
  const children = Object.keys(obj).map((key) => toXml(obj[key], key, indent + 1)).join('\n');
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
  } catch {
    return false;
  }
}

function makeTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizeFilePart(value, fallback) {
  const clean = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || fallback;
}

function buildFileName(data, ext) {
  const nome = normalizeFilePart(data?.registro?.nome_completo, 'SEM_NOME');
  const cpfDigits = String(data?.registro?.cpf || '').replace(/\D/g, '');
  const cpfPart = cpfDigits ? cpfDigits : 'SEM_CPF';
  const stamp = makeTimestamp();
  return `OBITO_${nome}_${cpfPart}_${stamp}.${ext}`;
}

function generateJson() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const json = JSON.stringify(data, null, 2);
  const out = document.getElementById('json-output');
  if (out) out.value = json;
  const name = buildFileName(data, 'json');
  if (downloadFile(name, json, 'application/json')) setStatus(`JSON baixado: ${name}`);
  else setStatus('Falha ao gerar JSON', true);
}

function generateXml() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const xml = toXml(data, 'certidao_obito', 0);
  const out = document.getElementById('xml-output');
  if (out) out.value = xml;
  const name = buildFileName(data, 'xml');
  if (downloadFile(name, xml, 'application/xml')) setStatus(`XML baixado: ${name}`);
  else setStatus('Falha ao gerar XML', true);
}

function openPrintPreview() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const assinante = document.querySelector('select[name="idAssinante"] option:checked')?.textContent || '';
  const tituloLivro = document.querySelector('input[name="tituloLivro"]')?.value || '';
  const cidadeMatch = /COMARCA DE\s+(.+)$/i.exec(tituloLivro);
  const cidadeCartorio = (cidadeMatch ? cidadeMatch[1] : '') || document.querySelector('input[name="municipioObito"]')?.value || '';
  const ufCartorio = document.querySelector('select[name="ufMunicipioObito"]')?.value || '';
  const html = buildObitoPrintHtml(data, {
    assinante: assinante.trim(),
    cidadeCartorio: cidadeCartorio.trim(),
    ufCartorio
  });
  const out = document.getElementById('print-html');
  if (out) out.value = html;
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
  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

function setupConfigPanel() {
  const radios = document.querySelectorAll('input[name=\"name-validation-mode\"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === nameValidationMode;
  });
  document.getElementById('config-save')?.addEventListener('click', () => {
    const selected = document.querySelector('input[name=\"name-validation-mode\"]:checked');
    if (selected && selected.value) {
      nameValidationMode = selected.value;
      localStorage.setItem(NAME_MODE_KEY, nameValidationMode);
    }
  });
}

function setupSettingsPanel() {
  const select = document.getElementById('settings-drawer-position');
  const cbCpf = document.getElementById('settings-enable-cpf');
  const cbName = document.getElementById('settings-enable-name');
  const saveBtn = document.getElementById('settings-save');
  const applyBtn = document.getElementById('settings-apply');

  const pos = localStorage.getItem(DRAWER_POS_KEY) || 'bottom-right';
  const enableCpf = localStorage.getItem(ENABLE_CPF_KEY) !== 'false';
  const enableName = localStorage.getItem(ENABLE_NAME_KEY) !== 'false';
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  // default: floating drawer is primary (false)
  const panelInline = panelInlineStored === null ? false : panelInlineStored === 'true';

  if (select) select.value = pos;
  if (cbCpf) cbCpf.checked = !!enableCpf;
  if (cbName) cbName.checked = !!enableName;
  const cbInline = document.getElementById('settings-panel-inline');
  if (cbInline) cbInline.checked = !!panelInline;

  applyDrawerPosition(pos);

  saveBtn?.addEventListener('click', () => {
    const newPos = select?.value || 'bottom-right';
    const newCpf = cbCpf?.checked ? 'true' : 'false';
    const newName = cbName?.checked ? 'true' : 'false';
    const newInline = (document.getElementById('settings-panel-inline')?.checked) ? 'true' : 'false';
    localStorage.setItem(DRAWER_POS_KEY, newPos);
    localStorage.setItem(ENABLE_CPF_KEY, newCpf);
    localStorage.setItem(ENABLE_NAME_KEY, newName);
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
    applyDrawerPosition(newPos);
    // reload to rebind validators cleanly
    setStatus('Preferências salvas. Atualizando...', false);
    setTimeout(() => window.location.reload(), 300);
  });

  applyBtn?.addEventListener('click', () => {
    const newPos = select?.value || 'bottom-right';
    applyDrawerPosition(newPos);
    setStatus('Posição aplicada (não salva)', false);
  });
}

function ensureDrawer() {
  let drawer = document.getElementById('drawer');
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
  const btnConfig = makeTabBtn('Configuracoes','tab-config'); btnConfig.classList.add('active');
  const btnJson = makeTabBtn('JSON','tab-json');
  const btnXml = makeTabBtn('XML','tab-xml');
  const btnDebug = makeTabBtn('Debug','tab-debug');
  tabbar.appendChild(btnConfig); tabbar.appendChild(btnJson); tabbar.appendChild(btnXml); tabbar.appendChild(btnDebug);

  const paneConfig = document.createElement('div'); paneConfig.id = 'tab-config'; paneConfig.className = 'tab-pane active';
  const paneJson = document.createElement('div'); paneJson.id = 'tab-json'; paneJson.className = 'tab-pane';
  const paneXml = document.createElement('div'); paneXml.id = 'tab-xml'; paneXml.className = 'tab-pane';
  const paneDebug = document.createElement('div'); paneDebug.id = 'tab-debug'; paneDebug.className = 'tab-pane';

  body.appendChild(tabbar);
  body.appendChild(paneConfig);
  body.appendChild(paneJson);
  body.appendChild(paneXml);
  body.appendChild(paneDebug);

  // tab switching
  tabbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tab = btn.getAttribute('data-tab');
    tabbar.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    [paneConfig, paneJson, paneXml, paneDebug].forEach(p => p.classList.remove('active'));
    const target = body.querySelector(`#${tab}`);
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
  const inline = document.getElementById('panel-inline');
  if (!inline) return;
  const drawerPos = localStorage.getItem(DRAWER_POS_KEY) || 'bottom-right';
  const existingDrawer = document.getElementById('drawer');

  if (useInline) {
    // ensure content is inline
    if (existingDrawer) {
      const body = existingDrawer.querySelector('.drawer-body');
      if (body) {
        while (body.firstChild) inline.appendChild(body.firstChild);
      }
      existingDrawer.remove();
    }
    const toggle = document.getElementById('drawer-toggle');
    if (toggle) toggle.style.display = 'none';
  } else {
    // move inline content into drawer
    const drawer = ensureDrawer();
    applyDrawerPosition(drawerPos);
    const body = drawer.querySelector('.drawer-body');
    if (body) {
      // distribute inline children into appropriate tab panes inside drawer
      const paneConfig = body.querySelector('#tab-config');
      const paneJson = body.querySelector('#tab-json');
      const paneXml = body.querySelector('#tab-xml');
      const paneDebug = body.querySelector('#tab-debug');
      while (inline.firstChild) {
        const node = inline.firstChild;
        // inspect node for known outputs
        const hasJson = node.querySelector && node.querySelector('#json-output');
        const hasXml = node.querySelector && node.querySelector('#xml-output');
        const hasPrint = node.querySelector && node.querySelector('#print-html');
        const hasDebug = node.querySelector && (node.querySelector('#debug-invalid') || node.querySelector('#debug-alerts') || node.querySelector('#debug-matricula-base'));
        if (hasJson && paneJson) paneJson.appendChild(node);
        else if (hasXml && paneXml) paneXml.appendChild(node);
        else if (hasPrint && paneXml) paneXml.appendChild(node);
        else if (hasDebug && paneDebug) paneDebug.appendChild(node);
        else if (paneConfig) paneConfig.appendChild(node);
        else body.appendChild(node);
      }
    }
    const toggle = document.getElementById('drawer-toggle');
    if (toggle) toggle.style.display = 'inline-flex';
  }
}

function setupDrawerToggle() {
  const btn = document.getElementById('drawer-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const drawer = document.getElementById('drawer');
    if (!drawer) return;
    drawer.classList.toggle('open');
  });
}

function setupActSelect() {
  const select = document.getElementById('ato-select');
  if (!select) return;
  select.value = 'obito';
  select.addEventListener('change', () => {
    const map = {
      nascimento: './Nascimento2Via.html',
      casamento: './Casamento2Via.html',
      obito: './Obito2Via.html'
    };
    const next = map[select.value];
    if (next) window.location.href = next;
  });
}

function populateOrgaoAndUf() {
  // opções de órgãos (copiado do template HTML)
  const orgaos = [
    ['', ''],
    ['7','CONSELHO REGIONAL DE ADMINISTRACAO'],
    ['8','CONSELHO REGIONAL DE ASSISTENCIA SOCIAL'],
    ['9','CONSELHO REGIONAL DE BIBLIOTECONOMIA'],
    ['28','CONSELHO REGIONAL DE BIOLOGIA'],
    ['10','CONSELHO REGIONAL DE CONTABILIDADE'],
    ['11','CONSELHO REGIONAL DE CORRETORES IMOVEIS'],
    ['12','CONSELHO REGIONAL DE ECONOMIA'],
    ['13','CONSELHO REGIONAL DE ENFERMAGEM'],
    ['14','CONSELHO REGIONAL DE ENGENHARIA E ARQUITETURA'],
    ['15','CONSELHO REGIONAL DE ESTATISTICA'],
    ['16','CONSELHO REGIONAL DE FARMACIA'],
    ['17','CONSELHO REGIONAL DE FISIOTERAPIA E TERAPIA'],
    ['29','CONSELHO REGIONAL DE FONAUDIOLOGIA'],
    ['18','CONSELHO REGIONAL DE MEDICINA'],
    ['19','CONSELHO REGIONAL DE MEDICINA VETERINÁRIA'],
    ['21','CONSELHO REGIONAL DE NUTRICAO'],
    ['22','CONSELHO REGIONAL DE ODONTOLOGIA'],
    ['24','CONSELHO REGIONAL DE PSICOLOGIA'],
    ['25','CONSELHO REGIONAL DE QUIMICA'],
    ['23','CONSELHO REGIONAL DE RELACOES PUBLICAS'],
    ['30','CONSELHO REGIONAL DE SERVICO SOCIAL'],
    ['31','CONSELHO REGIONAL DE TECNICOS EM RADIOLOGIA'],
    ['26','CONSELHO REGIONAL DOS ESCRITORES'],
    ['34','CORPO DE BOMBEIROS'],
    ['32','DEPARTAMENTO ESTADUAL DE TRANSITO'],
    ['4','MINISTERIO DA AERONATICA'],
    ['3','MINISTERIO DA DEFESA'],
    ['5','MINISTERIO DA MARINHA'],
    ['1','NAO INFORMADO'],
    ['27','ORDEM DOS ADVOGADOS DO BRASIL'],
    ['20','ORDEM DOS MUSICOS DO BRASIL'],
    ['36','POLICIA CIVIL'],
    ['6','POLICIA FEDERAL'],
    ['33','POLICIA MILITAR'],
    ['38','SECRETARIA DE DEFESA SOCIAL'],
    ['37','SECRETARIA DE ESTADO DA DEFESA SOCIAL/AL'],
    ['2','SECRETARIA DE SEGURANCA PUBLICA'],
    ['35','SECRETARIA DO ESTADO DA CASA CIVIL']
  ];

  const orgIds = ['orgaoExpedidorRG','orgaoExpedidorPIS','orgaoExpedidorPassaporte','orgaoExpedidorCNS'];
  orgIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // limpamos possíveis opções duplicadas antes de popular
    el.innerHTML = '';
    orgaos.forEach(pair => {
      const o = document.createElement('option');
      o.value = pair[0];
      o.textContent = pair[1];
      el.appendChild(o);
    });
  });

  // popular ufTitulo
  const ufSelect = document.getElementById('ufTitulo');
  if (ufSelect) {
    ufSelect.innerHTML = '';
    const ufs = ['','AC','AL','AP','AM','BA','BR','CE','DF','ES','ET','GO','IG','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    ufs.forEach(u => {
      const o = document.createElement('option');
      o.value = u;
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
  const cns = document.querySelector('input[name=\"certidao.cartorio_cns\"]')?.value || '';
  const ano = yearFromDate(document.querySelector('input[name=\"dataTermo\"]')?.value || '');
  const livro = document.querySelector('input[name=\"livro\"]')?.value || '';
  const folha = document.querySelector('input[name=\"folha\"]')?.value || '';
  const termo = document.querySelector('input[name=\"termo\"]')?.value || '';
  const base = buildMatriculaBase30({
    cns6: cns,
    ano,
    tipoAto: '4',
    acervo: '01',
    servico: '55',
    livro,
    folha,
    termo
  });
  const dv = base ? calcDv2Digits(base) : '';
  const final = base && dv ? base + dv : buildMatriculaFinal({ cns6: cns, ano, tipoAto: '4', livro, folha, termo });

  const baseEl = document.getElementById('debug-matricula-base');
  if (baseEl) baseEl.value = base || '';
  const dvEl = document.getElementById('debug-matricula-dv');
  if (dvEl) dvEl.value = dv || '';
  const finalEl = document.getElementById('debug-matricula-final');
  if (finalEl) finalEl.value = final || '';

  const invalids = collectInvalidFields(document);
  const invalidEl = document.getElementById('debug-invalid');
  if (invalidEl) invalidEl.value = invalids.join('\n');

  const alertsEl = document.getElementById('debug-alerts');
  if (alertsEl) alertsEl.value = '';
}

function updateOutputs() {
  const data = mapperHtmlToJson(document);
  const jsonEl = document.getElementById('json-output');
  if (jsonEl) jsonEl.value = JSON.stringify(data, null, 2);
  const xmlEl = document.getElementById('xml-output');
  if (xmlEl) xmlEl.value = toXml(data, 'certidao_obito', 0);
  const printEl = document.getElementById('print-html');
  if (printEl) {
    const assinante = document.querySelector('select[name="idAssinante"] option:checked')?.textContent || '';
    const tituloLivro = document.querySelector('input[name="tituloLivro"]')?.value || '';
    const cidadeMatch = /COMARCA DE\s+(.+)$/i.exec(tituloLivro);
    const cidadeCartorio = (cidadeMatch ? cidadeMatch[1] : '') || document.querySelector('input[name="municipioObito"]')?.value || '';
    const ufCartorio = document.querySelector('select[name="ufMunicipioObito"]')?.value || '';
    printEl.value = buildObitoPrintHtml(data, {
      assinante: assinante.trim(),
      cidadeCartorio: cidadeCartorio.trim(),
      ufCartorio
    });
  }
  updateDebug(data);
}

function setupLiveOutputs() {
  const form = document.getElementById('form-obito');
  const handler = () => updateOutputs();
  form?.addEventListener('input', handler);
  form?.addEventListener('change', handler);
  updateOutputs();
}

function setupTogglePanels() {
  document.querySelectorAll('[data-toggle]').forEach((toggle) => {
    const key = toggle.getAttribute('data-toggle');
    const panel = document.querySelector(`[data-toggle-panel="${key}"]`);
    if (!panel) return;
    toggle.addEventListener('click', () => {
      const isHidden = panel.style.display === 'none' || !panel.style.display;
      panel.style.display = isHidden ? 'block' : 'none';
    });
  });
}

function resolveField(input) {
  return input.closest('td') || input.closest('.campo') || input.closest('.field') || input.parentElement;
}

function setFieldHint(field, message) {
  if (!field) return;
  let hint = field.querySelector('.hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'hint';
    field.appendChild(hint);
  }
  // build content with an icon and message
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
    // update aria-live region for screen-readers
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
  } else {
    hint.innerHTML = '';
    hint.classList.remove('visible');
  }
}

function clearFieldHint(field) { setFieldHint(field, ''); }

function setupFocusEmphasis() {
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) {
      try { el.scrollIntoView({behavior:'smooth', block:'center'}); } catch {}
      el.classList.add('focus-emphasis');
    }
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) el.classList.remove('focus-emphasis');
  });
}

function applyState(input, field, state) {
  applyFieldState(field, state);
  if (input) input.classList.toggle('invalid', state === 'empty' || state === 'invalid');
}

function setupValidation() {
  document.querySelectorAll('input[data-date]').forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute('data-required');
    const onInput = () => {
      applyDateMask(input);
      // clear hints while typing
      clearFieldHint(field);
      const normalized = normalizeDate(input.value);
      const isValid = !input.value || !!normalized;
      const state = getFieldState({ required, value: input.value, isValid });
      applyState(input, field, state);
    };

    const onBlur = () => {
      applyDateMask(input);
      const raw = input.value || '';
      const res = validateDateDetailed(raw);
      const isValid = res.ok;
      const state = getFieldState({ required, value: raw, isValid });
      applyState(input, field, state);
      if (!isValid && raw) {
        setFieldHint(field, res.message || 'Data inválida');
      } else {
        clearFieldHint(field);
      }
    };

    input.addEventListener('input', onInput);
    input.addEventListener('blur', onBlur);
    // apply initial mask only (do not mark field invalid on load)
    applyDateMask(input);
  });

  document.querySelectorAll('input[data-time]').forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute('data-required');
    const handler = () => {
      applyTimeMask(input);
      const normalized = normalizeTime(input.value);
      const isValid = !input.value || !!normalized;
      const state = getFieldState({ required, value: input.value, isValid });
      applyState(input, field, state);
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
    // apply initial mask only (do not mark field invalid on load)
    applyTimeMask(input);
  });

  const enableNameValidation = localStorage.getItem(ENABLE_NAME_KEY) !== 'false';
  if (enableNameValidation) {
    document.querySelectorAll('[data-name-validate]').forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute('data-required');
    const handler = () => {
      const res = validateName(input.value, { minWords: 2 });
      const state = getFieldState({
        required,
        value: input.value,
        isValid: !res.invalid,
        warn: res.warn
      });
      applyState(input, field, state);
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
    // format CPF visually but don't validate on load
    input.value = formatCpfInput(input.value);
    });
  }

  const enableCpfValidation = localStorage.getItem(ENABLE_CPF_KEY) !== 'false';
  if (enableCpfValidation) {
    document.querySelectorAll('input[data-cpf]').forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute('data-required');
    const handler = () => {
      input.value = formatCpfInput(input.value);
      const digits = normalizeCpf(input.value);
      const isValid = !digits || isValidCpf(digits);
      const state = getFieldState({ required, value: digits ? input.value : '', isValid });
      applyState(input, field, state);
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', () => {
      handler();
      const digits = normalizeCpf(input.value);
      if (input.value && (!digits || !isValidCpf(digits))) setFieldHint(field, 'CPF inválido');
      else clearFieldHint(field);
    });
    handler();
    });
  }

  // helper to prevent actions when there are invalid fields
  function canProceed() {
    const invalids = collectInvalidFields(document);
    if (!invalids || invalids.length === 0) return true;
    setStatus(`${invalids.length} campo(s) inválido(s). Corrija antes de prosseguir.`, true);
    showToast('Existem campos inválidos — corrija antes de prosseguir');
    // also populate debug area if present
    const invalidEl = document.getElementById('debug-invalid');
    if (invalidEl) invalidEl.value = invalids.join('\n');
    return false;
  }

  function updateActionButtons() {
    const invalids = collectInvalidFields(document);
    const disabled = !!(invalids && invalids.length > 0);
    const btnJson = document.getElementById('btn-json'); if (btnJson) btnJson.disabled = disabled;
    const btnXml = document.getElementById('btn-xml'); if (btnXml) btnXml.disabled = disabled;
    const btnPrint = document.getElementById('btn-print'); if (btnPrint) btnPrint.disabled = disabled;
    const statusEl = document.getElementById('statusText'); if (statusEl && !disabled) statusEl.textContent = 'Pronto';

    // show inline summary near top of form
    let summary = document.getElementById('form-error-summary');
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
      const container = document.querySelector('.container');
      if (container) container.appendChild(summary);
    }
    if (disabled) {
      summary.textContent = `Campos inválidos: ${invalids.join(', ')}`;
      summary.style.display = 'block';
    } else if (summary) {
      summary.style.display = 'none';
    }
    // keep an aria-live region in sync for assistive tech
    let aria = document.getElementById('aria-live-errors');
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

  document.querySelectorAll('select[data-required], textarea[data-required], input[data-required]').forEach((input) => {
    if (input.hasAttribute('data-date') || input.hasAttribute('data-time') || input.hasAttribute('data-cpf') || input.hasAttribute('data-name-validate')) return;
    const field = resolveField(input);
    const required = input.hasAttribute('data-required');
    const handler = () => {
      const state = getFieldState({ required, value: input.value, isValid: true });
      applyState(input, field, state);
    };
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
    // do not run required-field handler on load to avoid marking all fields red
  });
}

function setupNameValidation() {
  const validator = createNameValidator();
  const fields = document.querySelectorAll('[data-name-validate]');
  const timers = new Map();

  fields.forEach((input) => {
    const field = resolveField(input);
    if (field) field.classList.add('name-field');
    let hint = field ? field.querySelector('.name-suggest') : null;
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
        const value = input.value;
        if (!value) return;
        validator.repo.addException(value);
        input.classList.remove('invalid');
        if (field) field.classList.remove('name-suspect');
        const t = timers.get(input);
        if (t) clearInterval(t);
        timers.delete(input);
      });
    }

    const runCheck = () => {
      const value = input.value || '';
      const result = validator.check(value);
      const suspect = !!result.suspicious;
      input.classList.toggle('invalid', suspect);
      if (field) field.classList.toggle('name-suspect', suspect);
      if (suspect) {
        showToast('Nome possivelmente incorreto');
        if (!timers.has(input)) {
          const id = setInterval(() => {
            if (input.classList.contains('invalid')) showToast('Nome possivelmente incorreto');
          }, 180000);
          timers.set(input, id);
        }
      } else {
        const t = timers.get(input);
        if (t) clearInterval(t);
        timers.delete(input);
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
      const field = resolveField(input);
      if (field) field.classList.remove('name-suspect');
      const value = input.value || '';
      if (value) {
        const result = validator.check(value);
        const suspect = !!result.suspicious;
        input.classList.toggle('invalid', suspect);
        if (field) field.classList.toggle('name-suspect', suspect);
      }
    });
  });
}

function setup() {
  document.getElementById('btn-json')?.addEventListener('click', (e) => {
    e.preventDefault();
    generateJson();
  });
  document.getElementById('btn-xml')?.addEventListener('click', (e) => {
    e.preventDefault();
    generateXml();
  });
  document.getElementById('btn-print')?.addEventListener('click', (e) => {
    e.preventDefault();
    openPrintPreview();
  });
  setupValidation();
  // popular selects dependentes (órgãos, UF título)
  populateOrgaoAndUf();
  setupNameValidation();
  setupConfigPanel();
  setupAdminPanel();
  // drawer removed for inline layout; no setupDrawer call
  // apply persisted drawer position and wire settings
  applyDrawerPosition(localStorage.getItem(DRAWER_POS_KEY) || 'bottom-right');
  setupSettingsPanel();
  // arrange panel according to saved preference (inline vs floating)
  arrangePanel();
  setupDrawerToggle();
  setupActSelect();
  setupPrimaryShortcut(() => document.getElementById('btn-json') || document.getElementById('btn-xml'));
  setupTogglePanels();
  setupLiveOutputs();
  setupFocusEmphasis();
  // ensure action buttons reflect current validity
  updateActionButtons();
  document.getElementById('form-obito')?.addEventListener('input', updateActionButtons);
  document.getElementById('form-obito')?.addEventListener('change', updateActionButtons);
}

setup();
