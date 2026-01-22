const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async function(){
  const htmlPath = path.join(__dirname, '..', 'ui', 'pages', 'Casamento2Via.html');
  const bundlePath = path.join(__dirname, '..', 'ui', 'js', 'casamento.bundle.js');

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const bundle = fs.readFileSync(bundlePath, 'utf-8');

  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;

  // Provide minimal APIs used by the bundle
  window.fetch = async () => ({ ok: true, text: async () => '<div></div>' });
  window.Blob = function(){};
  window.URL = { createObjectURL: () => 'blob:' };

  // Evaluate the bundle in the JSDOM window
  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = bundle;
  window.document.head.appendChild(scriptEl);

  // wait a tick
  await new Promise((r) => setTimeout(r, 50));

  const btnJson = window.document.getElementById('btn-json');
  const btnXml = window.document.getElementById('btn-xml');
  const btnPrint = window.document.getElementById('btn-print');

  console.log('btnJson exists?', !!btnJson);
  console.log('btnXml exists?', !!btnXml);
  console.log('btnPrint exists?', !!btnPrint);

  function click(el){
    const ev = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
  }

  if (btnJson) {
    click(btnJson);
    await new Promise(r => setTimeout(r, 50));
    console.log('After click, statusText:', (window.document.getElementById('statusText')||{textContent:''}).textContent);
    console.log('Toast container exists:', !!window.document.getElementById('toast-container'));
  }

  if (btnXml) {
    click(btnXml);
    await new Promise(r => setTimeout(r, 300));
    console.log('After XML click, statusText:', (window.document.getElementById('statusText')||{textContent:''}).textContent);
    console.log('Toast container exists:', !!window.document.getElementById('toast-container'));
  }

  console.log('Done');
})();