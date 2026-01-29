const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  console.log('Running drawer load tests...');

  // Create a minimal DOM with a drawer element
  const dom = new JSDOM('<div id="drawer"></div>', { runScripts: 'outside-only' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.Event = dom.window.Event;
  global.MouseEvent = dom.window.MouseEvent;
  global.PointerEvent = dom.window.PointerEvent;
  global.CustomEvent = dom.window.CustomEvent;

  // Import setup-ui (dist build required before running this test)
  const setup = await import('../dist-src/ui/setup-ui.js');

  // Simulate drawer content being loaded with the search panel
  const drawer = document.getElementById('drawer');
  drawer.innerHTML = `
    <div id="op-search">
      <input id="import-file" type="file" />
      <button id="btn-import">Import</button>
      <div id="import-status"></div>
    </div>
  `;

  // Dispatch the event that routes will emit after replacing drawer.innerHTML
  window.dispatchEvent(new window.CustomEvent('drawer:loaded'));

  // allow microtasks to run
  await new Promise((r) => setTimeout(r, 0));

  // Now simulate clicking the import button with no file selected
  const btn = document.getElementById('btn-import');
  assert(btn, 'btn-import must exist');

  btn.dispatchEvent(new window.Event('click', { bubbles: true }));

  // allow async handler to run
  await new Promise((r) => setTimeout(r, 0));

  const status = document.getElementById('import-status');
  assert(status, 'import-status element must exist');
  assert(status.textContent.includes('Selecione um arquivo'), 'Import without file should show a selection warning');

  console.log('drawer-load.test.js: assertions passed');
})();