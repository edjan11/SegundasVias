const fs = require('fs');
const path = require('path');

// caminho default do template e do json
const templatePath = process.argv[2] || path.resolve(__dirname, '../ui/templates/nascimento-modelo.xml');
const jsonPath = process.argv[3] || path.resolve(__dirname, '../tests/fixtures/sample-nascimento.json');
const outPath = process.argv[4] || path.resolve(__dirname, '../artifacts/out/nascimento-gerado.xml');

function main() {
  try {
    const templateXml = fs.readFileSync(templatePath, 'utf8');
    const json = require(jsonPath);

    const builder = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');
    const xml = builder.buildNascimentoXmlFromJson(templateXml, json);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, xml, 'utf8');
    console.log('XML gerado em:', outPath);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao gerar XML:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

main();
