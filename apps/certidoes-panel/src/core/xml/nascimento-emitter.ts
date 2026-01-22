import { NormalizedCertidao } from '../domain';
import { digitsOnly, normalizeUpper, normalizeWhitespace } from '../normalizer';
import { replaceTagValue, ensureXmlHeader } from './xml-utils';

export type XmlEmitResult = { xml: string; warnings: string[] };

// Pure emitter boundary; can be exposed via HTTP as a service later.
export function emitNascimentoXml(data: NormalizedCertidao, referenceXml: string): XmlEmitResult {
  let xml = ensureXmlHeader(referenceXml);
  const warnings: string[] = [];
  const reg = data.registro || {};
  const cert = data.certidao || {};

  xml = replaceTagValue(xml, 'DataRegistro', normalizeWhitespace(reg.data_registro || ''));
  xml = replaceTagValue(xml, 'Nome', normalizeWhitespace(reg.nome_completo || ''));
  xml = replaceTagValue(xml, 'DataNascimento', normalizeWhitespace(reg.data_nascimento || ''));
  xml = replaceTagValue(xml, 'HoraNascimento', normalizeWhitespace(reg.hora_nascimento || ''));
  xml = replaceTagValue(xml, 'CidadeNascimento', normalizeUpper(reg.municipio_nascimento || ''));
  xml = replaceTagValue(xml, 'UFNascimento', normalizeUpper(reg.uf_nascimento || ''));
  xml = replaceTagValue(xml, 'EstabelecimentoDoNascimento', normalizeWhitespace(reg.local_nascimento || ''));

  const sexo = String(reg.sexo || '').toLowerCase();
  if (sexo === 'masculino') xml = replaceTagValue(xml, 'Sexo', 'M');
  else if (sexo === 'feminino') xml = replaceTagValue(xml, 'Sexo', 'F');

  const cns = digitsOnly(cert.cartorio_cns || '').slice(0, 6);
  if (cns) xml = replaceTagValue(xml, 'CodigoCNJ', cns);
  else warnings.push('CNS ausente');

  if (reg.numero_dnv) xml = replaceTagValue(xml, 'NumeroDNV_DO', normalizeWhitespace(reg.numero_dnv));

  return { xml, warnings };
}
