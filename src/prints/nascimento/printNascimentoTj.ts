// src/prints/nascimento/printNascimentoTj.ts
type AnyJson = any;

function escapeHtml(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeHref(href: string | undefined, fallback: string) {
  if (!href) return fallback;
  const trimmed = href.trim();
  // disallow dangerous protocols like javascript: and data:
  if (/^\s*(javascript|data):/i.test(trimmed)) return fallback;
  return escapeHtml(trimmed);
}

/**
 * Template EDITÁVEL do PDF.
 * Você cola aqui a estrutura do TJ e só troca os ${...}.
 */
export function buildNascimentoPdfHtmlTJ(data: AnyJson, opts?: { cssHref?: string }) {
  const cssHref = sanitizeHref(opts?.cssHref, "../assets/tj/certidao.css"); // copie o CSS do TJ pro seu projeto

  // Pegue do seu JSON como já é hoje (sem mudar contrato)
  const reg = data?.registro ?? {};
  const cert = data?.certidao ?? {};

  const nome = escapeHtml(reg.nome_completo ?? "");
  const cpf = escapeHtml(reg.cpf ?? "");
  const matricula = escapeHtml(reg.matricula ?? "");
  const livro = escapeHtml(reg.livro ?? "");
  const folha = escapeHtml(reg.folha ?? "");
  const termo = escapeHtml(reg.termo ?? "");
  const dnv = escapeHtml(reg.numero_dnv ?? "");

  // Ajuste esses binds conforme teu JSON real (sem inventar campos)
  const dataNascExt = escapeHtml(reg.data_nascimento_extenso ?? "NÃO CONSTA");
  const diaNasc = escapeHtml(reg.dia_nascimento ?? "");
  const mesNasc = escapeHtml(reg.mes_nascimento ?? "");
  const anoNasc = escapeHtml(reg.ano_nascimento ?? "");
  const hora = escapeHtml(reg.hora_nascimento ?? "00:00 HORAS");
  const sexo = escapeHtml(reg.sexo ?? "NÃO CONSTA");

  const naturalidade = escapeHtml(reg.naturalidade_municipio_uf ?? "NÃO CONSTA");
  const ufNaturalidade = escapeHtml(reg.naturalidade_uf ?? "");

  const localNasc = escapeHtml(reg.local_nascimento ?? "NÃO CONSTA");
  const municipioNasc = escapeHtml(reg.municipio_nascimento ?? "NÃO CONSTA");
  const ufNasc = escapeHtml(reg.uf_nascimento ?? "");

  const maeNome = escapeHtml(reg.mae_nome ?? "NÃO CONSTA");
  const maeMun = escapeHtml(reg.mae_municipio ?? "NÃO CONSTA");
  const maeUf = escapeHtml(reg.mae_uf ?? "");
  const maeAvos = escapeHtml(reg.mae_avos ?? "");

  const paiNome = escapeHtml(reg.pai_nome ?? "NÃO CONSTA");
  const paiMun = escapeHtml(reg.pai_municipio ?? "NÃO CONSTA");
  const paiUf = escapeHtml(reg.pai_uf ?? "");
  const paiAvos = escapeHtml(reg.pai_avos ?? "");

  const dataRegistroExt = escapeHtml(reg.data_registro_extenso ?? "NÃO CONSTA");
  const gemeo = escapeHtml(reg.gemeo ?? "NÃO CONSTA");

  const cns = escapeHtml(cert.cartorio_cns ?? "");
  const cartorioCidadeUf = escapeHtml(cert.cartorio_cidade_uf ?? "");
  const serventuario = escapeHtml(cert.serventuario_nome ?? "");
  const serventuarioCargo = escapeHtml(cert.serventuario_cargo ?? "ESCREVENTE");

  // Estrutura baseada no HTML do TJ (do seu TXT) — você pode expandir/colar tudo aqui
  // Exemplo: fieldsets e tabelas com classes e textos iguais ao TJ. :contentReference[oaicite:2]{index=2}
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certidão de Nascimento</title>
  <link rel="StyleSheet" href="${escapeHtml(cssHref)}" type="text/css">
  <style>@media print{.nao-imprimir{display:none!important}} body{margin-top:0}</style>
</head>
<body>
<center>

  <br><br><br><br><br><br><br><br><br><br><br>
  <br><br>

  <div style="font-size: 14pt;">CERTIDÃO DE NASCIMENTO</div>
  <div style="font-size: 13pt;">Nome: ${nome}</div>
  <div style="font-size: 13pt;">CPF: ${cpf}</div>
  <div style="font-size: 13pt;">Matrícula: ${matricula}</div>

  <div style="width: 90%;">
    <table width="100%" class="tabela">
      <tr>
        <th width="20%" class="label">Data de nascimento</th>
        <td width="30%"><span class="novodado">${dataNascExt}</span></td>
        <th width="20%" class="label">Dia / mês / ano</th>
        <td width="30%"><span class="novodado">${diaNasc} / ${mesNasc} / ${anoNasc}</span></td>
      </tr>
      <tr>
        <th class="label">Hora</th>
        <td><span class="novodado">${hora}</span></td>
        <th class="label">Sexo</th>
        <td><span class="novodado">${sexo}</span></td>
      </tr>
      <tr>
        <th class="label">Naturalidade</th>
        <td><span class="novodado">${naturalidade}</span></td>
        <th class="label">UF</th>
        <td><span class="novodado">${ufNaturalidade}</span></td>
      </tr>
      <tr>
        <th class="label">Local de nascimento</th>
        <td><span class="novodado">${localNasc}</span></td>
        <th class="label">Município/UF</th>
        <td><span class="novodado">${municipioNasc}/${ufNasc}</span></td>
      </tr>
    </table>

    <fieldset>
      <legend>Genitor(a) 1</legend>
      <table width="100%" class="tabela">
        <tr><th class="label" width="20%">Nome</th><td><span class="novodado">${maeNome}</span></td></tr>
        <tr><th class="label">Naturalidade</th><td><span class="novodado">${maeMun}/${maeUf}</span></td></tr>
        <tr><th class="label">Avós</th><td><span class="novodado">${maeAvos}</span></td></tr>
      </table>
    </fieldset>

    <fieldset>
      <legend>Genitor(a) 2</legend>
      <table width="100%" class="tabela">
        <tr><th class="label" width="20%">Nome</th><td><span class="novodado">${paiNome}</span></td></tr>
        <tr><th class="label">Naturalidade</th><td><span class="novodado">${paiMun}/${paiUf}</span></td></tr>
        <tr><th class="label">Avós</th><td><span class="novodado">${paiAvos}</span></td></tr>
      </table>
    </fieldset>

    <table width="100%" class="tabela">
      <tr>
        <th class="label" width="20%">Gêmeo</th>
        <td width="30%"><span class="novodado">${gemeo}</span></td>
        <th class="label" width="20%">Data do registro</th>
        <td width="30%"><span class="novodado">${dataRegistroExt}</span></td>
      </tr>
      <tr>
        <th class="label">DNV</th>
        <td><span class="novodado">${dnv}</span></td>
        <th class="label">CNS</th>
        <td><span class="novodado">${cns}</span></td>
      </tr>
    </table>

    <div style="margin-top:12px;font-size:12px;">
      ${cartorioCidadeUf}<br>
      ${serventuario} - ${serventuarioCargo}
    </div>
  </div>

</center>
</body>
</html>`;
}
