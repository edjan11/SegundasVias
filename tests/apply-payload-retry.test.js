// Test that applyCertificatePayloadToSecondCopy retries when binds mount later
const { JSDOM } = require('jsdom');

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="app-root"></div></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;

  try {
    const compiledPath = '../dist-src/ui/payload/apply-payload.js';
    delete require.cache[require.resolve(compiledPath)];
    const mod = require(compiledPath);

    const payload = {
      certidao: { tipo_registro: 'nascimento' },
      registro: { nome_completo: 'JOAO DA SILVA', cpf: '123.456.789-09', data_registro: '1990-01-02' }
    };

    // Insert the inputs after a short delay to simulate dynamic mounting
    setTimeout(() => {
      const root = document.getElementById('app-root');
      const inputNome = document.createElement('input');
      inputNome.setAttribute('data-bind', 'registro.nome_completo');
      inputNome.setAttribute('type', 'text');
      root.appendChild(inputNome);

      const inputCpf = document.createElement('input');
      inputCpf.setAttribute('data-bind', 'registro.cpf');
      inputCpf.setAttribute('type', 'text');
      root.appendChild(inputCpf);

      const inputData = document.createElement('input');
      inputData.setAttribute('data-bind', 'registro.data_registro');
      inputData.setAttribute('type', 'text');
      root.appendChild(inputData);

      const selectTipo = document.createElement('select');
      selectTipo.setAttribute('data-bind', 'certidao.tipo_registro');
      ['','nascimento','casamento','obito'].forEach((v) => {
        const o = document.createElement('option'); o.value = v; o.textContent = v || '(none)'; selectTipo.appendChild(o);
      });
      root.appendChild(selectTipo);
    }, 400);

    // Call apply (it should retry until elements appear)
    mod.applyCertificatePayloadToSecondCopy(payload, document, 6);

    // Poll until values are applied or timeout
    const success = await (async () => {
      const timeout = 5000;
      const start = Date.now();
      while (true) {
        const nome = document.querySelector('[data-bind="registro.nome_completo"]');
        const cpf = document.querySelector('[data-bind="registro.cpf"]');
        const data = document.querySelector('[data-bind="registro.data_registro"]');
        const tipo = document.querySelector('[data-bind="certidao.tipo_registro"]');
        if (nome && cpf && data && tipo) {
          const nval = (nome.value || '').trim();
          const cval = (cpf.value || '').trim();
          const dval = (data.value || '').trim();
          const tval = (tipo.value || '').trim();
          if (nval === payload.registro.nome_completo && cval === payload.registro.cpf && dval === payload.registro.data_registro && tval === payload.certidao.tipo_registro) {
            return true;
          }
        }
        if (Date.now() - start > timeout) return false;
        await new Promise((r) => setTimeout(r, 100));
      }
    })();

    if (!success) {
      console.error('[apply-payload-retry.test] FAIL - values not applied');
      console.error('[apply-payload-retry.test] DOM snapshot:', document.body.innerHTML);
      process.exit(1);
    }

    console.log('[apply-payload-retry.test] OK - payload applied after delayed mount');
    process.exit(0);
  } catch (err) {
    console.error('[apply-payload-retry.test] ERROR', err);
    process.exit(2);
  }
})();