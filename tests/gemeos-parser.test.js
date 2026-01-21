const { JSDOM } = require('jsdom');
const { mapperHtmlToJsonNascimento } = require('../dist-src/acts/nascimento/mapperHtmlToJsonNascimento');

function runTest(input) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <input data-bind="registro.gemeos.quantidade" value="1" />
    <textarea data-bind="ui.gemeos_irmao_raw">${input}</textarea>
  </body></html>`);
  const doc = dom.window.document;
  const payload = mapperHtmlToJsonNascimento(doc);
  console.log('INPUT:\n' + input + '\nOUTPUT:');
  console.log(JSON.stringify(payload.registro.gemeos, null, 2));
}

// Cases to validate
runTest('JOAO - 123456');
runTest('MARIA|98765');
runTest('PEDRO PEREIRA');
runTest('54321');
runTest('ANA MARIA - 12 34 56');
runTest('JOÃO-PEDRO - 2468');
