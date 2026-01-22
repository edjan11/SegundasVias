const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist-src',
  'artifacts',
  'legacy',
  'apps',
  'ui\\js',
  'ui/js',
]);

const TARGETS = [
  { name: 'print-nascimento-tj.html', allowed: ['ui/pdfElementsNascimento'] },
  { name: 'print-casamento-pdf-tj.html', allowed: ['ui/pdfElementsCasamento'] },
  { name: 'pdf.css', allowed: ['ui/assets/pdfElementsNascimento'] },
  { name: 'pdf-casamento.css', allowed: ['ui/assets/pdfElementsCasamento'] },
  { name: 'casamento-modelo.xml', allowed: ['ui/templates'] },
  { name: 'nascimento-modelo.xml', allowed: ['ui/templates'] },
  { name: 'nascimento-modelo-crc.xml', allowed: ['ui/templates'] },
];

const PATTERN_TARGETS = [
  { regex: /^nascimento-modelo-\d+\.xml$/i, allowed: ['ui/templates'] },
  { regex: /^casamento-modelo-\d+\.xml$/i, allowed: ['ui/templates'] },
];

function isIgnoredDir(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  for (const dir of IGNORE_DIRS) {
    const dirNorm = dir.replace(/\\/g, '/');
    if (normalized === dirNorm) return true;
    if (normalized.startsWith(dirNorm + '/')) return true;
  }
  return false;
}

function walk(dir, out = []) {
  const relDir = path.relative(ROOT, dir);
  if (isIgnoredDir(relDir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (entry.isDirectory()) {
      if (isIgnoredDir(rel)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      out.push({ full, rel });
    }
  }
  return out;
}

function isAllowed(relPath, allowedDirs) {
  const normalized = relPath.replace(/\\/g, '/');
  return allowedDirs.some((dir) => normalized.startsWith(dir.replace(/\\/g, '/') + '/'));
}

function run() {
  const files = walk(ROOT);
  const errors = [];

  const byName = new Map();
  files.forEach((f) => {
    const base = path.basename(f.full);
    if (!byName.has(base)) byName.set(base, []);
    byName.get(base).push(f.rel);
  });

  // Exact-name targets
  TARGETS.forEach((t) => {
    const found = byName.get(t.name) || [];
    const bad = found.filter((p) => !isAllowed(p, t.allowed));
    const good = found.filter((p) => isAllowed(p, t.allowed));
    if (bad.length) {
      errors.push(
        `Duplicata fora do caminho oficial para "${t.name}":\n  - ${bad.join('\n  - ')}`,
      );
    }
    if (good.length > 1) {
      errors.push(
        `Mais de uma copia oficial para "${t.name}":\n  - ${good.join('\n  - ')}`,
      );
    }
    if (good.length === 0) {
      errors.push(`Arquivo oficial ausente: "${t.name}" (esperado em ${t.allowed.join(', ')})`);
    }
  });

  // Pattern targets
  files.forEach((f) => {
    const base = path.basename(f.full);
    for (const p of PATTERN_TARGETS) {
      if (p.regex.test(base) && !isAllowed(f.rel, p.allowed)) {
        errors.push(
          `Template com padrao "${p.regex}" fora do caminho oficial:\n  - ${f.rel}`,
        );
      }
    }
  });

  if (errors.length) {
    console.error('check-duplicates: falhou');
    errors.forEach((e) => console.error('-', e));
    process.exit(1);
  }

  console.log('check-duplicates: ok');
}

if (require.main === module) {
  run();
}

module.exports = { run };
