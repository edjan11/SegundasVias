const assert = require('assert');

(async () => {
  const { parseRegistrationTypeDigit, validateMatriculaType } = await import(
    '../dist-src/shared/matricula/type.js'
  );

  assert.strictEqual(parseRegistrationTypeDigit(''), 'unknown');
  assert.strictEqual(parseRegistrationTypeDigit('123'), 'unknown');
  assert.strictEqual(parseRegistrationTypeDigit('123456789012341'), 'nascimento');
  assert.strictEqual(parseRegistrationTypeDigit('123456789012342'), 'civil');
  assert.strictEqual(parseRegistrationTypeDigit('123456789012343'), 'religioso');
  assert.strictEqual(parseRegistrationTypeDigit('123456789012344'), 'obito');
  assert.strictEqual(parseRegistrationTypeDigit('123.456.789.012.342-67'), 'civil');

  let res = validateMatriculaType('123456789012342', 'civil');
  assert.strictEqual(res.ok, true);

  res = validateMatriculaType('123456789012343', 'civil');
  assert.strictEqual(res.ok, false);
  assert.ok(res.reason && res.reason.includes('digito 2'));

  res = validateMatriculaType('123456789012344', 'obito');
  assert.strictEqual(res.ok, true);

  res = validateMatriculaType('123456789012341', 'nascimento');
  assert.strictEqual(res.ok, true);

  res = validateMatriculaType('12345678901', 'obito');
  assert.strictEqual(res.ok, false);
  assert.ok(res.reason && res.reason.toLowerCase().includes('incompleta'));

  console.log('Matricula type tests passed.');
})();
