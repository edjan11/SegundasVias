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
    registro: { cartorio_oficio: '999999', nome_completo: 'Test2', cpf: '11111111111', data_registro: '2021-02-02' }
  };

  // Simulate select being populated after 300ms (e.g., async load)
  setTimeout(() => {
    const sel = document.getElementById('cartorio-oficio');
    const opt = document.createElement('option');
    opt.value = '999999';
    opt.text = 'Oficio 999999';
    sel.appendChild(opt);
    // dispatch change so frameworks notice - use JSDOM window Event
    sel.dispatchEvent(new window.Event('input', { bubbles: true }));
    sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  }, 300);

  console.log('Running select delay population test (waiting up to 1500ms)');
  applyCertificatePayloadToSecondCopy(payload, document, 5);

  // wait for 800ms to allow retries to apply
  setTimeout(() => {
    const sel = document.getElementById('cartorio-oficio');
    const selected = sel.value === '999999';
    if (!selected) {
      console.error('TEST FAIL: delayed populated select not set after retries');
      process.exitCode = 2;
    } else {
      console.log('TEST PASS: delayed select populated and value applied');
    }
  }, 900);
})();