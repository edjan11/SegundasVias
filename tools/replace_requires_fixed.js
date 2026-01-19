const fs = require('fs');
const path = require('path');

function walk(dir, exts) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, exts));
    else if (exts.includes(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function transformFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  const original = text;

  // 1) Top-level require -> import (simple cases only)
  text = text.replace(/^([ \t]*)(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*require\((['"])"?([^'\"]+)\3\);?/mg,
    (m, indent, name, q, pkg) => `${indent}import ${name} from '${pkg}';`);

  // 2) Remove single-line @ts-nocheck comments
  text = text.replace(/^[ \t]*\/\/\s*@ts-nocheck\s*$/mg, '');

  // 3) Replace empty catch blocks with a short comment
  text = text.replace(/catch\s*\(([^)]+)\)\s*{\s*}/mg, (m, g1) => `catch (${g1}) { /* ignore */ }`);

  if (text !== original) {
    fs.writeFileSync(file, text, 'utf8');
    console.log('Modified:', file);
  }
}

const roots = ['src', 'ui/ts'];
const exts = ['.ts', '.js'];
for (const r of roots) {
  const p = path.join(__dirname, '..', r);
  if (!fs.existsSync(p)) continue;
  const files = walk(p, exts);
  for (const f of files) transformFile(f);
}

console.log('replace_requires_fixed finished.');
