import { NormalizedCertidao } from '../domain';
import { digitsOnly, normalizeUpper, normalizeWhitespace } from '../normalizer';
import { replaceTagValue, ensureXmlHeader } from './xml-utils';

export type XmlEmitResult = { xml: string; warnings: string[] };

// Pure emitter boundary; can be exposed via HTTP as a service later.
export function emitCasamentoXml(data: NormalizedCertidao, referenceXml: string): XmlEmitResult {
  let xml = ensureXmlHeader(referenceXml);
  const warnings: string[] = [];
  const reg = data.registro || {};
  const cert = data.certidao || {};
  const c1 = (reg.conjuges && reg.conjuges[0]) || {};
  const c2 = (reg.conjuges && reg.conjuges[1]) || {};

  xml = replaceTagValue(xml, 'pc_101', normalizeWhitespace(c1.nome_atual_habilitacao || ''));
  xml = replaceTagValue(xml, 'pc_111', normalizeWhitespace(c1.data_nascimento || ''));
  xml = replaceTagValue(xml, 'pc_109', normalizeUpper(c1.municipio_naturalidade || ''));
  xml = replaceTagValue(xml, 'pc_110', normalizeUpper(c1.uf_naturalidade || ''));
  xml = replaceTagValue(xml, 'pc_130', normalizeWhitespace(c1.genitores || ''));

  xml = replaceTagValue(xml, 'pc_201', normalizeWhitespace(c2.nome_atual_habilitacao || ''));
  xml = replaceTagValue(xml, 'pc_211', normalizeWhitespace(c2.data_nascimento || ''));
  xml = replaceTagValue(xml, 'pc_209', normalizeUpper(c2.municipio_naturalidade || ''));
  xml = replaceTagValue(xml, 'pc_210', normalizeUpper(c2.uf_naturalidade || ''));
  xml = replaceTagValue(xml, 'pc_230', normalizeWhitespace(c2.genitores || ''));

  const cns = digitsOnly(cert.cartorio_cns || '').slice(0, 6);
  if (cns) xml = replaceTagValue(xml, 'pc_301', cns);
  else warnings.push('CNS ausente');

  if (reg.data_registro) xml = replaceTagValue(xml, 'pc_311', normalizeWhitespace(reg.data_registro));
  if (reg.regime_bens) xml = replaceTagValue(xml, 'pc_320', normalizeWhitespace(reg.regime_bens));

  return { xml, warnings };
}
