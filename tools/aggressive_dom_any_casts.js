const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src');

function fixFile(full) {
  let s = fs.readFileSync(full, 'utf8');
  const orig = s;

  // cast document.querySelector(...)? .value => (document.querySelector(...) as any)?.value
  s = s.replace(/document\.querySelector\(([^)]+)\)\?\.value/g, '(document.querySelector($1) as any)?.value');
  s = s.replace(/document\.querySelector\(([^)]+)\)\?\.checked/g, '(document.querySelector($1) as any)?.checked');
  s = s.replace(/document\.querySelector\(([^)]+)\)\?\.disabled/g, '(document.querySelector($1) as any)?.disabled');
  s = s.replace(/document\.getElementById\(([^)]+)\)\?\.value/g, '(document.getElementById($1) as any)?.value');
  s = s.replace(/\b([A-Za-z_$][\w$]*)\.value/g, '($1 as any).value');
  s = s.replace(/\b([A-Za-z_$][\w$]*)\.checked/g, '($1 as any).checked');
  s = s.replace(/\b([A-Za-z_$][\w$]*)\.disabled/g, '($1 as any).disabled');

  if (s !== orig) {
    fs.writeFileSync(full, s, 'utf8');
    console.log('applied aggressive DOM casts in', path.relative(root, full));
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
