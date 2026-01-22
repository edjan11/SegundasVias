const fs = require('fs');
const path = require('path');
const { buildCasamentoXmlFromJson } = require('../dist-src/acts/casamento/printCasamentoXml');

const tplPath = path.resolve(__dirname, '../ui/templates/casamento-modelo.xml');
const jsonPath = path.resolve(__dirname, '../tests/JSON DE CASAMENTO.json');

const tpl = fs.readFileSync(tplPath, 'utf8');
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const result = buildCasamentoXmlFromJson(tpl, json);
console.log('warnings:', result.warnings);
const xml = result.xml;
console.log(xml.slice(0, 400));

// basic tag balance check: use separate counts for opening (<tag ...>) and closing (</tag>)
function countMatches(re) {
  const s = xml;
  let c = 0;
  let mm;
  while ((mm = re.exec(s))) c += 1;
  return c;
}

const tagNames = Array.from(new Set(Array.from(xml.matchAll(/<\/?([A-Za-z0-9_]+)(?=\s|>|\/)/g)).map(m => m[1])));
const unbalanced = tagNames
  .map(name => ({ name, open: countMatches(new RegExp(`<${name}(?=\s|>|/)`, 'g')), close: countMatches(new RegExp(`</${name}>`, 'g')) }))
  .filter(x => x.open !== x.close);

if (unbalanced.length === 0) console.log('Tag balance: OK ✅');
else console.log('Tag balance: UNBALANCED ❌', unbalanced.slice(0, 10));

// Save to tmp for inspection
fs.writeFileSync(path.resolve(__dirname, '../tmp/casamento-generated.xml'), xml);
console.log('Wrote tmp/casamento-generated.xml');

// Use jsdom to check XML parse errors
const { JSDOM } = require('jsdom');
const dom = new JSDOM(xml, { contentType: 'application/xml' });
const doc = dom.window.document;
const parserError = doc.querySelector('parsererror');
if (parserError) {
  console.error('XML parser error detected:\n', parserError.textContent.slice(0, 400));
  process.exitCode = 2;
} else {
  console.log('XML parsed by JSDOM: OK ✅');
}
