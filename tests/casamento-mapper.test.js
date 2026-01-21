const { JSDOM } = require('jsdom');
const { mapperHtmlToCrcJson } = require('../dist-src/acts/casamento/mapperHtmlToJsonCasamento');

function runTest() {
  const html = `<!doctype html><html><body>
    <input name="matricula" value="9998881234567890" />

    <input name="CPFNoivo" value="" />
    <input name="cpfNoiva" value="529.982.247-25" />

    <input name="nomeSolteiro" value="JOAO" />
    <input name="nomeSolteira" value="MARIA" />

    <input name="nomePaiNoivo" value="PAI COMPLETO" />
    <input name="nomeMaeNoivo" value="MAE COMPLETO" />

    <input name="cidadeNascimentoNoivo" value="" />
    <input name="ufNascimentoNoivo" value="" />

    <input name="cidadeNascimentoNoiva" value="" />
    <input name="ufNascimentoNoiva" value="" />

  </body></html>`;

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const json = mapperHtmlToCrcJson(doc);

  console.log('certidao.cartorio_cns:', json.certidao.cartorio_cns);
  console.log('conjuge1.cpf_sem_inscricao, cpf:', json.registro.conjuges[0].cpf_sem_inscricao, json.registro.conjuges[0].cpf);
  console.log('conjuge2.cpf_sem_inscricao, cpf:', json.registro.conjuges[1].cpf_sem_inscricao, json.registro.conjuges[1].cpf);
  console.log('genitores1:', json.registro.conjuges[0].genitores);
  console.log('conjuge1.has_nome_apos:', 'nome_apos_casamento' in json.registro.conjuges[0]);
  console.log('uf_naturalidade1:', JSON.stringify(json.registro.conjuges[0].uf_naturalidade));
}

runTest();
