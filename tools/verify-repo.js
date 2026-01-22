const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'ui/templates/casamento-modelo.xml',
  'ui/templates/nascimento-modelo.xml',
  'ui/templates/nascimento-modelo-crc.xml',
  'ui/pdfElementsNascimento/print-nascimento-tj.html',
  'ui/pdfElementsCasamento/print-casamento-pdf-tj.html',
  'ui/assets/pdfElementsNascimento/pdf.css',
  'ui/assets/pdfElementsCasamento/pdf-casamento.css',
  'public/data/nomes.csv.gz',
  'public/data/grupos.csv.gz',
  'public/data/jsonCidades/estados-cidades.json',
];

const FORBIDDEN_DIRS = [
  'ui/pages/templates',
  'ui/pages/pdfElementsNascimento',
  'ui/pages/pdfElementsCasamento',
  'ui/pages/assets',
  'public/templates',
  'public/pages',
  'public/pdfElementsNascimento',
  'public/assets',
  'src/acts/nascimento/pdfElementsNascimento',
  'src/acts/casamento/pdfElementsCasamento',
];

function exists(rel) {
  return fs.existsSync(path.resolve(ROOT, rel));
}

function fileHash(absPath) {
  const data = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function walkFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function verifyRequiredFiles(errors) {
  REQUIRED_FILES.forEach((rel) => {
    if (!exists(rel)) errors.push(`Arquivo obrigatorio ausente: ${rel}`);
  });
  // Pelo menos um template CNJ especifico
  const tplDir = path.resolve(ROOT, 'ui/templates');
  if (fs.existsSync(tplDir)) {
    const hasCnj = fs
      .readdirSync(tplDir)
      .some((f) => /^nascimento-modelo-\d+\.xml$/i.test(f));
    if (!hasCnj) errors.push('Nenhum template CNJ encontrado em ui/templates');
  }
}

function verifyForbiddenDirs(errors) {
  FORBIDDEN_DIRS.forEach((rel) => {
    if (exists(rel)) errors.push(`Diretorio legacy/duplicado ainda existe: ${rel}`);
  });
}

function verifyDataMirror(errors) {
  const src = path.resolve(ROOT, 'public/data');
  const dest = path.resolve(ROOT, 'ui/data');
  if (!fs.existsSync(src)) {
    errors.push('public/data nao encontrado');
    return;
  }
  if (!fs.existsSync(dest)) {
    errors.push('ui/data nao encontrado (esperado via copy:assets)');
    return;
  }
  const srcFiles = walkFiles(src).map((f) => path.relative(src, f));
  const destFiles = walkFiles(dest).map((f) => path.relative(dest, f));

  srcFiles.forEach((rel) => {
    if (!destFiles.includes(rel)) {
      errors.push(`ui/data faltando arquivo: ${rel}`);
    } else {
      const a = path.join(src, rel);
      const b = path.join(dest, rel);
      const ha = fileHash(a);
      const hb = fileHash(b);
      if (ha !== hb) errors.push(`ui/data divergente de public/data: ${rel}`);
    }
  });
}

function run() {
  const errors = [];
  verifyRequiredFiles(errors);
  verifyForbiddenDirs(errors);
  verifyDataMirror(errors);

  try {
    const dup = require('./check-duplicates');
    if (dup && typeof dup.run === 'function') dup.run();
  } catch (e) {
    errors.push(`Falha ao rodar check-duplicates: ${e && e.message ? e.message : e}`);
  }

  if (errors.length) {
    console.error('verify-repo: falhou');
    errors.forEach((e) => console.error('-', e));
    process.exit(1);
  }

  console.log('verify-repo: ok');
}

if (require.main === module) {
  run();
}
