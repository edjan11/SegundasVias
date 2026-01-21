const fs = require('fs');
const path = require('path');
const { buildNascimentoXmlFromJson } = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');

const template = fs.readFileSync(path.resolve(__dirname, '../ui/templates/nascimento-modelo-crc.xml'), 'utf8');
const sample = require('../tests/sample-nascimento-crc.json');
const out = buildNascimentoXmlFromJson(template, sample);
fs.mkdirSync(path.resolve(__dirname, '../out'), { recursive: true });
const outPath = path.resolve(__dirname, '../out/nascimento-crc-gerado.xml');
fs.writeFileSync(outPath, out, 'utf8');
console.log('XML CRC gerado em:', outPath);
