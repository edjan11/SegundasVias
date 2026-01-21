const assert = require('assert');
const { JSDOM } = require('jsdom');
const mapper = require('../dist-src/acts/nascimento/mapperHtmlToJsonNascimento').default;
const { buildNascimentoXmlFromJson } = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Running local-nascimento-mapping.test.js...');

  const html = `
    <div>
      <select id="localNascimento">
        <option value="">--</option>
        <option value="H">HOSPITAL</option>
        <option value="S">OUTROS ESTABELECIMENTOS</option>
        <option value="D">DOMICILIO</option>
      </select>
    </div>
  `;

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const select = doc.querySelector('#localNascimento');
  select.value = 'H';

  const payload = mapper(doc);
  assert.strictEqual(payload.registro.local_nascimento, 'H', 'mapper should read the select value H');

  const template = fs.readFileSync(path.resolve(__dirname, '../ui/templates/nascimento-modelo-110635.xml'), 'utf8');
  const xml = buildNascimentoXmlFromJson(template, payload);

  assert(xml.includes('<CodigoLocalDoNascimento>1</CodigoLocalDoNascimento>'), 'Expected CodigoLocalDoNascimento to be 1 for H (Hospital)');

  console.log('local-nascimento-mapping.test.js: all assertions passed');

  // Additional direct checks for mapLocalNascimentoCode behavior
  const { mapLocalNascimentoCode } = require('../dist-src/acts/nascimento/printNascimentoXmlFromJson');
  assert.strictEqual(mapLocalNascimentoCode('1 - Hospital'), '1', 'Should extract leading digit from "1 - Hospital"');
  assert.strictEqual(mapLocalNascimentoCode(' 2 - Centro'), '2', 'Should extract leading digit from "2 - Centro"');

  console.log('mapLocalNascimentoCode leading-digit assertions passed');
})();