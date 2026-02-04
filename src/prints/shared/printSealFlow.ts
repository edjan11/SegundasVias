import { showSeloModal } from '../../seal/seloModal';
import type { SeloOperationResult } from '../../seal/seloController';

export type PrintSealCertType = 'nascimento' | 'casamento' | 'obito';

export interface PrintSealFlowParams {
  certType: PrintSealCertType;
  payload: any;
  popupWindow: Window;
}

const SEAL_BLOCK_ID = 'seal-image-print-block';
const MOCK_SEAL_STORAGE_KEY = 'seal.mock.enabled';

function onlyDigits(value: unknown): string {
  return String(value || '').replace(/\D+/g, '');
}

function pickName(value: unknown): string {
  return String(value || '').trim();
}

function resolveNomeRegistrado(certType: PrintSealCertType, payload: any): string {
  const reg = payload?.registro || {};
  if (certType === 'casamento') {
    const conjuges = Array.isArray(reg?.conjuges) ? reg.conjuges : [];
    const first = conjuges[0] || {};
    return (
      pickName(first.nome_atual_habilitacao) ||
      pickName(first.nome_atual) ||
      pickName(first.nome_completo) ||
      pickName(first.nome)
    );
  }
  return (
    pickName(reg?.nome_completo) ||
    pickName(reg?.nome_falecido) ||
    pickName(reg?.nome)
  );
}

function resolveNomeConjuge(payload: any): string {
  const conjuges = Array.isArray(payload?.registro?.conjuges) ? payload.registro.conjuges : [];
  const second = conjuges[1] || {};
  return (
    pickName(second.nome_atual_habilitacao) ||
    pickName(second.nome_atual) ||
    pickName(second.nome_completo) ||
    pickName(second.nome)
  );
}

function resolveMatricula(payload: any): string {
  const raw = String(payload?.registro?.matricula || '').trim();
  if (!raw) return '';
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (
    normalized === 'NAO CONSTA' ||
    normalized === 'N/C' ||
    normalized === 'NAO INFORMADO'
  ) {
    return '';
  }
  return raw;
}

function resolveCodCartorio(payload: any): string {
  const certCns = onlyDigits(payload?.certidao?.cartorio_cns).slice(0, 6);
  if (certCns) return certCns;
  const registroCns = onlyDigits(payload?.registro?.cartorio_cns).slice(0, 6);
  if (registroCns) return registroCns;
  const genericCns = onlyDigits(payload?.registro?.cns).slice(0, 6);
  if (genericCns) return genericCns;
  const matriculaBase = onlyDigits(payload?.registro?.matricula_base).slice(0, 6);
  if (matriculaBase) return matriculaBase;
  const matricula = onlyDigits(payload?.registro?.matricula);
  return matricula.slice(0, 6);
}

function removeSealFromPopup(popupWindow: Window): void {
  const doc = popupWindow.document;
  const existing = doc.getElementById(SEAL_BLOCK_ID);
  if (existing) existing.remove();
}

function appendSealToPopup(popupWindow: Window, imageDataUrl: string): void {
  const doc = popupWindow.document;
  removeSealFromPopup(popupWindow);

  const wrapper = doc.createElement('div');
  wrapper.id = SEAL_BLOCK_ID;
  wrapper.style.marginTop = '20px';
  wrapper.style.paddingTop = '8px';
  wrapper.style.borderTop = '1px solid #d1d5db';
  wrapper.style.display = 'flex';
  wrapper.style.justifyContent = 'flex-start';
  wrapper.style.alignItems = 'flex-end';
  wrapper.style.width = '100%';
  wrapper.style.pageBreakInside = 'avoid';

  const figure = doc.createElement('figure');
  figure.style.margin = '0';
  figure.style.display = 'inline-flex';
  figure.style.flexDirection = 'column';
  figure.style.alignItems = 'flex-start';
  figure.style.gap = '4px';

  const title = doc.createElement('figcaption');
  title.textContent = 'SELO DIGITAL TJSE';
  title.style.fontSize = '9px';
  title.style.fontWeight = '700';
  title.style.letterSpacing = '0.04em';
  title.style.color = '#334155';
  figure.appendChild(title);

  const img = doc.createElement('img');
  img.src = imageDataUrl;
  img.alt = 'Selo digital TJSE';
  img.style.maxWidth = '180px';
  img.style.width = '100%';
  img.style.height = 'auto';
  img.style.display = 'block';
  figure.appendChild(img);
  wrapper.appendChild(figure);

  const body = doc.body;
  const mainContainer =
    (doc.querySelector('body > center > div') as HTMLElement | null) ||
    (doc.querySelector('center > div') as HTMLElement | null) ||
    body;
  const lastTable = mainContainer.querySelector('table:last-of-type');

  if (lastTable?.parentElement) {
    lastTable.parentElement.insertBefore(wrapper, lastTable.nextSibling);
    return;
  }

  mainContainer.appendChild(wrapper);
}

function resolveResultImage(result: SeloOperationResult): string {
  const value = String(result?.imageDataUrl || '').trim();
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  return `data:image/png;base64,${value}`;
}

function isMockSealEnabled(popupWindow: Window, payload: any): boolean {
  try {
    const popupFlag = (popupWindow as any)?.SEAL_CONFIG?.mockSeal === true;
    const openerFlag = (popupWindow.opener as any)?.SEAL_CONFIG?.mockSeal === true;
    const storageFlag = popupWindow.localStorage?.getItem(MOCK_SEAL_STORAGE_KEY) === '1';
    const payloadFlag = payload?.certidao?.mock_selo === true;
    return popupFlag || openerFlag || storageFlag || payloadFlag;
  } catch {
    return false;
  }
}

function buildMockSealDataUrl(certType: PrintSealCertType, matricula: string, codCartorio: string): string {
  const escapeSvg = (value: string): string =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  const now = new Date();
  const stamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
  const safeMatricula = escapeSvg(String(matricula || '').slice(0, 32) || 'SEM MATRICULA');
  const safeCert = escapeSvg(certType.toUpperCase());
  const safeCartorio = escapeSvg(codCartorio || '000000');
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="380" height="180" viewBox="0 0 380 180">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="378" height="178" rx="10" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
  <rect x="10" y="10" width="360" height="40" rx="8" fill="url(#g)"/>
  <text x="190" y="36" text-anchor="middle" fill="#ffffff" font-size="16" font-family="Segoe UI, Arial" font-weight="700">SELO DIGITAL TJSE (SIMULACAO)</text>
  <text x="16" y="72" fill="#0f172a" font-size="13" font-family="Segoe UI, Arial" font-weight="700">ATO: ${safeCert}</text>
  <text x="16" y="94" fill="#0f172a" font-size="12" font-family="Segoe UI, Arial">CARTORIO: ${safeCartorio}</text>
  <text x="16" y="114" fill="#0f172a" font-size="11" font-family="Segoe UI, Arial">MATRICULA: ${safeMatricula}</text>
  <text x="16" y="134" fill="#0f172a" font-size="10" font-family="Segoe UI, Arial">NUM SELO: MOCK-${safeCartorio}-${now.getTime()}</text>
  <text x="16" y="152" fill="#334155" font-size="10" font-family="Segoe UI, Arial">GERADO EM: ${stamp}</text>
</svg>`;
  const encoded = encodeURIComponent(svg).replace(/%20/g, ' ');
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

export async function runSealFlowBeforePrint(params: PrintSealFlowParams): Promise<boolean> {
  const nomeRegistrado = resolveNomeRegistrado(params.certType, params.payload);
  const nomeConjuge = params.certType === 'casamento' ? resolveNomeConjuge(params.payload) : '';
  const matricula = resolveMatricula(params.payload);
  const codCartorio = resolveCodCartorio(params.payload);

  if (isMockSealEnabled(params.popupWindow, params.payload)) {
    appendSealToPopup(
      params.popupWindow,
      buildMockSealDataUrl(params.certType, matricula || 'SEM MATRICULA', codCartorio || '000000'),
    );
    return true;
  }

  if (!matricula || !codCartorio) {
    const missing: string[] = [];
    if (!matricula) missing.push('matricula');
    if (!codCartorio) missing.push('cartorio_cns');
    const msg = `Selagem indisponivel: campo(s) obrigatorio(s) ausente(s): ${missing.join(', ')}. Atualize os dados e gere o PDF novamente.`;
    console.warn('[printSealFlow]', msg);
    try {
      params.popupWindow.alert(msg);
    } catch {
      // ignore
    }
    return false;
  }

  let modalRef: { hide: () => void } | null = null;
  const hadSealBefore = !!params.popupWindow.document.getElementById(SEAL_BLOCK_ID);

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (allowPrint: boolean, imageDataUrl?: string) => {
      if (settled) return;
      settled = true;

      if (imageDataUrl) {
        appendSealToPopup(params.popupWindow, imageDataUrl);
      } else if (!hadSealBefore) {
        removeSealFromPopup(params.popupWindow);
      }

      try {
        modalRef?.hide();
      } catch {
        // ignore
      }

      resolve(allowPrint);
    };

    const openModal = async () => {
      try {
        params.popupWindow.focus();
        modalRef = await showSeloModal({
          certType: params.certType,
          matricula,
          codCartorio,
          nomeRegistrado: nomeRegistrado || 'REGISTRO',
          nomeConjuge: nomeConjuge || undefined,
          hostWindow: params.popupWindow,
          onSuccess: (result) => settle(true, resolveResultImage(result)),
          onCancel: () => settle(false),
          onError: (error) => {
            console.warn('[printSealFlow] erro de selagem:', error);
          },
        });
      } catch (error) {
        console.error('[printSealFlow] falha ao abrir modal de selagem', error);
        settle(true);
      }
    };

    void openModal();
  });
}
