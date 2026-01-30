const { mapCsvRowToPayload } = require('../dist-src/shared/import-export/csv-to-payload');

test('mapCsvRowToPayload maps common CSV keys to payload fields', () => {
  const row = {
    Nome: 'João Silva',
    CPF: '123.456.789-00',
    DataRegistro: '2025-01-01',
    DataNascimento: '1990-05-10',
    Hora: '7:30',
    Municipio: 'São Paulo',
    UF: 'SP',
  };

  const payload = mapCsvRowToPayload(row);
  expect(payload.certidao.tipo_registro).toBe('nascimento');
  expect(payload.registro.nome_completo).toBe('João Silva');
  expect(payload.registro.cpf).toBe('12345678900');
  expect(payload.registro.data_registro).toBe('2025-01-01');
  expect(payload.registro.data_nascimento).toBe('1990-05-10');
  expect(payload.registro.hora_nascimento).toBe('7:30');
  expect(payload.registro.municipio_nascimento).toBe('São Paulo');
  expect(payload.registro.uf_nascimento).toBe('SP');
});