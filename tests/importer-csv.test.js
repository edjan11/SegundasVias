const { readImportFile } = require('../dist-src/ui/importer');

test('readImportFile can parse CSV into payload', async () => {
  const csv = `Nome,CPF,DataRegistro,DataNascimento,Municipio,UF\n"Maria Silva",987.654.321-99,2024-12-01,1992-07-20,Recife,PE`;
  const file = new File([csv], 'test.csv', { type: 'text/csv' });

  const res = await readImportFile(file);
  expect(res.ok).toBe(true);
  expect(res.sourceFormat).toBe('csv');
  expect(res.payload).toBeTruthy();
  expect(res.payload.registro.nome_completo).toBe('Maria Silva');
  expect(res.payload.registro.cpf).toBe('98765432199');
  expect(res.payload.registro.data_registro).toBe('2024-12-01');
});