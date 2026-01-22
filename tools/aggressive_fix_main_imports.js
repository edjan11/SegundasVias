const fs = require('fs');
const p = 'c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src/main.ts';
let s = fs.readFileSync(p, 'utf8');
const orig = s;

// change default import from './db' to namespace import
s = s.replace(/import\s+db\s+from\s+['"]\.\/db['"];?/g, "import * as db from './db';");

// replace inner import declarations with require()
s = s.replace(/(^|\n)\s*import\s+([\w_$]+)\s+from\s+['"]electron['"];?/g, (m, nl, id) => `\nconst ${id} = require('electron');`);
s = s.replace(/(^|\n)\s*import\s+([\w_$]+)\s+from\s+['"]electron\/main['"];?/g, (m, nl, id) => `\nconst ${id} = require('electron/main');`);

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('fixed main.ts imports');
} else console.log('no changes main.ts');
