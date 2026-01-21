const fs = require('fs');
const { buildNascimentoXmlFromJson } = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');
const template = fs.readFileSync('./ui/templates/nascimento-modelo-110635.xml', 'utf8');
const sample = require('../tests/sample-nascimento.json');
const xml = buildNascimentoXmlFromJson(template, sample);

function preserve(templateStr, generatedStr) {
  const selfClosingTags = new Set();
  const reSelfClosing = /<([A-Za-z0-9_]+)(?=\s|\/|>)[^>]*\/>/g;
  let m;
  while ((m = reSelfClosing.exec(templateStr))) {
    selfClosingTags.add(m[1]);
  }

  for (const tag of selfClosingTags) {
    const emptyPairRe = new RegExp(`<${tag}(?=\\s|/|>)[^>]*>\\s*<\\/${tag}>`, 'g');
    generatedStr = generatedStr.replace(emptyPairRe, (match) => {
      const openTagMatch = match.match(new RegExp(`(<${tag}[^>]*>)`));
      if (openTagMatch && openTagMatch[1]) {
        return openTagMatch[1].replace(/>\s*$/, '/>');
      }
      return `<${tag}/>`;
    });
  }
  return generatedStr;
}

const after = preserve(template, xml);
console.log('containsGenitoresSelfClosingBefore?', xml.includes('<Genitores/>'));
console.log('containsGenitoresSelfClosingAfter?', after.includes('<Genitores/>'));
console.log('containsGenitoresEmptyPairBefore?', xml.includes('<Genitores></Genitores>'));
console.log('containsGenitoresEmptyPairAfter?', after.includes('<Genitores></Genitores>'));
fs.mkdirSync('./tmp', { recursive: true });
fs.writeFileSync('./tmp/actual-stripped.xml', xml.replace(/>[^<]*</g, '><'));
fs.writeFileSync('./tmp/expected-stripped.xml', template.replace(/>[^<]*</g, '><'));
console.log('wrote tmp files');
