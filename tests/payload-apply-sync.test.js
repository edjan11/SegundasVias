const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadHtml(name) {
  const p = path.join(__dirname, '..', 'ui', 'pages', name);
  return fs.readFileSync(p, 'utf8');
}

async function run() {
  const html = loadHtml('Nascimento2Via.html');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const win = dom.window;
  global.window = win;
  global.document = win.document;
  global.navigator = win.navigator;
  global.HTMLElement = win.HTMLElement;
  global.HTMLInputElement = win.HTMLInputElement;
  global.HTMLTextAreaElement = win.HTMLTextAreaElement;
  global.HTMLSelectElement = win.HTMLSelectElement;
  global.Event = win.Event;
  global.CustomEvent = win.CustomEvent;

  // Now require the built modules from dist-src
  const apply = require('../dist-src/ui/payload/apply-payload');

  // Ensure sync function exists
  const ui = require('../dist-src/ui');

  const payload = {
    certidao: { tipo_registro: 'nascimento' },
    registro: { cpf: '123.456.789-09' },
  };

  const res = apply.applyCertificatePayloadToSecondCopy(payload, document);
  if (!res.ok) {
    console.error('Apply returned not ok', res);
    process.exit(2);
  }

  // After applying, syncInputsFromState should have run
  const cpfInput = document.querySelector('[data-bind="registro.cpf"]');
  const cpfVal = cpfInput ? cpfInput.value : null;
  console.log('cpf input value after apply:', cpfVal);

  // Verify mapperHtmlToJson reflects CPF
  const mapper = require('../dist-src/acts/nascimento/mapperHtmlToJsonNascimento').default;
  const data = mapper(document);
  const cpfFromJson = (data && data.registro && data.registro.cpf) || '';
  console.log('cpf in mapped JSON:', cpfFromJson);

  if (!cpfVal || cpfVal.replace(/\D+/g, '') !== '12345678909') {
    console.error('CPF not applied correctly to input or not normalized');
    process.exit(3);
  }
  if (!cpfFromJson || cpfFromJson.replace(/\D+/g, '') !== '12345678909') {
    console.error('CPF not present in JSON mapping');
    process.exit(4);
  }

  console.log('OK');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error', err);
  process.exit(1);
});