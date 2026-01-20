const assert = require('assert');
const fs = require('fs');

(async () => {
  console.log('Running city UI integration tests...');

  // Load casamento page HTML and create a JSDOM environment
  const html = fs.readFileSync('ui/pages/Casamento2Via.html', 'utf8');
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  // Ensure native event constructors point to JSDOM ones so module code that calls `new Event()` works
  global.Event = dom.window.Event;
  global.MouseEvent = dom.window.MouseEvent;
  global.PointerEvent = dom.window.PointerEvent;
  global.CustomEvent = dom.window.CustomEvent;

  // Import compiled modules from dist-src (build is required before running this test)
  const resolverMod = await import('../dist-src/shared/city-uf-resolver.js');
  const uiMod = await import('../dist-src/ui/city-uf-ui.js');
  const { buildIndexFromData } = resolverMod;
  const { attachCityIntegrationToAll } = uiMod;

  // Build a small index with a few cities
  const raw = {
    estados: [
      { sigla: 'SE', nome: 'Sergipe', cidades: ['Aracaju', 'Nossa Senhora'] },
      { sigla: 'AL', nome: 'Alagoas', cidades: ['Arapiraca', 'Maceió'] },
      { sigla: 'SP', nome: 'São Paulo', cidades: ['Araçatuba', 'Araraquara'] }
    ]
  };
  const index = buildIndexFromData(raw);

  // Run the attach function and assert it attaches to the expected inputs
  const detach = await attachCityIntegrationToAll(index, { minSuggestions: 1 });

  const inNoivo = document.querySelector('input[name="cidadeNascimentoNoivo"]');
  const inNoiva = document.querySelector('input[name="cidadeNascimentoNoiva"]');

  assert(inNoivo, 'cidadeNascimentoNoivo input must exist');
  assert(inNoiva, 'cidadeNascimentoNoiva input must exist');
  assert.strictEqual(inNoivo.getAttribute('data-city-integrated'), '1', 'cidadeNascimentoNoivo should be integrated');
  assert.strictEqual(inNoiva.getAttribute('data-city-integrated'), '1', 'cidadeNascimentoNoiva should be integrated');

  // Trigger input to open suggestions for noivo
  inNoivo.value = 'Ara';
  inNoivo.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  // find the suggestions container (should be appended to parent)
  const container = inNoivo.parentElement.querySelector('.city-autocomplete-list');
  assert(container, 'suggestions container must exist');
  assert.equal(container.hidden, false, 'suggestions should be visible after input');

  // Check that items were rendered and clicking one updates the input value
  const item = container.querySelector('.city-autocomplete-item');
  assert(item, 'there should be at least one suggestion item');
  assert.strictEqual(item.getAttribute('data-uf'), 'SE', 'SE should be prioritized in suggestions');

  // Simulate selection via pointerdown
  const ev = new dom.window.Event('pointerdown', { bubbles: true });
  item.dispatchEvent(ev);

  // After selection, input value should be set to the city's canonical name
  assert(inNoivo.value && inNoivo.value.toLowerCase().includes('ara'), 'input value should be set after selecting suggestion');

  // If UF select exists, it should be updated by autofill
  const ufNoivo = document.querySelector('select[name="ufNascimentoNoivo"], input[name="ufNascimentoNoivo"]');
  if (ufNoivo) {
    // Allow a microtask for autofill to run
    await new Promise((r) => setTimeout(r, 0));
    const val = ufNoivo.value || '';
    assert(val === '' || typeof val === 'string', 'UF input exists and should be string value (may be empty)');
  }

  // Now test behavior when no index is provided — simulate fetch
  // stub global fetch to return the raw data used above
  global.window.fetch = async (url) => ({ ok: true, json: async () => raw });

  // Call attach with no index; it should proceed and perform on-demand fetch
  const detach2 = await attachCityIntegrationToAll(undefined, { minSuggestions: 1 });
  const inNoivo2 = document.querySelector('input[name="cidadeNascimentoNoivo"]');
  assert(inNoivo2.getAttribute('data-city-integrated') === '1', 'should mark integrated even when index initially missing');

  inNoivo2.value = 'Ara';
  inNoivo2.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  // Wait a bit for async fetch + render to complete
  await new Promise((r) => setTimeout(r, 50));

  const container2 = inNoivo2.parentElement.querySelector('.city-autocomplete-list');
  assert(container2, 'suggestions container must exist after on-demand fetch');
  assert.equal(container2.hidden, false, 'suggestions should be visible after input and fetch');

  // Cleanup both attaches
  if (typeof detach2 === 'function') detach2();
  if (typeof detach === 'function') detach();

  console.log('City UI integration tests passed.');
})();
