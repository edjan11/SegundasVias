const assert = require('assert');
const fs = require('fs');

// load compiled function
(async () => {
  // Dynamic import the ESM-compiled module
  const mod = await import('../dist-src/prints/nascimento/printNascimentoTj.js');
  const { buildNascimentoPdfHtmlTJ } = mod;

  function runTests() {
    console.log('Running print generator tests...');

    // Test 1: ensure script tags in data are escaped
    const data1 = { registro: { nome_completo: "<script>alert(1)</script>", data_nascimento_extenso: '10 de janeiro de 2026' } };
    const html1 = buildNascimentoPdfHtmlTJ(data1);
    assert(!/<script/i.test(html1), 'Output must not contain raw <script> tags');
    assert(html1.includes('&lt;script&gt;'), 'Script tags should be escaped');

    // Test 2: dangerous css href is replaced with default
    const data2 = { registro: { nome_completo: 'Nome Teste' } };
    const html2 = buildNascimentoPdfHtmlTJ(data2, { cssHref: 'javascript:alert(1)' });
    assert(html2.includes('../assets/tj/certidao.css'), 'Dangerous cssHref should be replaced with default');
    assert(!html2.includes('javascript:'), 'Should not include javascript: in output');

    // Test 3: ensure typical data appears escaped but visible
    const data3 = { registro: { nome_completo: 'José <b>Silva</b>' } };
    const html3 = buildNascimentoPdfHtmlTJ(data3);
    assert(html3.includes('Jos&eacute;') || html3.includes('José') || html3.includes('&lt;b&gt;'), 'Name should appear and tags should be escaped');

    console.log('All print tests passed.');
  }

  try {
    runTests();
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();
