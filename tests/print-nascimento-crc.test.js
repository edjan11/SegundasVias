const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildNascimentoXmlFromJson } = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');

const template = fs.readFileSync(path.resolve(__dirname, '../ui/templates/nascimento-modelo-crc.xml'), 'utf8');
const sample = require('./sample-nascimento-crc.json');

const xml = buildNascimentoXmlFromJson(template, sample);

function stripValues(x) {
  const normalized = x.replace(/<([A-Za-z0-9:_-]+)\s*\/\>/g, '<$1></$1>');
  return normalized.replace(/>[^<]*</g, '><');
}

assert.strictEqual(stripValues(xml), stripValues(template), 'Estrutura do XML CRC divergiu do template');
assert(xml.includes('<CartorioCNS>163659</CartorioCNS>'), 'CartorioCNS nao aplicado');
assert(xml.includes('<Transcricao>false</Transcricao>'), 'Transcricao deveria ser false');
assert(xml.includes('<Nome>FULANO DA SILVA</Nome>'), 'Nome principal nao foi inserido');

console.log('print-nascimento-crc.test.js: all assertions passed');
