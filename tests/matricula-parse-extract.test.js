const assert = require('assert');
// Allow requiring TypeScript modules in tests
require('ts-node').register({ transpileOnly: true });
const { extractMatriculaParts } = require('../src/shared/matricula.ts');

console.log('Running matricula parse tests');

const cases = [
  { input: '00000100010055202000012000340000056', expect: { livro: '00012', folha: '003', termo: '0000056' } },
  { input: 'OF30100000001200340000056', expect: { livro: '00012', folha: '003', termo: '0000056' }, note: 'mixed string fallback digits' },
  { input: '1234560001200340000056', expect: { livro: '00012', folha: '003', termo: '0000056' } },
  { input: 'shortstring', expect: { livro: '', folha: '', termo: '' } },
];

for (const c of cases) {
  const res = extractMatriculaParts(c.input);
  console.log('input:', c.input, '->', res);
}

console.log('Done');