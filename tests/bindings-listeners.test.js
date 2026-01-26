const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function run() {
  const html = '<input id="test-input" data-bind="registro.testfield" />';
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const win = dom.window;
  global.window = win;
  global.document = win.document;
  global.HTMLElement = win.HTMLElement;
  global.HTMLInputElement = win.HTMLInputElement;
  global.Event = win.Event;

  // load compiled module
  const setup = require('../dist-src/ui/setupListeners');

  const stateHolder = {};
  function setState(path, value) {
    stateHolder[path] = value;
  }

  setup.initBindings({
    getDocument: () => document,
    setState,
    updateSexoOutros: () => {},
    updateIgnoreFields: () => {},
    updateCpfState: () => {},
    updateCpfFromToggle: () => {},
    applyCartorioChange: () => {},
    updateMatricula: () => {},
    updateNaturalidadeVisibility: () => {},
    rememberNaturalidadeEdit: () => {},
    syncNaturalidadeLockedToBirth: () => {},
    validateLiveField: () => {},
    updateDirty: () => {},
  });

  const input = document.getElementById('test-input');
  input.value = 'abc';
  input.dispatchEvent(new Event('input', { bubbles: true }));

  if (stateHolder['registro.testfield'] !== 'ABC') {
    console.error('Expected state to have uppercased value, got', stateHolder['registro.testfield']);
    process.exit(2);
  }

  console.log('OK');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });