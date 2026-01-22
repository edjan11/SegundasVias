const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src');

function fixFile(full) {
  let s = fs.readFileSync(full, 'utf8');
  const orig = s;

  // specific patterns for getElementById with as HTMLElement | null
  s = s.replace(/\(document\.getElementById\(([^)]+)\) as HTMLElement \| null\)\?\.value/g, '(document.getElementById($1) as any)?.value');
  s = s.replace(/\(document\.getElementById\(([^)]+)\) as HTMLElement \| null\)\.value/g, '(document.getElementById($1) as any).value');

  // cover common spacing variants
  s = s.replace(/\(\s*document\.getElementById\(([^)]+)\)\s+as\s+HTMLElement\s+\|\s+null\s*\)\?\.value/g, '(document.getElementById($1) as any)?.value');

  if (s !== orig) {
    fs.writeFileSync(full, s, 'utf8');
    console.log('applied even-more DOM any casts in', path.relative(root, full));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js')) {
      try { fixFile(full); } catch (err) { console.error('err', full, err.message); }
    }
  }
}

if (fs.existsSync(root)) walk(root);
console.log('done');
