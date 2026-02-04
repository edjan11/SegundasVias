import { escapeHtml, sanitizeHref } from '../shared/print-utils';

type AnyJson = any;

async function fetchTemplate(href: string): Promise<string> {
      // Ensure we use relative paths or window.location.origin in browser context
      let resolvedHref = href;
      if (typeof window !== 'undefined' && resolvedHref.startsWith('/')) {
        resolvedHref = window.location.origin + resolvedHref;
      }
      const res = await fetch(resolvedHref, { cache: 'no-store' });
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

function stripSection(raw: string, key: string, keep: boolean): string {
  const start = `<!--${key}_START-->`;
  const end = `<!--${key}_END-->`;
  const startIdx = raw.indexOf(start);
  if (startIdx < 0) return raw;
  const endIdx = raw.indexOf(end, startIdx + start.length);
  if (endIdx < 0) return raw;
  if (keep) {
    return raw.replace(start, '').replace(end, '');
  }
  return raw.slice(0, startIdx) + raw.slice(endIdx + end.length);
}

export async function buildNascimentoPdfHtmlFromTemplate(
  data: AnyJson,
  opts?: { templateHref?: string; cssHref?: string },
): Promise<string> {
  const templateHref = opts?.templateHref;
  const cssHref = sanitizeHref(opts?.cssHref, '/assets/pdfElementsNascimento/pdf.css');

  const template = await loadTemplate([
    templateHref,
    '/pdfElementsNascimento/print-nascimento-tj.html',
    '../pdfElementsNascimento/print-nascimento-tj.html',
  ].filter(Boolean) as string[]);

  const reg = data?.registro ?? {};
  const cert = data?.certidao ?? {};

  const hasGenitor1 = !!(
    normalizeSpace(reg.mae_nome ?? '') ||
    normalizeSpace(reg.mae_municipio ?? '') ||
    normalizeSpace(reg.mae_uf ?? '') ||
    normalizeSpace(reg.mae_avos ?? '')
  );
  const hasGenitor2 = !!(
    normalizeSpace(reg.pai_nome ?? '') ||
    normalizeSpace(reg.pai_municipio ?? '') ||
    normalizeSpace(reg.pai_uf ?? '') ||
    normalizeSpace(reg.pai_avos ?? '')
  );
  const hasGenitor3 = !!(
    normalizeSpace(reg.genitor3_nome ?? '') ||
    normalizeSpace(reg.genitor3_municipio ?? '') ||
    normalizeSpace(reg.genitor3_uf ?? '') ||
    normalizeSpace(reg.genitor3_avos ?? '')
  );
  const hasGenitor4 = !!(
    normalizeSpace(reg.genitor4_nome ?? '') ||
    normalizeSpace(reg.genitor4_municipio ?? '') ||
    normalizeSpace(reg.genitor4_uf ?? '') ||
    normalizeSpace(reg.genitor4_avos ?? '')
  );

  const values: Record<string, string> = {
    '{{CSS_HREF}}': cssHref,
    '{{NOME}}': fallback(reg.nome_completo ?? '', 'NAO CONSTA'),
    '{{CPF}}': fallback(reg.cpf ?? '', 'NAO CONSTA'),
    '{{MATRICULA}}': fallback(reg.matricula_formatada ?? reg.matricula ?? '', 'NAO CONSTA'),
    '{{DATA_NASC_EXTENSO}}': fallback(reg.data_nascimento_extenso ?? '', 'NAO CONSTA'),
    '{{DIA_NASC}}': fallback(reg.dia_nascimento ?? '', 'NAO CONSTA'),
    '{{MES_NASC}}': fallback(reg.mes_nascimento ?? '', 'NAO CONSTA'),
    '{{ANO_NASC}}': fallback(reg.ano_nascimento ?? '', 'NAO CONSTA'),
    '{{HORA}}': fallback(reg.hora_nascimento ?? '', 'NAO CONSTA'),
    '{{NATURALIDADE}}': fallback(reg.naturalidade_municipio_uf ?? '', 'NAO CONSTA'),
    '{{NATURALIDADE_UF}}': fallback(reg.naturalidade_uf ?? '', 'N/C'),
    '{{LOCAL_NASC}}': fallback(reg.local_nascimento ?? '', 'NAO CONSTA'),
    '{{MUNICIPIO_NASC}}': fallback(reg.municipio_nascimento ?? '', 'NAO CONSTA'),
    '{{UF_NASC}}': fallback(reg.uf_nascimento ?? '', 'N/C'),
    '{{SEXO}}': fallback(reg.sexo ?? '', 'NAO CONSTA'),
    '{{MAE_NOME}}': fallback(reg.mae_nome ?? '', 'NAO CONSTA'),
    '{{MAE_MUNICIPIO}}': fallback(reg.mae_municipio ?? '', 'NAO CONSTA'),
    '{{MAE_UF}}': fallback(reg.mae_uf ?? '', 'N/C'),
    '{{MAE_AVOS}}': fallback(reg.mae_avos ?? '', 'NAO CONSTA'),
    '{{PAI_NOME}}': fallback(reg.pai_nome ?? '', 'NAO CONSTA'),
    '{{PAI_MUNICIPIO}}': fallback(reg.pai_municipio ?? '', 'NAO CONSTA'),
    '{{PAI_UF}}': fallback(reg.pai_uf ?? '', 'N/C'),
    '{{PAI_AVOS}}': fallback(reg.pai_avos ?? '', 'NAO CONSTA'),
    '{{GENITOR3_NOME}}': fallback(reg.genitor3_nome ?? '', 'NAO CONSTA'),
    '{{GENITOR3_MUNICIPIO}}': fallback(reg.genitor3_municipio ?? '', 'NAO CONSTA'),
    '{{GENITOR3_UF}}': fallback(reg.genitor3_uf ?? '', 'N/C'),
    '{{GENITOR3_AVOS}}': fallback(reg.genitor3_avos ?? '', 'NAO CONSTA'),
    '{{GENITOR4_NOME}}': fallback(reg.genitor4_nome ?? '', 'NAO CONSTA'),
    '{{GENITOR4_MUNICIPIO}}': fallback(reg.genitor4_municipio ?? '', 'NAO CONSTA'),
    '{{GENITOR4_UF}}': fallback(reg.genitor4_uf ?? '', 'N/C'),
    '{{GENITOR4_AVOS}}': fallback(reg.genitor4_avos ?? '', 'NAO CONSTA'),
    '{{GEMEO}}': fallback(reg.gemeo ?? '', 'NAO CONSTA'),
    '{{DATA_REGISTRO_EXTENSO}}': fallback(reg.data_registro_extenso ?? '', 'NAO CONSTA'),
    '{{DNV}}': fallback(reg.numero_dnv ?? '', 'NAO CONSTA'),
    '{{AVERBACAO}}': fallback(reg.averbacao_anotacao ?? '', 'NAO CONSTA'),
    '{{ANOTACOES}}': fallback(reg.anotacoes_voluntarias ?? '', 'NAO CONSTA'),
    '{{CNS}}': fallback(cert.cartorio_cns ?? '', '000000'),
    '{{CARTORIO_CIDADE_UF}}': fallback(cert.cartorio_cidade_uf ?? '', ''),
    '{{SERVENTUARIO}}': fallback(cert.serventuario_nome ?? reg.nome_assinante ?? '', ''),
    '{{SERVENTUARIO_CARGO}}': fallback(cert.serventuario_cargo ?? '', 'ESCREVENTE'),
    '{{ASSINANTE_ASSINATURA}}': fallback(cert.serventuario_nome ?? reg.nome_assinante ?? '', ''),
    '{{ASSINANTE_CARGO}}': fallback(cert.serventuario_cargo ?? '', 'ESCREVENTE'),
  };

  let html = template;
  html = stripSection(html, 'GENITOR1', hasGenitor1);
  html = stripSection(html, 'GENITOR2', hasGenitor2);
  html = stripSection(html, 'GENITOR3', hasGenitor3);
  html = stripSection(html, 'GENITOR4', hasGenitor4);
  for (const [token, value] of Object.entries(values)) {
    html = replaceAll(html, token, escapeHtml(value));
  }

  return html;
}
