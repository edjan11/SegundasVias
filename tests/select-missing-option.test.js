const { JSDOM } = require('jsdom');

(async () => {
  require('ts-node').register({ transpileOnly: true });
  const dom = new JSDOM(`<!doctype html><html><body class="page-nascimento"><div class="app-shell">
    <form id="nascimento-form">
      <select id="cartorio-oficio" data-bind="ui.cartorio_oficio"></select>
      <input data-bind="registro.nome_completo" />
      <input data-bind="registro.cpf" />
      <input data-bind="registro.data_registro" />
    </form>
  </div>
  </body></html>`);

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLSelectElement = dom.window.HTMLSelectElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;

  const { applyCertificatePayloadToSecondCopy } = require('../src/ui/payload/apply-payload.ts');

  const payload = {
    certidao: { tipo_registro: 'nascimento' },
    registro: { cartorio_oficio: 'OF3', nome_completo: 'Test', cpf: '00000000000', data_registro: '2020-01-01' }
  };

  console.log('Running select missing option test');
  const res = applyCertificatePayloadToSecondCopy(payload, document, 5);
  console.log('apply result:', res);

  const sel = document.getElementById('cartorio-oficio');
  const gotOption = Array.from(sel.options).some((o) => o.value === 'OF3' || o.text === 'OF3');
  const selected = sel.value === 'OF3';
  if (!gotOption) {
    console.error('TEST FAIL: option was not created');
    process.exitCode = 2;
  } else if (!selected) {
    console.error('TEST FAIL: select not set to created option');
    process.exitCode = 2;
  } else {
    console.log('TEST PASS: option created and selected');
  }
})();