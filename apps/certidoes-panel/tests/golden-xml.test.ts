import fs from 'fs';
import path from 'path';
import { emitXml } from '../src/core/xml/emitter';
import { normalizeInput } from '../src/application/normalization';
import { normalizeXmlWhitespace } from '../src/core/xml/xml-utils';
import { CertidaoInput } from '../src/core/domain';

const baseDir = path.resolve(__dirname, '..');

function loadJson(file: string): CertidaoInput {
  return JSON.parse(fs.readFileSync(path.join(baseDir, file), 'utf-8'));
}

function loadXml(file: string): string {
  return fs.readFileSync(path.join(baseDir, file), 'utf-8');
}

function assertEqual(name: string, a: string, b: string) {
  if (a !== b) {
    throw new Error(`Golden XML mismatch: ${name}`);
  }
}

export function runGoldenTests() {
  const casamentoInput = loadJson('samples/input/certidao.casamento.input.json');
  const casamentoRef = loadXml('samples/reference/certidao.casamento.reference.xml');
  const casamentoNorm = normalizeInput(casamentoInput);
  const casamentoOut = emitXml('casamento', casamentoNorm, casamentoRef).xml;
  assertEqual('casamento', normalizeXmlWhitespace(casamentoOut), normalizeXmlWhitespace(casamentoRef));

  const nascimentoInput = loadJson('samples/input/certidao.nascimento.input.json');
  const nascimentoRef = loadXml('samples/reference/certidao.nascimento.reference.xml');
  const nascimentoNorm = normalizeInput(nascimentoInput);
  const nascimentoOut = emitXml('nascimento', nascimentoNorm, nascimentoRef).xml;
  assertEqual('nascimento', normalizeXmlWhitespace(nascimentoOut), normalizeXmlWhitespace(nascimentoRef));

  return true;
}

if (require.main === module) {
  runGoldenTests();
  console.log('golden-xml ok');
}
