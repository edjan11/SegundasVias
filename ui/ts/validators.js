
import { qs, qsa, byId } from './dom.js';
import { normalizeDateValue, normalizeTimeValue, formatDateInput, formatTimeInput, } from './state.js';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
export function clearInvalid() {
    qsa('.invalid').forEach((el) => el.classList.remove('invalid'));
}
export function markInvalid(path) {
    const el = qs(`[data-bind="${path}"]`);
    if (el)
        el.classList.add('invalid');
}
export function isValidDate(value) {
    const normalized = normalizeDateValue(value);
    if (!normalized)
        return true;
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
    if (!m)
        return false;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}
export function isValidTime(value) {
    const normalized = normalizeTimeValue(value);
    if (!normalized)
        return true;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized);
}
export function validateData(data, setStatus, context = {}) {
    clearInvalid();
    let ok = true;
    if (!data.registro.nome_completo) {
        markInvalid('registro.nome_completo');
        ok = false;
    }
    if (!data.registro.sexo) {
        markInvalid('registro.sexo');
        ok = false;
    }
    if (!data.registro.uf_nascimento) {
        markInvalid('registro.uf_nascimento');
        ok = false;
    }
    if (!data.registro.local_nascimento) {
        markInvalid('registro.local_nascimento');
        ok = false;
    }
    if (!data.registro.municipio_nascimento) {
        markInvalid('registro.municipio_nascimento');
        ok = false;
    }
    if (!data.certidao.modalidade) {
        markInvalid('certidao.modalidade');
        ok = false;
    }
    if (data.registro.sexo === 'outros' && !data.registro.sexo_outros) {
        markInvalid('registro.sexo_outros');
        ok = false;
    }
    const tipo = (context.tipoRegistro || data.certidao.tipo_registro || '').toLowerCase();
    if ((tipo === 'nascimento' || tipo === 'casamento') &&
        !normalizeDateValue(data.registro.data_registro)) {
        markInvalid('registro.data_registro');
        ok = false;
    }
    if (tipo === 'casamento' && !String(context.casamentoTipo || '').trim()) {
        markInvalid('ui.casamento_tipo');
        ok = false;
    }
    if (!isValidDate(data.registro.data_registro)) {
        markInvalid('registro.data_registro');
        ok = false;
    }
    if (!isValidDate(data.registro.data_nascimento)) {
        markInvalid('registro.data_nascimento');
        ok = false;
    }
    if (!isValidTime(data.registro.hora_nascimento)) {
        markInvalid('registro.hora_nascimento');
        ok = false;
    }
    if (!data.registro.cpf_sem_inscricao && !cpfValidator.isValid(data.registro.cpf)) {
        markInvalid('registro.cpf');
        ok = false;
    }
    if (!String(data.ui?.cartorio_oficio || '').trim()) {
        markInvalid('ui.cartorio_oficio');
        ok = false;
    }
    if (!ok && setStatus)
        setStatus('Campos obrigatorios pendentes', true);
    return ok;
}
function digitsOnly(v) {
    return (v || '').replace(/\D/g, '');
}
function maskDate(el) {
    el.value = formatDateInput(el.value);
}
function maskTime(el) {
    el.value = formatTimeInput(el.value);
}
function attachMask(el, type) {
    if (!el)
        return;
    const handler = (e) => {
        const input = e.target;
        if (type === 'date')
            maskDate(input);
        if (type === 'time')
            maskTime(input);
    };
    el.addEventListener('input', handler);
    el.addEventListener('blur', handler);
}
export function setupMasks() {
    attachMask(qs('[data-bind="registro.data_registro"]'), 'date');
    attachMask(byId('dn'), 'date');
    attachMask(byId('hn'), 'time');
}
