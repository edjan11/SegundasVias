const fs = require('fs');
const path = require('path');
const { escapeHtml, sanitizeHref } = require('../dist-src/prints/shared/print-utils.js');

(async function main(){
  const templatePath = path.join(__dirname, '..', 'src', 'acts', 'casamento', 'pdfElementsCasamento', 'print-casamento-pdf-tj.html');
  if (!fs.existsSync(templatePath)) {
    console.error('Template not found at', templatePath);
    process.exit(1);
  }
  const raw = fs.readFileSync(templatePath, 'utf-8');

  // sample data
  const data = {
    certidao: { cartorio_cns: '110072', cartorio_cidade_uf: 'ARACAJU/SE', serventuario_nome: 'FLORIANO', serventuario_cargo: 'ESCREVENTE' },
    registro: {
      matricula: '11007201000020012000021',
      conjuges: [
        { nome_atual_habilitacao: 'DURAND NORONHA SILVA JUNIOR', cpf: '310.913.935-91', data_nascimento: '13/03/1962', municipio_naturalidade: 'ARACAJU', uf_naturalidade: 'SE', genitores: 'ANA MARIA; DURAND' },
        { nome_atual_habilitacao: 'CARMEN BATISTA', cpf: '667.884.397-53', data_nascimento: '16/07/1957', municipio_naturalidade: 'RIO DE JANEIRO', uf_naturalidade: 'RJ', genitores: 'MARIA; PAULO' }
      ],
      data_celebracao: '25/08/1992',
      data_registro: '25/08/1992',
      regime_bens: 'COMUNHÃO DE BENS',
      averbacao_anotacao: 'A PRESENTE CERTIDÃO...'
    }
  };

  function parseDateParts(value) {
    const m = String(value||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return {dd:'',mm:'',yyyy:''};
    return { dd: m[1], mm: m[2], yyyy: m[3] };
  }

  function buildDateExtenso(value){
    const p = parseDateParts(value);
    const meses = ['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
    const mes = meses[Number(p.mm)-1] || '';
    return p.dd ? `${p.dd} DE ${mes} DO ANO DE ${p.yyyy}` : '';
  }

  const reg = data.registro || {};
  const cert = data.certidao || {};
  const c1 = (reg.conjuges && reg.conjuges[0]) || {};
  const c2 = (reg.conjuges && reg.conjuges[1]) || {};

  const values = {
    '{{CSS_HREF}}': sanitizeHref(undefined, '/assets/pdfElementsCasamento/pdf-casamento.css'),
    '{{MATRICULA}}': escapeHtml(reg.matricula || ''),
    '{{CONJUGE1_NOME}}': escapeHtml(c1.nome_atual_habilitacao || ''),
    '{{CONJUGE1_CPF}}': escapeHtml(c1.cpf || ''),
    '{{CONJUGE1_DIA}}': escapeHtml(parseDateParts(c1.data_nascimento).dd || ''),
    '{{CONJUGE1_MES}}': escapeHtml(parseDateParts(c1.data_nascimento).mm || ''),
    '{{CONJUGE1_ANO}}': escapeHtml(parseDateParts(c1.data_nascimento).yyyy || ''),
    '{{CONJUGE1_NAT}}': escapeHtml(c1.municipio_naturalidade || ''),
    '{{CONJUGE1_UF}}': escapeHtml(c1.uf_naturalidade || ''),
    '{{CONJUGE1_GENITORES}}': escapeHtml(c1.genitores || ''),

    '{{CONJUGE2_NOME}}': escapeHtml(c2.nome_atual_habilitacao || ''),
    '{{CONJUGE2_CPF}}': escapeHtml(c2.cpf || ''),
    '{{CONJUGE2_DIA}}': escapeHtml(parseDateParts(c2.data_nascimento).dd || ''),
    '{{CONJUGE2_MES}}': escapeHtml(parseDateParts(c2.data_nascimento).mm || ''),
    '{{CONJUGE2_ANO}}': escapeHtml(parseDateParts(c2.data_nascimento).yyyy || ''),
    '{{CONJUGE2_NAT}}': escapeHtml(c2.municipio_naturalidade || ''),
    '{{CONJUGE2_UF}}': escapeHtml(c2.uf_naturalidade || ''),
    '{{CONJUGE2_GENITORES}}': escapeHtml(c2.genitores || ''),

    '{{DATA_CELEBRACAO_EXTENSO}}': escapeHtml(buildDateExtenso(reg.data_celebracao || '')),
    '{{DATA_CELEBRACAO_DIA}}': escapeHtml(parseDateParts(reg.data_celebracao).dd || ''),
    '{{DATA_CELEBRACAO_MES}}': escapeHtml(parseDateParts(reg.data_celebracao).mm || ''),
    '{{DATA_CELEBRACAO_ANO}}': escapeHtml(parseDateParts(reg.data_celebracao).yyyy || ''),

    '{{REGIME_BENS}}': escapeHtml(reg.regime_bens || ''),
    '{{ANOTACOES}}': escapeHtml(reg.averbacao_anotacao || ''),

    '{{CNS}}': escapeHtml(cert.cartorio_cns || ''),
    '{{CARTORIO_CIDADE_UF}}': escapeHtml(cert.cartorio_cidade_uf || ''),
    '{{SERVENTUARIO}}': escapeHtml(cert.serventuario_nome || ''),
    '{{SERVENTUARIO_CARGO}}': escapeHtml(cert.serventuario_cargo || ''),
  };

  let html = raw;
  for (const [token, value] of Object.entries(values)) html = html.split(token).join(value);

  const outDir = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'casamento-sample.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log('Wrote sample HTML to', outPath);
  console.log('Preview (first 200 chars):\n', html.slice(0, 200));
})();