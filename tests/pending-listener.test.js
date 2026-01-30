// Simple node-style test: ensures pending-payload listener binds at module load
const { JSDOM } = require('jsdom');

(async () => {
  // setup JSDOM global environment
  const dom = new JSDOM('<!doctype html><html><body><div id="app-root"></div></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;

  try {
    // require the compiled module so node can load it in CommonJS
    const compiledPath = '../dist-src/ui/panels/search-panel.js';
    delete require.cache[require.resolve(compiledPath)];
    require(compiledPath);

    // dispatch event
    window.dispatchEvent(new CustomEvent('app:pending-payload', { detail: { kind: 'nascimento' } }));

    // wait for element to appear (poll up to 700ms)
    const el = await (async () => {
      const timeout = 700;
      const start = Date.now();
      while (true) {
        const found = document.getElementById('pending-payload-action');
        if (found) return found;
        if (Date.now() - start > timeout) return null;
        await new Promise((r) => setTimeout(r, 50));
      }
    })();

    if (!el) {
      console.error('[pending-listener.test] FAIL - #pending-payload-action not found');
      console.error('[pending-listener.test] DOM snapshot:', document.body.innerHTML);
      process.exit(1);
    }

    if (!/Ir para/i.test(el.textContent || '')) {
      console.error('[pending-listener.test] FAIL - action label not matching:', el.textContent);
      process.exit(1);
    }

    console.log('[pending-listener.test] OK - pending action present:', el.textContent.trim());
    process.exit(0);
  } catch (err) {
    console.error('[pending-listener.test] ERROR', err);
    process.exit(2);
  }
})();
