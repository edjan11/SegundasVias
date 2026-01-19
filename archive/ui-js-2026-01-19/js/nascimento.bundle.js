// src/shared/validators/date.ts
function pad2(value) {
  return String(value).padStart(2, "0");
}
function toYear(yearRaw) {
  const y = Number(yearRaw);
  if (String(yearRaw).length === 2) {
    return y <= 29 ? 2e3 + y : 1900 + y;
  }
  return y;
}
function isValidDateParts(day, month, year) {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}
function normalizeDate(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";
  const m = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.exec(input);
  let day = "";
  let month = "";
  let year = "";
  if (m) {
    [day, month, year] = input.split(/[/-]/);
  } else {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 8) {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 8);
    } else if (digits.length === 6) {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 6);
    }
  }
  if (!day || !month || !year) return "";
  const yyyy = toYear(year);
  const dd = Number(day);
  const mm = Number(month);
  if (!isValidDateParts(dd, mm, yyyy)) return "";
  return `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
}
function validateDateDetailed(raw) {
  const input = String(raw || "").trim();
  if (!input) return { ok: false, code: "EMPTY", message: "Campo vazio" };
  const m = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.exec(input);
  let day = "";
  let month = "";
  let year = "";
  if (m) {
    [day, month, year] = input.split(/[/-]/);
  } else {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 8) {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 8);
    } else if (digits.length === 6) {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 6);
    } else {
      return {
        ok: false,
        code: "FORMAT",
        message: "Formato inv\xE1lido \u2014 use DD/MM/AAAA (ex.: 31/12/2024)"
      };
    }
  }
  const dd = Number(day);
  const mm = Number(month);
  const yyyy = toYear(year);
  if (isNaN(mm) || mm < 1 || mm > 12)
    return { ok: false, code: "MONTH", message: "M\xEAs inv\xE1lido (01\u201312)" };
  if (isNaN(dd) || dd < 1 || dd > 31)
    return { ok: false, code: "DAY", message: "Dia inv\xE1lido (1\u201331)" };
  const d = new Date(yyyy, mm - 1, dd);
  if (!(d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd)) {
    return {
      ok: false,
      code: "NONEXISTENT",
      message: "Data inexistente \u2014 verifique dia e m\xEAs (ex.: 31/02/2024 n\xE3o existe)"
    };
  }
  return {
    ok: true,
    code: "OK",
    message: `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`
  };
}

// node_modules/cpf-cnpj-validator/dist/cpf-cnpj-validator.es.js
var BLACKLIST = [
  "00000000000",
  "11111111111",
  "22222222222",
  "33333333333",
  "44444444444",
  "55555555555",
  "66666666666",
  "77777777777",
  "88888888888",
  "99999999999",
  "12345678909"
];
var STRICT_STRIP_REGEX = /[.-]/g;
var LOOSE_STRIP_REGEX = /[^\d]/g;
var verifierDigit = (digits) => {
  const numbers = digits.split("").map((number) => {
    return parseInt(number, 10);
  });
  const modulus = numbers.length + 1;
  const multiplied = numbers.map((number, index) => number * (modulus - index));
  const mod = multiplied.reduce((buffer, number) => buffer + number) % 11;
  return mod < 2 ? 0 : 11 - mod;
};
var strip = (number, strict) => {
  const regex = strict ? STRICT_STRIP_REGEX : LOOSE_STRIP_REGEX;
  return (number || "").replace(regex, "");
};
var format = (number) => {
  return strip(number).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
};
var isValid = (number, strict) => {
  const stripped = strip(number, strict);
  if (!stripped) {
    return false;
  }
  if (stripped.length !== 11) {
    return false;
  }
  if (BLACKLIST.includes(stripped)) {
    return false;
  }
  let numbers = stripped.substr(0, 9);
  numbers += verifierDigit(numbers);
  numbers += verifierDigit(numbers);
  return numbers.substr(-2) === stripped.substr(-2);
};
var generate = (formatted) => {
  let numbers = "";
  for (let i = 0; i < 9; i += 1) {
    numbers += Math.floor(Math.random() * 9);
  }
  numbers += verifierDigit(numbers);
  numbers += verifierDigit(numbers);
  return formatted ? format(numbers) : numbers;
};
var cpf = {
  verifierDigit,
  strip,
  format,
  isValid,
  generate
};

// src/shared/validators/cpf.ts
function normalizeCpf(raw) {
  return String(raw || "").replace(/\D/g, "");
}
function isValidCpf(raw) {
  const digits = normalizeCpf(raw);
  return cpf.isValid(digits);
}

// src/acts/nascimento/mapperHtmlToJson.ts
function mapperHtmlToJson(doc) {
  const get = (sel) => {
    var _a;
    return ((_a = doc.querySelector(sel)) == null ? void 0 : _a.value) || "";
  };
  const getText = (sel) => {
    var _a;
    return ((_a = doc.querySelector(sel)) == null ? void 0 : _a.textContent) || "";
  };
  const getChecked = (sel) => {
    var _a;
    return !!((_a = doc.querySelector(sel)) == null ? void 0 : _a.checked);
  };
  const getRadio = (name) => {
    const el = doc.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  };
  const getSelect = (sel) => {
    const el = doc.querySelector(sel);
    return el ? el.value : "";
  };
  const getAll = (sel) => Array.from(doc.querySelectorAll(sel)).map((el) => el.value || "");
  return {
    registro: {
      nome_completo: get('input[name="nomeCompleto"]'),
      sexo: getRadio("sexo"),
      data_nascimento: normalizeDate(get('input[name="dataNascimento"]')),
      data_registro: normalizeDate(get('input[name="dataRegistro"]')),
      naturalidade: get('input[name="naturalidade"]'),
      nacionalidade: get('input[name="nacionalidade"]'),
      filiacao: get('input[name="filiacao"]'),
      cpf: normalizeCpf(get('input[name="cpf"]')),
      numero_dnv: get('input[name="numeroDNV"]'),
      livro: get('input[name="livro"]'),
      folha: get('input[name="folha"]'),
      termo: get('input[name="termo"]'),
      matricula: get('input[name="matricula"]')
    },
    certidao: {
      cartorio_cns: get('input[name="certidao.cartorio_cns"]'),
      municipio_cartorio: get('input[name="municipioCartorio"]'),
      uf_cartorio: getSelect('select[name="ufCartorio"]'),
      data_emissao: normalizeDate(get('input[name="dataEmissao"]')),
      via: get('input[name="via"]'),
      solicitante: get('input[name="solicitante"]'),
      cpf_solicitante: normalizeCpf(get('input[name="cpfSolicitante"]')),
      observacoes: get('textarea[name="observacoes"]')
    }
  };
}

// src/shared/validators/time.ts
function pad22(value) {
  return String(value).padStart(2, "0");
}
function isValidTimeParts(hour, minute) {
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  return true;
}
function normalizeTime(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";
  const m = /^(\d{1,2})[:]?(\d{2})$/.exec(input);
  if (!m) return "";
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!isValidTimeParts(hh, mm)) return "";
  return `${pad22(hh)}:${pad22(mm)}`;
}

// src/shared/validators/name.ts
var NAME_RE = /^[A-Za-zÀ-ÿ' \-]+$/;
function validateName(raw, opts = {}) {
  const minWords = opts.minWords || 2;
  const value = normalizeName(raw);
  if (!value) return { value: "", invalid: false, warn: false };
  if (!NAME_RE.test(value)) return { value, invalid: true, warn: false };
  const words = value.split(" ").filter(Boolean);
  const warn = words.length < minWords;
  return { value, invalid: false, warn };
}
function normalizeName(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim();
}

// src/shared/ui/fieldState.ts
function getFieldState(args) {
  const required = !!args.required;
  const value = String(args.value || "").trim();
  const isValid2 = args.isValid !== false;
  const warn = !!args.warn;
  if (!required && !value) return "valid";
  if (required && !value) return "empty";
  if (!isValid2) return "invalid";
  if (warn) return "warn";
  return value ? "valid" : "empty";
}
function applyFieldState(el, state) {
  if (!el) return;
  el.classList.toggle("field--error", state === "empty" || state === "invalid");
  el.classList.toggle("field--empty", state === "empty");
  el.classList.toggle("field--invalid", state === "invalid");
  el.classList.toggle("field--warn", state === "warn");
}

// src/shared/ui/mask.ts
function applyTimeMask(input) {
  if (!input) return;
  const digits = digitsOnly(input.value).slice(0, 4);
  let out = "";
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length > 2) out += ":" + digits.slice(2, 4);
  input.value = out;
}
function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}
function applyDateMask(input) {
  if (!input) return;
  const digits = digitsOnly(input.value).slice(0, 8);
  let out = "";
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length >= 3) out += "/" + digits.slice(2, 4);
  else if (digits.length > 2) out += "/" + digits.slice(2);
  if (digits.length >= 5) out += "/" + digits.slice(4, 8);
  input.value = out;
}

// src/shared/ui/debug.ts
function getFieldLabel(input) {
  var _a, _b, _c, _d, _e;
  const field = ((_a = input == null ? void 0 : input.closest) == null ? void 0 : _a.call(input, ".field")) || ((_b = input == null ? void 0 : input.closest) == null ? void 0 : _b.call(input, ".campo"));
  if (!field) return ((_c = input == null ? void 0 : input.getAttribute) == null ? void 0 : _c.call(input, "data-bind")) || (input == null ? void 0 : input.name) || (input == null ? void 0 : input.id) || "";
  const label = field.querySelector("label");
  const text = (_d = label == null ? void 0 : label.textContent) == null ? void 0 : _d.trim();
  return text || ((_e = input == null ? void 0 : input.getAttribute) == null ? void 0 : _e.call(input, "data-bind")) || (input == null ? void 0 : input.name) || (input == null ? void 0 : input.id) || "";
}
function collectInvalidFields(root = document) {
  const items = /* @__PURE__ */ new Set();
  root.querySelectorAll(".invalid").forEach((el) => {
    const label = getFieldLabel(el);
    if (label) items.add(label);
  });
  root.querySelectorAll(".field.field--error, .campo.field--error").forEach((field) => {
    var _a, _b;
    const label = (_b = (_a = field.querySelector("label")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim();
    if (label) items.add(label);
  });
  return Array.from(items);
}

// src/shared/matricula.ts
function digitsOnly2(value) {
  return String(value || "").replace(/\D/g, "");
}
function padLeft(value, size) {
  const digits = digitsOnly2(value);
  if (!digits) return "";
  return digits.padStart(size, "0").slice(-size);
}
function buildMatriculaBase30(args) {
  const cns = digitsOnly2(args.cns6 || "");
  const ano = digitsOnly2(args.ano || "");
  const tipoAto = digitsOnly2(args.tipoAto || "");
  const acervo = digitsOnly2(args.acervo || "01").padStart(2, "0");
  const servico = digitsOnly2(args.servico || "55").padStart(2, "0");
  const livro = padLeft(args.livro || "", 5);
  const folha = padLeft(args.folha || "", 3);
  const termo = padLeft(args.termo || "", 7);
  if (cns.length !== 6 || ano.length !== 4 || !tipoAto || !livro || !folha || !termo) return "";
  const base = `${cns}${acervo}${servico}${ano}${tipoAto}${livro}${folha}${termo}`;
  return base.length === 30 ? base : "";
}
function calcDv2Digits(base30) {
  if (!base30 || base30.length !== 30) return "";
  let s1 = 0;
  for (let i = 0; i < 30; i++) s1 += Number(base30[i]) * (31 - i);
  let d1 = 11 - s1 % 11;
  d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;
  const seq31 = base30 + String(d1);
  let s2 = 0;
  for (let i = 0; i < 31; i++) s2 += Number(seq31[i]) * (32 - i);
  let d2 = 11 - s2 % 11;
  d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;
  return `${d1}${d2}`;
}
function buildMatriculaFinal(args) {
  const base30 = buildMatriculaBase30(args);
  if (!base30) return "";
  const dv = calcDv2Digits(base30);
  return dv ? base30 + dv : "";
}

// src/shared/productivity/index.ts
function lockInput(input) {
  if (!input) return;
  input.readOnly = true;
  input.tabIndex = -1;
  input.classList.add("input-locked");
}
function setupNameCopy(sourceSelector, targetSelector) {
  const source = document.querySelector(sourceSelector);
  const target = document.querySelector(targetSelector);
  if (!source || !target) return;
  let lastAuto = "";
  const applyCopy = () => {
    const value = String(source.value || "").trim();
    if (!value) return;
    if (!target.value || target.value === lastAuto) {
      target.value = value;
      lastAuto = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  source.addEventListener("blur", applyCopy);
  source.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !e.shiftKey) {
      applyCopy();
    }
  });
}
function setupAutoNationality(selector, value) {
  const input = document.querySelector(selector);
  if (!input) return;
  if (String(input.value || "").trim()) return;
  input.value = value;
  lockInput(input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

// src/shared/ui/admin.ts
function setupAdminPanel() {
  const SIGNERS_KEY = "ui.admin.signers";
  function loadSigners() {
    try {
      const raw = localStorage.getItem(SIGNERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
    } catch (e) {
      return [];
    }
  }
  function saveSigners(list2) {
    localStorage.setItem(SIGNERS_KEY, JSON.stringify(list2));
  }
  function buildSignerOption(name) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    opt.dataset.localSigner = "1";
    return opt;
  }
  function syncSignerSelects(signers) {
    const selects = document.querySelectorAll(
      'select[data-signer-select], select[name="idAssinante"]'
    );
    selects.forEach((select) => {
      Array.from(select.options).forEach((opt) => {
        if (opt.dataset && opt.dataset.localSigner === "1") opt.remove();
      });
      signers.forEach((name) => {
        const exists = Array.from(select.options).some((opt) => opt.value === name);
        if (!exists) select.appendChild(buildSignerOption(name));
      });
    });
  }
  function renderList(container, signers) {
    if (!container) return;
    container.innerHTML = "";
    if (!signers.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Nenhum assinante cadastrado.";
      container.appendChild(empty);
      return;
    }
    signers.forEach((name) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const label = document.createElement("span");
      label.textContent = name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn tiny secondary";
      remove.textContent = "Remover";
      remove.addEventListener("click", () => {
        const next = loadSigners().filter((item) => item !== name);
        saveSigners(next);
        renderList(container, next);
        syncSignerSelects(next);
      });
      row.appendChild(label);
      row.appendChild(remove);
      container.appendChild(row);
    });
  }
  const input = document.getElementById("admin-signer-name");
  const addBtn = document.getElementById("admin-signer-add");
  const list = document.getElementById("admin-signer-list");
  if (!input || !addBtn || !list) {
    syncSignerSelects(loadSigners());
    return;
  }
  const render = () => {
    const signers = loadSigners();
    renderList(list, signers);
    syncSignerSelects(signers);
  };
  addBtn.addEventListener("click", () => {
    const value = String(input.value || "").trim();
    if (!value) return;
    const signers = loadSigners();
    if (!signers.includes(value)) {
      signers.push(value);
      saveSigners(signers);
    }
    input.value = "";
    render();
  });
  render();
}

// src/prints/nascimento/printNascimentoTj.ts
function escapeHtml(s) {
  return String(s != null ? s : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildNascimentoPdfHtmlTJ(data, opts) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I;
  const cssHref = (_a = opts == null ? void 0 : opts.cssHref) != null ? _a : "../assets/tj/certidao.css";
  const reg = (_b = data == null ? void 0 : data.registro) != null ? _b : {};
  const cert = (_c = data == null ? void 0 : data.certidao) != null ? _c : {};
  const nome = escapeHtml((_d = reg.nome_completo) != null ? _d : "");
  const cpf2 = escapeHtml((_e = reg.cpf) != null ? _e : "");
  const matricula = escapeHtml((_f = reg.matricula) != null ? _f : "");
  const livro = escapeHtml((_g = reg.livro) != null ? _g : "");
  const folha = escapeHtml((_h = reg.folha) != null ? _h : "");
  const termo = escapeHtml((_i = reg.termo) != null ? _i : "");
  const dnv = escapeHtml((_j = reg.numero_dnv) != null ? _j : "");
  const dataNascExt = escapeHtml((_k = reg.data_nascimento_extenso) != null ? _k : "N\xC3O CONSTA");
  const diaNasc = escapeHtml((_l = reg.dia_nascimento) != null ? _l : "");
  const mesNasc = escapeHtml((_m = reg.mes_nascimento) != null ? _m : "");
  const anoNasc = escapeHtml((_n = reg.ano_nascimento) != null ? _n : "");
  const hora = escapeHtml((_o = reg.hora_nascimento) != null ? _o : "00:00 HORAS");
  const sexo = escapeHtml((_p = reg.sexo) != null ? _p : "N\xC3O CONSTA");
  const naturalidade = escapeHtml((_q = reg.naturalidade_municipio_uf) != null ? _q : "N\xC3O CONSTA");
  const ufNaturalidade = escapeHtml((_r = reg.naturalidade_uf) != null ? _r : "");
  const localNasc = escapeHtml((_s = reg.local_nascimento) != null ? _s : "N\xC3O CONSTA");
  const municipioNasc = escapeHtml((_t = reg.municipio_nascimento) != null ? _t : "N\xC3O CONSTA");
  const ufNasc = escapeHtml((_u = reg.uf_nascimento) != null ? _u : "");
  const maeNome = escapeHtml((_v = reg.mae_nome) != null ? _v : "N\xC3O CONSTA");
  const maeMun = escapeHtml((_w = reg.mae_municipio) != null ? _w : "N\xC3O CONSTA");
  const maeUf = escapeHtml((_x = reg.mae_uf) != null ? _x : "");
  const maeAvos = escapeHtml((_y = reg.mae_avos) != null ? _y : "");
  const paiNome = escapeHtml((_z = reg.pai_nome) != null ? _z : "N\xC3O CONSTA");
  const paiMun = escapeHtml((_A = reg.pai_municipio) != null ? _A : "N\xC3O CONSTA");
  const paiUf = escapeHtml((_B = reg.pai_uf) != null ? _B : "");
  const paiAvos = escapeHtml((_C = reg.pai_avos) != null ? _C : "");
  const dataRegistroExt = escapeHtml((_D = reg.data_registro_extenso) != null ? _D : "N\xC3O CONSTA");
  const gemeo = escapeHtml((_E = reg.gemeo) != null ? _E : "N\xC3O CONSTA");
  const cns = escapeHtml((_F = cert.cartorio_cns) != null ? _F : "");
  const cartorioCidadeUf = escapeHtml((_G = cert.cartorio_cidade_uf) != null ? _G : "");
  const serventuario = escapeHtml((_H = cert.serventuario_nome) != null ? _H : "");
  const serventuarioCargo = escapeHtml((_I = cert.serventuario_cargo) != null ? _I : "ESCREVENTE");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certid\xE3o de Nascimento</title>
  <link rel="StyleSheet" href="${escapeHtml(cssHref)}" type="text/css">
  <style>@media print{.nao-imprimir{display:none!important}} body{margin-top:0}</style>
</head>
<body>
<center>

  <br><br><br><br><br><br><br><br><br><br><br>
  <br><br>

  <div style="font-size: 14pt;">CERTID\xC3O DE NASCIMENTO</div>
  <div style="font-size: 13pt;">Nome: ${nome}</div>
  <div style="font-size: 13pt;">CPF: ${cpf2}</div>
  <div style="font-size: 13pt;">Matr\xEDcula: ${matricula}</div>

  <div style="width: 90%;">
    <table width="100%" class="tabela">
      <tr>
        <th width="20%" class="label">Data de nascimento</th>
        <td width="30%"><span class="novodado">${dataNascExt}</span></td>
        <th width="20%" class="label">Dia / m\xEAs / ano</th>
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
        <th class="label">Munic\xEDpio/UF</th>
        <td><span class="novodado">${municipioNasc}/${ufNasc}</span></td>
      </tr>
    </table>

    <fieldset>
      <legend>Genitor(a) 1</legend>
      <table width="100%" class="tabela">
        <tr><th class="label" width="20%">Nome</th><td><span class="novodado">${maeNome}</span></td></tr>
        <tr><th class="label">Naturalidade</th><td><span class="novodado">${maeMun}/${maeUf}</span></td></tr>
        <tr><th class="label">Av\xF3s</th><td><span class="novodado">${maeAvos}</span></td></tr>
      </table>
    </fieldset>

    <fieldset>
      <legend>Genitor(a) 2</legend>
      <table width="100%" class="tabela">
        <tr><th class="label" width="20%">Nome</th><td><span class="novodado">${paiNome}</span></td></tr>
        <tr><th class="label">Naturalidade</th><td><span class="novodado">${paiMun}/${paiUf}</span></td></tr>
        <tr><th class="label">Av\xF3s</th><td><span class="novodado">${paiAvos}</span></td></tr>
      </table>
    </fieldset>

    <table width="100%" class="tabela">
      <tr>
        <th class="label" width="20%">G\xEAmeo</th>
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

// src/prints/shared/openAndSavePdf.ts
function openHtmlAndSavePdf(html, filenamePrefix) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) throw new Error("Popup bloqueado");
  w.document.open();
  w.document.write(html);
  w.document.close();
  const code = `
    (function(){
      function cleanup(){
        try{
          document.querySelectorAll('script, button, .nao-imprimir, [role="button"]').forEach(e=>e.remove());
          Array.from(document.querySelectorAll('*')).forEach((el)=>{
            try{ if(getComputedStyle(el).position==='fixed') el.remove(); }catch(e){}
          });
        }catch(e){}
      }
      function run(){
        try{
          cleanup();
          const opt = {
            margin: 10,
            filename: '${filenamePrefix}'+(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'')+'.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
          };
          const el = document.querySelector('center') || document.body.firstElementChild || document.body;
          if (window.html2pdf) window.html2pdf().set(opt).from(el).save();
          else window.print();
        } catch(e){ console.error(e); window.print(); }
      }
      if (window.html2pdf) run();
      else {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js';
        s.onload = run; s.onerror = function(){ window.print(); };
        document.head.appendChild(s);
      }
    })();
  `;
  const s = w.document.createElement("script");
  s.textContent = code;
  w.document.body.appendChild(s);
}

// src/acts/nascimento/nascimento.ts
var DRAWER_POS_KEY = "ui.drawerPosition";
var ENABLE_CPF_KEY = "ui.enableCpfValidation";
var ENABLE_NAME_KEY = "ui.enableNameValidation";
var PANEL_INLINE_KEY = "ui.panelInline";
function setStatus(text, isError) {
  const el = document.getElementById("statusText");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#dc2626" : "#64748b";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = "Pronto";
    el.style.color = "#64748b";
  }, 2e3);
}
function showToast(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 200);
  }, 2e3);
}
function resolveField(input) {
  return input.closest("td") || input.closest(".campo") || input.closest(".field") || input.parentElement;
}
function setFieldHint(field, message) {
  if (!field) return;
  let hint = field.querySelector(".hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.className = "hint";
    field.appendChild(hint);
  }
  if (message) {
    hint.innerHTML = "";
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.textContent = "\u26A0";
    icon.setAttribute("aria-hidden", "true");
    hint.appendChild(icon);
    const txt = document.createElement("span");
    txt.className = "hint-text";
    txt.textContent = message;
    hint.appendChild(txt);
    hint.classList.add("visible");
    let aria = document.getElementById("aria-live-errors");
    if (!aria) {
      aria = document.createElement("div");
      aria.id = "aria-live-errors";
      aria.className = "sr-only";
      aria.setAttribute("aria-live", "assertive");
      aria.setAttribute("role", "status");
      document.body.appendChild(aria);
    }
    aria.textContent = message;
  } else {
    hint.innerHTML = "";
    hint.classList.remove("visible");
  }
}
function clearFieldHint(field) {
  setFieldHint(field, "");
}
function setupFocusEmphasis() {
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e2) {
      }
      el.classList.add("focus-emphasis");
    }
  });
  document.addEventListener("focusout", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) el.classList.remove("focus-emphasis");
  });
}
function formatCpfInput(value) {
  const digits = normalizeCpf(value).slice(0, 11);
  if (!digits) return "";
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}
function toXml(obj, nodeName, indent = 0) {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === void 0) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== "object") return `${pad}<${nodeName}>${String(obj || "")}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => toXml(item, nodeName, indent)).join("\n");
  const children = Object.keys(obj).map((key) => toXml(obj[key], key, indent + 1)).join("\n");
  return `${pad}<${nodeName}>
${children}
${pad}</${nodeName}>`;
}
function updateDebug(data) {
  var _a, _b, _c, _d, _e;
  const cns = ((_a = document.querySelector('input[data-bind="certidao.cartorio_cns"]')) == null ? void 0 : _a.value) || "";
  const ano = (((_b = document.getElementById("data-reg")) == null ? void 0 : _b.value) || "").slice(-4);
  const livro = ((_c = document.getElementById("matricula-livro")) == null ? void 0 : _c.value) || "";
  const folha = ((_d = document.getElementById("matricula-folha")) == null ? void 0 : _d.value) || "";
  const termo = ((_e = document.getElementById("matricula-termo")) == null ? void 0 : _e.value) || "";
  const base = buildMatriculaBase30({
    cns6: cns,
    ano,
    tipoAto: "1",
    acervo: "01",
    servico: "55",
    livro,
    folha,
    termo
  });
  const dv = base ? calcDv2Digits(base) : "";
  const final = base && dv ? base + dv : buildMatriculaFinal({ cns6: cns, ano, tipoAto: "1", livro, folha, termo });
  const baseEl = document.getElementById("debug-matricula-base");
  if (baseEl) baseEl.value = base || "";
  const dvEl = document.getElementById("debug-matricula-dv");
  if (dvEl) dvEl.value = dv || "";
  const finalEl = document.getElementById("debug-matricula-final");
  if (finalEl) finalEl.value = final || "";
  const invalids = collectInvalidFields(document);
  const invalidEl = document.getElementById("debug-invalid");
  if (invalidEl) invalidEl.value = invalids.join("\n");
}
function updateOutputs() {
  const data = mapperHtmlToJson(document);
  const jsonEl = document.getElementById("json-output");
  if (jsonEl) jsonEl.value = JSON.stringify(data, null, 2);
  const xmlEl = document.getElementById("xml-output");
  if (xmlEl) xmlEl.value = toXml(data, "certidao_nascimento", 0);
  updateDebug(data);
}
function canProceed() {
  const invalids = collectInvalidFields(document);
  if (!invalids || invalids.length === 0) return true;
  setStatus(`${invalids.length} campo(s) inv\xE1lido(s). Corrija antes de prosseguir.`, true);
  showToast("Existem campos inv\xE1lidos \u2014 corrija antes de prosseguir");
  const invalidEl = document.getElementById("debug-invalid");
  if (invalidEl) invalidEl.value = invalids.join("\n");
  return false;
}
function updateActionButtons() {
  const invalids = collectInvalidFields(document);
  const disabled = !!(invalids && invalids.length > 0);
  const btnJson = document.getElementById("btn-json");
  if (btnJson) btnJson.disabled = disabled;
  const btnXml = document.getElementById("btn-xml");
  if (btnXml) btnXml.disabled = disabled;
  const btnSave = document.getElementById("btn-save");
  if (btnSave) btnSave.disabled = disabled;
  const statusEl = document.getElementById("statusText");
  if (statusEl && !disabled) statusEl.textContent = "Pronto";
  let summary = document.getElementById("form-error-summary");
  if (!summary) {
    summary = document.createElement("div");
    summary.id = "form-error-summary";
    summary.style.margin = "6px 0 0 0";
    summary.style.padding = "6px 8px";
    summary.style.borderRadius = "6px";
    summary.style.background = "transparent";
    summary.style.border = "none";
    summary.style.color = "#6b7280";
    summary.style.fontSize = "12px";
    summary.style.opacity = "0.85";
    const container = document.querySelector(".container");
    if (container) container.appendChild(summary);
  }
  if (disabled) {
    summary.textContent = `Campos inv\xE1lidos: ${invalids.join(", ")}`;
    summary.style.display = "block";
  } else if (summary) {
    summary.style.display = "none";
  }
  let aria = document.getElementById("aria-live-errors");
  if (!aria) {
    aria = document.createElement("div");
    aria.id = "aria-live-errors";
    aria.className = "sr-only";
    aria.setAttribute("aria-live", "assertive");
    aria.setAttribute("role", "status");
    document.body.appendChild(aria);
  }
  aria.textContent = disabled ? `Existem ${invalids.length} campos inv\xE1lidos: ${invalids.join(", ")}` : "";
}
function generateJson() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const json = JSON.stringify(data, null, 2);
  const out = document.getElementById("json-output");
  if (out) out.value = json;
  const name = `NASCIMENTO_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "")}.json`;
  try {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`JSON baixado: ${name}`);
  } catch (e) {
    setStatus("Falha ao gerar JSON", true);
  }
}
function generateXml() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const xml = toXml(data, "certidao_nascimento", 0);
  const out = document.getElementById("xml-output");
  if (out) out.value = xml;
  const name = `NASCIMENTO_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "")}.xml`;
  try {
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`XML baixado: ${name}`);
  } catch (e) {
    setStatus("Falha ao gerar XML", true);
  }
}
function setupValidation() {
  document.querySelectorAll("input.w-date").forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute("data-required") || input.classList.contains("required");
    const onInput = () => {
      applyDateMask(input);
      clearFieldHint(field);
      const normalized = normalizeDate(input.value);
      const isValid2 = !input.value || !!normalized;
      const state = getFieldState({ required, value: input.value, isValid: isValid2 });
      applyFieldState(field, state);
    };
    const onBlur = () => {
      applyDateMask(input);
      const raw = input.value || "";
      const res = validateDateDetailed(raw);
      const isValid2 = res.ok;
      const state = getFieldState({ required, value: raw, isValid: isValid2 });
      applyFieldState(field, state);
      if (!isValid2 && raw) setFieldHint(field, res.message || "Data inv\xE1lida");
      else clearFieldHint(field);
    };
    input.addEventListener("input", onInput);
    input.addEventListener("blur", onBlur);
    onInput();
  });
  document.querySelectorAll("input.w-time").forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute("data-required");
    const handler = () => {
      applyTimeMask(input);
      const normalized = normalizeTime(input.value);
      const isValid2 = !input.value || !!normalized;
      const state = getFieldState({ required, value: input.value, isValid: isValid2 });
      applyFieldState(field, state);
    };
    input.addEventListener("input", handler);
    input.addEventListener("blur", handler);
    handler();
  });
  const cpfInput = document.getElementById("cpf");
  if (cpfInput) {
    const field = resolveField(cpfInput);
    const handler = () => {
      cpfInput.value = formatCpfInput(cpfInput.value);
      const digits = normalizeCpf(cpfInput.value);
      const isValid2 = !digits || isValidCpf(digits);
      const state = getFieldState({
        required: false,
        value: digits ? cpfInput.value : "",
        isValid: isValid2
      });
      applyFieldState(field, state);
    };
    cpfInput.addEventListener("input", handler);
    cpfInput.addEventListener("blur", () => {
      handler();
      const digits = normalizeCpf(cpfInput.value);
      if (cpfInput.value && (!digits || !isValidCpf(digits))) setFieldHint(field, "CPF inv\xE1lido");
      else clearFieldHint(field);
    });
    handler();
  }
  const enableName = localStorage.getItem("ui.enableNameValidation") !== "false";
  if (enableName) {
    document.querySelectorAll("[data-name-validate]").forEach((input) => {
      const field = resolveField(input);
      const required = input.hasAttribute("data-required");
      const handler = () => {
        const res = validateName(input.value || "", { minWords: 2 });
        const state = getFieldState({
          required,
          value: input.value,
          isValid: !res.invalid,
          warn: res.warn
        });
        applyFieldState(field, state);
      };
      input.addEventListener("input", handler);
      input.addEventListener("blur", handler);
      handler();
    });
  }
}
function setupLiveOutputs() {
  const form = document.querySelector(".container");
  const handler = () => updateOutputs();
  document.addEventListener("input", handler);
  document.addEventListener("change", handler);
  updateOutputs();
}
function setup() {
  var _a, _b, _c;
  (_a = document.getElementById("btn-json")) == null ? void 0 : _a.addEventListener("click", (e) => {
    e.preventDefault();
    generateJson();
  });
  (_b = document.getElementById("btn-xml")) == null ? void 0 : _b.addEventListener("click", (e) => {
    e.preventDefault();
    generateXml();
  });
  function buildNascimentoPrintHtml(data, srcDoc = document) {
    var _a2, _b2, _c2;
    const reg = (data == null ? void 0 : data.registro) || {};
    const cert = (data == null ? void 0 : data.certidao) || {};
    const name = reg.nome_completo || "";
    const matricula = reg.matricula || "";
    const dataRegistro = reg.data_registro || "";
    const dataNascimento = reg.data_nascimento || "";
    const sexo = reg.sexo || "";
    const mae = (reg.filiacao || "").split(";")[1] || "";
    const pai = (reg.filiacao || "").split(";")[0] || "";
    const cartorio = cert.cartorio_cns || "";
    const livro = ((_a2 = document.getElementById("matricula-livro")) == null ? void 0 : _a2.value) || "";
    const folha = ((_b2 = document.getElementById("matricula-folha")) == null ? void 0 : _b2.value) || "";
    const termo = ((_c2 = document.getElementById("matricula-termo")) == null ? void 0 : _c2.value) || "";
    const cpf2 = reg.cpf || "";
    const dnv = reg.numero_dnv || "";
    const candidate = srcDoc.querySelector("center") || srcDoc.querySelector(".certidao") || srcDoc.querySelector(".container-certidao");
    if (candidate && /CERTIDÃO|CERTIDAO|CERTID/iu.test(candidate.textContent || "")) {
      const links = Array.from(srcDoc.querySelectorAll('link[rel="stylesheet"]')).map((l) => `<link rel="stylesheet" href="${l.href}">`).join("\n");
      const styles = Array.from(srcDoc.querySelectorAll("style")).map((s) => s.innerHTML ? `<style>${s.innerHTML}</style>` : "").join("\n");
      const cloned = candidate.cloneNode(true);
      cloned.querySelectorAll('script, .nao-imprimir, button, [role="button"]').forEach((el) => el.remove());
      Array.from(cloned.querySelectorAll("*")).forEach((el) => {
        try {
          const elEl = el;
          const st = elEl.getAttribute && elEl.getAttribute("style") || "";
          if (/position\s*:\s*fixed/iu.test(st)) elEl.remove();
        } catch (e) {
        }
      });
      return `<!doctype html><html><head><meta charset="utf-8"><title>Certid\xE3o Nascimento</title>${links}${styles}</head><body>${cloned.outerHTML}
				<script>
				(function(){
					function runHtml2Pdf(){
						try{
							const opt = {
								margin: 10,
								filename: 'NASCIMENTO_'+(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'')+'.pdf',
								image: { type: 'jpeg', quality: 0.98 },
								html2canvas: { scale: 2, useCORS: true },
								jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
							};
							// cleanup: remove any scripts/buttons/fixed UI elements
							(function cleanup(){
								try{
									document.querySelectorAll('script, button, .nao-imprimir, [role="button"]').forEach(e=>e.remove());
									Array.from(document.querySelectorAll('*')).forEach((el: unknown)=>{
										try{ const pos = window.getComputedStyle(el).position; if (pos === 'fixed') el.remove(); }catch (e) { /* ignore */ }
									});
								}catch(e){/* ignore */}
							})();
                            const el = (document.body as any).querySelector('center') || document.body.firstElementChild;
							if (window.html2pdf) {
								window.html2pdf().set(opt).from(el).save();
							} else { console.warn('html2pdf not loaded'); window.print(); }
						} catch(e){ console.error(e); window.print(); }
					}
					if (window.html2pdf) runHtml2Pdf();
					else {
						var s = document.createElement('script');
						s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js';
						s.onload = runHtml2Pdf; s.onerror = function(){ window.print(); };
						document.head.appendChild(s);
					}
				})();
				<\/script>
				</body></html>`;
    }
    return `<!doctype html><html><head><meta charset="utf-8"><title>Certid\xE3o Nascimento</title>
			<style>body{font-family:Arial,Helvetica,sans-serif;padding:12px;color:#111} .h{font-size:14pt;font-weight:700;margin-bottom:6px} .label{font-size:9pt;color:#444} .val{font-weight:700;font-size:11pt;margin-bottom:8px} table{width:100%;margin-top:6px} td{vertical-align:top;padding:6px}</style>
		</head><body>
		<div class="h">CERTID\xC3O DE NASCIMENTO - 2\xAA VIA</div>
		<div><span class="label">Nome:</span><div class="val">${escapeHtml2(name)}</div></div>
		<table><tr><td><span class="label">Data de registro</span><div class="val">${escapeHtml2(
      dataRegistro
    )}</div></td>
		<td><span class="label">Data de nascimento</span><div class="val">${escapeHtml2(
      dataNascimento
    )}</div></td>
		<td><span class="label">Sexo</span><div class="val">${escapeHtml2(sexo)}</div></td></tr>
		<tr><td><span class="label">Pai</span><div class="val">${escapeHtml2(pai)}</div></td>
		<td><span class="label">M\xE3e</span><div class="val">${escapeHtml2(mae)}</div></td>
		<td><span class="label">CPF</span><div class="val">${escapeHtml2(cpf2)}</div></td></tr>
		<tr><td colspan="3"><span class="label">Cart\xF3rio/Matricula</span>
			<div class="val">Cart\xF3rio CNS: ${escapeHtml2(cartorio)} &nbsp; Livro: ${escapeHtml2(
      livro
    )} &nbsp; Folha: ${escapeHtml2(folha)} &nbsp; Termo: ${escapeHtml2(
      termo
    )}<br/>Matr\xEDcula: ${escapeHtml2(matricula)}</div>
		</td></tr>
		<tr><td><span class="label">DNV</span><div class="val">${escapeHtml2(dnv)}</div></td></tr>
		</table>
		<!-- load html2pdf and trigger download -->
		<script>
			(function(){
				function runHtml2Pdf__dup_2(){
					try{
						const opt = {
							margin: 10,
							filename: 'NASCIMENTO_'+(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'')+'.pdf',
							image: { type: 'jpeg', quality: 0.98 },
							html2canvas: { scale: 2 },
							jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
						};
						// cleanup interactive UI before printing
						try{
							document.querySelectorAll('script, button, .nao-imprimir, [role="button"]').forEach(e=>e.remove());
							Array.from(document.querySelectorAll('*')).forEach((el: unknown)=>{
								try{ const pos = window.getComputedStyle(el).position; if (pos === 'fixed') el.remove(); }catch (e) { /* ignore */ }
							});
						}catch (e) { /* ignore */ }
						if (window.html2pdf) {
							window.html2pdf().set(opt).from(document.body).save();
						} else {
							console.warn('html2pdf not loaded'); window.print();
						}
					} catch(e){ console.error(e); window.print(); }
				}
				if (window.html2pdf) runHtml2Pdf();
				else {
					var s = document.createElement('script');
					s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js';
					s.onload = runHtml2Pdf; s.onerror = function(){ window.print(); };
					document.head.appendChild(s);
				}
			})();
		<\/script>
		</body></html>`;
  }
  function escapeHtml2(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  (_c = document.getElementById("btn-print")) == null ? void 0 : _c.addEventListener("click", (e) => {
    e.preventDefault();
    if (!canProceed()) return;
    const data = mapperHtmlToJson(document);
    const html = buildNascimentoPdfHtmlTJ(data, {
      cssHref: "../assets/tj/certidao.css"
      // você coloca o arquivo local
    });
    try {
      openHtmlAndSavePdf(html, "NASCIMENTO_");
      setStatus("Gerando PDF\u2026");
    } catch (err) {
      showToast("Permita popups para imprimir/baixar PDF");
      setStatus("Popup bloqueado", true);
    }
  });
  setupValidation();
  setupFocusEmphasis();
  setupAdminPanel();
  setupSettingsPanel();
  setupNameCopy('input[data-bind="ui.mae_nome"]', 'input[data-bind="ui.pai_nome"]');
  setupAutoNationality('input[name="nacionalidade"]', "BRASILEIRO");
  setupLiveOutputs();
  updateActionButtons();
  document.addEventListener("input", updateActionButtons);
  document.addEventListener("change", updateActionButtons);
}
function setupSettingsPanel() {
  const select = document.getElementById("settings-drawer-position");
  const cbCpf = document.getElementById("settings-enable-cpf");
  const cbName = document.getElementById("settings-enable-name");
  const saveBtn = document.getElementById("settings-save");
  const applyBtn = document.getElementById("settings-apply");
  const pos = localStorage.getItem(DRAWER_POS_KEY) || "bottom-right";
  const enableCpf = localStorage.getItem(ENABLE_CPF_KEY) !== "false";
  const enableName = localStorage.getItem(ENABLE_NAME_KEY) !== "false";
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  const panelInline = panelInlineStored === null ? false : panelInlineStored === "true";
  if (select) select.value = pos;
  if (cbCpf) cbCpf.checked = !!enableCpf;
  if (cbName) cbName.checked = !!enableName;
  const cbInline = document.getElementById("settings-panel-inline");
  if (cbInline) cbInline.checked = !!panelInline;
  applyBtn == null ? void 0 : applyBtn.addEventListener("click", () => {
    const newPos = (select == null ? void 0 : select.value) || "bottom-right";
    const drawer = document.getElementById("drawer");
    if (drawer) {
      drawer.classList.remove("position-top", "position-bottom-right", "position-side");
      if (newPos === "top") drawer.classList.add("position-top");
      else if (newPos === "side") drawer.classList.add("position-side");
      else drawer.classList.add("position-bottom-right");
    }
    setStatus("Posi\xE7\xE3o aplicada (n\xE3o salva)", false);
  });
  saveBtn == null ? void 0 : saveBtn.addEventListener("click", () => {
    var _a;
    const newPos = (select == null ? void 0 : select.value) || "bottom-right";
    const newCpf = (cbCpf == null ? void 0 : cbCpf.checked) ? "true" : "false";
    const newName = (cbName == null ? void 0 : cbName.checked) ? "true" : "false";
    const newInline = ((_a = document.getElementById("settings-panel-inline")) == null ? void 0 : _a.checked) ? "true" : "false";
    localStorage.setItem(DRAWER_POS_KEY, newPos);
    localStorage.setItem(ENABLE_CPF_KEY, newCpf);
    localStorage.setItem(ENABLE_NAME_KEY, newName);
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
    setStatus("Prefer\xEAncias salvas. Atualizando...", false);
    setTimeout(() => window.location.reload(), 300);
  });
}
setup();
/*! Bundled license information:

cpf-cnpj-validator/dist/cpf-cnpj-validator.es.js:
  (*!
   * cpf-cnpj-validator v1.0.3
   * (c) 2020-present Carvalho, Vinicius Luiz <carvalho.viniciusluiz@gmail.com>
   * Released under the MIT License.
   *)
*/
