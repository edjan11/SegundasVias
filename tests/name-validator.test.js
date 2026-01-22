const assert = require('assert');

(async () => {
  const mod = await import('../dist-src/shared/validators/name.js');
  const { validateName, isValidName } = mod;

  function runTests() {
    console.log('Running name validator tests...');

    const samples = ['José da Silva', 'Luís Alberto', 'Márcia Souza', 'João Paulo'];
    samples.forEach((s) => {
      const res = validateName(s, { minWords: 2 });
      console.log('Checking', s, '=>', res, isValidName(s));
      assert.strictEqual(res.invalid, false, `Expected "${s}" to be valid`);
      assert.strictEqual(isValidName(s), true, `Expected "${s}" to be valid by isValidName`);
    });

    // Edge cases
    assert.strictEqual(isValidName('A'), false);
    const resA = validateName('A', { minWords: 2 });
    // Single-word names are warned but not considered invalid by validateName()
    assert.strictEqual(resA.warn, true);
    assert.strictEqual(resA.invalid, false);

    // Names with hyphens and apostrophes
    console.log("Checking O'Connor Maria =>", validateName("O'Connor Maria", { minWords: 2 }), isValidName("O'Connor Maria"));
    assert.strictEqual(isValidName("O'Connor Maria"), true);
    console.log("Checking Anne-Marie Silva =>", validateName('Anne-Marie Silva', { minWords: 2 }), isValidName('Anne-Marie Silva'));
    assert.strictEqual(isValidName('Anne-Marie Silva'), true);

    console.log('All name validator tests passed.');
  }

  try {
    runTests();
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();