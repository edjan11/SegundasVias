const fs = require('fs');
const path = require('path');
const tplPath = path.resolve(__dirname, '../ui/templates/nascimento-modelo-110635.xml');
const sample = require('../tests/sample-nascimento.json');
const builder = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');

const tpl = fs.readFileSync(tplPath, 'utf8');
const out = builder.buildNascimentoXmlFromJson(tpl, sample);

function stripValues(x) { return x.replace(/>[^<]*</g, '><'); }

const sTpl = stripValues(tpl);
const sOut = stripValues(out);

let i = 0;
while (i < sTpl.length && i < sOut.length && sTpl[i] === sOut[i]) i++;
console.log('first diff index:', i);
console.log('context expected:', sTpl.slice(Math.max(0,i-50), i+50));
console.log('context actual  :', sOut.slice(Math.max(0,i-50), i+50));

if (sTpl === sOut) console.log('STRUCTURE MATCH'); else console.log('STRUCTURE DIFF');
