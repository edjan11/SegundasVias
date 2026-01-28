const fs = require('fs');
const path = require('path');
const plan = require('./docs-move-plan.json');
const base = path.join(__dirname, 'backup');
if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
for (const item of plan) {
  const src = path.join(process.cwd(), item.path);
  if (!fs.existsSync(src)) {
    console.warn('Missing source, skipping:', item.path);
    continue;
  }
  const dst = path.join(base, item.path);
  const dir = path.dirname(dst);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dst);
}
console.log('Copied', plan.length, 'files to', base);
