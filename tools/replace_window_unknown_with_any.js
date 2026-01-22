const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src');

function fixFile(full) {
  let s = fs.readFileSync(full, 'utf8');
  const orig = s;

  s = s.replace(/\(window as unknown\)/g, '(window as any)');
  s = s.replace(/\(window as unknown\)\./g, '(window as any).');

  if (s !== orig) {
    fs.writeFileSync(full, s, 'utf8');
    console.log('replaced (window as unknown) with any in', path.relative(root, full));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js')) fixFile(full);
  }
}

walk(root);
console.log('done');
