const fs = require('fs');
const p = 'c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src/main.ts';
let s = fs.readFileSync(p, 'utf8');
const orig = s;

if (/import \* as db from '\.\/db'/.test(s) && !/const _db = db as any;/.test(s)) {
  s = s.replace(/(import \* as db from '\.\/db';?\s*)/g, "$1\nconst _db = db as any;\n");
  s = s.replace(/\bdb\./g, '_db.');
}

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('aliased db to _db as any in main.ts');
} else console.log('no changes to main.ts db alias');
