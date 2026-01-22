const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  if (fs.cpSync) {
    fs.cpSync(src, dest, { recursive: true, force: true });
    return;
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function main() {
  const root = path.resolve(__dirname, '..');
  const src = path.resolve(root, 'public', 'data');
  const dest = path.resolve(root, 'ui', 'data');

  if (!fs.existsSync(src)) {
    console.error('[ui:copy-data] origem nao encontrada:', src);
    process.exit(1);
  }

  copyDir(src, dest);
  console.log('[ui:copy-data] copiado', src, '->', dest);
}

main();
