
// Funções relacionadas à interface do usuário
export function showToast(message: string): void {
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

export function setupConfigPanel(): void {
  // Configuração do painel de configurações
}

export function setFieldHint(field: HTMLElement | null, message: string): void {
  if (!field) return;
  let hint = field.querySelector('.hint');
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


export function clearFieldHint(field: HTMLElement | null): void {
  setFieldHint(field, '');
}

export function updateActionButtons(): void {
  // Atualiza os botões de ação com base no estado dos campos
}

export const state: any = {
  certidao: {
    cod_selo: '',
    modalidade: 'eletronica',
    cota_emolumentos: '',
    cota_emolumentos_isento: false,
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
    averbacao_anotacao: '',
  },
  ui: {
    gemeos_irmao_raw: '',
    anotacoes_raw: '',
    cartorio_oficio: '',
    casamento_tipo: '',
    matricula_livro: '',
    matricula_folha: '',
    matricula_termo: '',
    naturalidade_diferente: false,
    mae_nome: '',
    mae_uf: '',
    mae_cidade: '',
    mae_avo_materna: '',
    mae_avo_materno: '',
    pai_nome: '',
    pai_uf: '',
    pai_cidade: '',
    pai_avo_paterna: '',
    pai_avo_paterno: '',
  },
};

let lastSavedSnapshot = '';
let lastSavedId = '';
let isDirty = true;
let currentDirs = { jsonDir: '', xmlDir: '' };



interface Registro {
  nome_completo?: string;
  sexo?: string;
  sexo_outros?: string;
  uf_nascimento?: string;
  local_nascimento?: string;
  municipio_nascimento?: string;
  data_registro?: string;
  data_nascimento?: string;
  hora_nascimento?: string;
  cpf?: string;
}
interface Certidao {
  modalidade?: string;
  tipo_registro?: string;
}
interface DataObj {
  registro?: Registro;
  certidao?: Certidao;
}
declare global {
  interface Window {
    api?: {
      dbSaveDraft?: Function;
      saveXml?: Function;
      saveJson?: Function;
      getConfig?: Function;
      pickJsonDir?: Function;
      pickXmlDir?: Function;
    };
  }
}

function setStatus(text: string, isError?: boolean) {
  const el = (document.getElementById('statusText') as HTMLElement | null);
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

// ...restante do código...

function setByPath(obj: any, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] === undefined) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc: any, p: string) => (acc ? acc[p] : undefined), obj);
}

function syncInputsFromState() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = (el as any).getAttribute('data-bind') || '';
    const val = getByPath(state, path);
    const input = el as HTMLInputElement;
    if (input.type === 'checkbox') {
      (input as any).checked = !!val;
      return;
    }
    if (path === 'registro.cpf') {
      (input as any).value = formatCpf(val);
      return;
    }
    if (path === 'registro.data_registro' || path === 'registro.data_nascimento') {
      (input as any).value = normalizeDateValue(val);
      return;
    }
    if (path === 'registro.hora_nascimento') {
      (input as any).value = normalizeTimeValue(val);
      return;
    }
    (input as any).value = val !== undefined && val !== null ? String(val) : '';
  });
  updateTipoButtons();
  updateSexoOutros();
  updateIgnoreFields();
  updateNaturalidadeVisibility(false);
  updateCpfState();
  updateMatricula();
}

function bindInputs() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = (el as any).getAttribute('data-bind') || '';
    const handler = () => {
      const input = el as HTMLInputElement;
      if (input.type === 'checkbox') {
        setByPath(state, path, (input as any).checked);
      } else if (path === 'registro.cpf') {
        const digits = normalizeCpfValue((input as any).value);
        setByPath(state, path, digits);
        (input as any).value = formatCpf(digits);
      } else if (path === 'registro.data_registro' || path === 'registro.data_nascimento') {
        const formatted = formatDateInput((input as any).value);
        setByPath(state, path, formatted);
        (input as any).value = formatted;
      } else if (path === 'registro.hora_nascimento') {
        const formatted = formatTimeInput((input as any).value);
        setByPath(state, path, formatted);
        (input as any).value = formatted;
      } else {
        setByPath(state, path, (input as any).value);
      }
      if (path === 'registro.sexo') updateSexoOutros();
      if (
        path === 'registro.data_nascimento_ignorada' ||
        path === 'registro.hora_nascimento_ignorada'
      ) {
        updateIgnoreFields();
      }
      if (path === 'registro.cpf') updateCpfState();
      if (path === 'registro.cpf_sem_inscricao') updateCpfFromToggle();
      if (path === 'ui.cartorio_oficio') applyCartorioChange();
      if (path === 'registro.data_registro') updateMatricula();
      if (
        path === 'ui.casamento_tipo' ||
        path === 'ui.matricula_livro' ||
        path === 'ui.matricula_folha' ||
        path === 'ui.matricula_termo'
      ) {
        updateMatricula();
      }
      if (path === 'ui.naturalidade_diferente') updateNaturalidadeVisibility(true);
      if (path === 'registro.municipio_naturalidade' || path === 'registro.uf_naturalidade') {
        rememberNaturalidadeEdit();
      }
      if (path === 'registro.municipio_nascimento' || path === 'registro.uf_nascimento') {
        syncNaturalidadeLockedToBirth();
      }
      validateLiveField(path, input);
      updateDirty();
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });
}

function updateTipoButtons() {
  const tipo = state.certidao.tipo_registro || 'nascimento';
  const btnN = (document.getElementById('btn-nascimento') as HTMLElement | null);
  const btnC = (document.getElementById('btn-casamento') as HTMLElement | null);
  const btnO = (document.getElementById('btn-obito') as HTMLElement | null);
  if (btnN) btnN.classList.toggle('active', tipo === 'nascimento');
  if (btnC) btnC.classList.toggle('active', tipo === 'casamento');
  if (btnO) btnO.classList.toggle('active', tipo === 'obito');
  const input = document.querySelector(
    '[data-bind="certidao.tipo_registro"]',
  ) as HTMLInputElement | null;
  if (input) (input as any).value = tipo;
  const casamentoWrap = (document.getElementById('casamento-tipo-wrap') as HTMLElement | null);
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
  const wrap = (document.getElementById('sexo-outros-wrap') as HTMLElement | null);
  const input = (document.getElementById('sexo-outros') as HTMLElement | null) as HTMLInputElement | null;
  if (!wrap || !input) return;
  const enabled = sexo === 'outros';
  wrap.style.display = enabled ? 'flex' : 'none';
  if (!enabled) {
    (input as any).value = '';
    state.registro.sexo_outros = '';
  }
}

function updateIgnoreFields() {
  const dnIgn = !!state.registro.data_nascimento_ignorada;
  const hnIgn = !!state.registro.hora_nascimento_ignorada;
  const dn = (document.getElementById('dn') as HTMLElement | null) as HTMLInputElement | null;
  const hn = (document.getElementById('hn') as HTMLElement | null) as HTMLInputElement | null;
  if (dn) {
    (dn as any).disabled = dnIgn;
    if (dnIgn) {
      (dn as any).value = '';
      state.registro.data_nascimento = '';
    }
  }
  if (hn) {
    (hn as any).disabled = hnIgn;
    if (hnIgn) {
      (hn as any).value = '';
      state.registro.hora_nascimento = '';
    }
  }
}

let naturalidadeMemo = { city: '', uf: '' };
let naturalidadeEdited = false;

function setBoundValue(path: string, value: unknown) {
  setByPath(state, path, value);
  const el = document.querySelector(`[data-bind="${path}"]`) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
  if (!el) return;
  if ((el as HTMLInputElement).type === 'checkbox') (el as HTMLInputElement).checked = !!value;
  else (el as any).value = value !== undefined && value !== null ? String(value) : '';
}

function rememberNaturalidadeEdit() {
  if (!state.ui.naturalidade_diferente) return;
  naturalidadeEdited = true;
  naturalidadeMemo = {
    city: trimValue(state.registro.municipio_naturalidade),
    uf: trimValue(state.registro.uf_naturalidade),
  };
}

function copyBirthToNaturalidade() {
  const city = trimValue(state.registro.municipio_nascimento);
  const uf = trimValue(state.registro.uf_nascimento).toUpperCase();
  setBoundValue('registro.municipio_naturalidade', city);
  setBoundValue('registro.uf_naturalidade', uf);
  naturalidadeMemo = { city, uf };
  naturalidadeEdited = false;
}

function syncNaturalidadeLockedToBirth() {
  if (state.ui.naturalidade_diferente) return;
  const city = trimValue(state.registro.municipio_nascimento);
  const uf = trimValue(state.registro.uf_nascimento).toUpperCase();
  setBoundValue('registro.municipio_naturalidade', city);
  setBoundValue('registro.uf_naturalidade', uf);
}

function updateNaturalidadeVisibility(fromToggle: boolean) {
  const isDifferent = !!state.ui.naturalidade_diferente;
  const row = (document.getElementById('naturalidade-extra') as HTMLElement | null);
  if (row) {
    row.classList.toggle('visible', isDifferent);
    (row as HTMLElement).style.display = isDifferent ? 'flex' : 'none';
    (row as HTMLElement).hidden = false;
  }
  const copyBtn = (document.getElementById('copy-naturalidade') as HTMLElement | null) as HTMLButtonElement | null;
  if (copyBtn) (copyBtn as any).disabled = !isDifferent;
  const labelCity = (document.getElementById('label-municipio-principal') as HTMLElement | null);
  const labelUf = (document.getElementById('label-uf-principal') as HTMLElement | null);
  if (labelCity) {
    labelCity.textContent = isDifferent
      ? 'Municipio de nascimento'
      : 'Municipio (nascimento e naturalidade)';
  }
  if (labelUf) {
    labelUf.textContent = isDifferent ? 'UF de nascimento' : 'UF (nascimento e naturalidade)';
  }
  if (!fromToggle) return;
  if (isDifferent) {
    if (naturalidadeEdited && (naturalidadeMemo.city || naturalidadeMemo.uf)) {
      setBoundValue('registro.municipio_naturalidade', naturalidadeMemo.city);
      setBoundValue('registro.uf_naturalidade', naturalidadeMemo.uf);
    } else {
      copyBirthToNaturalidade();
    }
  } else {
    naturalidadeMemo = {
      city: trimValue(state.registro.municipio_naturalidade),
      uf: trimValue(state.registro.uf_naturalidade),
    };
    syncNaturalidadeLockedToBirth();
  }
  updateDirty();
}

function applyBirthValues(city: string, uf: string, force: boolean) {
  const cityTrim = trimValue(city);
  const ufTrim = trimValue(uf).toUpperCase();
  const currentCity = trimValue(state.registro.municipio_nascimento);
  const currentUf = trimValue(state.registro.uf_nascimento);
  let changed = false;
  if (force || !currentCity) {
    setBoundValue('registro.municipio_nascimento', cityTrim);
    changed = true;
  }
  if (force || !currentUf) {
    setBoundValue('registro.uf_nascimento', ufTrim);
    changed = true;
  }
  if (changed) syncNaturalidadeLockedToBirth();
  return { changed, currentCity, currentUf };
}

function updateCpfState() {
  const cpfDigits = normalizeCpfValue(state.registro.cpf || '');
  state.registro.cpf = cpfDigits;
  if (cpfDigits.length > 0) {
    state.registro.cpf_sem_inscricao = false;
    const cpfSemEl = (document.getElementById('cpf-sem') as HTMLElement | null) as HTMLInputElement | null;
    if (cpfSemEl) (cpfSemEl as any).checked = false;
  }
  const cpfEl = (document.getElementById('cpf') as HTMLElement | null) as HTMLInputElement | null;
  if (cpfEl) (cpfEl as any).value = formatCpf(cpfDigits);
}

function updateCpfFromToggle() {
  const cpfSem = !!state.registro.cpf_sem_inscricao;
  const cpfEl = (document.getElementById('cpf') as HTMLElement | null) as HTMLInputElement | null;
  if (cpfSem && cpfEl) {
    (cpfEl as any).value = '';
    state.registro.cpf = '';
  }
}

const CNS_CARTORIOS: Record<string, string> = {
  '6': '110742',
  '9': '163659',
  '12': '110064',
  '13': '109736',
  '14': '110635',
  '15': '110072',
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

function normalizeDateValue(value: string) {
  const raw = trimValue(value);
  if (!raw) return '';
  const digits = digitsOnly(raw);
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  return raw;
}

function normalizeTimeValue(value: string) {
  const raw = trimValue(value);
  if (!raw) return '';
  const digits = digitsOnly(raw);
  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  return raw;
}

function formatDateInput(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  let out = '';
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length >= 3) out += '/' + digits.slice(2, 4);
  else if (digits.length > 2) out += '/' + digits.slice(2);
  if (digits.length >= 5) out += '/' + digits.slice(4, 8);
  return out;
}

function formatTimeInput(value: string) {
  const digits = digitsOnly(value).slice(0, 4);
  let out = '';
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length > 2) out += ':' + digits.slice(2, 4);
  return out;
}

function normalizeCpfValue(value: string) {
  return digitsOnly(value).slice(0, 11);
}

function formatCpf(value: string) {
  const digits = normalizeCpfValue(value);
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

function padDigits(value: string, size: number) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return digits.padStart(size, '0').slice(-size);
}

function yearFromDate(value: string) {
  const normalized = normalizeDateValue(value);
  const match = (normalized || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
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
  const matEl = (document.getElementById('matricula') as HTMLElement | null) as HTMLInputElement | null;
  if (matEl) (matEl as any).value = value || '';
}

function updateMatricula() {
  const value = buildMatricula();
  setMatriculaValue(value);
}

function applyCartorioChange() {
  const oficio = state.ui.cartorio_oficio || '';
  if (!oficio) {
    updateMatricula();
    return;
  }
  const cns = CNS_CARTORIOS[oficio];
  if (cns) {
    state.certidao.cartorio_cns = cns;
    const cnsInput = document.querySelector(
      '[data-bind="certidao.cartorio_cns"]',
    ) as HTMLInputElement | null;
    if (cnsInput) (cnsInput as any).value = cns;
  }
  updateMatricula();
}

function trimValue(value: unknown) {
  return String(value || '').trim();
}

function parseLines(raw: string, mapper: (line: string) => any) {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(mapper);
}

function parseIrmaos(raw: string) {
  return parseLines(raw, (line) => {
    const parts = line.split('|');
    return {
      nome: trimValue(parts[0]),
      matricula: trimValue(parts[1]),
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
      data_emissao: trimValue(parts[4]),
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
    avos,
  };
}

function normalizeData() {
  const cert = state.certidao;
  const reg = state.registro;
  const cpfDigits = normalizeCpfValue(reg.cpf);
  const cpfExists = cpfDigits.length > 0;
  const cpfSem = !!reg.cpf_sem_inscricao;
  const dataIgn = !!reg.data_nascimento_ignorada;
  const horaIgn = !!reg.hora_nascimento_ignorada;
  const natDifferent = !!state.ui.naturalidade_diferente;
  const municipioNascimento = trimValue(reg.municipio_nascimento);
  const ufNascimento = trimValue(reg.uf_nascimento);
  let municipioNaturalidade = trimValue(reg.municipio_naturalidade);
  let ufNaturalidade = trimValue(reg.uf_naturalidade);
  if (!natDifferent) {
    municipioNaturalidade = municipioNascimento;
    ufNaturalidade = ufNascimento;
  }

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
    cota_emolumentos_isento: !!cert.cota_emolumentos_isento,
  };

  const filiacao: any[] = [];
  const mae = buildFiliacaoItem(
    state.ui.mae_nome,
    state.ui.mae_cidade,
    state.ui.mae_uf,
    state.ui.mae_avo_materna,
    state.ui.mae_avo_materno,
  );
  if (mae) filiacao.push(mae);
  const pai = buildFiliacaoItem(
    state.ui.pai_nome,
    state.ui.pai_cidade,
    state.ui.pai_uf,
    state.ui.pai_avo_paterna,
    state.ui.pai_avo_paterno,
  );
  if (pai) filiacao.push(pai);

  const matriculaFull = trimValue(reg.matricula);
  const matriculaDv = matriculaFull.length >= 2 ? matriculaFull.slice(-2) : '';
  const matriculaBase = matriculaFull.length > 2 ? matriculaFull.slice(0, -2) : '';

  const registro: any = {
    nome_completo: trimValue(reg.nome_completo),
    cpf_sem_inscricao: cpfSem,
    cpf: cpfExists ? cpfDigits : '',
    matricula: matriculaFull,
    matricula_base: matriculaBase,
    matricula_dv: matriculaDv,
    cartorio_oficio: trimValue(state.ui.cartorio_oficio),
    cartorio_cns: trimValue(cert.cartorio_cns),
    matricula_livro: trimValue(state.ui.matricula_livro),
    matricula_folha: trimValue(state.ui.matricula_folha),
    matricula_termo: trimValue(state.ui.matricula_termo),
    casamento_tipo: trimValue(state.ui.casamento_tipo),
    data_registro: normalizeDateValue(reg.data_registro),
    data_nascimento_ignorada: dataIgn,
    data_nascimento: dataIgn ? '' : normalizeDateValue(reg.data_nascimento),
    hora_nascimento_ignorada: horaIgn,
    hora_nascimento: horaIgn ? '' : normalizeTimeValue(reg.hora_nascimento),
    municipio_naturalidade: municipioNaturalidade,
    uf_naturalidade: ufNaturalidade,
    local_nascimento: trimValue(reg.local_nascimento),
    municipio_nascimento: municipioNascimento,
    uf_nascimento: ufNascimento,
    sexo: trimValue(reg.sexo),
    gemeos: {
      quantidade: trimValue(reg.gemeos.quantidade),
      irmao: parseIrmaos(state.ui.gemeos_irmao_raw),
    },
    filiacao,
    numero_dnv: trimValue(reg.numero_dnv),
    averbacao_anotacao: trimValue(reg.averbacao_anotacao),
    anotacoes_cadastro: parseAnotacoes(state.ui.anotacoes_raw),
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
  const btn = (document.getElementById('btn-save') as HTMLElement | null);
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
  const normalized = normalizeDateValue(value);
  if (!normalized) return true;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function isValidTime(value: string) {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return true;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized);
}

function validateData(data: any) {
  clearInvalid();
  let ok = true;
  if (!data.registro.nome_completo) {
    markInvalid('registro.nome_completo');
    ok = false;
  }
  if (!data.registro.sexo) {
    markInvalid('registro.sexo');
    ok = false;
  }
  if (!data.registro.uf_nascimento) {
    markInvalid('registro.uf_nascimento');
    ok = false;
  }
  if (!data.registro.local_nascimento) {
    markInvalid('registro.local_nascimento');
    ok = false;
  }
  if (!data.registro.municipio_nascimento) {
    markInvalid('registro.municipio_nascimento');
    ok = false;
  }
  if (!data.certidao.modalidade) {
    markInvalid('certidao.modalidade');
    ok = false;
  }
  if (data.registro.sexo === 'outros' && !data.registro.sexo_outros) {
    markInvalid('registro.sexo_outros');
    ok = false;
  }
  const tipo = (data.certidao.tipo_registro || '').toLowerCase();
  if (
    (tipo === 'nascimento' || tipo === 'casamento') &&
    !normalizeDateValue(data.registro.data_registro)
  ) {
    markInvalid('registro.data_registro');
    ok = false;
  }
  if (tipo === 'casamento' && !trimValue(state.ui.casamento_tipo)) {
    markInvalid('ui.casamento_tipo');
    ok = false;
  }
  if (!isValidDate(data.registro.data_registro)) {
    markInvalid('registro.data_registro');
    ok = false;
  }
  if (!isValidDate(data.registro.data_nascimento)) {
    markInvalid('registro.data_nascimento');
    ok = false;
  }
  if (!isValidTime(data.registro.hora_nascimento)) {
    markInvalid('registro.hora_nascimento');
    ok = false;
  }
  if (!ok) setStatus('Campos obrigatorios pendentes', true);
  return ok;
}

function ensureHint(input: HTMLInputElement | HTMLSelectElement) {
  const field = input.closest('.field') as HTMLElement | null;
  if (!field) return null;
  let hint = (field as any).querySelector('.hint') as HTMLElement | null;
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'hint';
    field.appendChild(hint);
  }
  return hint;
}

function setFieldError(input: HTMLInputElement | HTMLSelectElement, message: string) {
  input.classList.toggle('invalid', !!message);
  const hint = ensureHint(input);
  if (!hint) return;
  hint.textContent = message || '';
  hint.classList.toggle('visible', !!message);
}



function validateDateInputValue(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.length >= 2) {
    const day = Number(digits.slice(0, 2));
    if (day < 1 || day > 31) return 'Dia invalido';
  }
  if (digits.length >= 4) {
    const month = Number(digits.slice(2, 4));
    if (month < 1 || month > 12) return 'Mes invalido';
  }
  if (digits.length === 8 && !isValidDate(formatDateInput(value))) return 'Data invalida';
  return '';
}

function validateTimeInputValue(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.length >= 2) {
    const hour = Number(digits.slice(0, 2));
    if (hour > 23) return 'Hora invalida';
  }
  if (digits.length >= 4) {
    const minute = Number(digits.slice(2, 4));
    if (minute > 59) return 'Minutos invalidos';
  }
  if (digits.length === 4 && !isValidTime(formatTimeInput(value))) return 'Hora invalida';
  return '';
}

function validateLiveField(path: string, input: HTMLInputElement | HTMLSelectElement) {
  if (path === 'registro.data_registro' || path === 'registro.data_nascimento') {
    setFieldError(
      input as HTMLInputElement,
      validateDateInputValue((input as HTMLInputElement).value),
    );
    return;
  }
  if (path === 'registro.hora_nascimento') {
    setFieldError(
      input as HTMLInputElement,
      validateTimeInputValue((input as HTMLInputElement).value),
    );
    return;
  }
  if (path === 'registro.cpf') {
    const digits = normalizeCpfValue((input as HTMLInputElement).value);
    const invalid = !state.registro.cpf_sem_inscricao && digits.length !== 11;
    (input as HTMLInputElement).classList.toggle('invalid', invalid);
    clearFieldHint(input as HTMLInputElement);
    return;
  }
  if (path === 'ui.cartorio_oficio') {
    const invalid = !state.ui.cartorio_oficio;
    (input as HTMLSelectElement).classList.toggle('invalid', invalid);
    clearFieldHint(input as HTMLSelectElement);
    return;
  }
  if (path === 'registro.cpf_sem_inscricao') {
    const cpfEl = (document.getElementById('cpf') as HTMLElement | null) as HTMLInputElement | null;
    if (cpfEl) validateLiveField('registro.cpf', cpfEl);
  }
}

function stripAccents(value: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeFilePart(value: string, fallback: string) {
  const clean = stripAccents(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || fallback;
}

function makeTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}${pad(d.getSeconds())}`;
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

function toXml(obj: unknown, nodeName: string, indent?: number) {
  const pad = '  '.repeat(indent || 0);
  if (obj === null || obj === undefined) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== 'object') return `${pad}<${nodeName}>${escapeXml(String(obj))}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => toXml(item, nodeName, indent)).join('\n');
  const children = Object.keys(obj)
    .map((key) => toXml(obj[key], key, (indent || 0) + 1))
    .join('\n');
  return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}

function downloadFile(name: string, content: string, mime: string) {
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
  } catch (e) { void e;
    return false;
  }
}

async function saveDraft() {
  const data = normalizeData();
  if (!validateData(data)) return;
  recordPlaceMappingFromState();
  try {
    if (window.api && window.api.dbSaveDraft) {
      const res = await window.api.dbSaveDraft({
        id: lastSavedId || null,
        data,
        sourceFormat: 'manual',
        kind: data.certidao.tipo_registro || 'nascimento',
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
      const mime = format === 'xml' ? 'application/xml' : 'application/json';
      if (downloadFile(name, content, mime)) {
        setStatus(`${format.toUpperCase()} baixado: ${name}`);
      } else {
        setStatus('API indisponivel', true);
      }
    }
  } catch (err) {
    setStatus('Falha ao gerar arquivo', true);
  }
}

function updateBadge() {
  const badge = (document.getElementById('outputDirBadge') as HTMLElement | null);
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
    const jsonEl = (document.getElementById('json-dir') as HTMLElement | null) as HTMLInputElement | null;
    const xmlEl = (document.getElementById('xml-dir') as HTMLElement | null) as HTMLInputElement | null;
    if (jsonEl) (jsonEl as any).value = currentDirs.jsonDir;
    if (xmlEl) (xmlEl as any).value = currentDirs.xmlDir;
  } catch (err) {
    setStatus('Falha ao ler config', true);
  }
}

function setupConfigModal() {
  const modal = (document.getElementById('config-modal') as HTMLElement | null);
  const open = async () => {
    await refreshConfig();
    if (modal) modal.classList.remove('hidden');
  };
  const close = () => { if (modal) modal.classList.add('hidden'); };

  (document.getElementById('btn-config') as HTMLElement | null)?.addEventListener('click', open);
  (document.getElementById('config-close') as HTMLElement | null)?.addEventListener('click', close);
  (document.getElementById('config-save') as HTMLElement | null)?.addEventListener('click', () => {
    updateBadge();
    close();
  });
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  const tabs = Array.from(document.querySelectorAll('.tab-btn')) as HTMLElement[];
  const panes = Array.from(document.querySelectorAll('.tab-pane')) as HTMLElement[];
  const activateTab = (id: string) => {
    tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === id));
    panes.forEach((pane) => pane.classList.toggle('active', pane.id === id));
  };
  tabs.forEach((btn) =>
    btn.addEventListener('click', () => activateTab(btn.dataset.tab || 'tab-pastas')),
  );

  (document.getElementById('pick-json') as HTMLElement | null)?.addEventListener('click', async () => {
    if (!window.api || !window.api.pickJsonDir) return;
    const dir = await window.api.pickJsonDir();
    const jsonEl = (document.getElementById('json-dir') as HTMLElement | null) as HTMLInputElement | null;
    if (jsonEl) (jsonEl as any).value = dir;
    currentDirs.jsonDir = dir;
    updateBadge();
  });
  (document.getElementById('pick-xml') as HTMLElement | null)?.addEventListener('click', async () => {
    if (!window.api || !window.api.pickXmlDir) return;
    const dir = await window.api.pickXmlDir();
    const xmlEl = (document.getElementById('xml-dir') as HTMLElement | null) as HTMLInputElement | null;
    if (xmlEl) (xmlEl as any).value = dir;
    currentDirs.xmlDir = dir;
    updateBadge();
  });
}

function setupActions() {
  (document.getElementById('btn-save') as HTMLElement | null)?.addEventListener('click', saveDraft);
  (document.getElementById('btn-json') as HTMLElement | null)?.addEventListener('click', () => generateFile('json'));
  (document.getElementById('btn-xml') as HTMLElement | null)?.addEventListener('click', () => generateFile('xml'));
  document
    .getElementById('btn-nascimento')
    ?.addEventListener('click', () => setTipoRegistro('nascimento'));
  document
    .getElementById('btn-casamento')
    ?.addEventListener('click', () => setTipoRegistro('casamento'));
  (document.getElementById('btn-obito') as HTMLElement | null)?.addEventListener('click', () => setTipoRegistro('obito'));
}

type PlaceCacheEntry = {
  key: string;
  normalizedPlaceText: string;
  cityBirth: string;
  ufBirth: string;
  cityNatural?: string;
  ufNatural?: string;
  updatedAt: number;
  tokens: string[];
};

type PlaceCacheData = {
  v: number;
  entries: Record<string, PlaceCacheEntry>;
};

function getSafeStorage() {
  try {
    const key = '__certidao_cache_test__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return window.localStorage;
  } catch (e) { void e;
    return null;
  }
}

class PlaceAutoFillCache {
  private storageKey: string;
  private maxEntries: number;
  private storage: Storage | null;
  private memoryData: PlaceCacheData;

  constructor(opts: { storageKey?: string; maxEntries?: number } = {}) {
    this.storageKey = opts.storageKey || 'certidao.placeCache.v1';
    this.maxEntries = opts.maxEntries || 200;
    this.storage = getSafeStorage();
    this.memoryData = { v: 1, entries: {} };
  }

  normalize(text: string) {
    return stripAccents(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractCityUfFromText(text: string) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;
    const patterns = [
      /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s*\/\s*([A-Za-z]{2})\s*$/u,
      /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s*-\s*([A-Za-z]{2})\s*$/u,
      /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s+([A-Za-z]{2})\s*$/u,
    ];
    for (const re of patterns) {
      const match = trimmed.match(re);
      if (match) {
        const city = match[1].replace(/\s+/g, ' ').trim();
        const uf = match[2].toUpperCase();
        return { city, uf };
      }
    }
    return null;
  }

  getSuggestions(input: string, limit = 6) {
    const key = this.normalize(this.stripCityUfSuffix(input || ''));
    if (!key) return [];
    const data = this.readData();
    const queryTokens = this.tokenize(key);
    return (Object as any).values(data.entries)
      .map((entry) => {
        const entryKey = entry.key || '';
        const contains = entryKey.includes(key) || key.includes(entryKey);
        const intersect = queryTokens.filter((t) => entry.tokens.includes(t)).length;
        const tokenScore = queryTokens.length
          ? intersect / Math.max(queryTokens.length, entry.tokens.length)
          : 0;
        let score = tokenScore + (contains ? 0.6 : 0);
        if (entryKey === key) score += 0.4;
        return { entry, score };
      })
      .filter((item) => item.score >= 0.35)
      .sort((a, b) => b.score - a.score || b.entry.updatedAt - a.entry.updatedAt)
      .slice(0, limit)
      .map((item) => item.entry);
  }

  recordMapping(args: {
    placeText: string;
    cityBirth: string;
    ufBirth: string;
    cityNatural?: string;
    ufNatural?: string;
    normalizedPlaceText?: string;
  }) {
    const placeText = trimValue(args.placeText);
    const cityBirth = trimValue(args.cityBirth);
    const ufBirth = trimValue(args.ufBirth).toUpperCase();
    if (!placeText || !cityBirth || !ufBirth) return;
    const extracted = this.extractCityUfFromText(placeText);
    const normalizedPlaceText =
      trimValue(args.normalizedPlaceText) || this.normalizePlaceText(placeText, extracted);
    const keyBase = this.stripCityUfSuffix(placeText);
    const key = this.normalize(keyBase || placeText);
    if (!key) return;
    const entry: PlaceCacheEntry = {
      key,
      normalizedPlaceText: normalizedPlaceText || placeText,
      cityBirth,
      ufBirth,
      updatedAt: Date.now(),
      tokens: this.tokenize(key),
    };
    const cityNatural = trimValue(args.cityNatural);
    const ufNatural = trimValue(args.ufNatural).toUpperCase();
    if (cityNatural) entry.cityNatural = cityNatural;
    if (ufNatural) entry.ufNatural = ufNatural;
    const data = this.readData();
    data.entries[key] = entry;
    this.prune(data);
    this.writeData(data);
  }

  private tokenize(text: string) {
    return this.normalize(text).split(' ').filter(Boolean);
  }

  private normalizePlaceText(placeText: string, extracted: { city: string; uf: string } | null) {
    const clean = (placeText || '').replace(/\s+/g, ' ').trim();
    if (!extracted) return clean;
    const base = this.stripCityUfSuffix(clean);
    const city = extracted.city.replace(/\s+/g, ' ').trim();
    const uf = extracted.uf.toUpperCase();
    if (!base) return `${city}/${uf}`;
    return `${base}, ${city}/${uf}`;
  }

  private stripCityUfSuffix(text: string) {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const patterns = [
      /\s*[,;]?\s*[\p{L}][\p{L}\s.'-]{1,}\s*\/\s*[A-Za-z]{2}\s*$/u,
      /\s*[,;]?\s*[\p{L}][\p{L}\s.'-]{1,}\s*-\s*[A-Za-z]{2}\s*$/u,
      /\s*[,;]?\s*[\p{L}][\p{L}\s.'-]{1,}\s+[A-Za-z]{2}\s*$/u,
    ];
    for (const re of patterns) {
      if (re.test(clean)) {
        return clean
          .replace(re, '')
          .replace(/[,;\s-]+$/, '')
          .trim();
      }
    }
    return clean;
  }

  private prune(data: PlaceCacheData) {
    const keys = Object.keys(data.entries);
    if (keys.length <= this.maxEntries) return;
    keys.sort((a, b) => data.entries[a].updatedAt - data.entries[b].updatedAt);
    for (let i = 0; i < keys.length - this.maxEntries; i++) {
      delete data.entries[keys[i]];
    }
  }

  private readData(): PlaceCacheData {
    if (!this.storage) return this.memoryData;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return { v: 1, entries: {} };
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1 || !parsed.entries) return { v: 1, entries: {} };
      return parsed;
    } catch (e) { void e;
      return { v: 1, entries: {} };
    }
  }

  private writeData(data: PlaceCacheData) {
    if (this.storage) {
      try {
        this.storage.setItem(this.storageKey, JSON.stringify(data));
        return;
      } catch (e) { void e;
        this.memoryData = data;
        return;
      }
    }
    this.memoryData = data;
  }
}

const placeCache = new PlaceAutoFillCache({
  storageKey: 'certidao.placeCache.v1',
  maxEntries: 200,
});

function recordPlaceMappingFromState(placeTextOverride?: string) {
  const placeText = trimValue(placeTextOverride || state.registro.local_nascimento);
  const cityBirth = trimValue(state.registro.municipio_nascimento);
  const ufBirth = trimValue(state.registro.uf_nascimento).toUpperCase();
  if (!placeText || !cityBirth || !ufBirth) return;
  const cityNatural = state.ui.naturalidade_diferente
    ? trimValue(state.registro.municipio_naturalidade)
    : '';
  const ufNatural = state.ui.naturalidade_diferente
    ? trimValue(state.registro.uf_naturalidade).toUpperCase()
    : '';
  placeCache.recordMapping({
    placeText,
    cityBirth,
    ufBirth,
    cityNatural,
    ufNatural,
  });
}

function applyPlaceEntry(
  entry: PlaceCacheEntry,
  opts: { force?: boolean; setLocal?: boolean; allowNatural?: boolean } = {},
) {
  if (!entry) return;
  if (opts.setLocal && entry.normalizedPlaceText) {
    setBoundValue('registro.local_nascimento', entry.normalizedPlaceText);
  }
  applyBirthValues(entry.cityBirth, entry.ufBirth, !!opts.force);
  if (opts.allowNatural && state.ui.naturalidade_diferente) {
    const cityNatural = trimValue(entry.cityNatural);
    const ufNatural = trimValue(entry.ufNatural).toUpperCase();
    if (cityNatural) setBoundValue('registro.municipio_naturalidade', cityNatural);
    if (ufNatural) setBoundValue('registro.uf_naturalidade', ufNatural);
    if (cityNatural || ufNatural) {
      naturalidadeMemo = {
        city: trimValue(state.registro.municipio_naturalidade),
        uf: trimValue(state.registro.uf_naturalidade),
      };
      naturalidadeEdited = true;
    }
  }
  updateDirty();
}

function setupCache() {
  (document.getElementById('cache-save') as HTMLElement | null)?.addEventListener('click', () => {
    const desc =
      ((document.getElementById('cache-desc') as HTMLElement | null) as HTMLInputElement | null)?.value.trim() || '';
    const local =
      ((document.getElementById('cache-local') as HTMLElement | null) as HTMLInputElement | null)?.value.trim() || '';
    const cidade =
      ((document.getElementById('cache-cidade') as HTMLElement | null) as HTMLInputElement | null)?.value.trim() || '';
    const uf = ((document.getElementById('cache-uf') as HTMLElement | null) as HTMLInputElement | null)?.value.trim() || '';
    const naturalidade =
      ((document.getElementById('cache-nat') as HTMLElement | null) as HTMLInputElement | null)?.value.trim() || '';
    const placeText = local || desc;
    if (!placeText || !cidade || !uf) return;
    placeCache.recordMapping({
      placeText,
      normalizedPlaceText: local || placeText,
      cityBirth: cidade,
      ufBirth: uf,
      cityNatural: naturalidade,
    });
    setStatus('Padrao salvo');
  });
  (document.getElementById('cache-apply') as HTMLElement | null)?.addEventListener('click', () => {
    const desc =
      ((document.getElementById('cache-desc') as HTMLElement | null) as HTMLInputElement | null)?.value.trim() || '';
    if (!desc) return;
    const entry = placeCache.getSuggestions(desc, 1)[0];
    if (!entry) {
      setStatus('Padrao nao encontrado', true);
      return;
    }
    applyPlaceEntry(entry, { force: true, setLocal: true, allowNatural: true });
    setStatus('Padrao aplicado');
  });
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function setupLocalAutofill() {
  const localEl = document.querySelector(
    '[data-bind="registro.local_nascimento"]',
  ) as HTMLInputElement | null;
  const cityEl = document.querySelector(
    '[data-bind="registro.municipio_nascimento"]',
  ) as HTMLInputElement | null;
  const ufEl = document.querySelector(
    '[data-bind="registro.uf_nascimento"]',
  ) as HTMLSelectElement | null;
  const natCityEl = document.querySelector(
    '[data-bind="registro.municipio_naturalidade"]',
  ) as HTMLInputElement | null;
  const natUfEl = document.querySelector(
    '[data-bind="registro.uf_naturalidade"]',
  ) as HTMLSelectElement | null;
  const suggestionWrap = (document.getElementById('local-suggestion') as HTMLElement | null);
  const suggestionText = (document.getElementById('local-suggestion-text') as HTMLElement | null);
  const suggestionApply = (document.getElementById('local-suggestion-apply') as HTMLElement | null);
  const dataList = (document.getElementById('local-suggestions') as HTMLElement | null) as HTMLDataListElement | null;
  const copyBtn = (document.getElementById('copy-naturalidade') as HTMLElement | null) as HTMLButtonElement | null;
  if (!localEl || !cityEl || !ufEl) return;

  const suggestionMap = new Map<string, PlaceCacheEntry>();
  let pendingSuggestion: { city: string; uf: string } | null = null;

  const recordDebounced = debounce(() => recordPlaceMappingFromState(), 650);
  const suggestDebounced = debounce(() => runSuggest(false), 550);

  function clearSuggestion() {
    pendingSuggestion = null;
    if (suggestionWrap) suggestionWrap.classList.remove('visible');
  }

  function showSuggestion(city: string, uf: string) {
    pendingSuggestion = { city, uf };
    if (suggestionText) suggestionText.textContent = `Sugestao: ${city}/${uf}`;
    if (suggestionWrap) suggestionWrap.classList.add('visible');
  }

  function applyPendingSuggestion() {
    if (!pendingSuggestion) return;
    applyBirthValues(pendingSuggestion.city, pendingSuggestion.uf, true);
    clearSuggestion();
    updateDirty();
    recordPlaceMappingFromState();
  }

  function renderSuggestions(list: PlaceCacheEntry[]) {
    if (!dataList) return;
    dataList.innerHTML = '';
    suggestionMap.clear();
    list.forEach((entry) => {
      const value = entry.normalizedPlaceText || entry.key;
      if (!value) return;
      const option = document.createElement('option');
      (option as any).value = value;
      dataList.appendChild(option);
      suggestionMap.set(value.toLowerCase(), entry);
    });
  }

  function applySelectedSuggestion() {
    const entry = suggestionMap.get((localEl as any).value.trim().toLowerCase());
    if (!entry) return;
    applyPlaceEntry(entry, { force: true, allowNatural: true });
    recordPlaceMappingFromState(entry.normalizedPlaceText || (localEl as any).value);
    clearSuggestion();
  }

  function handleExtracted(city: string, uf: string) {
    const currentCity = trimValue(state.registro.municipio_nascimento);
    const currentUf = trimValue(state.registro.uf_nascimento);
    const cityMatches = !currentCity || currentCity.toLowerCase() === city.toLowerCase();
    const ufMatches = !currentUf || currentUf.toUpperCase() === uf.toUpperCase();
    let applied = false;
    if (!currentCity && ufMatches) {
      setBoundValue('registro.municipio_nascimento', city);
      applied = true;
    }
    if (!currentUf && cityMatches) {
      setBoundValue('registro.uf_nascimento', uf);
      applied = true;
    }
    if (applied) {
      syncNaturalidadeLockedToBirth();
      updateDirty();
      recordPlaceMappingFromState();
      clearSuggestion();
      return;
    }
    if (!cityMatches || !ufMatches) {
      showSuggestion(city, uf);
    } else {
      clearSuggestion();
      recordPlaceMappingFromState();
    }
  }

  function runSuggest(fromBlur: boolean) {
    const text = (localEl as any).value.trim();
    if (!text) {
      clearSuggestion();
      renderSuggestions([]);
      return;
    }
    const extracted = placeCache.extractCityUfFromText(text);
    if (extracted) {
      renderSuggestions([]);
      handleExtracted(extracted.city, extracted.uf);
      return;
    }
    clearSuggestion();
    const suggestions = placeCache.getSuggestions(text, 6);
    renderSuggestions(suggestions);
    if (fromBlur) applySelectedSuggestion();
  }

  localEl.addEventListener('input', () => {
    clearSuggestion();
    suggestDebounced();
  });
  localEl.addEventListener('blur', () => {
    runSuggest(true);
    recordPlaceMappingFromState();
  });
  localEl.addEventListener('change', () => {
    runSuggest(true);
    recordPlaceMappingFromState();
  });
  cityEl.addEventListener('input', recordDebounced);
  ufEl.addEventListener('change', recordDebounced);
  natCityEl?.addEventListener('input', recordDebounced);
  natUfEl?.addEventListener('change', recordDebounced);
  suggestionApply?.addEventListener('click', applyPendingSuggestion);
  copyBtn?.addEventListener('click', () => {
    copyBirthToNaturalidade();
    updateDirty();
    recordPlaceMappingFromState();
  });
}

function setupNaturalidadeToggle() {
  const toggle = (document.getElementById('naturalidade-diferente') as HTMLElement | null) as HTMLInputElement | null;
  if (!toggle) return;
  const handler = () => {
    state.ui.naturalidade_diferente = !!(toggle as any).checked;
    updateNaturalidadeVisibility(true);
    updateDirty();
  };
  toggle.addEventListener('change', handler);
}

function setupShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      saveDraft();
    }
  });
}

function setupCartorioTyping() {
  const select = (document.getElementById('cartorio-oficio') as HTMLElement | null) as HTMLSelectElement | null;
  if (!select) return;
  let buffer = '';
  let timer: number | null = null;

  const clearBuffer = () => {
    buffer = '';
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  select.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
      e.preventDefault();
      buffer += key;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        buffer = '';
      }, 700);

      const match = Array.from(select.options).find((opt) => (opt as any).value === buffer);
      if (match) {
        (select as any).value = buffer;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        clearBuffer();
      }
      return;
    }
    if (key === 'Backspace') {
      e.preventDefault();
      buffer = buffer.slice(0, -1);
      return;
    }
  });
}

// --- Máscaras simples de data e hora (só números) ---
function digitsOnly__dup_2(v: string) {
  return (v || '').replace(/\D/g, '');
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
  //  setupMasks();
  setupActions();
  setupConfigModal();
  setupCache();
  setupLocalAutofill();
  setupNaturalidadeToggle();
  setupShortcuts();
  setupCartorioTyping();
  setupBeforeUnload();
  await refreshConfig();
  const cpfEl = (document.getElementById('cpf') as HTMLElement | null) as HTMLInputElement | null;
  if (cpfEl) validateLiveField('registro.cpf', cpfEl);
  const cartorioEl = document.querySelector(
    '[data-bind="ui.cartorio_oficio"]',
  ) as HTMLSelectElement | null;
  if (cartorioEl) validateLiveField('ui.cartorio_oficio', cartorioEl);
  updateDirty();
}

bootstrap();
