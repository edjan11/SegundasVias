const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const dom = new JSDOM(
    `<!doctype html>
    <html><body>
      <select name="tipoCasamento">
        <option value=""></option>
        <option value="2">Civil</option>
        <option value="3">Religioso</option>
      </select>
      <input name="dataTermo" />
      <input name="dataCasamento" />
      <select name="regimeBens"></select>
      <input name="nomeSolteiro" />
      <input name="nomeCasado" />
      <input name="nomeSolteira" />
      <input name="nomeCasada" />
      <input name="nacionalidadeNoivo" />
      <input name="nacionalidadeNoiva" />
    </body></html>`,
    { runScripts: 'outside-only' },
  );

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Event = dom.window.Event;

  const mod = await import('../dist-src/shared/productivity/index.js');
  const { setupCasamentoDates, setupAutofillWithDirty, setupDefaultValueWithDirty } = mod;

  const tipo = document.querySelector('select[name="tipoCasamento"]');
  const dataTermo = document.querySelector('input[name="dataTermo"]');
  const dataCasamento = document.querySelector('input[name="dataCasamento"]');
  const nomeSolteiro = document.querySelector('input[name="nomeSolteiro"]');
  const nomeCasado = document.querySelector('input[name="nomeCasado"]');
  const nomeSolteira = document.querySelector('input[name="nomeSolteira"]');
  const nomeCasada = document.querySelector('input[name="nomeCasada"]');
  const nacionalidadeNoiva = document.querySelector('input[name="nacionalidadeNoiva"]');

  setupCasamentoDates();

  tipo.value = '2';
  tipo.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  dataTermo.value = '01/01/2020';
  dataTermo.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(dataCasamento.value, '01/01/2020');
  assert.strictEqual(dataCasamento.tabIndex, -1);
  dataTermo.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  assert.strictEqual(document.activeElement, tipo);

  tipo.value = '3';
  tipo.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.strictEqual(dataCasamento.tabIndex, 0);
  assert.strictEqual(document.activeElement, dataCasamento);
  dataCasamento.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  assert.strictEqual(document.activeElement, tipo);

  setupAutofillWithDirty('input[name="nomeSolteiro"]', 'input[name="nomeCasado"]');
  nomeSolteiro.value = 'Carlos';
  nomeSolteiro.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(nomeCasado.value, 'Carlos');

  nomeCasado.value = 'Carlos Silva';
  nomeCasado.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  nomeSolteiro.value = 'Carlos Alberto';
  nomeSolteiro.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(nomeCasado.value, 'Carlos Silva');

  nomeCasado.value = '';
  nomeCasado.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  nomeSolteiro.value = 'Carlos Alberto';
  nomeSolteiro.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(nomeCasado.value, 'Carlos Alberto');

  setupAutofillWithDirty('input[name="nomeSolteira"]', 'input[name="nomeCasada"]');
  nomeSolteira.value = 'Ana';
  nomeSolteira.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(nomeCasada.value, 'Ana');

  nomeCasada.value = 'Ana Maria';
  nomeCasada.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  nomeSolteira.value = 'Ana Clara';
  nomeSolteira.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(nomeCasada.value, 'Ana Maria');

  nomeCasada.value = '';
  nomeCasada.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  nomeSolteira.value = 'Ana Clara';
  nomeSolteira.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(nomeCasada.value, 'Ana Clara');

  setupDefaultValueWithDirty('input[name="nacionalidadeNoiva"]', 'BRASILEIRA');
  assert.strictEqual(nacionalidadeNoiva.value, 'BRASILEIRA');
  nacionalidadeNoiva.value = 'PORTUGUESA';
  nacionalidadeNoiva.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(nacionalidadeNoiva.value, 'PORTUGUESA');
  nacionalidadeNoiva.value = '';
  nacionalidadeNoiva.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.strictEqual(nacionalidadeNoiva.value, 'BRASILEIRA');

  console.log('Casamento productivity tests passed.');
})();
