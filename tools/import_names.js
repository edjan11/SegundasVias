// Node script to scan a folder of CSVs and extract name tokens into public/data/nomes.csv
// Usage: node tools/import_names.js <path-to-cloned-repo-or-csv-folder>
// Requires: npm install papaparse

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

function listCsvFiles(dir) {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...listCsvFiles(p));
    else if (/\.csv$/i.test(it.name)) out.push(p);
  }
  return out;
}

function readCsvSync(file) {
  const text = fs.readFileSync(file, 'utf8');
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data || [];
}

function normalizeName(n) {
  if (!n) return '';
  return String(n).trim();
}

function extractNamesFromRow(row) {
  const names = [];
  const keys = Object.keys(row || {});
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (
      lk.includes('nome') ||
      lk.includes('name') ||
      lk.includes('nome_completo') ||
      lk.includes('full_name')
    ) {
      const v = row[k];
      if (v)
        names.push(
          ...String(v)
            .split(/[,;|\t\/\\]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        );
    }
  }
  return names;
}

function main() {
  const src = process.argv[2];
  if (!src) {
    console.error('Usage: node tools/import_names.js <path-to-csv-folder>');
    process.exit(2);
  }
  if (!fs.existsSync(src)) {
    console.error('Path not found:', src);
    process.exit(2);
  }
  const csvFiles = listCsvFiles(src);
  console.log('Found CSV files:', csvFiles.length);
  const nameSet = new Set();
  for (const f of csvFiles) {
    try {
      const rows = readCsvSync(f);
      for (const r of rows) {
        const extracted = extractNamesFromRow(r);
        for (const ex of extracted) {
          const pieces = String(ex).split(/\s+/).filter(Boolean);
          if (pieces.length === 0) continue;
          // take first token as first_name candidate
          nameSet.add(pieces[0]);
        }
      }
    } catch (e) {
      console.warn('Failed parsing', f, e.message);
    }
  }

  if (!fs.existsSync(path.join(__dirname, '..', 'public', 'data'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'public', 'data'), { recursive: true });
  }

  const outNames = Array.from(nameSet).sort((a, b) => a.localeCompare(b, 'pt'));
  const outCsv = outNames
    .map((n) => ({ first_name: n }))
    .map((r) => Papa.unparse([r], { header: false }))
    .join('\n');
  // produce a simple CSV header
  const final = 'first_name\nalternative_names\ngroup_name\n'.split('\n').slice(0, 1).join('\n');
  // We'll write a simple one-column CSV (first_name)
  const csvText = 'first_name\n' + outNames.join('\n') + '\n';
  const outDir = path.join(__dirname, '..', 'public', 'data');
  const csvPath = path.join(outDir, 'nomes.csv');
  fs.writeFileSync(csvPath, csvText, 'utf8');
  console.log('Wrote', csvPath, 'with', outNames.length, 'entries');

  // generate gz compressed version
  try {
    const zlib = require('zlib');
    const gz = zlib.gzipSync(Buffer.from(csvText, 'utf8'));
    const gzPath = path.join(outDir, 'nomes.csv.gz');
    fs.writeFileSync(gzPath, gz);
    console.log('Wrote compressed', gzPath);
  } catch (e) {
    console.warn('Failed to compress nomes.csv:', e.message);
  }
}

main();
