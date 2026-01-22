import express from 'express';
import fs from 'fs';
import path from 'path';
import { JsonFileRepository } from '../../infrastructure/json/JsonFileRepository';
import { ingestCertidao } from '../../application/ingest';
import { getCertidaoById, getCertidaoXml, searchCertidoes } from '../../application/query';

const app = express();
app.use(express.json({ limit: '5mb' }));

const baseDir = path.resolve(__dirname, '../../../');
const dbPath = path.join(baseDir, 'storage/db/db.json');
const repo = new JsonFileRepository(dbPath);

function readReferenceXml(tipo: string): string {
  const file =
    tipo === 'nascimento'
      ? 'samples/reference/certidao.nascimento.reference.xml'
      : 'samples/reference/certidao.casamento.reference.xml';
  const full = path.join(baseDir, file);
  return fs.readFileSync(full, 'utf-8');
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/certidoes', async (req, res) => {
  try {
    const tipo = String(req.body?.certidao?.tipo_registro || 'casamento');
    const referenceXml = readReferenceXml(tipo);
    const result = await ingestCertidao(repo, req.body, referenceXml);
    if (!result.ok) return res.status(422).json(result);
    return res.status(201).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

app.get('/certidoes', async (req, res) => {
  const result = await searchCertidoes(repo, req.query as any);
  res.json(result);
});

app.get('/certidoes/:id', async (req, res) => {
  const item = await getCertidaoById(repo, req.params.id);
  if (!item) return res.status(404).json({ error: 'not_found' });
  res.json(item);
});

app.get('/certidoes/:id/xml', async (req, res) => {
  const xml = await getCertidaoXml(repo, req.params.id);
  if (!xml) return res.status(404).send('not_found');
  res.type('application/xml').send(xml);
});

const port = Number(process.env.PORT || 5055);
app.listen(port, () => {
  console.log(`certidoes-panel api running on http://localhost:${port}`);
});
