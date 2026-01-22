import {
  BindWarning,
  applyObjectToBinds,
  setBoundValue,
  setBySelector,
  setElementValue,
  normalizeSpaces,
  onlyDigits,
  dispatchInputEvents,
} from './bind';
import { syncInputsFromState } from '../../ui';

type CertificatePayload = {
  certidao?: Record<string, unknown>;
  registro?: Record<string, unknown>;
};

const PENDING_KEY = 'ui.pendingPayload';

function getCurrentAct(): string {
  const body = document.body;
  if (body.classList.contains('page-nascimento')) return 'nascimento';
  if (body.classList.contains('page-casamento')) return 'casamento';
  if (body.classList.contains('page-obito')) return 'obito';
  const href = window.location.href || '';
  if (href.includes('Nascimento2Via')) return 'nascimento';
  if (href.includes('Casamento2Via')) return 'casamento';
  if (href.includes('Obito2Via')) return 'obito';
  return '';
}

function navigateToAct(kind: string): void {
  const map: Record<string, string> = {
    nascimento: './Nascimento2Via.html',
    casamento: './Casamento2Via.html',
    obito: './Obito2Via.html',
  };
  const href = map[kind];
  if (!href) return;
  try {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { href } }));
  } catch {
    window.location.href = href;
  }
}

export function queuePendingPayload(payload: CertificatePayload): void {
  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), payload }),
    );
  } catch {
    // ignore
  }
}

export function consumePendingPayload(): CertificatePayload | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    localStorage.removeItem(PENDING_KEY);
    return parsed?.payload || null;
  } catch {
    return null;
  }
}

export function assertIsCertificatePayload(obj: any): { ok: boolean; errors: string[]; payload?: CertificatePayload } {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    errors.push('JSON vazio ou invalido');
  } else {
    if (!obj.certidao) errors.push('certidao ausente');
    if (!obj.registro) errors.push('registro ausente');
    const tipo = obj?.certidao?.tipo_registro;
    if (!tipo) errors.push('certidao.tipo_registro ausente');
  }
  return { ok: errors.length === 0, errors, payload: obj as CertificatePayload };
}

function splitGenitores(raw: string): { pai: string; mae: string } {
  const parts = String(raw || '')
    .split(';')
    .map((p) => normalizeSpaces(p));
  return { pai: parts[0] || '', mae: parts[1] || '' };
}

function parseAvos(raw: string): { avo1: string; avo2: string } {
  const parts = String(raw || '')
    .split(';')
    .map((p) => normalizeSpaces(p));
  return { avo1: parts[0] || '', avo2: parts[1] || '' };
}

function applyNascimentoToForm(payload: CertificatePayload, root: Document | HTMLElement, warnings: BindWarning[]): void {
  const cert = payload.certidao || {};
  const reg = payload.registro || {};

  applyObjectToBinds('certidao', cert as Record<string, unknown>, root, warnings);
  applyObjectToBinds('registro', reg as Record<string, unknown>, root, warnings);

  const munNasc = String((reg as any).municipio_nascimento || '');
  const ufNasc = String((reg as any).uf_nascimento || '');
  const munNat = String((reg as any).municipio_naturalidade || '');
  const ufNat = String((reg as any).uf_naturalidade || '');

  const naturalidadeDiff = !!(munNat && (munNat !== munNasc || ufNat !== ufNasc));
  setBoundValue('ui.naturalidade_diferente', naturalidadeDiff, root, warnings);

  const filiacao = (reg as any).filiacao;
  let mae: any = null;
  let pai: any = null;
  if (Array.isArray(filiacao)) {
    for (const f of filiacao) {
      const papel = String(f?.papel || '').toUpperCase();
      if (papel === 'MAE' && !mae) mae = f;
      if (papel === 'PAI' && !pai) pai = f;
    }
    if (!mae && filiacao[0]) mae = filiacao[0];
    if (!pai && filiacao[1]) pai = filiacao[1];
  } else if (typeof filiacao === 'string') {
    const parts = filiacao.split(';').map((p) => normalizeSpaces(p));
    mae = { nome: parts[0] || '' };
    pai = { nome: parts[1] || '' };
  }

  if (mae) {
    setBoundValue('ui.mae_nome', mae.nome || '', root, warnings);
    setBoundValue('ui.mae_cidade', mae.municipio_nascimento || '', root, warnings);
    setBoundValue('ui.mae_uf', mae.uf_nascimento || '', root, warnings);
    const avos = parseAvos(mae.avos || '');
    setBoundValue('ui.mae_avo_materna', avos.avo1, root, warnings);
    setBoundValue('ui.mae_avo_materno', avos.avo2, root, warnings);
  }
  if (pai) {
    setBoundValue('ui.pai_nome', pai.nome || '', root, warnings);
    setBoundValue('ui.pai_cidade', pai.municipio_nascimento || '', root, warnings);
    setBoundValue('ui.pai_uf', pai.uf_nascimento || '', root, warnings);
    const avos = parseAvos(pai.avos || '');
    setBoundValue('ui.pai_avo_paterna', avos.avo1, root, warnings);
    setBoundValue('ui.pai_avo_paterno', avos.avo2, root, warnings);
  }

  // Ensure CPF is applied to the registro.cpf bound field
  if ((reg as any).cpf) {
    setBoundValue('registro.cpf', (reg as any).cpf, root, warnings);
  }

  // Local nascimento type code -> ui select
  // Map local nascimento using explicit code or fallback to textual heuristics
  let appliedLocalNascimento = false;
  if ((reg as any).local_nascimento_codigo) {
    // Map the numeric code (1,2,3,4,5,9) or single-char codes to the select options (O,H,S,D,V,I)
    const rawCode = String((reg as any).local_nascimento_codigo || '').trim();
    let selectVal = '';
    // If it's a single letter already (O/H/S/D/V/I), accept it
    if (/^[A-Za-z]$/.test(rawCode)) {
      selectVal = rawCode.toUpperCase();
    } else {
      // numeric mapping
      const map: Record<string, string> = {
        '1': 'H',
        '2': 'S',
        '3': 'D',
        '4': 'V',
        '5': 'O',
        '9': 'I',
      };
      selectVal = map[rawCode] || '';
    }
    if (selectVal) {
      setBoundValue('ui.local_nascimento_tipo', selectVal, root, warnings);
      appliedLocalNascimento = true;
    }
  }

  // Fallback: try to infer from textual local_nascimento description
  if (!appliedLocalNascimento && (reg as any).local_nascimento) {
    const txt = String((reg as any).local_nascimento || '').toUpperCase();
    let inferred = '';
    if (/HOSP|CLINIC|MATERN|HOSPITAL/.test(txt)) inferred = 'H';
    else if (/DOMIC|DOMICILIO|CASA/.test(txt)) inferred = 'D';
    else if (/VIA|RUA|LOGRADOURO/.test(txt)) inferred = 'V';
    else if (/IGNOR|IGNORADO/.test(txt)) inferred = 'I';
    else inferred = 'O';
    if (inferred) setBoundValue('ui.local_nascimento_tipo', inferred, root, warnings);
  }

  // Matricula parts -> ui fields
  if ((reg as any).matricula_livro) {
    setBoundValue('ui.matricula_livro', (reg as any).matricula_livro, root, warnings);
  }
  if ((reg as any).matricula_folha) {
    setBoundValue('ui.matricula_folha', (reg as any).matricula_folha, root, warnings);
  }
  if ((reg as any).matricula_termo) {
    setBoundValue('ui.matricula_termo', (reg as any).matricula_termo, root, warnings);
  }

  // If a combined matricula is provided, set the #matricula input as well
  if ((reg as any).matricula) {
    setBySelector(root, '#matricula', (reg as any).matricula || '');
  }

  // Prepare CNS <-> oficio mapping from UI (window.CNS_CARTORIOS maps oficio -> cns)
  const mapping: Record<string, string> = (window as any).CNS_CARTORIOS || {};

  // 1) Prefer explicit certidao.cartorio_cns from payload (XML case)
  const cartorioCnsRaw = String((cert as any).cartorio_cns || '').replace(/\D+/g, '').slice(0, 6);
  let oficioFound = false;
  if (cartorioCnsRaw) {
    const oficio = Object.keys(mapping).find((k) => String(mapping[k]) === cartorioCnsRaw);
    if (oficio) {
      setBoundValue('ui.cartorio_oficio', oficio, root, warnings);
      oficioFound = true;
    } else {
      // If we don't know the oficio for this CNS, still populate the cns input so UI/tools can use it
      setBoundValue('certidao.cartorio_cns', cartorioCnsRaw, root, warnings);
    }
  }

  // 2) Fallback for JSON case: some JSON payloads have the CNS embedded at the start of the matrícula
  if (!oficioFound && (reg as any).matricula) {
    const matDigits = onlyDigits(String((reg as any).matricula || ''));
    const prefix = matDigits.slice(0, 6);
    if (prefix.length === 6) {
      // Always populate the certidao.cns input so the UI shows the detected CNS even when we don't have a mapping
      setBoundValue('certidao.cartorio_cns', prefix, root, warnings);

      const oficioFromMat = Object.keys(mapping).find((k) => String(mapping[k]) === prefix);
      if (oficioFromMat) {
        setBoundValue('ui.cartorio_oficio', oficioFromMat, root, warnings);
        oficioFound = true;
      }
    }
  }

  const gemeos = (reg as any).gemeos?.irmao;
  if (Array.isArray(gemeos)) {
    const lines = gemeos
      .map((g) => {
        const nome = normalizeSpaces(g?.nome || '');
        const mat = onlyDigits(g?.matricula || '');
        return [nome, mat].filter(Boolean).join(' - ');
      })
      .filter(Boolean)
      .join('\n');
    setBoundValue('ui.gemeos_irmao_raw', lines, root, warnings);
  }

  const anotacoes = (reg as any).anotacoes_cadastro;
  if (Array.isArray(anotacoes)) {
    const lines = anotacoes
      .map((a) =>
        [
          normalizeSpaces(a?.tipo || ''),
          normalizeSpaces(a?.documento || ''),
          normalizeSpaces(a?.orgao_emissor || ''),
          normalizeSpaces(a?.uf_emissao || ''),
          normalizeSpaces(a?.data_emissao || ''),
        ].join('|'),
      )
      .filter(Boolean)
      .join('\n');
    setBoundValue('ui.anotacoes_raw', lines, root, warnings);
  }
}

function mapEstadoCivilValue(raw: string): string {
  const v = normalizeSpaces(raw).toUpperCase();
  if (v.includes('SOLTE')) return 'SO';
  if (v.includes('CASAD')) return 'CA';
  if (v.includes('DIVOR')) return 'DI';
  if (v.includes('VIUV')) return 'VI';
  if (v.includes('SEPAR')) return 'SJ';
  if (v.includes('DESQUIT')) return 'DE';
  return '';
}

function applyCasamentoToForm(payload: CertificatePayload, root: Document | HTMLElement, warnings: BindWarning[]): void {
  const cert = payload.certidao || {};
  const reg = payload.registro || {};
  applyObjectToBinds('certidao', cert as Record<string, unknown>, root, warnings);
  applyObjectToBinds('registro', reg as Record<string, unknown>, root, warnings);

  const conj = Array.isArray((reg as any).conjuges) ? (reg as any).conjuges : [];
  const c1 = conj[0] || {};
  const c2 = conj[1] || {};

  setBySelector(root, 'input[name="nomeSolteiro"]', c1.nome_atual_habilitacao || '');
  setBySelector(root, 'input[name="nomeCasado"]', c1.novo_nome || '');
  setBySelector(root, 'input[name="dataNascimentoNoivo"]', c1.data_nascimento || '');
  setBySelector(root, 'input[name="nacionalidadeNoivo"]', c1.nacionalidade || '');
  setBySelector(root, 'input[name="cidadeNascimentoNoivo"]', c1.municipio_naturalidade || '');
  setBySelector(root, 'select[name="ufNascimentoNoivo"]', c1.uf_naturalidade || '');
  setBySelector(root, 'input[name="CPFNoivo"]', c1.cpf || '');
  const gen1 = splitGenitores(c1.genitores || '');
  setBySelector(root, 'input[name="nomePaiNoivo"]', gen1.pai);
  setBySelector(root, 'input[name="nomeMaeNoivo"]', gen1.mae);
  setBySelector(root, 'select[name="estadoCivilNoivo"]', mapEstadoCivilValue(c1.estado_civil || ''));

  setBySelector(root, 'input[name="nomeSolteira"]', c2.nome_atual_habilitacao || '');
  setBySelector(root, 'input[name="nomeCasada"]', c2.novo_nome || '');
  setBySelector(root, 'input[name="dataNascimentoNoiva"]', c2.data_nascimento || '');
  setBySelector(root, 'input[name="nacionalidadeNoiva"]', c2.nacionalidade || '');
  setBySelector(root, 'input[name="cidadeNascimentoNoiva"]', c2.municipio_naturalidade || '');
  setBySelector(root, 'select[name="ufNascimentoNoiva"]', c2.uf_naturalidade || '');
  setBySelector(root, 'input[name="CPFNoiva"]', c2.cpf || '');
  const gen2 = splitGenitores(c2.genitores || '');
  setBySelector(root, 'input[name="nomePaiNoiva"]', gen2.pai);
  setBySelector(root, 'input[name="nomeMaeNoiva"]', gen2.mae);
  setBySelector(root, 'select[name="estadoCivilNoiva"]', mapEstadoCivilValue(c2.estado_civil || ''));

  setBySelector(root, 'input[name="dataTermo"]', (reg as any).data_registro || '');
  setBySelector(root, 'input[name="dataCasamento"]', (reg as any).data_celebracao || '');

  const regime = (reg as any).regime_bens || '';
  const regimeSel = (root as Document).querySelector?.('select[name="regimeBens"]') as HTMLSelectElement | null;
  if (regimeSel && regime) {
    const opt = Array.from(regimeSel.options).find(
      (o) => normalizeSpaces(o.textContent || '').toUpperCase() === normalizeSpaces(regime).toUpperCase(),
    );
    if (opt) {
      regimeSel.value = opt.value;
      dispatchInputEvents(regimeSel);
    }
  }

  setBySelector(root, 'textarea[name="observacao"]', (reg as any).averbacao_anotacao || '');
  setBySelector(root, '#matricula', (reg as any).matricula || '');
}

function applyObitoToForm(payload: CertificatePayload, root: Document | HTMLElement, warnings: BindWarning[]): void {
  const cert = payload.certidao || {};
  const reg = payload.registro || {};
  applyObjectToBinds('certidao', cert as Record<string, unknown>, root, warnings);
  applyObjectToBinds('registro', reg as Record<string, unknown>, root, warnings);

  setBySelector(
    root,
    'input[name="nomeFalecido"], input[name="nomePessoa"], input[data-bind="registro.nome_completo"]',
    (reg as any).nome_completo || '',
  );
  setBySelector(
    root,
    'input[name="cpfFalecido"], input[name="CPFPessoa"], input[data-bind="registro.cpf"]',
    (reg as any).cpf || '',
  );
  setBySelector(root, 'input[name="dataObito"], input[name="dataFalecimento"]', (reg as any).data_falecimento || '');
  setBySelector(root, 'input[name="horaObito"], input[name="horaFalecimento"]', (reg as any).hora_falecimento || '');
  setBySelector(root, 'input[name="localObito"], input[name="localFalecimento"]', (reg as any).local_falecimento || '');
  setBySelector(root, 'input[name="municipioObito"], input[name="municipioFalecimento"]', (reg as any).municipio_falecimento || '');
  setBySelector(
    root,
    'select[name="ufMunicipioObito"], input[name="ufMunicipioObito"]',
    (reg as any).uf_falecimento || '',
  );
  const sexoRaw = String((reg as any).sexo || '').toLowerCase();
  let sexoVal = '';
  if (sexoRaw === 'masculino' || sexoRaw === 'm') sexoVal = 'M';
  if (sexoRaw === 'feminino' || sexoRaw === 'f') sexoVal = 'F';
  if (sexoRaw === 'ignorado' || sexoRaw === 'i') sexoVal = 'I';
  if (sexoRaw === 'outros' || sexoRaw === 'n') sexoVal = 'N';
  if (sexoVal) setBySelector(root, 'select[name="sexo"]', sexoVal);
  setBySelector(root, 'input[name="localSepultamento"]', (reg as any).local_sepultamento_cremacao || '');
  setBySelector(root, 'input[name="municipioSepultamento"]', (reg as any).municipio_sepultamento_cremacao || '');
  setBySelector(
    root,
    'select[name="ufMunicipioSepultamento"], input[name="ufMunicipioSepultamento"]',
    (reg as any).uf_sepultamento_cremacao || '',
  );
  setBySelector(root, 'input[name="dataRegistro"], input[name="dataTermo"]', (reg as any).data_registro || '');
  setBySelector(root, 'input[name="nomePaiFalecido"], input[name="nomePai"]', splitGenitores((reg as any).filiacao || '').pai);
  setBySelector(root, 'input[name="nomeMaeFalecido"], input[name="nomeMae"]', splitGenitores((reg as any).filiacao || '').mae);
  setBySelector(root, 'input[name="naturalidadeFalecido"], input[name="naturalidade"]', (reg as any).municipio_naturalidade || '');
  setBySelector(
    root,
    'select[name="ufNaturalidadeFalecido"], input[name="ufNaturalidadeFalecido"]',
    (reg as any).uf_naturalidade || '',
  );
  setBySelector(root, 'input[name="informante"]', (reg as any).nome_declarante || '');
  setBySelector(root, 'select[name="existenciaBens"]', (reg as any).existencia_bens || '');
}

export function applyCertificatePayloadToSecondCopy(
  payload: CertificatePayload,
  root: Document | HTMLElement = document,
): { ok: boolean; warnings: BindWarning[]; navigated?: boolean } {
  const warnings: BindWarning[] = [];
  if (!payload || !payload.certidao || !payload.registro) {
    return { ok: false, warnings };
  }
  const kind = String((payload.certidao as any).tipo_registro || '').toLowerCase();
  const current = getCurrentAct();
  if (kind && current && kind !== current) {
    queuePendingPayload(payload);
    navigateToAct(kind);
    return { ok: true, warnings, navigated: true };
  }

  if (kind === 'nascimento') {
    applyNascimentoToForm(payload, root, warnings);
  } else if (kind === 'casamento') {
    applyCasamentoToForm(payload, root, warnings);
  } else if (kind === 'obito') {
    applyObitoToForm(payload, root, warnings);
  } else {
    applyObjectToBinds('certidao', payload.certidao as Record<string, unknown>, root, warnings);
    applyObjectToBinds('registro', payload.registro as Record<string, unknown>, root, warnings);
  }

  // Ensure UI state is synced after programmatic application of values
  try {
    syncInputsFromState();
  } catch (e) {
    // ignore
  }

  return { ok: true, warnings };
}
