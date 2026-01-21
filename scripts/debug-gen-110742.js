const fs = require('fs');
const path = require('path');
const tplPath = path.resolve(__dirname, '../ui/templates/nascimento-modelo-110742.xml');
const samplePath = path.resolve(__dirname, '../tests/sample-nascimento.json');
const outPath = path.resolve(__dirname, '../out/nascimento-110742-gerado.xml');

const tpl = fs.readFileSync(tplPath, 'utf8');
const sample = require(samplePath);
const builder = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');
const out = builder.buildNascimentoXmlFromJson(tpl, sample);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, 'utf8');
console.log('Generated to', outPath);
