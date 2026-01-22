const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src');

function process(full) {
  let s = fs.readFileSync(full, 'utf8');
  const hasModule = /(^|\n)\s*(import\s|export\s)/.test(s);
  if (!hasModule) {
    s = 'export {};\n' + s;
    fs.writeFileSync(full, s, 'utf8');
    console.log('marked module:', path.relative(root, full));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (full.endsWith('.ts')) process(full);
  }
}

walk(root);
console.log('done');
