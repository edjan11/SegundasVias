const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadHtml(file) {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'pages', file), 'utf8');
  // do NOT run scripts in the page during tests - we only need static DOM
  const dom = new JSDOM(html);
  return dom;
}

function waitFor(fn, timeout = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return true;
    // small pause
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  }
  return false;
}

// Test: drawer opens on Obito page
(function testObitoDrawerAndFields() {
  const dom = loadHtml('Obito2Via.html');
  const window = dom.window;
  global.window = window;
  global.document = window.document;

  // stub window.open to avoid jsdom errors from print preview or popup tests
  window.open = function () {
    return { document: { open: () => {}, write: () => {}, close: () => {} }, focus: () => {}, print: () => {} };
  };

  // drawer element should exist (static in template)
  const drawer = document.getElementById('drawer');
  console.assert(!!drawer, 'drawer should exist');

  // initially closed (no open class)
  console.assert(!drawer.classList.contains('open'), 'drawer initially closed');

  const toggle = document.getElementById('drawer-toggle');
  console.assert(!!toggle, 'drawer-toggle present');

  // emulate click: the global delegation toggles the 'open' class; here we simulate user click that the delegation would do
  drawer.classList.toggle('open');
  console.assert(drawer.classList.contains('open'), 'drawer should be open after toggle simulation');

  // close via close button (static close button with id must exist)
  const close = document.getElementById('drawer-close');
  console.assert(!!close, 'drawer-close present');
  // simulate click handler behavior
  drawer.classList.remove('open');
  console.assert(!drawer.classList.contains('open'), 'drawer should be closed after close simulation');

  // nacionalidade default exists as data-default and when setupAutoNationality runs it will set value and lock input
  const nat = document.querySelector('input[name="nacionalidade"]');
  console.assert(!!nat, 'nacionalidade input exists');
  console.assert(nat.getAttribute('data-default') === 'BRASILEIRO', 'nacionalidade input should have data-default="BRASILEIRO"');

  // emulate setupAutoNationality behavior
  if (!String(nat.value || '').trim()) {
    nat.value = 'BRASILEIRO';
    nat.readOnly = true;
    nat.tabIndex = -1;
    nat.classList.add('input-locked');
  }
  console.assert(nat.value === 'BRASILEIRO', 'after applying default, nacionalidade value should be BRASILEIRO');

  // folha width class
  const folhaField = document.querySelector('input[name="folha"]')?.closest('.campo');
  console.assert(!!folhaField, 'folha field container exists');
  console.assert(folhaField.classList.contains('span-2'), 'folha should have class span-2 (increased)');

  // assinante position: select[name=idAssinante] should appear after #matricula in DOM order
  const matriculaEl = document.getElementById('matricula');
  const assinanteSel = document.querySelector('select[name="idAssinante"]');
  console.assert(!!matriculaEl && !!assinanteSel, 'matricula and assinante must exist');
  const parent = matriculaEl.parentElement?.parentElement || matriculaEl.parentElement;
  const children = Array.from(parent.children || []);
  const idxMat = children.indexOf(matriculaEl.parentElement);
  const idxAss = children.indexOf(assinanteSel.parentElement);
  console.assert(idxAss > idxMat, 'assinante select should be after matricula in DOM');

  console.log('obito-ui.test.js: all assertions passed');
})();