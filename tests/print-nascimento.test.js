const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildNascimentoXmlFromJson } = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');

const template = fs.readFileSync(path.resolve(__dirname, '../ui/templates/nascimento-modelo-110635.xml'), 'utf8');
const sample = require('./sample-nascimento.json');

const xml = buildNascimentoXmlFromJson(template, sample);

function stripValues(x) {
  return x.replace(/>[^<]*</g, '><');
}

// Normalize text-only or explicit empty tag pairs (e.g. <Tag>text</Tag> or <Tag></Tag>) to
// self-closing (<Tag/>) to avoid false-positives caused by different but equivalent
// empty-tag representations or presence of text-only content that should be ignored for
// structural comparison.
function normalizeTextOnlyElementsToSelfClosing(s) {
  return s.replace(/<([A-Za-z0-9_]+)(?=\s|>|\/)[^>]*>[^<]*<\/\1>/g, '<$1/>');
}

assert.strictEqual(stripValues(normalizeTextOnlyElementsToSelfClosing(xml)), stripValues(normalizeTextOnlyElementsToSelfClosing(template)), 'Estrutura do XML divergiu do template');
assert(xml.includes('<CodigoCNJ>163659</CodigoCNJ>'), 'CodigoCNJ nao aplicado');
assert(xml.includes('<Nome>FULANO DA SILVA</Nome>'), 'Nome nao foi inserido corretamente');
assert(xml.includes('<HoraNascimento>09:35:00</HoraNascimento>'), 'Hora nascimento formatada incorretamente');
assert(xml.includes('12345678901'), 'CPF nao aplicado');
assert(!xml.includes('LUCAS RAVI'), 'Nome do template nao foi substituido');

console.log('print-nascimento.test.js: all assertions passed');
