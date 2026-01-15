import { template } from "./template";
import { createInitialState, getByPath, setByPath } from "./state";
import { applyCartorioCns, buildMatricula } from "./matricula";
import type { AppState } from "./types";
import { loadDraft, saveDraft } from "./storage";

let state: AppState = createInitialState();
let lastSavedSnapshot = "";

export function setupUI(root: HTMLElement) {
  root.innerHTML = template;
  bindInputs();
  syncInputsFromState();
  setupButtons();
  shortcuts();
  loadDraftIntoState();
  updateDirty();
}

function bindInputs() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = (el as HTMLElement).getAttribute('data-bind') || '';
    const handler = () => {
      const input = el as HTMLInputElement;
      const val = input.type === 'checkbox' ? input.checked : input.value;
      setByPath(state, path, val);
      if (path === 'registro.sexo') updateSexoOutros();
      if (path === 'registro.data_nascimento_ignorada' || path === 'registro.hora_nascimento_ignorada') updateIgnoreFields();
      if (path === 'registro.cpf') updateCpfState();
      if (path === 'registro.cpf_sem_inscricao') updateCpfFromToggle();
      if ([
        'ui.casamento_tipo','ui.matricula_livro','ui.matricula_folha','ui.matricula_termo',
        'registro.data_registro','ui.cartorio_oficio','certidao.tipo_registro'
      ].includes(path)) updateMatricula();
      updateDirty();
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });
}

function syncInputsFromState() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = (el as HTMLElement).getAttribute('data-bind') || '';
    const val = getByPath(state, path);
    const input = el as HTMLInputElement;
    if (input.type === 'checkbox') input.checked = !!val; else input.value = val ?? '';
  });
  updateSexoOutros();
  updateIgnoreFields();
  updateCpfState();
  updateTipoButtons();
  updateMatricula();
}

function updateSexoOutros() {
  const wrap = document.getElementById('sexo-outros-wrap');
  const input = document.getElementById('sexo-outros') as HTMLInputElement | null;
  if (!wrap || !input) return;
  const enabled = state.registro.sexo === 'outros';
  wrap.style.display = enabled ? 'flex' : 'none';
  if (!enabled) { input.value = ''; state.registro.sexo_outros = ''; }
}

function updateIgnoreFields() {
  const dn = document.getElementById('dn') as HTMLInputElement | null;
  const hn = document.getElementById('hn') as HTMLInputElement | null;
  const dnIgn = !!state.registro.data_nascimento_ignorada;
  const hnIgn = !!state.registro.hora_nascimento_ignorada;
  if (dn) { dn.disabled = dnIgn; if (dnIgn) { dn.value = ''; state.registro.data_nascimento = ''; } }
  if (hn) { hn.disabled = hnIgn; if (hnIgn) { hn.value = ''; state.registro.hora_nascimento = ''; } }
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
  if (cpfSem && cpfEl) { cpfEl.value = ''; state.registro.cpf = ''; }
}

function updateTipoButtons() {
  const tipo = state.certidao.tipo_registro || 'nascimento';
  const btnN = document.getElementById('btn-nascimento');
  const btnC = document.getElementById('btn-casamento');
  const btnO = document.getElementById('btn-obito');
  btnN?.classList.toggle('active', tipo === 'nascimento');
  btnC?.classList.toggle('active', tipo === 'casamento');
  btnO?.classList.toggle('active', tipo === 'obito');
  const wrap = document.getElementById('casamento-tipo-wrap');
  if (wrap) wrap.style.display = tipo === 'casamento' ? 'flex' : 'none';
}

function updateMatricula() {
  state.certidao.cartorio_cns = applyCartorioCns(state);
  const val = buildMatricula(state);
  state.registro.matricula = val;
  const matEl = document.getElementById('matricula') as HTMLInputElement | null;
  if (matEl) matEl.value = val;
}

function buildData() {
  const reg = state.registro;
  const cpfRaw = (reg.cpf || '').trim();
  const cpfDigits = cpfRaw.replace(/\D/g, '');
  const cpfExists = cpfDigits.length > 0;
  const dataIgn = !!reg.data_nascimento_ignorada;
  const horaIgn = !!reg.hora_nascimento_ignorada;
  const cert = state.certidao;
  const filiacao: any[] = [];
  const addFil = (nome: string, cid: string, uf: string, a1: string, a2: string) => {
    const n = (nome || '').trim(); const c = (cid || '').trim(); const u = (uf || '').trim(); const av = [a1, a2].filter(Boolean).join('; ');
    if (!n && !c && !u && !av) return; filiacao.push({ nome: n, municipio_nascimento: c, uf_nascimento: u, avos: av });
  };
  addFil(state.ui.mae_nome, state.ui.mae_cidade, state.ui.mae_uf, state.ui.mae_avo_materna, state.ui.mae_avo_materno);
  addFil(state.ui.pai_nome, state.ui.pai_cidade, state.ui.pai_uf, state.ui.pai_avo_paterna, state.ui.pai_avo_paterno);
  return {
    certidao: { ...cert },
    registro: {
      nome_completo: reg.nome_completo,
      cpf_sem_inscricao: !cpfExists,
      cpf: cpfExists ? cpfRaw : '',
      matricula: reg.matricula,
      data_registro: reg.data_registro,
      data_nascimento_ignorada: dataIgn,
      data_nascimento: dataIgn ? '' : reg.data_nascimento,
      hora_nascimento_ignorada: horaIgn,
      hora_nascimento: horaIgn ? '' : reg.hora_nascimento,
      municipio_naturalidade: reg.municipio_naturalidade,
      uf_naturalidade: reg.uf_naturalidade,
      local_nascimento: reg.local_nascimento,
      municipio_nascimento: reg.municipio_nascimento,
      uf_nascimento: reg.uf_nascimento,
      sexo: reg.sexo,
      sexo_outros: reg.sexo === 'outros' ? reg.sexo_outros : '',
      gemeos: { quantidade: reg.gemeos.quantidade, irmao: parseIrmaos(state.ui.gemeos_irmao_raw) },
      filiacao,
      numero_dnv: reg.numero_dnv,
      averbacao_anotacao: reg.averbacao_anotacao,
      anotacoes_cadastro: parseAnotacoes(state.ui.anotacoes_raw)
    }
  };
}

function parseLines(raw: string, mapper: (line: string) => any) {
  if (!raw) return [];
  return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(mapper);
}
function parseIrmaos(raw: string) { return parseLines(raw, line => { const [n,m] = line.split('|'); return { nome: n?.trim() || '', matricula: m?.trim() || '' }; }); }
function parseAnotacoes(raw: string) { return parseLines(raw, line => { const [t,d,o,u,dt] = line.split('|'); return { tipo: t?.trim()||'', documento: d?.trim()||'', orgao_emissor: o?.trim()||'', uf_emissao: u?.trim()||'', data_emissao: dt?.trim()||'' }; }); }

function validate(data: any) {
  let ok = true; const mark = (p: string) => { const el = document.querySelector(`[data-bind="${p}"]`); el?.classList.add('invalid'); ok=false; };
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  if (!data.registro.nome_completo) mark('registro.nome_completo');
  if (!data.registro.sexo) mark('registro.sexo');
  if (!data.registro.uf_nascimento) mark('registro.uf_nascimento');
  if (!data.registro.local_nascimento) mark('registro.local_nascimento');
  if (!data.registro.municipio_nascimento) mark('registro.municipio_nascimento');
  if (!data.certidao.modalidade) mark('certidao.modalidade');
  return ok;
}

const escapeXml = (s: any) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function toXml(obj: any, node: string, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${pad}<${node}></${node}>`;
  if (typeof obj !== 'object') return `${pad}<${node}>${escapeXml(obj)}</${node}>`;
  if (Array.isArray(obj)) return obj.map(i=>toXml(i,node,indent)).join('\n');
  const children = Object.keys(obj).map(k => toXml(obj[k], k, indent+1)).join('\n');
  return `${pad}<${node}>\n${children}\n${pad}</${node}>`;
}

function fileName(ext: 'json'|'xml') {
  const data = buildData();
  const tipo = (data.certidao.tipo_registro || 'NASCIMENTO').toUpperCase();
  const nome = (data.registro.nome_completo || 'SEM_NOME').normalize('NFD').replace(/[^\w]+/g,'_').replace(/_+/g,'_');
  const cpf = (data.registro.cpf || 'SEM_CPF').replace(/\D/g,'') || 'SEM_CPF';
  const ts = new Date(); const pad = (n:number)=>String(n).padStart(2,'0');
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
  return `${tipo}_${nome}_${cpf}_${stamp}.${ext}`;
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function setStatus(text: string, isError?: boolean) {
  const el = document.getElementById('statusText');
  if (el) { el.textContent = text; (el as HTMLElement).style.color = isError ? '#dc2626' : '#64748b'; }
  const toast = document.getElementById('toast');
  if (toast) { toast.textContent = text; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1500); }
}

function snapshot() { return JSON.stringify(buildData()); }
function updateDirty() {
  const snap = snapshot();
  const dirty = snap !== lastSavedSnapshot;
  const btn = document.getElementById('btn-save');
  if (btn) btn.classList.toggle('dirty', dirty);
}

function saveDraftLocal() {
  const data = buildData();
  if (!validate(data)) { setStatus('Campos obrigatorios pendentes', true); return; }
  state.registro.cpf_sem_inscricao = !((state.registro.cpf || '').replace(/\D/g,'').length > 0);
  saveDraft(state);
  lastSavedSnapshot = snapshot();
  updateDirty();
  setStatus('Salvo');
}

function generate(format: 'json'|'xml') {
  const data = buildData();
  if (!validate(data)) { setStatus('Campos obrigatorios pendentes', true); return; }
  const name = fileName(format);
  if (format === 'json') downloadFile(name, JSON.stringify(data, null, 2), 'application/json');
  else downloadFile(name, toXml(data, 'certidao_nascimento'), 'application/xml');
  setStatus(`${format.toUpperCase()} gerado`);
}

function shortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); saveDraftLocal(); }
  });
}

function setupButtons() {
  document.getElementById('btn-save')?.addEventListener('click', saveDraftLocal);
  document.getElementById('btn-json')?.addEventListener('click', () => generate('json'));
  document.getElementById('btn-xml')?.addEventListener('click', () => generate('xml'));
  document.getElementById('btn-nascimento')?.addEventListener('click', () => { state.certidao.tipo_registro = 'nascimento'; updateTipoButtons(); updateMatricula(); updateDirty(); });
  document.getElementById('btn-casamento')?.addEventListener('click', () => { state.certidao.tipo_registro = 'casamento'; updateTipoButtons(); updateMatricula(); updateDirty(); });
  document.getElementById('btn-obito')?.addEventListener('click', () => { state.certidao.tipo_registro = 'obito'; updateTipoButtons(); updateMatricula(); updateDirty(); });
  document.getElementById('btn-config')?.addEventListener('click', () => setStatus('Sem config de pasta (browser)'));
}

function loadDraftIntoState() {
  const draft = loadDraft();
  if (!draft) return;
  try {
    state = { ...state, ...draft, certidao: { ...state.certidao, ...(draft as any).certidao }, registro: { ...state.registro, ...(draft as any).registro }, ui: { ...state.ui, ...(draft as any).ui } };
    syncInputsFromState();
    lastSavedSnapshot = snapshot();
  } catch {}
}

