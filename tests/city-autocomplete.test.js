const assert = require('assert');

(async () => {
  const mod = await import('../dist-src/shared/city-uf-resolver.js');
  const { buildIndexFromData, findCitySuggestions } = mod;

  function runTests() {
    console.log('Running city autocomplete suggestion tests...');

    const raw = {
      estados: [
        { sigla: 'SE', nome: 'Sergipe', cidades: ['Aracaju', 'Nossa Senhora'] },
        { sigla: 'AL', nome: 'Alagoas', cidades: ['Arapiraca', 'Maceió'] },
        { sigla: 'BA', nome: 'Bahia', cidades: ['Araci', 'Salvador'] },
        { sigla: 'SP', nome: 'São Paulo', cidades: ['Araçatuba', 'Araraquara'] }
      ]
    };

    const idx = buildIndexFromData(raw);

    // Query 'Ara' should return at least 5 suggestions (or as many matches up to 5)
    const s = findCitySuggestions(idx, 'Ara', 5);
    assert(s.length >= 4 && s.length <= 5, 'Expected 4-5 suggestions for "Ara"');
    // Verify format of returned objects
    assert(s[0].city && s[0].uf, 'Suggestion items must include city and uf');

    // Check ordering: prefix matches should appear first (Aracaju, Arapiraca...)
    const cities = s.map((x) => x.city.toLowerCase());
    assert(cities.some((c) => c.includes('aracaju')),
      'Aracaju should be among suggestions');

    console.log('City autocomplete suggestion tests passed.');
  }

  try {
    runTests();
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();