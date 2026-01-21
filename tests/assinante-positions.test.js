const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadHtml(file) {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'pages', file), 'utf8');
  // do NOT run scripts in the page during tests - we only need static DOM
  const dom = new JSDOM(html);
  return dom;
}

(function testNascimentoAssinante() {
  const dom = loadHtml('Nascimento2Via.html');
  global.window = dom.window;
  global.document = dom.window.document;

  // ensure select is present
  const sel = document.querySelector('select[name="idAssinante"]');
  console.assert(!!sel, 'Nascimento should have a select[name=idAssinante]');
  console.log('nascimento assinante present');
})();

(function testCasamentoAssinante() {
  const dom = loadHtml('Casamento2Via.html');
  global.window = dom.window;
  global.document = dom.window.document;
  // load casamento module to ensure admin wiring
  require('../dist-src/acts/casamento/mapperHtmlToJsonCasamento');

  const sel = document.querySelector('select[name="idAssinante"]');
  console.assert(!!sel, 'Casamento should have a select[name=idAssinante]');
  console.log('casamento assinante present');
})();