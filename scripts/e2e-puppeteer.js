const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.URL || 'http://127.0.0.1:5000/pages/Base2ViaLayout.html?act=nascimento';
  console.log('[e2e] starting puppeteer against', url);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[page]', msg.type(), msg.text()));

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Prepare a sample pending payload similar to tests
    const samplePayload = {
      certidao: { tipo_registro: 'nascimento' },
      registro: { nome_completo: 'Fulano de Tal', cpf: '12345678909', data_registro: '2020-01-01' }
    };

    // Enable import tracer and initialize DOM snapshots array for instrumentation
    await page.evaluate(() => { try { localStorage.setItem('debug.importTrace', '1'); } catch (e) {} });
    await page.evaluate(() => { try { window.__domSnapshots = window.__domSnapshots || []; } catch (e) {} });

    // Save in localStorage and dispatch pending event multiple times to ensure page listener picks it up
    await page.evaluate((p) => {
      window.localStorage.setItem('ui.pendingPayload', JSON.stringify({ savedAt: new Date().toISOString(), payload: p }));
      function dispatchPending() {
        try {
          const ev = new CustomEvent('app:pending-payload', { detail: { kind: 'nascimento' } });
          window.dispatchEvent(ev);
        } catch (e) {
          // fallback
          const ev = new Event('app:pending-payload');
          try { ev.detail = { kind: 'nascimento' }; } catch (ex) { /* ignore */ }
          window.dispatchEvent(ev);
        }
      }
      // initial dispatch
      dispatchPending();
      // re-dispatch after short delays to increase chance that listener is registered
      setTimeout(dispatchPending, 500);
      setTimeout(dispatchPending, 2000);
    }, samplePayload);

    console.log('[e2e] pending payload injected, waiting for action button...');

    // Fetch localStorage value for debugging
    const pendingRaw = await page.evaluate(() => window.localStorage.getItem('ui.pendingPayload'));
    console.log('[e2e] localStorage ui.pendingPayload:', pendingRaw ? 'SET' : 'NOT SET');

    // Quick check for the action element or any text suggesting user action
    const found = await page.evaluate(() => {
      const el = document.querySelector('#pending-payload-action');
      const anyBtn = document.querySelector('button');
      const containsIr = Array.from(document.querySelectorAll('*')).some(n => n.textContent && /ir para/i.test(n.textContent));
      return { hasActionContainer: !!el, hasAnyButton: !!anyBtn, containsIr };
    });

    console.log('[e2e] quick DOM probes:', found);

    // Wait a bit longer for the UI to render; if not present, capture full page HTML for analysis
    try {
      await page.waitForSelector('#pending-payload-action button', { timeout: 20000 });
      await page.screenshot({ path: path.join('artifacts', 'e2e-pending-visible.png') });
      console.log('[e2e] screenshot saved (pending-visible)');
    } catch (e) {
      console.warn('[e2e] pending action button did not appear within timeout, saving DOM snapshot');
      const html = await page.content();
      fs.writeFileSync(path.join('artifacts', 'e2e-pending-dom.html'), html);
      console.log('[e2e] wrote artifacts/e2e-pending-dom.html for inspection');
      // rethrow to enter catch clause and fail the test run
      throw e;
    }

    // Click the action to navigate and apply
    // Prefer the primary action button (contains "Ir para") and avoid the close button
    const actionSelector = '#pending-payload-action button:not(.btn-close)';
    const actionBtn = await page.$(actionSelector);
    if (actionBtn) {
      try {
        await actionBtn.click();
      } catch (clickErr) {
        console.warn('[e2e] Puppeteer click failed, attempting DOM click fallback:', clickErr.message);
        // fallback to DOM click (avoids Puppeteer's element visibility/clickablePoint issues)
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.click();
        }, actionSelector);
      }
    } else {
      const btns = await page.$x("//div[@id='pending-payload-action']//button[contains(normalize-space(string(.)), 'Ir para')]");
      if (btns.length) {
        try {
          await btns[0].click();
        } catch (clickErr) {
          console.warn('[e2e] XPath click failed, falling back to DOM click:', clickErr.message);
          await page.evaluate(() => {
            const el = document.evaluate("//div[@id='pending-payload-action']//button[contains(normalize-space(string(.)), 'Ir para')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (el) el.click();
          });
        }
      } else throw new Error('Pending action button not found');
    }
    console.log('[e2e] clicked pending action (or dispatched DOM click), waiting for navigation/apply');

    // Wait a bit for navigation + application
    await page.waitForTimeout(2000);

    // Ensure the navigated page initializes the snapshots array too
    try {
      await page.evaluate(() => { try { window.__domSnapshots = window.__domSnapshots || []; } catch (e) {} });
      // Try a manual push to verify persistence across navigation
      await page.evaluate(() => { try { (window.__domSnapshots = window.__domSnapshots || []).push({ label: 'manual-push', time: Date.now() }); } catch (e) { console.error('push-error', e); } });
    } catch (e) {
      console.warn('[e2e] failed to init snapshots on navigated page', e);
    }

    // After navigation, wait for bound input values to be present
    const nomeSelector = '[data-bind="registro.nome_completo"]';
    const cpfSelector = '[data-bind="registro.cpf"]';
    const dataSelector = '[data-bind="registro.data_registro"]';

    // Wait for any of them to appear
    await page.waitForSelector(nomeSelector, { timeout: 5000 }).catch(() => {});

    const values = await page.evaluate((nomeS, cpfS, dataS) => {
      const nome = document.querySelector(nomeS) ? (document.querySelector(nomeS).value || '') : '';
      const cpf = document.querySelector(cpfS) ? (document.querySelector(cpfS).value || '') : '';
      const data = document.querySelector(dataS) ? (document.querySelector(dataS).value || '') : '';
      return { nome, cpf, data };
    }, nomeSelector, cpfSelector, dataSelector);

    console.log('[e2e] applied fields:', values);

    await page.screenshot({ path: path.join('artifacts', 'e2e-after-apply.png') });
    console.log('[e2e] screenshot saved (after-apply)');

    // Inspect console warnings for missing binds or similar
    // Already listening to page console above

    // Collect DOM snapshots if instrumentation pushed them and collect import trace logs
    try {
      const snaps = await page.evaluate(() => window.__domSnapshots || null);
      if (snaps) {
        fs.writeFileSync(path.join('artifacts', 'e2e-dom-snapshots.json'), JSON.stringify(snaps, null, 2));
        console.log('[e2e] wrote artifacts/e2e-dom-snapshots.json (snapshots count:', snaps.length, ')');
      } else {
        // If no snapshots, save full DOM for manual inspection
        const html = await page.content();
        fs.writeFileSync(path.join('artifacts', 'e2e-after-apply-dom.html'), html);
        console.log('[e2e] no snapshots found; wrote full DOM to artifacts/e2e-after-apply-dom.html');
      }

      // Collect import tracer logs if available
      const traces = await page.evaluate(() => {
        try {
          if (window.__importTrace && typeof window.__importTrace.get === 'function') return window.__importTrace.get();
          if (window.__importLogs) return window.__importLogs;
          return null;
        } catch (e) { return null; }
      });
      if (traces) {
        fs.writeFileSync(path.join('artifacts', 'e2e-import-trace.json'), JSON.stringify(traces, null, 2));
        console.log('[e2e] wrote artifacts/e2e-import-trace.json (entries:', traces.length, ')');
      }
    } catch (e) {
      console.warn('[e2e] failed to collect DOM snapshots or traces', e);
    }

    // Save results
    fs.writeFileSync(path.join('artifacts', 'e2e-result.json'), JSON.stringify({ url, values, timestamp: new Date().toISOString() }, null, 2));

    console.log('[e2e] done. Results written to artifacts/e2e-result.json');


  } catch (err) {
    console.error('[e2e] error:', err);
    await page.screenshot({ path: path.join('artifacts', 'e2e-error.png') }).catch(() => {});
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();