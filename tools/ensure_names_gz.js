// Ensure .gz versions exist for CSVs under public/data
// Usage: node tools/ensure_names_gz.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const dataDir = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(dataDir)) {
  console.error('public/data not found');
  process.exit(1);
}
const allFiles = fs.readdirSync(dataDir);
const uiDataDir = path.join(__dirname, '..', 'ui', 'public', 'data');
fs.mkdirSync(uiDataDir, { recursive: true });

for (const f of allFiles) {
  const full = path.join(dataDir, f);
  try {
    if (f.endsWith('.csv')) {
      const txt = fs.readFileSync(full);
      const gz = zlib.gzipSync(txt);
      const gzPath = full + '.gz';
      fs.writeFileSync(gzPath, gz);
      console.log('Wrote', gzPath);
      const dest = path.join(uiDataDir, f + '.gz');
      fs.copyFileSync(gzPath, dest);
      console.log('Copied', gzPath, '->', dest);
    } else if (f.endsWith('.gz')) {
      const dest = path.join(uiDataDir, f);
      fs.copyFileSync(full, dest);
      console.log('Copied', full, '->', dest);
    }
  } catch (e) {
    console.warn('Failed processing', full, e.message);
  }
}
