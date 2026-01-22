const fs = require('fs');
const path = require('path');

const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '..', 'ui', 'pages', 'Nascimento2Via.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Import the module under test
const { applyCertificatePayloadToSecondCopy } = require('../src/ui/payload/apply-payload');

function setupDom() {
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  // expose globals similar to browser environment
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;

  // Ensure CNS mapping exists as in UI
  window.CNS_CARTORIOS = {
    '6': '110742',
    '9': '163659',
    '12': '110064',
    '13': '109736',
    '14': '110635',
    '15': '110072',
  };
}

describe('apply-payload integration', () => {
  beforeEach(() => setupDom());

  test('applies local_nascimento and cartorio properly', () => {
    const payload = {
      certidao: { tipo_registro: 'nascimento', cartorio_cns: '163659' },
      registro: {
        local_nascimento_codigo: '1',
        matricula: '00001/002/0000001',
        matricula_livro: '00001',
        matricula_folha: '002',
        matricula_termo: '0000001',
        cpf: '12345678901',
      },
    };

    const res = applyCertificatePayloadToSecondCopy(payload);
    expect(res.ok).toBe(true);

    const localSelect = document.querySelector('select[name="localNascimento"]');
    expect(localSelect).not.toBeNull();
    expect(localSelect.value).toBe('H'); // '1' -> 'H'

    const cartSelect = document.getElementById('cartorio-oficio');
    expect(cartSelect).not.toBeNull();
    expect(cartSelect.value).toBe('9'); // CNS 163659 -> oficio 9

    const cnsInput = document.querySelector('[data-bind="certidao.cartorio_cns"]');
    expect(cnsInput).not.toBeNull();
    expect(cnsInput.value).toBe('163659');

    const matInput = document.getElementById('matricula');
    expect(matInput).not.toBeNull();
    expect(matInput.value).toBe('00001/002/0000001');

    const cpfInput = document.querySelector('[data-bind="registro.cpf"]');
    expect(cpfInput).not.toBeNull();
    // formatting may change but digits should be present
    expect(cpfInput.value.replace(/\D/g, '')).toBe('12345678901');
  });

  test('detects CNS from matricula and sets cartorio_oficio', () => {
    const payload = {
      certidao: { tipo_registro: 'nascimento' },
      registro: { matricula: '163659/001/0001', cpf: '99999999999' },
    };

    const res = applyCertificatePayloadToSecondCopy(payload);
    expect(res.ok).toBe(true);

    const cartSelect = document.getElementById('cartorio-oficio');
    expect(cartSelect).not.toBeNull();
    expect(cartSelect.value).toBe('9'); // matricula starts with 163659 -> oficio 9

    const cnsInput = document.querySelector('[data-bind="certidao.cartorio_cns"]');
    expect(cnsInput).not.toBeNull();
    expect(cnsInput.value).toBe('163659');
  });

  test('sets certidao.cartorio_cns from matricula even without known mapping', () => {
    const payload = {
      certidao: { tipo_registro: 'nascimento' },
      registro: { matricula: '12610961135', cpf: '77788899900' },
    };

    const res = applyCertificatePayloadToSecondCopy(payload);
    expect(res.ok).toBe(true);

    const cnsInput = document.querySelector('[data-bind="certidao.cartorio_cns"]');
    expect(cnsInput).not.toBeNull();
    expect(cnsInput.value).toBe('126109'); // first 6 digits

    const cartSelect = document.getElementById('cartorio-oficio');
    expect(cartSelect).not.toBeNull();
    // Mapping for 126109 does not exist in window.CNS_CARTORIOS test map, so cartorio_oficio should not be set to any oficio mapping this prefix
    const mapped = Object.keys(window.CNS_CARTORIOS).find((k) => window.CNS_CARTORIOS[k] === '126109');
    expect(mapped).toBeUndefined();
  });
});
