import { normalizeDate } from '../../shared/validators/date.js';
import { normalizeTime } from '../../shared/validators/time.js';
const MONTHS = [
    'JANEIRO',
    'FEVEREIRO',
    'MARCO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO',
];
const MONTHS_LONG = [
    'Janeiro',
    'Fevereiro',
    'Marco',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];
const UNITS = ['ZERO', 'UM', 'DOIS', 'TRES', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO', 'NOVE'];
const TEENS = [
    'DEZ',
    'ONZE',
    'DOZE',
    'TREZE',
    'QUATORZE',
    'QUINZE',
    'DEZESSEIS',
    'DEZESSETE',
    'DEZOITO',
    'DEZENOVE',
];
const TENS = [
    '',
    '',
    'VINTE',
    'TRINTA',
    'QUARENTA',
    'CINQUENTA',
    'SESSENTA',
    'SETENTA',
    'OITENTA',
    'NOVENTA',
];
const HUNDREDS = [
    '',
    'CEM',
    'DUZENTOS',
    'TREZENTOS',
    'QUATROCENTOS',
    'QUINHENTOS',
    'SEISCENTOS',
    'SETECENTOS',
    'OITOCENTOS',
    'NOVECENTOS',
];
function pad2(value) {
    return String(value).padStart(2, '0');
}
function normalizeUpper(value) {
    return String(value || '')
        .trim()
        .toUpperCase();
}
function fallback(value, alt = 'NÃO CONSTA') {
    const v = String(value || '').trim();
    return v ? v : alt;
}
function ufDisplay(value) {
    const uf = normalizeUpper(value);
    if (!uf || uf === 'IG')
        return 'N/C';
    return uf;
}
function numberToWords(n) {
    if (n === 0)
        return UNITS[0];
    if (n < 10)
        return UNITS[n];
    if (n < 20)
        return TEENS[n - 10];
    if (n < 100) {
        const t = Math.floor(n / 10);
        const u = n % 10;
        return u ? `${TENS[t]} E ${UNITS[u]}` : TENS[t];
    }
    if (n < 1000) {
        if (n === 100)
            return 'CEM';
        const h = Math.floor(n / 100);
        const rest = n % 100;
        const hword = h === 1 ? 'CENTO' : HUNDREDS[h];
        return rest ? `${hword} E ${numberToWords(rest)}` : hword;
    }
    if (n < 2000) {
        const rest = n - 1000;
        return rest ? `MIL E ${numberToWords(rest)}` : 'MIL';
    }
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const tword = `${numberToWords(thousands)} MIL`;
    return rest ? `${tword} E ${numberToWords(rest)}` : tword;
}
function dateParts(value) {
    const normalized = normalizeDate(value);
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized || '');
    if (!m)
        return null;
    return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
}
function buildDateExtenso(dateStr, timeStr) {
    const parts = dateParts(dateStr);
    if (!parts)
        return 'NÃO CONSTA';
    const day = numberToWords(parts.day);
    const month = MONTHS[parts.month - 1] || '';
    const year = numberToWords(parts.year);
    const time = normalizeTime(timeStr);
    const hora = time ? ` ÀS ${time}` : '';
    return `${day} DO MÊS DE ${month} DO ANO DE ${year}${hora}`;
}
function formatDatePieces(dateStr) {
    const parts = dateParts(dateStr);
    if (!parts) {
        return { day: 'N/C', month: 'N/C', year: 'N/C' };
    }
    return {
        day: pad2(parts.day),
        month: pad2(parts.month),
        year: String(parts.year),
    };
}
function formatIssueDate(date = new Date()) {
    const day = date.getDate();
    const month = MONTHS_LONG[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
}
function formatMatricula(matricula) {
    const digits = String(matricula || '').replace(/\D/g, '');
    if (digits.length < 32)
        return fallback(matricula, 'NÃO CONSTA');
    const cns = digits.slice(0, 6);
    const acervo = digits.slice(6, 8);
    const servico = digits.slice(8, 10);
    const ano = digits.slice(10, 14);
    const tipo = digits.slice(14, 15);
    const livro = digits.slice(15, 20);
    const folha = digits.slice(20, 23);
    const termo = digits.slice(23, 30);
    const dv = digits.slice(30, 32);
    return `${cns} ${acervo} ${servico} ${ano} ${tipo} ${livro} ${folha} ${termo}  - ${dv}`;
}
function formatFilhos(registro) {
    const opcao = String(registro?.existencia_filhos_opcao || '').toLowerCase();
    const filhos = registro?.existencia_filhos?.filhos || [];
    if (opcao === 'texto') {
        const texto = filhos
            .map((f) => f.texto)
            .filter(Boolean)
            .join('; ');
        return texto ? texto : 'NÃO CONSTA';
    }
    if (opcao === 'sim') {
        if (!filhos.length)
            return 'SIM';
        const items = filhos
            .map((f) => {
            const nome = normalizeUpper(f.nome || '');
            const idade = f.idade ? ` (${normalizeUpper(f.idade)})` : '';
            const falecido = f.falecido ? ' FALECIDO' : '';
            return `${nome}${idade}${falecido}`.trim();
        })
            .filter(Boolean);
        return items.length ? items.join('; ') : 'SIM';
    }
    return 'NÃO CONSTA';
}
function formatAnotacoes(anotacoes) {
    if (!anotacoes || !anotacoes.length)
        return 'NÃO CONSTA';
    return anotacoes
        .map((item) => {
        const tipo = normalizeUpper(item.tipo);
        const doc = normalizeUpper(item.documento);
        return `${tipo}: ${doc}`;
    })
        .join(' | ');
}
function formatBens(value) {
    const v = normalizeUpper(value);
    if (!v || v === 'IGNORADA')
        return 'NÃO CONSTA';
    if (v === 'NAO')
        return 'NAO';
    return v;
}
export function buildObitoPrintHtml(data, opts = {}) {
    const registro = data?.registro || {};
    const certidao = data?.certidao || {};
    const now = new Date();
    const cidadeCartorio = normalizeUpper(opts.cidadeCartorio || registro.municipio_falecimento || '');
    const ufCartorio = ufDisplay(opts.ufCartorio || registro.uf_falecimento || '');
    const assinante = normalizeUpper(opts.assinante || '');
    const enderecoCartorio = normalizeUpper(opts.enderecoCartorio || '');
    const telefoneCartorio = normalizeUpper(opts.telefoneCartorio || '');
    const dataFalecimentoExt = buildDateExtenso(registro.data_falecimento, registro.hora_falecimento);
    const dataFalecimentoParts = formatDatePieces(registro.data_falecimento);
    const dataRegistroExt = buildDateExtenso(registro.data_registro, registro.hora_falecimento);
    const dataRegistroParts = formatDatePieces(registro.data_registro);
    const sexo = normalizeUpper(registro.sexo === 'outros' ? registro.sexo_outros || 'OUTROS' : registro.sexo);
    const estadoCivil = normalizeUpper(registro.estado_civil);
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Certidao de Obito</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; }
    .label { font-size: 9pt; color: #333; }
    .tabela { width: 100%; border-collapse: collapse; margin: 6px 0; }
    .novodado { font-size: 10pt; font-weight: bold; padding: 4px 2px; }
    .novomodelo { font-size: 10pt; padding: 4px 2px; }
    fieldset { border: 1px solid #cbd5e1; padding: 4px 8px; min-height: 40px; }
    legend { padding: 0 6px; }
    .rodape { width: 100%; margin-top: 10px; }
    .rodape-esquerdo { font-size: 9pt; vertical-align: top; width: 40%; }
    .rodape-direito { width: 40%; }
    .via { font-size: 12pt; font-weight: bold; }
    .tabelafinal { width: 100%; }
  </style>
</head>
<body>
<center>
  <img src="http://www.tjse.jus.br/scc/resources/imagens/brasao_exercito.jpg"><br>
  REPUBLICA FEDERATIVA DO BRASIL<br>
  REGISTRO CIVIL DAS PESSOAS NATURAIS<br>
  <br>
  <input type="hidden" name="moeda" value="">
  <br><span style="font-size: 13pt; color: gray">CERTIDAO DE OBITO</span><br>
  <br> <span class="label">NOME&nbsp;</span><br>
  <span style="font-size: 10pt; font-weight: bold">${fallback(normalizeUpper(registro.nome_completo))}</span><br>
  <div style="width: 80%">
    <table class="tabela">
      <tr>
        <td class="label" width="30%">CPF</td>
      </tr>
      <tr>
        <td class="novodado" width="30%">${fallback(normalizeUpper(registro.cpf))}</td>
      </tr>
    </table>
    <b>MATRICULA</b>
    <div style="font-size: 15px"><b>${formatMatricula(registro.matricula)}</b></div>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Data do falecimento</legend>
            <div class="novomodelo">${dataFalecimentoExt}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Dia</legend>
            <div class="novomodelo">${dataFalecimentoParts.day}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Mes</legend>
            <div class="novomodelo">${dataFalecimentoParts.month}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Ano</legend>
            <div class="novomodelo">${dataFalecimentoParts.year}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Horario do falecimento</legend>
            <div class="novomodelo">${fallback(normalizeTime(registro.hora_falecimento), 'N/C')} hora(s)</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Local de falecimento</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.local_falecimento))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Municipio de falecimento</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.municipio_falecimento))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">UF</legend>
            <div class="novomodelo">${ufDisplay(registro.uf_falecimento)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Sexo</legend>
            <div class="novomodelo">${fallback(sexo)}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Estado Civil</legend>
            <div class="novomodelo">${fallback(estadoCivil)}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Nome do ultimo conjuge ou convivente</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.nome_ultimo_conjuge_convivente))}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Idade</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.idade), 'N/C')}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Dia</legend>
            <div class="novomodelo">N/C</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Mes</legend>
            <div class="novomodelo">N/C</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Ano</legend>
            <div class="novomodelo">N/C</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Municipio de naturalidade</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.municipio_naturalidade))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">UF</legend>
            <div class="novomodelo">${ufDisplay(registro.uf_naturalidade)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Nome do(a)s Genitor(es)</legend>
            <div class="novomodelo">&nbsp;${fallback(normalizeUpper(registro.filiacao))}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Causa da morte</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.causa_morte))}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Nome do medico que atestou o obito ou, se for o caso, das testemunhas</legend>
            <div class="novomodelo">&nbsp;${normalizeUpper(registro.nome_medico)}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Numero do documento</legend>
            <div class="novomodelo">${normalizeUpper(registro.crm_medico)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Local de sepultamento / Cremacao</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.local_sepultamento_cremacao))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Municipio</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.municipio_sepultamento_cremacao))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">UF</legend>
            <div class="novomodelo">${ufDisplay(registro.uf_sepultamento_cremacao)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Data de registro</legend>
            <div class="novomodelo">${dataRegistroExt}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Dia</legend>
            <div class="novomodelo">${dataRegistroParts.day}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Mes</legend>
            <div class="novomodelo">${dataRegistroParts.month}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Ano</legend>
            <div class="novomodelo">${dataRegistroParts.year}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Nome do Declarante</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.nome_declarante))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Existencia de bens</legend>
            <div class="novomodelo">${formatBens(registro.existencia_bens)}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Existencia de filhos</legend>
            <div class="novomodelo">${formatFilhos(registro)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Anotacoes voluntarias de cadastro</legend>
            <div class="novomodelo" style="font-size: 95% !important">${formatAnotacoes(registro.anotacoes_cadastro)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table border="0" class="rodape">
      <tr>
        <td class="rodape-esquerdo">
          <div>
            <div>CNS nº ${fallback(certidao.cartorio_cns)}</div>
            <div>Oficial de Registro Civil de Pessoas Naturais</div>
            <div>${cidadeCartorio}${ufCartorio && cidadeCartorio ? '-' : ''}${ufCartorio}</div>
            <br>
            <div>${assinante || 'ESCREVENTE'}</div>
            <div>ESCREVENTE</div>
            <br>
            <div>${enderecoCartorio}</div>
            <div>${cidadeCartorio}${ufCartorio && cidadeCartorio ? ' - ' : ''}${ufCartorio}</div>
            <div>${telefoneCartorio}</div>
          </div>
        </td>
        <td><span class="via">2ª VIA</span></td>
        <td class="rodape-direito">
          <table class="tabelafinal">
            <tr>
              <td style="text-align: center">O conteudo da certidao e verdadeiro. Dou fe. <br>
                ${cidadeCartorio}, ${ufCartorio}, ${formatIssueDate(now)}. <br>
                <br><span style="font-family:verdana !important;"> _______________________________________________________</span><br>
                Assinatura do Oficial
              </td>
            </tr>
            <tr>
              <td style="text-align: center"> </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <br><br>
  </div>
</center>
</body>
</html>`;
    return html;
}
