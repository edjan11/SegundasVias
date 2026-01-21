const fs = require('fs');
const path = require('path');
const { buildNascimentoXmlFromJson } = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');

const template = fs.readFileSync(path.resolve(__dirname, '../ui/templates/nascimento-modelo-110635.xml'), 'utf8');
const sample = require('../tests/sample-nascimento.json');
const xml = buildNascimentoXmlFromJson(template, sample);

function stripValues(x) { return x.replace(/>[^<]*</g, '><'); }

const s1 = stripValues(xml);
const s2 = stripValues(template);

let i=0; while(i<s1.length && i<s2.length && s1[i]===s2[i]) i++;
console.log('first mismatch index:', i);
console.log('context around mismatch in actual:');
console.log(s1.slice(Math.max(0,i-80), i+80));
console.log('\ncontext around mismatch in expected:');
console.log(s2.slice(Math.max(0,i-80), i+80));

// Print small diff of tags around mismatch
function extractTags(s, idx, radius=200){
  const start = Math.max(0, s.lastIndexOf('<', idx - 1) - radius);
  const end = Math.min(s.length, s.indexOf('>', idx) + 1 + radius);
  return s.slice(start,end);
}
console.log('\n--- TAG WINDOW (actual) ---\n', extractTags(s1,i));
console.log('\n--- TAG WINDOW (expected) ---\n', extractTags(s2,i));

// Save outputs for manual inspection
fs.writeFileSync(path.resolve(__dirname, '../tmp/actual-stripped.xml'), s1);
fs.writeFileSync(path.resolve(__dirname, '../tmp/expected-stripped.xml'), s2);
console.log('\nSaved stripped actual/expected to tmp/');
