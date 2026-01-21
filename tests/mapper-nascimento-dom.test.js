const assert = require('assert');
const { JSDOM } = require('jsdom');
const mapper = require('../dist-src/acts/nascimento/mapperHtmlToJsonNascimento').default;

const html = `
  <div>
    <input data-bind="certidao.cartorio_cns" value="163659" />
    <input type="checkbox" data-bind="certidao.transcricao" checked />

    <input data-bind="registro.matricula" id="matricula" value="16365901000020000000000000000000" />
    <input data-bind="ui.matricula_livro" id="matricula-livro" value="12" />
    <input data-bind="ui.matricula_folha" id="matricula-folha" value="34" />
    <input data-bind="ui.matricula_termo" id="matricula-termo" value="5678901" />

    <input data-bind="ui.mae_nome" value="MAE COMPLETA" />
    <input data-bind="ui.pai_nome" value="PAI COMPLETO" />

    <select id="localNascimento">
      <option value=""> </option>
      <option value="H">HOSPITAL</option>
      <option value="S">OUTROS</option>
      <option value="D">DOMICÍLIO</option>
    </select>
  </div>
`;

// extra assertion to verify local_nascimento mapping for camelCase id
const dom2 = new JSDOM(`<div><select id="localNascimento"><option value="H">HOSPITAL</option></select></div>`);
const payload2 = mapper(dom2.window.document);
assert(payload2.registro.local_nascimento === 'H', 'local_nascimento não mapeou valor do select com id localNascimento');

const dom = new JSDOM(html);
const payload = mapper(dom.window.document);

assert(payload.certidao.cartorio_cns === '163659', 'cartorio não mapeado');
assert(payload.certidao.transcricao === true, 'transcricao não mapeada');
assert(payload.registro.livro === '12', 'livro não mapeado');
assert(payload.registro.folha === '34', 'folha não mapeada');
assert(payload.registro.termo === '5678901', 'termo não mapeado');
assert(Array.isArray(payload.registro.participantes), 'participantes não existe');
assert(payload.registro.participantes.length === 2, 'quantidade de participantes inválida');
assert(payload.registro.participantes[0].nome === 'MAE COMPLETA', 'nome mae incorreto');
assert(payload.registro.participantes[1].nome === 'PAI COMPLETO', 'nome pai incorreto');

console.log('mapper-nascimento-dom.test.js: all assertions passed');