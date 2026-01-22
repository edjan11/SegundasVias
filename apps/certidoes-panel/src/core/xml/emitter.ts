import { CertidaoTipo, NormalizedCertidao } from '../domain';
import { emitCasamentoXml } from './casamento-emitter';
import { emitNascimentoXml } from './nascimento-emitter';

export type XmlEmitResult = { xml: string; warnings: string[] };

// Pure orchestrator boundary; can be exposed via HTTP in the future.
export function emitXml(tipo: CertidaoTipo, data: NormalizedCertidao, referenceXml: string): XmlEmitResult {
  if (tipo === 'casamento') return emitCasamentoXml(data, referenceXml);
  if (tipo === 'nascimento') return emitNascimentoXml(data, referenceXml);
  return { xml: referenceXml, warnings: ['Tipo nao suportado, retornando template'] };
}
