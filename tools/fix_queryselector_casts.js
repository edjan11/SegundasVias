const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');

function castForSelector(selector) {
  const s = selector.toLowerCase();
  if (s.includes('input')) return 'HTMLInputElement';
  if (s.includes('select')) return 'HTMLSelectElement';
  if (s.includes('textarea')) return 'HTMLTextAreaElement';
  if (s.includes('button')) return 'HTMLButtonElement';
  return 'HTMLElement';
}

function fixFile(full) {
  let src = fs.readFileSync(full, 'utf8');
  const orig = src;

  // match document.querySelector('...') or document.querySelector("...")
  src = src.replace(/document\.querySelector\((['"])([^'"]+)\1\)/g, (m, q, sel) => {
    const cast = castForSelector(sel);
    return `(document.querySelector(${q}${sel}${q}) as ${cast} | null)`;
  });

  // also fix getElementById(...) occurrences where .value/.disabled/.style used
  src = src.replace(/document\.getElementById\((['"])([^'"]+)\1\)/g, (m, q, id) => {
    // conservatively cast to HTMLElement
    return `(document.getElementById(${q}${id}${q}) as HTMLElement | null)`;
  });

  if (src !== orig) {
    fs.writeFileSync(full, src, 'utf8');
    console.log('fixed casts in', path.relative(root, full));
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
