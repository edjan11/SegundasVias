const { JSDOM } = require('jsdom');

(async () => {
  require('ts-node').register({ transpileOnly: true });
  const payload = require('./fixtures/sample-nascimento.json');
  const dom = new JSDOM(`<!doctype html><html><body class="page-nascimento"><div class="app-shell">
    <form id="nascimento-form">
      <input data-bind="registro.nome_completo" />
      <input data-bind="registro.cpf" />
      <input data-bind="registro.data_registro" />
    </form>
  </div>
    <button id="btn-print">print</button>
    <button id="btn-xml">xml</button>
  </body></html>`);
  global.window = dom.window;
  global.document = dom.window.document;
  // Make common DOM classes available to module scope (used by instanceof checks)
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLSelectElement = dom.window.HTMLSelectElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;

  const { applyCertificatePayloadToSecondCopy, consumePendingPayload } = require('../src/ui/payload/apply-payload.ts');

  console.log('--- Running payload apply reproduction ---');
  const res = applyCertificatePayloadToSecondCopy(payload);
  console.log('apply result:', res);

  // If navigated, simulate that the page loaded and pending payload is consumed
  if (res.navigated) {
    console.log('navigated=true, checking pending payload');
    const pending = consumePendingPayload();
    console.log('pending payload present:', !!pending);
  }

  // Print fields applied
  const nome = document.querySelector('[data-bind="registro.nome_completo"]')?.value;
  const cpf = document.querySelector('[data-bind="registro.cpf"]')?.value;
  const data = document.querySelector('[data-bind="registro.data_registro"]')?.value;
  console.log('applied values -> nome:', nome, 'cpf:', cpf, 'data:', data);

  console.log('--- Done ---');
})();