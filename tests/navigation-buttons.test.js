const { JSDOM } = require('jsdom');

async function run() {
  const html = `
    <button id="btn-nascimento">N</button>
    <button id="btn-casamento">C</button>
    <button id="btn-obito">O</button>
  `;
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  global.window = dom.window; global.document = dom.window.document;

  const setup = require('../dist-src/ui/setupListeners');
  let navigated = [];
  function fakeNavigate(kind) { navigated.push(kind); }
  setup.initActions({
    saveDraft: () => {},
    generateFile: () => {},
    setTipoRegistro: () => {},
    getDocument: () => document,
    navigateToAct: fakeNavigate,
  });

  document.getElementById('btn-nascimento').click();
  document.getElementById('btn-casamento').click();
  document.getElementById('btn-obito').click();

  if (navigated.join(',') !== 'nascimento,casamento,obito') {
    console.error('Navigation not invoked as expected:', navigated);
    process.exit(2);
  }

  console.log('OK');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });