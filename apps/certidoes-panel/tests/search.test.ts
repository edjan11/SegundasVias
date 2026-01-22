import { buildSearchIndex, searchItems } from '../src/core/search/indexer';
import { normalizeInput } from '../src/application/normalization';
import fs from 'fs';
import path from 'path';

const baseDir = path.resolve(__dirname, '..');
const json = JSON.parse(fs.readFileSync(path.join(baseDir, 'samples/input/certidao.casamento.input.json'), 'utf-8'));

export function runSearchTest() {
  const norm = normalizeInput(json);
  const idx = buildSearchIndex('casamento', norm);
  const r1 = searchItems([idx], { q: 'aracaju' });
  if (r1.total < 1) throw new Error('search failed for accent-insensitive query');
  const r2 = searchItems([idx], { cns: norm.certidao.cartorio_cns });
  if (r2.total < 1) throw new Error('search failed for cns');
  return true;
}

if (require.main === module) {
  runSearchTest();
  console.log('search ok');
}
