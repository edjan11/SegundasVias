const fs = require('fs');
const path = require('path');
const db = require('../dist-src/db');

// Use a temp directory for DB file to avoid clobbering real DB
const os = require('os');
const tmpDir = path.join(os.tmpdir(), 'segundas-vias-test');

beforeAll(() => {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  db.initDb(tmpDir);
});

afterAll(() => {
  const dbFile = path.join(tmpDir, 'segundas-vias.db.json');
  try { fs.unlinkSync(dbFile); } catch (e) {}
});

test('ingest writes record and search finds it by name', () => {
  const payload = {
    kind: 'nascimento',
    sourceFormat: 'json',
    sourceRaw: '{}',
    data: {
      certidao: { tipo_registro: 'nascimento' },
      registro: { nome_completo: 'Test Person', cpf: '12345678900' }
    },
    status: 'importado'
  };
  const res = db.ingest(payload);
  expect(res).toHaveProperty('id');
  const q1 = { q: 'Test Person' };
  const r = db.search(q1);
  expect(r.total).toBeGreaterThanOrEqual(1);
  const found = r.items.find(i => i.nome && i.nome.includes('Test Person'));
  expect(found).toBeTruthy();
});