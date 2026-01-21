const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildNascimentoXmlFromJson } = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');

const template = fs.readFileSync(path.resolve(__dirname, '../ui/templates/nascimento-modelo-110635.xml'), 'utf8');
const sample = require('./sample-nascimento.json');

const xml = buildNascimentoXmlFromJson(template, sample);

function stripValues(x) {
  // Normalize self-closing (<Tag/>) to explicit empty tags (<Tag></Tag>) so both forms compare equally
  const normalized = x.replace(/<([A-Za-z0-9:_-]+)\s*\/\>/g, '<$1></$1>');
  return normalized.replace(/>[^<]*</g, '><');
}

assert.strictEqual(stripValues(xml), stripValues(template), 'Estrutura do XML divergiu do template');
assert(xml.includes('<CodigoCNJ>163659</CodigoCNJ>'), 'CodigoCNJ nao aplicado');
assert(xml.includes('<Nome>FULANO DA SILVA</Nome>'), 'Nome nao foi inserido corretamente');
assert(xml.includes('<HoraNascimento>09:35:00</HoraNascimento>'), 'Hora nascimento formatada incorretamente');
assert(xml.includes('12345678901'), 'CPF nao aplicado');
assert(!xml.includes('LUCAS RAVI'), 'Nome do template nao foi substituido');
assert(xml.includes('<CodigoLocalDoNascimento>1</CodigoLocalDoNascimento>'), 'CodigoLocalDoNascimento nao foi aplicado corretamente');

console.log('print-nascimento.test.js: all assertions passed');
