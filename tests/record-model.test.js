const assert = require('assert');
const { RecordModel } = require('../dist-src/shared/recordModel');
const { exportRecordToJson } = require('../dist-src/shared/exporters/jsonExporter');

// Simple unit test: ensure that exporting wraps the same data and is JSON-parseable
(function run() {
  const registro = {
    nome_completo: 'Fulano de Tal',
    matricula: '000000000000000000000000000000',
    municipio_casamento: 'Cidade X',
    uf_municipio_casamento: 'XX',
  };

  const model = new RecordModel(registro);
  const json = exportRecordToJson(model);
  const parsed = JSON.parse(json);

  assert.deepStrictEqual(parsed, registro, 'Exported JSON should match input registro object');

  console.log('RecordModel JSON exporter test passed.');
})();
