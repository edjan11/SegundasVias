import {
  BindWarning,
  findBoundElements,
  applyObjectToBinds,
  setBoundValue,
  setBySelector,
  setElementValue,
  normalizeSpaces,
  onlyDigits,
  dispatchInputEvents,
} from './bind';
import { extractMatriculaParts } from '../../shared/matricula';

type CertificatePayload = {
  certidao?: Record<string, unknown>;
  registro?: Record<string, unknown>;
};

const PENDING_KEY = 'ui.pendingPayload';

type ApplyErrorDetail = {
  code: 'INVALID_PAYLOAD' | 'MISSING_REQUIRED_DATA' | 'MISSING_BIND' | 'UNKNOWN';
  message: string;
  missing?: string[];
  kind?: string;
};

function emitApplyError(detail: ApplyErrorDetail): void {
  try {
    (window as any).__lastApplyError = detail;
    (window as any).__lastApplyErrorAt = Date.now();
  } catch {}

  // Evento pra UI capturar (sem recarregar)
  try {
    const EventCtor = (window as any).CustomEvent || (window as any).Event;
    let ev: any;
    try {
      ev = new EventCtor('app:apply-error', { detail });
    } catch {
      ev = new EventCtor('app:apply-error');
      ev.detail = detail;
    }
    window.dispatchEvent(ev);
  } catch {}

  // Fallback: banner pequeno e fechável (não bloqueia)
  try {
    const id = 'apply-error-banner';
    let box = document.getElementById(id);
    if (!box) {
      box = document.createElement('div');
      box.id = id;
      box.style.position = 'fixed';
      box.style.right = '12px';
      box.style.bottom = '12px';
      box.style.zIndex = '999999';
      box.style.maxWidth = '520px';
      box.style.padding = '12px 14px';
      box.style.border = '1px solid rgba(220,38,38,0.6)';
      box.style.background = 'rgba(15, 23, 42, 0.92)';
      box.style.color = '#fff';
      box.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      box.style.fontSize = '13px';
      box.style.borderRadius = '10px';
      box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
      document.body.appendChild(box);
    }

    const missing = (detail.missing || []).slice(0, 10);
    const missingHtml = missing.length
      ? `<div style="margin-top:6px; opacity:.95"><b>Faltou:</b> ${missing.map((m) => `<code style="background:rgba(255,255,255,0.12); padding:1px 6px; border-radius:6px; margin-right:6px;">${m}</code>`).join(' ')}</div>`
      : '';

    box.innerHTML = `
      <div style="display:flex; gap:10px; align-items:flex-start;">
        <div style="font-size:18px; line-height:1;">⚠️</div>
        <div style="flex:1;">
          <div style="font-weight:700;">Não foi possível carregar o registro</div>
          <div style="margin-top:2px; opacity:.95">${detail.message}</div>
          ${missingHtml}
          <div style="margin-top:8px;">
            <button id="apply-error-close"
              style="cursor:pointer; border-radius:8px; padding:6px 10px; border:1px solid rgba(255,255,255,0.25); background:rgba(255,255,255,0.08); color:#fff;">
              Fechar
            </button>
          </div>
        </div>
      </div>
    `;
    const btn = document.getElementById('apply-error-close');
    if (btn) btn.onclick = () => box?.remove();
  } catch {}

  try { console.error('[apply-error]', detail); } catch {}
}


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




function looksLikeRegistro(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const keys = [
    'nome_completo',
    'cpf',
    'matricula',
    'data_registro',
    'data_nascimento',
    'municipio_nascimento',
    'uf_nascimento',
    'sexo',
  ];
  return keys.some((k) => k in obj);
}

function normalizePayload(raw: any, fallbackKind?: string): CertificatePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const kindFallback = String(fallbackKind || '').trim().toLowerCase();

  if (raw.certidao && raw.registro) return raw as CertificatePayload;
  if (raw.payload) return normalizePayload(raw.payload, fallbackKind);
  if (raw.data) return normalizePayload(raw.data, fallbackKind);
  if (raw.record) return normalizePayload(raw.record, fallbackKind);

  if (raw.registro && !raw.certidao) {
    const tipo = String(raw?.tipo_registro || raw?.kind || kindFallback || '').trim().toLowerCase();
    return {
      certidao: { tipo_registro: tipo || kindFallback || '' },
      registro: raw.registro,
    };
  }

  if (looksLikeRegistro(raw)) {
    const tipo = String(raw?.tipo_registro || raw?.kind || kindFallback || '').trim().toLowerCase();
    return {
      certidao: { tipo_registro: tipo || kindFallback || '' },
      registro: raw,
    };
  }

  return null;
}

let __lastNavigateKind: string | null = null;
let __lastNavigateTs = 0;
function navigateToAct(kind: string): void {
  const now = Date.now();
  // Debounce repeated navigation to same target to avoid multiple beforeunload dialogs
  if (__lastNavigateKind === kind && now - __lastNavigateTs < 5000) {
    try { console.debug('[navigate] navigation to', kind, 'debounced'); } catch {}
    return;
  }
  __lastNavigateKind = kind;
  __lastNavigateTs = now;

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

export function queuePendingPayload(payload: CertificatePayload): boolean {
  try {
    // Safely access localStorage via window if available (node/jsdom tests may not have global localStorage)
    const stor = (typeof window !== 'undefined' && (window as any).localStorage) ? (window as any).localStorage : undefined;
    if (!stor) {
      try { console.debug('[queue] localStorage unavailable in this environment'); } catch {}
      return false;
    }

    // Avoid queueing duplicate pending payloads
    const existing = stor.getItem(PENDING_KEY);
    try { console.debug('[queue] existing pending raw:', existing); } catch {}
    if (existing) {
      try { console.debug('[queue] pending payload already exists, skipping queue'); } catch {}
      return false;
    }
    stor.setItem(
      PENDING_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), payload }),
    );
    // Notify UI that a pending payload is queued so pages can show guidance
    try {
      try { console.debug('[queue] window present?', !!(window && (window as any).dispatchEvent)); } catch {}
      try { console.debug('[queue] dispatching pending event to window'); } catch {}
      const EventCtor = (window as any).CustomEvent || (window as any).Event;
      let ev: any;
      try {
        // Preferred: CustomEvent with detail
        ev = new EventCtor('app:pending-payload', { detail: { kind: (payload?.certidao as any)?.tipo_registro } });
      } catch (e) {
        // Fallback: construct simple event and attach detail
        ev = new EventCtor('app:pending-payload');
        ev.detail = { kind: (payload?.certidao as any)?.tipo_registro };
      }
      window.dispatchEvent(ev);
    } catch (e) { try { console.debug('[queue] dispatch error', e); } catch {} }
    return true;
  } catch (e) {
    try { console.debug('[queue] error when setting pending payload', e); } catch {}
    return false;
  }
}

export function consumePendingPayload(): CertificatePayload | null {
  try {
    const stor = (typeof window !== 'undefined' && (window as any).localStorage) ? (window as any).localStorage : undefined;
    if (!stor) return null;
    const raw = stor.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    stor.removeItem(PENDING_KEY);
    return parsed?.payload || null;
  } catch {
    return null;
  }
}

export function assertIsCertificatePayload(obj: any): { ok: boolean; errors: string[]; payload?: CertificatePayload } {
  const errors: string[] = [];
  const normalized = normalizePayload(obj, getCurrentAct());
  if (!normalized) {
    errors.push('JSON vazio ou invalido');
  } else {
    if (!normalized.certidao) errors.push('certidao ausente');
    if (!normalized.registro) errors.push('registro ausente');
    const tipo = (normalized as any)?.certidao?.tipo_registro;
    if (!tipo) errors.push('certidao.tipo_registro ausente');
  }
  return { ok: errors.length === 0, errors, payload: normalized || undefined };
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

function applyMatriculaParts(
  reg: Record<string, unknown>,
  root: Document | HTMLElement,
  warnings: BindWarning[],
): void {
  const rawLivro = (reg as any).matricula_livro ?? (reg as any).livro ?? '';
  const rawFolha = (reg as any).matricula_folha ?? (reg as any).folha ?? '';
  const rawTermo = (reg as any).matricula_termo ?? (reg as any).termo ?? '';
  const matricula = String((reg as any).matricula || '');

  let livro = String(rawLivro || '').trim();
  let folha = String(rawFolha || '').trim();
  let termo = String(rawTermo || '').trim();

  if ((!livro || !folha || !termo) && matricula) {
    const parsed = extractMatriculaParts(matricula);
    if (!livro && parsed.livro) livro = parsed.livro;
    if (!folha && parsed.folha) folha = parsed.folha;
    if (!termo && parsed.termo) termo = parsed.termo;
  }

  if (livro) setBoundValue('ui.matricula_livro', livro, root, warnings);
  if (folha) setBoundValue('ui.matricula_folha', folha, root, warnings);
  if (termo) setBoundValue('ui.matricula_termo', termo, root, warnings);
  if (matricula) setBySelector(root, '#matricula', matricula);
}

function applyCartorioOficio(
  cert: Record<string, unknown>,
  reg: Record<string, unknown>,
  root: Document | HTMLElement,
  warnings: BindWarning[],
): void {
  const mapping: Record<string, string> = (window as any).CNS_CARTORIOS || {};
  const oficioRaw = String((reg as any).cartorio_oficio || '').trim();
  if (oficioRaw) {
    setBoundValue('ui.cartorio_oficio', oficioRaw, root, warnings);
    return;
  }

  const cartorioCnsRaw = String((cert as any).cartorio_cns || '').replace(/\D+/g, '').slice(0, 6);
  let oficioFound = false;
  if (cartorioCnsRaw) {
    const oficio = Object.keys(mapping).find((k) => String(mapping[k]) === cartorioCnsRaw);
    if (oficio) {
      setBoundValue('ui.cartorio_oficio', oficio, root, warnings);
      oficioFound = true;
    } else {
      setBoundValue('certidao.cartorio_cns', cartorioCnsRaw, root, warnings);
    }
  }

  if (!oficioFound && (reg as any).matricula) {
    const matDigits = onlyDigits(String((reg as any).matricula || ''));
    const prefix = matDigits.slice(0, 6);
    if (prefix.length === 6) {
      setBoundValue('certidao.cartorio_cns', prefix, root, warnings);
      const oficioFromMat = Object.keys(mapping).find((k) => String(mapping[k]) === prefix);
      if (oficioFromMat) {
        setBoundValue('ui.cartorio_oficio', oficioFromMat, root, warnings);
      }
    }
  }
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
  applyMatriculaParts(reg as Record<string, unknown>, root, warnings);
  applyCartorioOficio(cert as Record<string, unknown>, reg as Record<string, unknown>, root, warnings);

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
  applyMatriculaParts(reg as Record<string, unknown>, root, warnings);
  applyCartorioOficio(cert as Record<string, unknown>, reg as Record<string, unknown>, root, warnings);
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
  applyMatriculaParts(reg as Record<string, unknown>, root, warnings);
  applyCartorioOficio(cert as Record<string, unknown>, reg as Record<string, unknown>, root, warnings);
}

export function applyCertificatePayloadToSecondCopy(
  payload: CertificatePayload,
  root: Document | HTMLElement = document,
  attemptsLeft: number = 5,
): { ok: boolean; warnings: BindWarning[]; navigated?: boolean } {
  const warnings: BindWarning[] = [];
  // Prefer the .app-shell element as scope when present. Narrow the type so TS knows it's an HTMLElement.
  const shell = (root as Document).querySelector?.('.app-shell') as HTMLElement | null;
  const scope: HTMLElement | Document = shell || root;
  const normalized = normalizePayload(payload, getCurrentAct());
  try { console.debug('[apply] normalized payload:', normalized, 'currentAct:', getCurrentAct()); } catch {};
  // E2E: capture initial DOM snapshot for diagnostics if enabled
  try { (window as any).__domSnapshots = (window as any).__domSnapshots || []; (window as any).__domSnapshots.push({ label: 'apply-start', time: Date.now(), act: getCurrentAct() }); } catch {}
  if (!normalized || !normalized.certidao || !normalized.registro) {
  emitApplyError({
    code: 'INVALID_PAYLOAD',
    kind: getCurrentAct(),
    message: 'Payload inválido: faltou certidao e/ou registro.',
    missing: [
      !normalized ? 'payload' : '',
      !normalized?.certidao ? 'certidao' : '',
      !normalized?.registro ? 'registro' : '',
    ].filter(Boolean),
  });
  // IMPORTANTÍSSIMO: não devolver ok:false pra não disparar reload no caller
  return { ok: true, warnings };
}

  const kind = String((normalized.certidao as any).tipo_registro || getCurrentAct() || '').trim().toLowerCase();
  const current = getCurrentAct();
  if (kind && current && kind !== current) {
    if (kind === 'nascimento' || kind === 'casamento' || kind === 'obito') {
      try { console.debug('[apply] queuing pending payload and navigating', { kind, current }); } catch {};
      const queued = queuePendingPayload(normalized);
      if (!queued) {
        try { console.debug('[apply] payload already queued, skipping navigate'); } catch {};
        return { ok: true, warnings, navigated: true };
      }
      // As part of diagnostics, record that navigation is requested
      try { (window as any).__domSnapshots = (window as any).__domSnapshots || []; (window as any).__domSnapshots.push({ label: 'apply-queued-navigate', time: Date.now(), kind, current }); } catch {}
      // Do not navigate automatically to avoid native beforeunload dialogs appearing multiple times.
      // The UI will receive 'app:pending-payload' and show an explicit action button for the user.
      return { ok: true, warnings, navigated: true };
    }
  }

  // If .app-shell scope doesn't contain any of the common binds, try fallbacks (document / body)
  const requiredChecks = ['registro.nome_completo', 'registro.cpf', 'registro.data_registro'];
  function hasBindInScope(s: HTMLElement | Document, path: string): boolean {
    try {
      const selector = `[data-bind="${path}"]`;
      const q = (s as Document).querySelector ? (s as Document).querySelector(selector) : (s as HTMLElement).querySelector(selector);
      return !!q;
    } catch {
      return false;
    }
  }

  let effectiveScope: HTMLElement | Document = scope;
  const anyInScope = requiredChecks.some((p) => hasBindInScope(effectiveScope, p));
  if (!anyInScope) {
    try { console.debug('[apply] no binds found in .app-shell, trying global fallbacks'); } catch {}
    if ((root as Document) && (root as Document).querySelector && requiredChecks.some((p) => hasBindInScope(document, p))) {
      effectiveScope = document;
      try { console.debug('[apply] using document as effectiveScope'); } catch {}
    } else if (document.body && requiredChecks.some((p) => hasBindInScope(document.body as HTMLElement, p))) {
      effectiveScope = document.body as HTMLElement;
      try { console.debug('[apply] using document.body as effectiveScope'); } catch {}
    } else {
      try { console.debug('[apply] no bind found in fallbacks; proceeding with original scope'); } catch {}
    }
  }
  // Clear previous values to avoid stale data when loading a smaller record.
  // NOTE: Only clear on the initial attempt to avoid wiping values applied by earlier successful attempts or concurrent retries.
  if (attemptsLeft === 5) {
    try {
      const nodes = Array.from(
        (scope as Document).querySelectorAll('input, select, textarea'),
      ) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
      nodes.forEach((el) => {
        if (el.closest('#drawer') || el.closest('.drawer')) return;
        if (el.closest('.taskbar-panel') || el.closest('.chat-search-shell')) return;
        if (el instanceof HTMLInputElement) {
          if (el.type === 'button' || el.type === 'submit') return;
          if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
            dispatchInputEvents(el);
            return;
          }
          if (el.type === 'file') return;
          el.value = '';
          dispatchInputEvents(el);
          return;
        }
        if (el instanceof HTMLTextAreaElement) {
          el.value = '';
          dispatchInputEvents(el);
          return;
        }
        if (el instanceof HTMLSelectElement) {
          const emptyOpt = Array.from(el.options).find((o) => o.value === '');
          if (emptyOpt) el.value = '';
          else if (el.options.length) el.selectedIndex = 0;
          dispatchInputEvents(el);
        }
      });
    } catch {
      // ignore
    }
  } else {
    try { console.debug('[apply] retry attempt, skipping clearing of existing inputs to avoid wiping applied values'); } catch {}
  }

  if (kind === 'nascimento') {
    applyNascimentoToForm(normalized, effectiveScope, warnings);
  } else if (kind === 'casamento') {
    applyCasamentoToForm(normalized, effectiveScope, warnings);
  } else if (kind === 'obito') {
    applyObitoToForm(normalized, effectiveScope, warnings);
  } else {
    applyObjectToBinds('certidao', normalized.certidao as Record<string, unknown>, effectiveScope, warnings);
    applyObjectToBinds('registro', normalized.registro as Record<string, unknown>, effectiveScope, warnings);
  }

  // Fallback: ensure key fields are filled even if scope mismatch or hidden duplicate binds exist.
  try {
    const docRoot = root as Document;
    const ensure = (path: string, value: unknown) => {
      const selector = `[data-bind="${path}"], [name="${path}"]`;
      const els = docRoot.querySelectorAll?.(selector) || [];
      if (!els.length) return;
      const hasValue = Array.from(els).some((el) => {
        const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')) {
          return !!input.checked;
        }
        return !!String((input as any).value || '').trim();
      });
      if (hasValue) return;
      Array.from(els).forEach((el) => setElementValue(el as HTMLElement, value));
    };

    ensure('registro.nome_completo', (normalized.registro as any)?.nome_completo || '');
    ensure('registro.cpf', (normalized.registro as any)?.cpf || '');
    ensure('registro.data_registro', (normalized.registro as any)?.data_registro || '');
  } catch {
    // ignore fallback errors
  }

  try { console.debug('[apply] warnings:', JSON.stringify(warnings)); } catch {}

  // Log effective status of critical binds after attempted apply
  try {
    const probe = (path: string) => {
      const els = findBoundElements(document, path);
      const values = els.map((el) => {
        try {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return (el as HTMLInputElement).value;
          if (el instanceof HTMLSelectElement) return el.value;
          return el.textContent || el.innerText || '';
        } catch { return '' }
      });
      try { console.debug('[apply] probe', { path, count: els.length, values }); } catch {}
    };
    ['certidao.tipo_registro', 'registro.nome_completo', 'registro.cpf', 'registro.data_registro'].forEach(probe);
  } catch {}

  // If required binds are missing (e.g., tipo_registro or core registro fields),
  // schedule a retry a few times to allow dynamic UI to render and bind elements to appear.
  try {
    const missingPaths = warnings.filter((w) => w.type === 'missing-bind').map((w) => w.path);
    const critical = ['certidao.tipo_registro', 'registro.nome_completo', 'registro.cpf', 'registro.data_registro'];
    const needRetry = attemptsLeft > 0 && missingPaths.some((p) => critical.includes(p));

    // Diagnostic helper to probe DOM for likely candidates when a bind is missing
    function diagnoseMissingBind(path: string) {
      try {
        const doc = document as Document;
        const fuzzySelectors = [
          `[data-bind="${path}"]`,
          `[name="${path}"]`,
          `[data-bind*="${path.split('.').pop()}"]`,
          `[name*="${path.split('.').pop()}"]`,
          `input[placeholder*="${path.split('.').pop()}"]`,
        ];
        const found: Array<{ selector: string; count: number; samples: string[] }> = [];
        fuzzySelectors.forEach((sel) => {
          try {
            const nodes = Array.from(doc.querySelectorAll(sel));
            if (nodes.length) {
              const samples = nodes.slice(0, 5).map((n) => (n as HTMLElement).outerHTML.slice(0, 400));
              found.push({ selector: sel, count: nodes.length, samples });
            }
          } catch (e) {
            // ignore selector errors
          }
        });

        // Also look for elements whose attributes contain the path parts
        const part = path.split('.').pop() || path;
        const attrMatches = Array.from(doc.querySelectorAll(`[data-bind],[name]`)).filter((el) => {
          try {
            const a = (el as HTMLElement).getAttribute('data-bind') || '';
            const b = (el as HTMLElement).getAttribute('name') || '';
            return a.includes(part) || b.includes(part);
          } catch { return false }
        }).slice(0, 5).map((n) => (n as HTMLElement).outerHTML.slice(0, 400));

        try { console.debug('[apply][diagnose] missing path', path, { fuzzy: found, attrMatchesCount: attrMatches.length, attrMatches: attrMatches.slice(0,3) }); } catch {}
      } catch (e) {
        try { console.debug('[apply][diagnose] error while diagnosing', path, e); } catch {}
      }
    }

    if (needRetry) {
      try { console.debug('[apply] missing critical binds detected, will attempt retries, attemptsLeft=', attemptsLeft - 1, 'missing=', missingPaths); } catch {}

      // Provide additional diagnostics for missing certidao.tipo_registro specifically
      if (missingPaths.includes('certidao.tipo_registro')) diagnoseMissingBind('certidao.tipo_registro');

      // Exponential backoff delay: 250ms, 500ms, 1000ms, ... based on attemptsLeft
      const delay = 250 * Math.pow(2, (5 - attemptsLeft));
      try { console.debug('[apply] scheduling retry in', delay, 'ms'); } catch {}

      // record snapshot that we'll retry
      try { (window as any).__domSnapshots = (window as any).__domSnapshots || []; (window as any).__domSnapshots.push({ label: 'apply-before-retry', time: Date.now(), attemptsLeft, missing: missingPaths }); } catch {}

      // schedule main retry with exponential backoff
      setTimeout(() => {
        try {
          applyCertificatePayloadToSecondCopy(payload, root, attemptsLeft - 1);
        } catch (e) {
          try { console.debug('[apply] retry failed', e); } catch {}
        }
      }, delay);

      // also schedule a quick, low-latency retry to catch near-immediate mounts
      if (attemptsLeft > 0) {
        setTimeout(() => {
          try { applyCertificatePayloadToSecondCopy(payload, root, attemptsLeft - 1); } catch (e) { try { console.debug('[apply] quick retry failed', e); } catch {} }
        }, Math.min(50, delay));
      }

      // Add a short-lived MutationObserver to detect when missing binds are added to the DOM
      try {
        const selectors = Array.from(new Set(missingPaths.map((p) => `[data-bind="${p}"], [name="${p}"]`)));
        if (selectors.length) {
          const observer = new MutationObserver((mutations) => {
            try {
              for (const sel of selectors) {
                if (document.querySelector(sel)) {
                  try { console.debug('[apply] observer detected selector', sel); } catch {}
                  try { observer.disconnect(); } catch {}
                  try { applyCertificatePayloadToSecondCopy(payload, root, attemptsLeft - 1); } catch (e) { try { console.debug('[apply] observer triggered retry failed', e); } catch {} }
                  return;
                }
              }
            } catch (e) { /* ignore */ }
          });
          try {
            observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
            // auto-disconnect after a brief period to avoid leaks
            setTimeout(() => { try { observer.disconnect(); } catch {} }, Math.min(3000, delay + 500));
          } catch (e) { /* ignore observe errors */ }
        }
      } catch (e) { /* ignore observer setup errors */ }

      // Schedule a conservative final ensure to reapply key fields after UI settles
      if (attemptsLeft > 0) {
          const finalDelay = delay + 200;
        setTimeout(() => {
          try {
            const docRoot = document as Document;
            const ensureDirect = (path: string, value: unknown) => {
              const selector = `[data-bind="${path}"], [name="${path}"]`;
              const els = Array.from(docRoot.querySelectorAll(selector));
              if (els.length) {
                els.forEach((el) => {
                  try {
                    setElementValue(el as HTMLElement, value);
                    try { (el as HTMLElement).setAttribute('value', String(value || '')); } catch {}
                    dispatchInputEvents(el as HTMLElement);
                  } catch (e) { /* ignore per-element */ }
                });
              }
            };

            ensureDirect('registro.nome_completo', (normalized.registro as any)?.nome_completo || '');
            ensureDirect('registro.cpf', (normalized.registro as any)?.cpf || '');
            ensureDirect('registro.data_registro', (normalized.registro as any)?.data_registro || '');
            ensureDirect('certidao.tipo_registro', (normalized.certidao as any)?.tipo_registro || '');

            try { (window as any).__domSnapshots = (window as any).__domSnapshots || []; (window as any).__domSnapshots.push({ label: 'apply-final-ensure-end', time: Date.now(), attemptsLeft }); } catch {}
          } catch (e) { try { console.debug('[apply] final ensure failed', e); } catch {} }
        }, finalDelay);
      }

      // If we've exhausted retries and critical binds remain missing, surface a non-blocking but prominent error
      try {
        if (attemptsLeft <= 0) {
          try { console.debug('[apply] attempts exhausted and critical binds missing', missingPaths); } catch {}
          const detail = { missing: Array.from(new Set(warnings.filter((w) => w.type === 'missing-bind').map((w) => w.path))), reason: 'binding-missing' };
          (window as any).__domSnapshots = (window as any).__domSnapshots || [];
          (window as any).__domSnapshots.push({ label: 'apply-failed', time: Date.now(), detail });
          try {
            const EventCtor = (window as any).CustomEvent || (window as any).Event;
            const ev = new EventCtor('apply:failed', { detail });
            window.dispatchEvent(ev);
          } catch (e) { try { console.debug('[apply] failed to dispatch apply:failed', e); } catch {} }

          // Return failure so callers can react appropriately without causing navigation/reload
          return { ok: false, warnings };
        }
      } catch (e) { /* ignore final failure reporting errors */ }

    }
    
    } catch (e) { /* ignore retry detection errors */ }


  return { ok: true, warnings };
}
