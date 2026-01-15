// @ts-nocheck
'use strict';

declare global {
  interface Window {
    api?: any;
  }
}

type Certidao = {
  plataformaId: string;
  tipo_registro: string;
  tipo_certidao: string;
  transcricao: boolean;
  cartorio_cns: string;
  selo: string;
  cod_selo: string;
  modalidade: string;
  cota_emolumentos: string;
  cota_emolumentos_isento: boolean;
};

type Registro = {
  nome_completo: string;
  cpf_sem_inscricao: boolean;
  cpf: string;
  matricula: string;
  data_registro: string;
  data_nascimento_ignorada: boolean;
  data_nascimento: string;
  hora_nascimento_ignorada: boolean;
  hora_nascimento: string;
  municipio_naturalidade: string;
  uf_naturalidade: string;
  local_nascimento: string;
  municipio_nascimento: string;
  uf_nascimento: string;
  sexo: string;
  sexo_outros: string;
  gemeos: { quantidade: string };
  numero_dnv: string;
  averbacao_anotacao: string;
};

type UiState = {
  gemeos_irmao_raw: string;
  anotacoes_raw: string;
  cartorio_oficio: string;
  casamento_tipo: string;
  matricula_livro: string;
  matricula_folha: string;
  matricula_termo: string;
  mae_nome: string;
  mae_uf: string;
  mae_cidade: string;
  mae_avo_materna: string;
  mae_avo_materno: string;
  pai_nome: string;
  pai_uf: string;
  pai_cidade: string;
  pai_avo_paterna: string;
  pai_avo_paterno: string;
};

type AppState = {
  certidao: Certidao;
  registro: Registro;
  ui: UiState;
};

const state: AppState = {
  certidao: {
    plataformaId: 'certidao-eletronica',
    tipo_registro: 'nascimento',
    tipo_certidao: 'Breve relato',
    transcricao: false,
    cartorio_cns: '163659',
    selo: '',
    cod_selo: '',
    modalidade: 'eletronica',
    cota_emolumentos: '',
    cota_emolumentos_isento: false
  },
  registro: {
    nome_completo: '',
    cpf_sem_inscricao: false,
    cpf: '',
    matricula: '',
    data_registro: '',
    data_nascimento_ignorada: false,
    data_nascimento: '',
    hora_nascimento_ignorada: false,
    hora_nascimento: '',
    municipio_naturalidade: '',
    uf_naturalidade: '',
    local_nascimento: '',
    municipio_nascimento: '',
    uf_nascimento: '',
    sexo: '',
    sexo_outros: '',
    gemeos: { quantidade: '' },
    numero_dnv: '',
    averbacao_anotacao: ''
  },
  ui: {
    gemeos_irmao_raw: '',
    anotacoes_raw: '',
    cartorio_oficio: '',
    casamento_tipo: '',
    matricula_livro: '',
    matricula_folha: '',
    matricula_termo: '',
    mae_nome: '',
    mae_uf: '',
    mae_cidade: '',
    mae_avo_materna: '',
    mae_avo_materno: '',
    pai_nome: '',
    pai_uf: '',
    pai_cidade: '',
    pai_avo_paterna: '',
    pai_avo_paterno: ''
  }
};

let lastSavedSnapshot = '';
let lastSavedId = '';
let isDirty = true;
let currentDirs = { jsonDir: '', xmlDir: '' };

function setStatus(text: string, isError?: boolean) {
  const el = document.getElementById('statusText');
  if (!el) return;
  el.textContent = text;
  (el as HTMLElement).style.color = isError ? '#dc2626' : '#64748b';
  const anyEl = el as any;
  clearTimeout(anyEl._timer);
  anyEl._timer = setTimeout(() => {
    el.textContent = 'Pronto';
    (el as HTMLElement).style.color = '#64748b';
  }, 2000);
}

function setByPath(obj: any, path: string, value: any) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] === undefined) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function getByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, p) => (acc ? acc[p] : undefined), obj as any);
}

function syncInputsFromState() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = (el as HTMLElement).getAttribute('data-bind') || '';
    const val = getByPath(state, path);
    const input = el as HTMLInputElement;
    if (input.type === 'checkbox') input.checked = !!val;
    else input.value = val !== undefined && val !== null ? String(val) : '';
  });
  updateTipoButtons();
  updateSexoOutros();
  updateIgnoreFields();
  updateCpfState();
  updateMatricula();
}

function bindInputs() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = (el as HTMLElement).getAttribute('data-bind') || '';
    const handler = () => {
      const input = el as HTMLInputElement;
      const val = input.type === 'checkbox' ? input.checked : input.value;
      setByPath(state, path, val);
      if (path === 'registro.sexo') updateSexoOutros();
      if (path === 'registro.data_nascimento_ignorada' || path === 'registro.hora_nascimento_ignorada') {
        updateIgnoreFields();
      }
      if (path === 'registro.cpf') updateCpfState();
      if (path === 'registro.cpf_sem_inscricao') updateCpfFromToggle();
      if (path === 'ui.cartorio_oficio') applyCartorioChange();
      if (path === 'registro.data_registro') updateMatricula();
      if (path === 'ui.casamento_tipo' || path === 'ui.matricula_livro' || path === 'ui.matricula_folha' || path === 'ui.matricula_termo') {
        updateMatricula();
      }
      updateDirty();
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });
}

function updateTipoButtons() {
  const tipo = state.certidao.tipo_registro || 'nascimento';
  const btnN = document.getElementById('btn-nascimento');
  const btnC = document.getElementById('btn-casamento');
  const btnO = document.getElementById('btn-obito');
  if (btnN) btnN.classList.toggle('active', tipo === 'nascimento');
  if (btnC) btnC.classList.toggle('active', tipo === 'casamento');
  if (btnO) btnO.classList.toggle('active', tipo === 'obito');
  const input = document.querySelector('[data-bind=\"certidao.tipo_registro\"]') as HTMLInputElement | null;
  if (input) input.value = tipo;
  const casamentoWrap = document.getElementById('casamento-tipo-wrap');
  if (casamentoWrap) casamentoWrap.style.display = tipo === 'casamento' ? 'flex' : 'none';
}

function setTipoRegistro(tipo: string) {
  state.certidao.tipo_registro = tipo;
  updateTipoButtons();
  updateMatricula();
  updateDirty();
}

function updateSexoOutros() {
  const sexo = state.registro.sexo;
  const wrap = document.getElementById('sexo-outros-wrap');
  const input = document.getElementById('sexo-outros') as HTMLInputElement | null;
  if (!wrap || !input) return;
  const enabled = sexo === 'outros';
  wrap.style.display = enabled ? 'flex' : 'none';
  if (!enabled) {
    input.value = '';
    state.registro.sexo_outros = '';
  }
}

function updateIgnoreFields() {
  const dnIgn = !!state.registro.data_nascimento_ignorada;
  const hnIgn = !!state.registro.hora_nascimento_ignorada;
  const dn = document.getElementById('dn') as HTMLInputElement | null;
  const hn = document.getElementById('hn') as HTMLInputElement | null;
  if (dn) {
    dn.disabled = dnIgn;
    if (dnIgn) {
      dn.value = '';
      state.registro.data_nascimento = '';
    }
  }
  if (hn) {
    hn.disabled = hnIgn;
    if (hnIgn) {
      hn.value = '';
      state.registro.hora_nascimento = '';
    }
  }
}

function updateCpfState() {
  const cpfRaw = (state.registro.cpf || '').trim();
  const cpfSem = cpfRaw.length === 0;
  state.registro.cpf_sem_inscricao = cpfSem;
  const cpfSemEl = document.getElementById('cpf-sem') as HTMLInputElement | null;
  if (cpfSemEl) cpfSemEl.checked = cpfSem;
}

function updateCpfFromToggle() {
  const cpfSem = !!state.registro.cpf_sem_inscricao;
  const cpfEl = document.getElementById('cpf') as HTMLInputElement | null;
  if (cpfSem && cpfEl) {
    cpfEl.value = '';
    state.registro.cpf = '';
  }
}

const CNS_CARTORIOS: Record<string, string> = {
  '6': '110742',
  '9': '163659',
  '12': '110064',
  '13': '109736',
  '14': '110635',
  '15': '110072'
};

function dvMatricula(base30: string) {
  let s1 = 0;
  for (let i = 0; i < 30; i++) s1 += Number(base30[i]) * (31 - i);
  let d1 = 11 - (s1 % 11);
  d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;

  const seq31 = base30 + String(d1);
  let s2 = 0;
  for (let i = 0; i < 31; i++) s2 += Number(seq31[i]) * (32 - i);
  let d2 = 11 - (s2 % 11);
  d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;
  return `${d1}${d2}`;
}

function digitsOnly(value: string) {
  return (value || '').replace(/\D/g, '');
}

function padDigits(value: string, size: number) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return digits.padStart(size, '0').slice(-size);
}

function yearFromDate(value: string) {
  const match = (value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] : '';
}

function tipoDigit() {
  const registro = state.certidao.tipo_registro || '';
  if (registro === 'nascimento') return '1';
  if (registro === 'casamento') {
    const selected = digitsOnly(state.ui.casamento_tipo || '').slice(0, 1);
    return selected || '';
  }
  return '';
}

function buildMatricula() {
  const cns = digitsOnly(state.certidao.cartorio_cns || '');
  const ano = yearFromDate(state.registro.data_registro || '');
  const tipo = tipoDigit();
  const livro = padDigits(state.ui.matricula_livro || '', 5);
  const folha = padDigits(state.ui.matricula_folha || '', 3);
  const termo = padDigits(state.ui.matricula_termo || '', 7);

  if (cns.length !== 6 || !ano || !tipo || !livro || !folha || !termo) return '';
  const base30 = `${cns}01` + `55${ano}${tipo}${livro}${folha}${termo}`;
  if (base30.length !== 30) return '';
  const dv = dvMatricula(base30);
  return base30 + dv;
}

function setMatriculaValue(value: string) {
  state.registro.matricula = value || '';
  const matEl = document.getElementById('matricula') as HTMLInputElement | null;
  if (matEl) matEl.value = value || '';
}

function updateMatricula() {
  const value = buildMatricula();
  setMatriculaValue(value);
}

function applyCartorioChange() {
  const oficio = state.ui.cartorio_oficio || '';
  const cns = CNS_CARTORIOS[oficio] || '';
  state.certidao.cartorio_cns = cns;
  const cnsInput = document.querySelector('[data-bind="certidao.cartorio_cns"]') as HTMLInputElement | null;
  if (cnsInput) cnsInput.value = cns;
  updateMatricula();
}

function trimValue(value: any) {
  return String(value || '').trim();
}

function parseLines(raw: string, mapper: (line: string) => any) {
  if (!raw) return [];
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(mapper);
}

function parseIrmaos(raw: string) {
  return parseLines(raw, (line) => {
    const parts = line.split('|');
    return {
      nome: trimValue(parts[0]),
      matricula: trimValue(parts[1])
    };
  });
}

function parseAnotacoes(raw: string) {
  return parseLines(raw, (line) => {
    const parts = line.split('|');
    return {
      tipo: trimValue(parts[0]),
      documento: trimValue(parts[1]),
      orgao_emissor: trimValue(parts[2]),
      uf_emissao: trimValue(parts[3]),
      data_emissao: trimValue(parts[4])
    };
  });
}

function buildFiliacaoItem(nome: string, cidade: string, uf: string, avo1: string, avo2: string) {
  const n = trimValue(nome);
  const c = trimValue(cidade);
  const u = trimValue(uf);
  const a1 = trimValue(avo1);
  const a2 = trimValue(avo2);
  if (!n && !c && !u && !a1 && !a2) return null;
  const avos = [a1, a2].filter(Boolean).join('; ');
  return {
    nome: n,
    municipio_nascimento: c,
    uf_nascimento: u,
    avos
  };
}

function normalizeData() {
  const cert = state.certidao;
  const reg = state.registro;
  const cpfRaw = trimValue(reg.cpf);
  const cpfDigits = cpfRaw.replace(/\D/g, '');
  const cpfExists = cpfDigits.length > 0;
  const cpfSem = !!reg.cpf_sem_inscricao || !cpfExists;
  const dataIgn = !!reg.data_nascimento_ignorada;
  const horaIgn = !!reg.hora_nascimento_ignorada;

  const certidao = {
    plataformaId: trimValue(cert.plataformaId),
    tipo_registro: trimValue(cert.tipo_registro),
    tipo_certidao: trimValue(cert.tipo_certidao),
    transcricao: !!cert.transcricao,
    cartorio_cns: trimValue(cert.cartorio_cns),
    selo: trimValue(cert.selo),
    cod_selo: trimValue(cert.cod_selo),
    modalidade: trimValue(cert.modalidade),
    cota_emolumentos: trimValue(cert.cota_emolumentos),
    cota_emolumentos_isento: !!cert.cota_emolumentos_isento
  };

  const filiacao: any[] = [];
  const mae = buildFiliacaoItem(state.ui.mae_nome, state.ui.mae_cidade, state.ui.mae_uf, state.ui.mae_avo_materna, state.ui.mae_avo_materno);
  if (mae) filiacao.push(mae);
  const pai = buildFiliacaoItem(state.ui.pai_nome, state.ui.pai_cidade, state.ui.pai_uf, state.ui.pai_avo_paterna, state.ui.pai_avo_paterno);
  if (pai) filiacao.push(pai);

  const registro: any = {
    nome_completo: trimValue(reg.nome_completo),
    cpf_sem_inscricao: cpfSem,
    cpf: cpfExists ? cpfRaw : '',
    matricula: trimValue(reg.matricula),
    data_registro: trimValue(reg.data_registro),
    data_nascimento_ignorada: dataIgn,
    data_nascimento: dataIgn ? '' : trimValue(reg.data_nascimento),
    hora_nascimento_ignorada: horaIgn,
    hora_nascimento: horaIgn ? '' : trimValue(reg.hora_nascimento),
    municipio_naturalidade: trimValue(reg.municipio_naturalidade),
    uf_naturalidade: trimValue(reg.uf_naturalidade),
    local_nascimento: trimValue(reg.local_nascimento),
    municipio_nascimento: trimValue(reg.municipio_nascimento),
    uf_nascimento: trimValue(reg.uf_nascimento),
    sexo: trimValue(reg.sexo),
    gemeos: {
      quantidade: trimValue(reg.gemeos.quantidade),
      irmao: parseIrmaos(state.ui.gemeos_irmao_raw)
    },
    filiacao,
    numero_dnv: trimValue(reg.numero_dnv),
    averbacao_anotacao: trimValue(reg.averbacao_anotacao),
    anotacoes_cadastro: parseAnotacoes(state.ui.anotacoes_raw)
  };

  if (registro.sexo === 'outros') {
    registro.sexo_outros = trimValue(reg.sexo_outros);
  }

  return { certidao, registro };
}

function computeSnapshot() {
  return JSON.stringify(normalizeData());
}

function setDirty(flag: boolean) {
  isDirty = !!flag;
  const btn = document.getElementById('btn-save');
  if (!btn) return;
  if (isDirty) btn.classList.add('dirty');
  else btn.classList.remove('dirty');
}

function updateDirty() {
  const snap = computeSnapshot();
  setDirty(snap !== lastSavedSnapshot);
}

function clearInvalid() {
  document.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
}

function markInvalid(path: string) {
  const el = document.querySelector(`[data-bind="${path}"]`) as HTMLElement | null;
  if (el) el.classList.add('invalid');
}

function isValidDate(value: string) {
  if (!value) return true;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function isValidTime(value: string) {
  if (!value) return true;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function validateData(data: any) {
  clearInvalid();
  let ok = true;
  if (!data.registro.nome_completo) { markInvalid('registro.nome_completo'); ok = false; }
  if (!data.registro.sexo) { markInvalid('registro.sexo'); ok = false; }
  if (!data.registro.uf_nascimento) { markInvalid('registro.uf_nascimento'); ok = false; }
  if (!data.registro.local_nascimento) { markInvalid('registro.local_nascimento'); ok = false; }
  if (!data.registro.municipio_nascimento) { markInvalid('registro.municipio_nascimento'); ok = false; }
  if (!data.certidao.modalidade) { markInvalid('certidao.modalidade'); ok = false; }
  if (data.registro.sexo === 'outros' && !data.registro.sexo_outros) {
    markInvalid('registro.sexo_outros');
    ok = false;
  }
  if (!isValidDate(data.registro.data_registro)) { markInvalid('registro.data_registro'); ok = false; }
  if (!isValidDate(data.registro.data_nascimento)) { markInvalid('registro.data_nascimento'); ok = false; }
  if (!isValidTime(data.registro.hora_nascimento)) { markInvalid('registro.hora_nascimento'); ok = false; }
  if (!ok) setStatus('Campos obrigatorios pendentes', true);
  return ok;
}

function stripAccents(value: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeFilePart(value: string, fallback: string) {
  const clean = stripAccents(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return clean || fallback;
}

function makeTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function buildFileName(data: any, ext: string) {
  const tipo = normalizeFilePart(data.certidao.tipo_registro || 'nascimento', 'NASCIMENTO');
  const nome = normalizeFilePart(data.registro.nome_completo, 'SEM_NOME');
  const cpfDigits = (data.registro.cpf || '').replace(/\D/g, '');
  const cpfPart = cpfDigits ? cpfDigits : 'SEM_CPF';
  const stamp = makeTimestamp();
  return `${tipo}_${nome}_${cpfPart}_${stamp}.${ext}`;
}

function escapeXml(str: string) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toXml(obj: any, nodeName: string, indent?: number) {
  const pad = '  '.repeat(indent || 0);
  if (obj === null || obj === undefined) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== 'object') return `${pad}<${nodeName}>${escapeXml(obj)}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => toXml(item, nodeName, indent)).join('\n');
  const children = Object.keys(obj).map((key) => toXml(obj[key], key, (indent || 0) + 1)).join('\n');
  return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}

async function saveDraft() {
  const data = normalizeData();
  if (!validateData(data)) return;
  try {
    if (window.api && window.api.dbSaveDraft) {
      const res = await window.api.dbSaveDraft({
        id: lastSavedId || null,
        data,
        sourceFormat: 'manual',
        kind: data.certidao.tipo_registro || 'nascimento'
      });
      if (res && res.id) lastSavedId = res.id;
    } else {
      localStorage.setItem('draft_certidao', JSON.stringify(data));
    }
    lastSavedSnapshot = computeSnapshot();
    setDirty(false);
    setStatus('Salvo');
  } catch (err) {
    setStatus('Falha ao salvar', true);
  }
}

async function generateFile(format: string) {
  const data = normalizeData();
  if (!validateData(data)) return;
  const ext = format === 'xml' ? 'xml' : 'json';
  const name = buildFileName(data, ext);
  let content = '';
  if (format === 'xml') {
    const root = `certidao_${data.certidao.tipo_registro || 'registro'}`;
    content = toXml(data, root, 0);
  } else {
    content = JSON.stringify(data, null, 2);
  }
  try {
    if (format === 'xml' && window.api && window.api.saveXml) {
      const path = await window.api.saveXml({ name, content });
      setStatus(`XML salvo: ${path || name}`);
    } else if (format === 'json' && window.api && window.api.saveJson) {
      const path = await window.api.saveJson({ name, content });
      setStatus(`JSON salvo: ${path || name}`);
    } else {
      setStatus('API indisponivel', true);
    }
  } catch (err) {
    setStatus('Falha ao gerar arquivo', true);
  }
}

function updateBadge() {
  const badge = document.getElementById('outputDirBadge');
  if (!badge) return;
  const json = currentDirs.jsonDir || '...';
  const xml = currentDirs.xmlDir || '...';
  badge.textContent = `JSON: ${json} | XML: ${xml}`;
}

async function refreshConfig() {
  if (!window.api || !window.api.getConfig) return;
  try {
    const cfg = await window.api.getConfig();
    currentDirs = { jsonDir: cfg.jsonDir || '', xmlDir: cfg.xmlDir || '' };
    updateBadge();
    const jsonEl = document.getElementById('json-dir') as HTMLInputElement | null;
    const xmlEl = document.getElementById('xml-dir') as HTMLInputElement | null;
    if (jsonEl) jsonEl.value = currentDirs.jsonDir;
    if (xmlEl) xmlEl.value = currentDirs.xmlDir;
  } catch (err) {
    setStatus('Falha ao ler config', true);
  }
}

function setupConfigModal() {
  const modal = document.getElementById('config-modal') as HTMLElement;
  const open = async () => {
    await refreshConfig();
    modal.classList.remove('hidden');
  };
  const close = () => modal.classList.add('hidden');

  document.getElementById('btn-config')?.addEventListener('click', open);
  document.getElementById('config-close')?.addEventListener('click', close);
  document.getElementById('config-save')?.addEventListener('click', () => {
    updateBadge();
    close();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  const tabs = Array.from(document.querySelectorAll('.tab-btn')) as HTMLElement[];
  const panes = Array.from(document.querySelectorAll('.tab-pane')) as HTMLElement[];
  const activateTab = (id: string) => {
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === id));
    panes.forEach(pane => pane.classList.toggle('active', pane.id === id));
  };
  tabs.forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab || 'tab-pastas')));

  document.getElementById('pick-json')?.addEventListener('click', async () => {
    if (!window.api || !window.api.pickJsonDir) return;
    const dir = await window.api.pickJsonDir();
    const jsonEl = document.getElementById('json-dir') as HTMLInputElement | null;
    if (jsonEl) jsonEl.value = dir;
    currentDirs.jsonDir = dir;
    updateBadge();
  });
  document.getElementById('pick-xml')?.addEventListener('click', async () => {
    if (!window.api || !window.api.pickXmlDir) return;
    const dir = await window.api.pickXmlDir();
    const xmlEl = document.getElementById('xml-dir') as HTMLInputElement | null;
    if (xmlEl) xmlEl.value = dir;
    currentDirs.xmlDir = dir;
    updateBadge();
  });
}

function setupActions() {
  document.getElementById('btn-save')?.addEventListener('click', saveDraft);
  document.getElementById('btn-json')?.addEventListener('click', () => generateFile('json'));
  document.getElementById('btn-xml')?.addEventListener('click', () => generateFile('xml'));
  document.getElementById('btn-nascimento')?.addEventListener('click', () => setTipoRegistro('nascimento'));
  document.getElementById('btn-casamento')?.addEventListener('click', () => setTipoRegistro('casamento'));
  document.getElementById('btn-obito')?.addEventListener('click', () => setTipoRegistro('obito'));
}

const cacheKey = 'cache_local_nasc_v1';
function getCache() { try { return JSON.parse(localStorage.getItem(cacheKey) || '') || {}; } catch { return {}; } }
function setCache(obj: any) { localStorage.setItem(cacheKey, JSON.stringify(obj)); }

function applyCache(key: string) {
  const cache = getCache();
  const k = (key || '').trim().toUpperCase();
  if (!k || !cache[k]) return false;
  const entry = cache[k];
  const map: Array<[string, string]> = [
    ['registro.municipio_naturalidade', entry.naturalidade],
    ['registro.municipio_nascimento', entry.cidade],
    ['registro.uf_nascimento', entry.uf],
    ['registro.local_nascimento', entry.local]
  ];
  map.forEach(([path, value]) => {
    const el = document.querySelector(`[data-bind="${path}"]`) as HTMLInputElement | null;
    if (!el) return;
    if (!el.value.trim()) {
      el.value = value || '';
      setByPath(state, path, el.value);
    }
  });
  syncInputsFromState();
  updateDirty();
  return true;
}

function setupCache() {
  document.getElementById('cache-save')?.addEventListener('click', () => {
    const desc = (document.getElementById('cache-desc') as HTMLInputElement | null)?.value.trim() || '';
    if (!desc) return;
    const cache = getCache();
    cache[desc.toUpperCase()] = {
      naturalidade: (document.getElementById('cache-nat') as HTMLInputElement | null)?.value || '',
      cidade: (document.getElementById('cache-cidade') as HTMLInputElement | null)?.value || '',
      uf: (document.getElementById('cache-uf') as HTMLInputElement | null)?.value || '',
      local: (document.getElementById('cache-local') as HTMLInputElement | null)?.value || ''
    };
    setCache(cache);
    setStatus('Padrao salvo');
  });
  document.getElementById('cache-apply')?.addEventListener('click', () => {
    const desc = (document.getElementById('cache-desc') as HTMLInputElement | null)?.value || '';
    if (applyCache(desc)) setStatus('Padrao aplicado');
  });
}

function setupLocalAutofill() {
  const localEl = document.querySelector('[data-bind="registro.local_nascimento"]') as HTMLInputElement | null;
  const cityEl = document.querySelector('[data-bind="registro.municipio_nascimento"]') as HTMLInputElement | null;
  const ufEl = document.querySelector('[data-bind="registro.uf_nascimento"]') as HTMLSelectElement | null;
  if (!localEl || !cityEl || !ufEl) return;
  const reCidadeUf = /,\s*([\p{L}\s.'-]+)\/([A-Z]{2})\s*$/u;
  localEl.addEventListener('blur', () => {
    const text = localEl.value.trim();
    if (!text) return;
    const match = text.match(reCidadeUf);
    if (!match) return;
    const cidade = match[1].trim();
    const uf = match[2].trim();
    if (!cityEl.value.trim()) {
      cityEl.value = cidade;
      state.registro.municipio_nascimento = cidade;
    }
    if (!ufEl.value.trim()) {
      ufEl.value = uf;
      state.registro.uf_nascimento = uf;
    }
    updateDirty();
  });
}

function setupShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      saveDraft();
    }
  });
}

// --- Máscaras simples de data e hora (só números) ---
function digitsOnly(v: string) { return (v || '').replace(/\D/g, ''); }

function maskDate(el: HTMLInputElement) {
  const d = digitsOnly(el.value).slice(0, 8); // ddmmyyyy
  let out = '';
  if (d.length >= 2) out += d.slice(0, 2);
  if (d.length >= 3) out += '/' + d.slice(2, 4);
  else if (d.length > 2) out += '/' + d.slice(2);
  if (d.length >= 5) out += '/' + d.slice(4, 8);
  el.value = out;
}

function maskTime(el: HTMLInputElement) {
  const t = digitsOnly(el.value).slice(0, 4); // hhmm
  let out = '';
  if (t.length >= 2) out += t.slice(0, 2);
  if (t.length > 2) out += ':' + t.slice(2, 4);
  el.value = out;
}

function attachMask(el: HTMLInputElement | null, type: 'date' | 'time') {
  if (!el) return;
  const handler = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const before = input.value;
    if (type === 'date') maskDate(input);
    if (type === 'time') maskTime(input);
    if (input.value !== before) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
  el.addEventListener('input', handler);
  el.addEventListener('blur', handler);
}

function setupMasks() {
  attachMask(document.querySelector('[data-bind="registro.data_registro"]') as HTMLInputElement, 'date');
  attachMask(document.getElementById('dn') as HTMLInputElement, 'date');
  attachMask(document.getElementById('hn') as HTMLInputElement, 'time');
}

function setupBeforeUnload() {
  window.addEventListener('beforeunload', (e) => {
    if (!isDirty) return;
    e.preventDefault();
    (e as any).returnValue = '';
  });
}

async function bootstrap() {
  syncInputsFromState();
  bindInputs();
  setupMasks();
  setupActions();
  setupConfigModal();
  setupCache();
  setupLocalAutofill();
  setupShortcuts();
  setupBeforeUnload();
  await refreshConfig();
  updateDirty();
}

bootstrap();
