import { escapeHtml, sanitizeHref } from '../shared/print-utils';

type AnyJson = any;

async function fetchTemplate(href: string): Promise<string> {
  const res = await fetch(href, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Template fetch failed: ${href}`);
  return await res.text();
}

async function loadTemplate(candidates: string[]): Promise<string> {
  let lastErr: unknown = null;
  for (const href of candidates) {
    try {
      return await fetchTemplate(href);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Template not found');
}

function normalizeSpace(value: string): string {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fallback(value: string, def: string): string {
  const v = normalizeSpace(value);
  return v || def;
}

function replaceAll(raw: string, token: string, value: string): string {
  return raw.split(token).join(value);
}

function parseDateParts(value: string): { dd: string; mm: string; yyyy: string } | null {
  const raw = normalizeSpace(value);
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return { dd: m[1], mm: m[2], yyyy: m[3] };
}

function buildDateExtenso(value: string): string {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const meses = [
    'JANEIRO',
    'FEVEREIRO',
    'MARCO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO',
  ];
  const idx = Number(parts.mm) - 1;
  const mes = meses[idx] || '';
  if (!mes) return '';
  return `${parts.dd} DE ${mes} DE ${parts.yyyy}`;
}

export async function buildCasamentoPdfHtmlFromTemplate(
  data: AnyJson,
  opts?: { templateHref?: string; cssHref?: string },
): Promise<string> {
  const templateHref = opts?.templateHref;
  const cssHref = sanitizeHref(opts?.cssHref, '/assets/pdfElementsCasamento/pdf-casamento.css');

  const template = await loadTemplate([
    templateHref,
    '/pdfElementsCasamento/print-casamento-pdf-tj.html',
    '../pdfElementsCasamento/print-casamento-pdf-tj.html',
  ].filter(Boolean) as string[]);

  const reg = data?.registro ?? {};
  const cert = data?.certidao ?? {};
  const c1 = (reg.conjuges && reg.conjuges[0]) || {};
  const c2 = (reg.conjuges && reg.conjuges[1]) || {};

  const dataCelebracaoExtenso = buildDateExtenso(reg.data_celebracao || '');
  const dataRegistroExtenso = buildDateExtenso(reg.data_registro || '');

  const values: Record<string, string> = {
    '{{CSS_HREF}}': cssHref,
    '{{MATRICULA}}': fallback(reg.matricula ?? '', 'NAO CONSTA'),
    '{{CONJUGE1_NOME}}': fallback(c1.nome_atual_habilitacao ?? '', 'NAO CONSTA'),
    '{{CONJUGE1_CPF}}': fallback(c1.cpf ?? '', 'NAO CONSTA'),
    '{{CONJUGE1_NASC_EXTENSO}}': fallback(buildDateExtenso(c1.data_nascimento || ''), 'NAO CONSTA'),
    '{{CONJUGE1_DIA}}': fallback(parseDateParts(c1.data_nascimento || '')?.dd || '', 'NAO CONSTA'),
    '{{CONJUGE1_MES}}': fallback(parseDateParts(c1.data_nascimento || '')?.mm || '', 'NAO CONSTA'),
    '{{CONJUGE1_ANO}}': fallback(parseDateParts(c1.data_nascimento || '')?.yyyy || '', 'NAO CONSTA'),
    '{{CONJUGE1_NAT}}': fallback(c1.municipio_naturalidade ?? '', 'NAO CONSTA'),
    '{{CONJUGE1_UF}}': fallback(c1.uf_naturalidade ?? '', 'N/C'),
    '{{CONJUGE1_GENITORES}}': fallback(c1.genitores ?? '', 'NAO CONSTA'),

    '{{CONJUGE2_NOME}}': fallback(c2.nome_atual_habilitacao ?? '', 'NAO CONSTA'),
    '{{CONJUGE2_CPF}}': fallback(c2.cpf ?? '', 'NAO CONSTA'),
    '{{CONJUGE2_NASC_EXTENSO}}': fallback(buildDateExtenso(c2.data_nascimento || ''), 'NAO CONSTA'),
    '{{CONJUGE2_DIA}}': fallback(parseDateParts(c2.data_nascimento || '')?.dd || '', 'NAO CONSTA'),
    '{{CONJUGE2_MES}}': fallback(parseDateParts(c2.data_nascimento || '')?.mm || '', 'NAO CONSTA'),
    '{{CONJUGE2_ANO}}': fallback(parseDateParts(c2.data_nascimento || '')?.yyyy || '', 'NAO CONSTA'),
    '{{CONJUGE2_NAT}}': fallback(c2.municipio_naturalidade ?? '', 'NAO CONSTA'),
    '{{CONJUGE2_UF}}': fallback(c2.uf_naturalidade ?? '', 'N/C'),
    '{{CONJUGE2_GENITORES}}': fallback(c2.genitores ?? '', 'NAO CONSTA'),

    '{{DATA_CELEBRACAO_EXTENSO}}': fallback(dataCelebracaoExtenso, 'NAO CONSTA'),
    '{{DATA_REGISTRO_EXTENSO}}': fallback(dataRegistroExtenso, 'NAO CONSTA'),
    '{{DATA_CELEBRACAO_DIA}}': fallback(parseDateParts(reg.data_celebracao || '')?.dd || '', 'NAO CONSTA'),
    '{{DATA_CELEBRACAO_MES}}': fallback(parseDateParts(reg.data_celebracao || '')?.mm || '', 'NAO CONSTA'),
    '{{DATA_CELEBRACAO_ANO}}': fallback(parseDateParts(reg.data_celebracao || '')?.yyyy || '', 'NAO CONSTA'),

    '{{REGIME_BENS}}': fallback(reg.regime_bens ?? '', 'NAO CONSTA'),
    '{{ANOTACOES}}': fallback(reg.averbacao_anotacao ?? '', 'NAO CONSTA'),

    '{{CNS}}': fallback(cert.cartorio_cns ?? '', '000000'),
    '{{CARTORIO_CIDADE_UF}}': fallback(cert.cartorio_cidade_uf ?? '', ''),
    '{{SERVENTUARIO}}': fallback(cert.serventuario_nome ?? '', ''),
    '{{ASSINANTE}}': fallback(reg.assinante ?? cert.serventuario_nome ?? '', 'ASSINANTE NAO INFORMADO'),
    '{{SERVENTUARIO_CARGO}}': fallback(cert.serventuario_cargo ?? '', 'ESCREVENTE'),
  };

  let html = template;
  for (const [token, value] of Object.entries(values)) {
    html = replaceAll(html, token, escapeHtml(value));
  }

  return html;
}
