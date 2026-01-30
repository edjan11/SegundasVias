const { JSDOM } = require('jsdom');

(async () => {
  require('ts-node').register({ transpileOnly: true });

  const payload = require('./fixtures/sample-nascimento.json');

  // Start in CASAMENTO to force queuing (payload tipo=nascimento)
  const dom = new JSDOM(`<!doctype html><html><body class="page-casamento">
    <div id="import-status"></div>
    <div id="tab-search"></div>
    <div class="app-shell">
      <form id="nascimento-form">
        <input data-bind="registro.nome_completo" />
        <input data-bind="registro.cpf" />
        <input data-bind="registro.data_registro" />
      </form>
    </div>
  </body></html>`, { url: 'http://localhost' });

  global.window = dom.window;
  global.document = dom.window.document;
  // Provide DOM classes used by code
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLSelectElement = dom.window.HTMLSelectElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;

  const { applyCertificatePayloadToSecondCopy, consumePendingPayload, queuePendingPayload } = require('../src/ui/payload/apply-payload.ts');
  const { setupSearchPanel } = require('../src/ui/panels/search-panel.ts');

  console.log('--- Starting pending payload flow test ---');

  // Attach a listener to capture navigation events
  let navigatedTo = null;
  window.addEventListener('app:navigate', (ev) => {
    navigatedTo = ev.detail?.href || null;
    console.log('[test] captured app:navigate ->', navigatedTo);
  });

  // Clear any leftover pending payload from previous runs (do this before binding listeners)
  window.localStorage.removeItem('ui.pendingPayload');

  // Ensure search panel listeners are set
  setupSearchPanel();

  // Confirm localStorage state just before applying
  console.log('[test] localStorage before apply:', window.localStorage.getItem('ui.pendingPayload'));

  // Apply payload while on casamento page -> should queue and not auto-navigate
  const res = applyCertificatePayloadToSecondCopy(payload);
  console.log('[test] apply returned:', res);

  // Confirm localStorage state after apply
  console.log('[test] localStorage after apply:', window.localStorage.getItem('ui.pendingPayload'));

  if (!res.navigated) {
    console.error('Expected navigated:true when payload kind differs from current page');
    process.exit(1);
  }

  // The pending event handler in search-panel should have created the action button
  const container = document.getElementById('import-status');
  const btn = container.querySelector('#pending-payload-action button');
  console.log('[test] action button present?', !!btn);
  if (!btn) {
    console.error('Pending action button not found in import-status');
    process.exit(1);
  }

  // Instead of relying on real navigation in jsdom (not implemented), simulate manual navigation
  // that the user would trigger by clicking the button in the real app. This avoids jsdom navigation errors.
  document.body.classList.remove('page-casamento');
  document.body.classList.add('page-nascimento');

  // Simulate arrival: consume pending payload and apply on the target page
  const pending2 = consumePendingPayload();
  console.log('[test] pending consumed?', !!pending2);
  if (!pending2) {
    console.error('No pending payload found after navigation simulation');
    process.exit(1);
  }

  const appliedOnTarget = applyCertificatePayloadToSecondCopy(pending2);
  console.log('[test] applied on target page:', appliedOnTarget);
  // Simulate arriving at target page: change body class to nascimento
  document.body.classList.remove('page-casamento');
  document.body.classList.add('page-nascimento');

  // Simulate page setup that consumes pending payload
  const pending = consumePendingPayload();
  console.log('[test] pending consumed?', !!pending);
  if (!pending) {
    console.error('No pending payload found after navigation');
    process.exit(1);
  }

  const applied = applyCertificatePayloadToSecondCopy(pending);
  console.log('[test] applied on target page:', applied);

  // Check fields applied
  const nome = document.querySelector('[data-bind="registro.nome_completo"]')?.value;
  const cpf = document.querySelector('[data-bind="registro.cpf"]')?.value;
  const data = document.querySelector('[data-bind="registro.data_registro"]')?.value;
  console.log('[test] fields ->', { nome, cpf, data });

  if (nome && cpf && data) {
    console.log('OK - pending flow applied successfully');
  } else {
    console.error('Fields not applied on target page');
    process.exit(1);
  }

  console.log('--- Test complete ---');
})();