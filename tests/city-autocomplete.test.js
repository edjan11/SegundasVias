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

    // Query 'Ara' should return suggestions (up to 5)
    const s = findCitySuggestions(idx, 'Ara', 5);
    assert(s.length >= 4 && s.length <= 5, 'Expected 4-5 suggestions for "Ara"');
    // Verify format of returned objects
    assert(s[0].city && s[0].uf, 'Suggestion items must include city and uf');

    // Check ordering without priority: Aracaju should be present
    const cities = s.map((x) => x.city.toLowerCase());
    assert(cities.some((c) => c.includes('aracaju')),
      'Aracaju should be among suggestions');

    // Now test state priority: prefer SE then AL then BA
    const freq = new Map();
    // Give Arapiraca a higher frequency to show frequency influences ordering
    freq.set('Arapiraca|AL', 5);
    const s2 = findCitySuggestions(idx, 'Ara', 5, { statePriority: ['SE', 'AL', 'BA'], frequencyMap: freq });
    // First suggestion should be from SE (Aracaju) because state priority ranks SE first
    assert.strictEqual(s2[0].uf, 'SE', 'Expected first suggestion UF to be SE due to priority');
    // If we increase Arapiraca frequency more, it can outrank by frequency
    freq.set('Arapiraca|AL', 50);
    const s3 = findCitySuggestions(idx, 'Ara', 5, { statePriority: ['SE', 'AL', 'BA'], frequencyMap: freq });
    // With explicit statePriority, priority wins — SE remains on top
    assert.strictEqual(s3[0].uf, 'SE', 'When statePriority is set, SE should remain first even if other city has higher frequency');

    // Without statePriority, the frequency should be able to influence ranking
    const s4 = findCitySuggestions(idx, 'Ara', 5, { frequencyMap: freq });
    assert.strictEqual(s4[0].uf, 'AL', 'Without statePriority, frequency should allow AL to be top');
    assert(s4[0].city.toLowerCase().includes('arapirac'), 'Top city should be Arapiraca (or similar) when frequency is higher');

    console.log('City autocomplete suggestion tests passed.');
  }

  try {
    runTests();
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();