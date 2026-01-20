const assert = require('assert');

(async () => {
  const mod = await import('../dist-src/shared/city-uf-resolver.js');
  const {
    normalizeCityName,
    buildIndexFromData,
    resolveCityToUf
  } = mod;

  function runTests() {
    console.log('Running city→UF resolver tests...');

    // Build a small mock dataset
    const raw = {
      estados: [
        { sigla: 'SP', nome: 'São Paulo', cidades: ['São Paulo', "Santo André"] },
        { sigla: 'RJ', nome: 'Rio de Janeiro', cidades: ['Rio de Janeiro', 'Niterói'] },
        { sigla: 'PA', nome: 'Pará', cidades: ['Santa Rita'] },
        { sigla: 'PB', nome: 'Paraíba', cidades: ['Santa Rita'] } // ambiguous 'Santa Rita'
      ]
    };

    const index = buildIndexFromData(raw);

    // 1: valid city -> UF
    const r1 = resolveCityToUf('São Paulo', null, index);
    assert.strictEqual(r1.status, 'inferred', 'Expected inferred for São Paulo');
    assert.strictEqual(r1.uf, 'SP');

    // 1b: normalization
    const r1b = resolveCityToUf('sao  paulo', null, index);
    assert.strictEqual(r1b.status, 'inferred');
    assert.strictEqual(r1b.uf, 'SP');

    // 2: invalid city
    const r2 = resolveCityToUf('Cidade Inexistente', null, index);
    assert.strictEqual(r2.status, 'invalid');

    // 3: ambiguous
    const r3 = resolveCityToUf('Santa Rita', null, index);
    assert.strictEqual(r3.status, 'ambiguous');
    assert(Array.isArray(r3.matches) && r3.matches.length === 2);

    // 4: divergent UF (wrong UF provided)
    const r4 = resolveCityToUf('Rio de Janeiro', 'SP', index);
    assert.strictEqual(r4.status, 'divergent');
    assert(Array.isArray(r4.matches) && r4.matches[0].uf === 'RJ');

    // 5: correct UF provided
    const r5 = resolveCityToUf('Niterói', 'RJ', index);
    assert.strictEqual(r5.status, 'ok');
    assert.strictEqual(r5.uf, 'RJ');

    console.log('All city→UF resolver tests passed.');
  }

  try {
    runTests();
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();
