const assert = require('assert');
const { validateRecord } = require('../dist-src/shared/import-export/batch');

const minimalPayload = {
  certidao: { tipo_registro: 'nascimento' },
  registro: { nome_completo: 'FULANO DE TAL' },
};

const res = validateRecord('nascimento', minimalPayload);
assert.strictEqual(res.ok, true, 'Payload minimo deveria ser aceito');

console.log('import-batch.test.js: all assertions passed');
