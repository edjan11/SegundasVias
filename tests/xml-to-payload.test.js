const fs = require('fs');
const path = require('path');
const { parseNascimentoXmlToPayload } = require('../dist-src/ui/payload/xml-to-payload');

test('parseNascimentoXmlToPayload extracts local_nascimento_codigo and matricula parts', async () => {
  const xmlPath = path.join(__dirname, '..', 'ui', 'templates', 'nascimento-modelo-110742.xml');
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const payload = parseNascimentoXmlToPayload(xml);
  expect(payload).toBeTruthy();
  const reg = payload.registro || {};
  expect(reg.local_nascimento).toMatch(/CLÍNICA SANTA HELENA/i);
  expect(reg.local_nascimento_codigo).toBe('1');
  expect(reg.matricula_livro).toBe('2');
  expect(reg.matricula_folha).toBe('8');
  expect(reg.matricula_termo).toBe('1231');
});

test('parseNascimentoXmlToPayload extracts CartorioCNS when present in template', async () => {
  const xmlPath = path.join(__dirname, '..', 'ui', 'templates', 'nascimento-modelo-163659.xml');
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const payload = parseNascimentoXmlToPayload(xml);
  expect(payload).toBeTruthy();
  expect(payload.certidao).toBeDefined();
  expect(payload.certidao.cartorio_cns).toBe('163659');
});

test('falls back to matricula first 6 digits when CartorioCNS missing', async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <ListaRegistrosNascimento>
      <PNAS>
        <NumeroLivro>123456</NumeroLivro>
        <NumeroPagina>01</NumeroPagina>
        <NumeroRegistro>0001</NumeroRegistro>
      </PNAS>
    </ListaRegistrosNascimento>`;
  const payload = parseNascimentoXmlToPayload(xml);
  expect(payload).toBeTruthy();
  expect(payload.certidao.cartorio_cns).toBe('123456');
});

test('parseNascimentoXmlToPayload uses CodigoCNJ value when present', async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <ListaRegistrosNascimento>
      <PNAS>
        <CodigoCNJ>110072</CodigoCNJ>
      </PNAS>
    </ListaRegistrosNascimento>`;
  const payload = parseNascimentoXmlToPayload(xml);
  expect(payload).toBeTruthy();
  expect(payload.certidao.cartorio_cns).toBe('110072');
});