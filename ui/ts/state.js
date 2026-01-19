
import { qs, qsa, byId } from './dom.js';
import { stripAccents } from './placeAutofill/normalize.js';
export const state = {
    certidao: {
        plataformaId: 'certidao-eletronica',
        tipo_registro: 'nascimento',
        tipo_certidao: 'Breve relato',
        transcricao: false,
        cartorio_cns: '163659',
        selo: '',
        cod_selo: '',
        modalidade: 'eletronica',
        cota_emolumentos: '',
        cota_emolumentos_isento: false,
    },
    registro: {
        nome_completo: '',
        cpf_sem_inscricao: false,
        cpf: '',
        matricula: '',
        data_registro: '',
        data_nascimento_ignorada: false,
        data_nascimento: '',
        hora_nascimento_ignorada: false,
        hora_nascimento: '',
        municipio_naturalidade: '',
        uf_naturalidade: '',
        local_nascimento: '',
        municipio_nascimento: '',
        uf_nascimento: '',
        sexo: '',
        sexo_outros: '',
        gemeos: { quantidade: '' },
        numero_dnv: '',
        averbacao_anotacao: '',
    },
    ui: {
        gemeos_irmao_raw: '',
        anotacoes_raw: '',
        cartorio_oficio: '',
        casamento_tipo: '',
        matricula_livro: '',
        matricula_folha: '',
        matricula_termo: '',
        naturalidade_diferente: false,
        mae_nome: '',
        mae_uf: '',
        mae_cidade: '',
        mae_avo_materna: '',
        mae_avo_materno: '',
        pai_nome: '',
        pai_uf: '',
        pai_cidade: '',
        pai_avo_paterna: '',
        pai_avo_paterno: '',
    },
};
export function setByPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (cur[p] === undefined)
            cur[p] = {};
        cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
}
export function getByPath(obj, path) {
    return path.split('.').reduce((acc, p) => (acc ? acc[p] : undefined), obj);
}
export function setBoundValue(path, value) {
    setByPath(state, path, value);
    const el = qs(`[data-bind="${path}"]`);
    if (!el)
        return;
    if (el.type === 'checkbox')
        el.checked = !!value;
    else
        el.value = value !== undefined && value !== null ? String(value) : '';
}
export function syncInputsFromState() {
    qsa('[data-bind]').forEach((el) => {
        const path = el.getAttribute('data-bind') || '';
        const val = getByPath(state, path);
        if (el.type === 'checkbox') {
            el.checked = !!val;
            return;
        }
        if (path === 'registro.cpf') {
            el.value = formatCpf(val);
            return;
        }
        if (path === 'registro.data_registro' || path === 'registro.data_nascimento') {
            el.value = normalizeDateValue(val);
            return;
        }
        if (path === 'registro.hora_nascimento') {
            el.value = normalizeTimeValue(val);
            return;
        }
        el.value = val !== undefined && val !== null ? String(val) : '';
    });
}
export function bindDataBindInputs(onPathChange) {
    qsa('[data-bind]').forEach((el) => {
        const path = el.getAttribute('data-bind') || '';
        const handler = () => {
            if (el.type === 'checkbox') {
                setByPath(state, path, el.checked);
                if (onPathChange)
                    onPathChange(path);
                return;
            }
            if (path === 'registro.data_registro' || path === 'registro.data_nascimento') {
                const formatted = formatDateInput(el.value);
                setByPath(state, path, formatted);
                el.value = formatted;
                if (onPathChange)
                    onPathChange(path);
                return;
            }
            if (path === 'registro.hora_nascimento') {
                const formatted = formatTimeInput(el.value);
                setByPath(state, path, formatted);
                el.value = formatted;
                if (onPathChange)
                    onPathChange(path);
                return;
            }
            if (path === 'registro.cpf') {
                const digits = normalizeCpfValue(el.value);
                setByPath(state, path, digits);
                el.value = formatCpf(digits);
                if (onPathChange)
                    onPathChange(path);
                return;
            }
            setByPath(state, path, el.value);
            if (onPathChange)
                onPathChange(path);
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
    });
}
export function trimValue(value) {
    return String(value || '').trim();
}
function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}
export function formatDateInput(value) {
    const digits = digitsOnly(value).slice(0, 8);
    let out = '';
    if (digits.length >= 1)
        out += digits.slice(0, 2);
    if (digits.length >= 3)
        out += '/' + digits.slice(2, 4);
    else if (digits.length > 2)
        out += '/' + digits.slice(2);
    if (digits.length >= 5)
        out += '/' + digits.slice(4, 8);
    return out;
}
export function formatTimeInput(value) {
    const digits = digitsOnly(value).slice(0, 4);
    let out = '';
    if (digits.length >= 1)
        out += digits.slice(0, 2);
    if (digits.length > 2)
        out += ':' + digits.slice(2, 4);
    return out;
}
export function normalizeDateValue(value) {
    const raw = trimValue(value);
    if (!raw)
        return '';
    const digits = digitsOnly(raw);
    if (digits.length === 8) {
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw))
        return raw;
    return raw;
}
export function normalizeTimeValue(value) {
    const raw = trimValue(value);
    if (!raw)
        return '';
    const digits = digitsOnly(raw);
    if (digits.length === 4) {
        return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }
    if (/^\d{2}:\d{2}$/.test(raw))
        return raw;
    return raw;
}
export function normalizeCpfValue(value) {
    return digitsOnly(value).slice(0, 11);
}
export function formatCpf(value) {
    const digits = normalizeCpfValue(value);
    if (!digits)
        return '';
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);
    let out = p1;
    if (p2)
        out += `.${p2}`;
    if (p3)
        out += `.${p3}`;
    if (p4)
        out += `-${p4}`;
    return out;
}
export function parseLines(raw, mapper) {
    if (!raw)
        return [];
    return raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map(mapper);
}
export function parseIrmaos(raw) {
    return parseLines(raw, (line) => {
        const parts = line.split('|');
        return { nome: trimValue(parts[0]), matricula: trimValue(parts[1]) };
    });
}
export function parseAnotacoes(raw) {
    return parseLines(raw, (line) => {
        const parts = line.split('|');
        return {
            tipo: trimValue(parts[0]),
            documento: trimValue(parts[1]),
            orgao_emissor: trimValue(parts[2]),
            uf_emissao: trimValue(parts[3]),
            data_emissao: trimValue(parts[4]),
        };
    });
}
export function buildFiliacaoItem(nome, cidade, uf, avo1, avo2) {
    const n = trimValue(nome);
    const c = trimValue(cidade);
    const u = trimValue(uf);
    const a1 = trimValue(avo1);
    const a2 = trimValue(avo2);
    if (!n && !c && !u && !a1 && !a2)
        return null;
    const avos = [a1, a2].filter(Boolean).join('; ');
    return { nome: n, municipio_nascimento: c, uf_nascimento: u, avos };
}
export function normalizeData() {
    const cert = state.certidao;
    const reg = state.registro;
    const cpfDigits = normalizeCpfValue(reg.cpf);
    const cpfExists = cpfDigits.length > 0;
    const cpfSem = !!reg.cpf_sem_inscricao;
    const dataIgn = !!reg.data_nascimento_ignorada;
    const horaIgn = !!reg.hora_nascimento_ignorada;
    const natDifferent = !!state.ui.naturalidade_diferente;
    const municipioNascimento = trimValue(reg.municipio_nascimento);
    const ufNascimento = trimValue(reg.uf_nascimento);
    let municipioNaturalidade = trimValue(reg.municipio_naturalidade);
    let ufNaturalidade = trimValue(reg.uf_naturalidade);
    if (!natDifferent) {
        municipioNaturalidade = municipioNascimento;
        ufNaturalidade = ufNascimento;
    }
    const certidao = {
        plataformaId: trimValue(cert.plataformaId),
        tipo_registro: trimValue(cert.tipo_registro),
        tipo_certidao: trimValue(cert.tipo_certidao),
        transcricao: !!cert.transcricao,
        cartorio_cns: trimValue(cert.cartorio_cns),
        selo: trimValue(cert.selo),
        cod_selo: trimValue(cert.cod_selo),
        modalidade: trimValue(cert.modalidade),
        cota_emolumentos: trimValue(cert.cota_emolumentos),
        cota_emolumentos_isento: !!cert.cota_emolumentos_isento,
    };
    const filiacao = [];
    const mae = buildFiliacaoItem(state.ui.mae_nome, state.ui.mae_cidade, state.ui.mae_uf, state.ui.mae_avo_materna, state.ui.mae_avo_materno);
    if (mae)
        filiacao.push(mae);
    const pai = buildFiliacaoItem(state.ui.pai_nome, state.ui.pai_cidade, state.ui.pai_uf, state.ui.pai_avo_paterna, state.ui.pai_avo_paterno);
    if (pai)
        filiacao.push(pai);
    const matriculaFull = trimValue(reg.matricula);
    const matriculaDv = matriculaFull.length >= 2 ? matriculaFull.slice(-2) : '';
    const matriculaBase = matriculaFull.length > 2 ? matriculaFull.slice(0, -2) : '';
    const registro = {
        nome_completo: trimValue(reg.nome_completo),
        cpf_sem_inscricao: cpfSem,
        cpf: cpfExists ? cpfDigits : '',
        matricula: matriculaFull,
        matricula_base: matriculaBase,
        matricula_dv: matriculaDv,
        cartorio_oficio: trimValue(state.ui.cartorio_oficio),
        cartorio_cns: trimValue(cert.cartorio_cns),
        matricula_livro: trimValue(state.ui.matricula_livro),
        matricula_folha: trimValue(state.ui.matricula_folha),
        matricula_termo: trimValue(state.ui.matricula_termo),
        casamento_tipo: trimValue(state.ui.casamento_tipo),
        data_registro: normalizeDateValue(reg.data_registro),
        data_nascimento_ignorada: dataIgn,
        data_nascimento: dataIgn ? '' : normalizeDateValue(reg.data_nascimento),
        hora_nascimento_ignorada: horaIgn,
        hora_nascimento: horaIgn ? '' : normalizeTimeValue(reg.hora_nascimento),
        municipio_naturalidade: municipioNaturalidade,
        uf_naturalidade: ufNaturalidade,
        local_nascimento: trimValue(reg.local_nascimento),
        municipio_nascimento: municipioNascimento,
        uf_nascimento: ufNascimento,
        sexo: trimValue(reg.sexo),
        gemeos: {
            quantidade: trimValue(reg.gemeos.quantidade),
            irmao: parseIrmaos(state.ui.gemeos_irmao_raw),
        },
        filiacao,
        numero_dnv: trimValue(reg.numero_dnv),
        averbacao_anotacao: trimValue(reg.averbacao_anotacao),
        anotacoes_cadastro: parseAnotacoes(state.ui.anotacoes_raw),
    };
    if (registro.sexo === 'outros')
        registro.sexo_outros = trimValue(reg.sexo_outros);
    return { certidao, registro };
}
export function computeSnapshot() {
    return JSON.stringify(normalizeData());
}
export function stripAccentsForFilename(value) {
    return stripAccents(value || '');
}
export function normalizeFilePart(value, fallback) {
    const clean = stripAccentsForFilename(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return clean || fallback;
}
export function makeTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
export function buildFileName(data, ext) {
    const tipo = normalizeFilePart(data.certidao.tipo_registro || 'nascimento', 'NASCIMENTO');
    const nome = normalizeFilePart(data.registro.nome_completo, 'SEM_NOME');
    const cpfDigits = (data.registro.cpf || '').replace(/\D/g, '');
    const cpfPart = cpfDigits ? cpfDigits : 'SEM_CPF';
    const stamp = makeTimestamp();
    return `${tipo}_${nome}_${cpfPart}_${stamp}.${ext}`;
}
export function setMatriculaValue(value) {
    state.registro.matricula = value || '';
    const matEl = byId('matricula');
    if (matEl)
        matEl.value = value || '';
}
