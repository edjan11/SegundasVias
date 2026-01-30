const { JSDOM } = require('jsdom');

(async () => {
  // Require ts-node to allow importing TypeScript source directly in tests
  require('ts-node').register({ transpileOnly: true });
  const { scheduleAction } = require('../src/ui/panels/search-panel.ts');

  const dom = new JSDOM(`<!doctype html><html><body>
    <button id="btn-print">print</button>
    <button id="btn-xml">xml</button>
  </body></html>`);
  global.window = dom.window;
  global.document = dom.window.document;

  let printed = false;
  let exported = false;
  document.getElementById('btn-print').addEventListener('click', () => (printed = true));
  document.getElementById('btn-xml').addEventListener('click', () => (exported = true));

  try {
    await scheduleAction('print');
    if (!printed) throw new Error('print not dispatched');

    await scheduleAction('export');
    if (!exported) throw new Error('export not dispatched');

    console.log('OK');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();