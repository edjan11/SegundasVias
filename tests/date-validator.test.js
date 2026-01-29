const assert = require('assert');
const { normalizeDate, validateDateDetailed } = require('../dist-src/shared/validators/date');

assert.strictEqual(normalizeDate('31/12/1999'), '31/12/1999');
assert.strictEqual(normalizeDate('01/01/2000'), '01/01/2000');
assert.strictEqual(normalizeDate('11/11/1970'), '11/11/1970');
assert.strictEqual(normalizeDate('11/11/99'), '');
assert.strictEqual(normalizeDate('11/11/11'), '');

assert.strictEqual(validateDateDetailed('31/12/1999').ok, true);
assert.strictEqual(validateDateDetailed('01/01/2000').ok, true);
assert.strictEqual(validateDateDetailed('31/02/1999').ok, false);
assert.strictEqual(validateDateDetailed('11/11/11').ok, false);

console.log('date-validator.test.js: all assertions passed');
