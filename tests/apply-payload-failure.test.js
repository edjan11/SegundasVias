const { JSDOM } = require('jsdom');

(async () => {
  require('ts-node').register({ transpileOnly: true });

  const dom = new JSDOM(`<!doctype html><html><body class="page-nascimento"><div class="app-shell">
    <!-- Intentionally missing critical binds to simulate failure -->
    <form id="nascimento-form">
      <!-- no registro.nome_completo, no registro.cpf, no registro.data_registro -->
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
    registro: { /* intentionally empty */ }
  };

  let captured = false;
  let capturedDetail = null;
  window.addEventListener('apply:failed', (e) => {
    captured = true;
    try { capturedDetail = e.detail; } catch (err) { capturedDetail = null; }
  });

  console.log('Running apply with attemptsLeft=0 to simulate final failure');
  const res = applyCertificatePayloadToSecondCopy(payload, document, 0);
  console.log('apply result:', res);
  console.log('event captured:', captured, 'detail:', capturedDetail);

  if (!res || res.ok !== false) {
    console.error('TEST FAIL: expected apply to return ok:false when critical binds missing and no attempts left');
    process.exitCode = 2;
  } else if (!captured) {
    console.error('TEST FAIL: expected apply:failed event to be dispatched');
    process.exitCode = 2;
  } else if (!capturedDetail || !Array.isArray(capturedDetail.missing) || capturedDetail.missing.length === 0) {
    console.error('TEST FAIL: apply:failed event detail missing expected missing paths info');
    process.exitCode = 2;
  } else {
    console.log('TEST PASS: apply signaled failure and dispatched event with missing fields:', capturedDetail.missing);
  }
})();