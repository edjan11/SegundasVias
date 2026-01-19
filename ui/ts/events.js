
import { byId, qs, qsa, setText } from './dom.js';
import { state, bindDataBindInputs, syncInputsFromState, setBoundValue, computeSnapshot, normalizeData, buildFileName, trimValue, normalizeDateValue, normalizeCpfValue, formatCpf, formatDateInput, formatTimeInput, } from './state.js';
import { validateData, setupMasks, isValidDate, isValidTime } from './validators.js';
import { createNameValidator } from './nameValidator.js';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { createKeyValueStore } from './placeAutofill/cache.js';
import { createPlaceAutofill } from './placeAutofill/index.js';
import { setupDrawer } from './shared/ui/drawer.js';
import { collectInvalidFields } from './shared/ui/debug.js';
import { setupPrimaryShortcut } from './shared/productivity/index.js';
import { setupAdminPanel } from './shared/ui/admin.js';
let lastSavedSnapshot = '';
let lastSavedId = '';
let isDirty = true;
let currentDirs = { jsonDir: '', xmlDir: '' };
const NAME_MODE_KEY = 'ui.nameValidationMode';
let nameValidationMode = localStorage.getItem(NAME_MODE_KEY) || 'input';
function setStatus(text, isError) {
    const el = byId('statusText');
    if (!el)
        return;
    el.textContent = text;
    el.style.color = isError ? '#dc2626' : '#64748b';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
        el.textContent = 'Pronto';
        el.style.color = '#64748b';
    }, 2000);
}
function setDirty(flag) {
    isDirty = !!flag;
    const btn = byId('btn-save');
    if (!btn)
        return;
    btn.classList.toggle('dirty', isDirty);
}
function updateDirty() {
    const snap = computeSnapshot();
    setDirty(snap !== lastSavedSnapshot);
}
function updateTipoButtons() {
    const tipo = state.certidao.tipo_registro || 'nascimento';
    const input = qs('[data-bind="certidao.tipo_registro"]');
    if (input)
        input.value = tipo;
    const casamentoWrap = byId('casamento-tipo-wrap');
    if (casamentoWrap)
        casamentoWrap.style.display = tipo === 'casamento' ? 'flex' : 'none';
}
function setTipoRegistro(tipo) {
    state.certidao.tipo_registro = tipo;
    updateTipoButtons();
    updateMatricula();
    updateDirty();
}
function updateSexoOutros() {
    const sexo = state.registro.sexo;
    const wrap = byId('sexo-outros-wrap');
    const input = byId('sexo-outros');
    if (!wrap || !input)
        return;
    const enabled = sexo === 'outros';
    wrap.style.display = enabled ? 'flex' : 'none';
    if (!enabled) {
        input.value = '';
        state.registro.sexo_outros = '';
    }
}
function updateIgnoreFields() {
    const dnIgn = !!state.registro.data_nascimento_ignorada;
    const hnIgn = !!state.registro.hora_nascimento_ignorada;
    const dn = byId('dn');
    const hn = byId('hn');
    if (dn) {
        dn.disabled = dnIgn;
        if (dnIgn) {
            dn.value = '';
            state.registro.data_nascimento = '';
        }
    }
    if (hn) {
        hn.disabled = hnIgn;
        if (hnIgn) {
            hn.value = '';
            state.registro.hora_nascimento = '';
        }
    }
}
let naturalidadeMemo = { city: '', uf: '' };
let naturalidadeEdited = false;
function rememberNaturalidadeEdit() {
    if (!state.ui.naturalidade_diferente)
        return;
    naturalidadeEdited = true;
    naturalidadeMemo = {
        city: trimValue(state.registro.municipio_naturalidade),
        uf: trimValue(state.registro.uf_naturalidade),
    };
}
function copyBirthToNaturalidade() {
    const city = trimValue(state.registro.municipio_nascimento);
    const uf = trimValue(state.registro.uf_nascimento).toUpperCase();
    setBoundValue('registro.municipio_naturalidade', city);
    setBoundValue('registro.uf_naturalidade', uf);
    naturalidadeMemo = { city, uf };
    naturalidadeEdited = false;
}
function syncNaturalidadeLockedToBirth() {
    if (state.ui.naturalidade_diferente)
        return;
    const city = trimValue(state.registro.municipio_nascimento);
    const uf = trimValue(state.registro.uf_nascimento).toUpperCase();
    setBoundValue('registro.municipio_naturalidade', city);
    setBoundValue('registro.uf_naturalidade', uf);
}
function updateNaturalidadeVisibility(fromToggle) {
    const isDifferent = !!state.ui.naturalidade_diferente;
    const row = byId('naturalidade-extra');
    if (row) {
        row.classList.toggle('visible', isDifferent);
        row.style.display = isDifferent ? 'flex' : 'none';
        row.hidden = false;
    }
    const copyBtn = byId('copy-naturalidade');
    if (copyBtn)
        copyBtn.disabled = !isDifferent;
    const labelCity = byId('label-municipio-principal');
    const labelUf = byId('label-uf-principal');
    if (labelCity)
        setText(labelCity, isDifferent ? 'Municipio de nascimento' : 'Municipio (nascimento e naturalidade)');
    if (labelUf)
        setText(labelUf, isDifferent ? 'UF de nascimento' : 'UF (nascimento e naturalidade)');
    if (!fromToggle)
        return;
    if (isDifferent) {
        if (naturalidadeEdited && (naturalidadeMemo.city || naturalidadeMemo.uf)) {
            setBoundValue('registro.municipio_naturalidade', naturalidadeMemo.city);
            setBoundValue('registro.uf_naturalidade', naturalidadeMemo.uf);
        }
        else {
            copyBirthToNaturalidade();
        }
    }
    else {
        naturalidadeMemo = {
            city: trimValue(state.registro.municipio_naturalidade),
            uf: trimValue(state.registro.uf_naturalidade),
        };
        syncNaturalidadeLockedToBirth();
    }
    updateDirty();
}
function updateCpfState() {
    const cpfDigits = normalizeCpfValue(state.registro.cpf || '');
    state.registro.cpf = cpfDigits;
    if (cpfDigits.length > 0) {
        state.registro.cpf_sem_inscricao = false;
        const cpfSemEl = byId('cpf-sem');
        if (cpfSemEl)
            cpfSemEl.checked = false;
    }
    const cpfEl = byId('cpf');
    if (cpfEl)
        cpfEl.value = formatCpf(cpfDigits);
}
function updateCpfFromToggle() {
    const cpfSem = !!state.registro.cpf_sem_inscricao;
    const cpfEl = byId('cpf');
    if (cpfSem && cpfEl) {
        cpfEl.value = '';
        state.registro.cpf = '';
    }
}
const CNS_CARTORIOS = {
    '6': '110742',
    '9': '163659',
    '12': '110064',
    '13': '109736',
    '14': '110635',
    '15': '110072',
};
function digitsOnly(value) {
    return (value || '').replace(/\D/g, '');
}
function padDigits(value, size) {
    const digits = digitsOnly(value);
    if (!digits)
        return '';
    return digits.padStart(size, '0').slice(-size);
}
function ensureHint(input) {
    const field = input.closest('.field');
    if (!field)
        return null;
    let hint = field.querySelector('.hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.className = 'hint';
        field.appendChild(hint);
    }
    return hint;
}
function setFieldError(input, message) {
    input.classList.toggle('invalid', !!message);
    const hint = ensureHint(input);
    if (!hint)
        return;
    hint.textContent = message || '';
    hint.classList.toggle('visible', !!message);
}
function clearFieldHint(input) {
    const field = input?.closest?.('.field');
    if (!field)
        return;
    const hint = field.querySelector('.hint');
    if (!hint)
        return;
    hint.textContent = '';
    hint.classList.remove('visible');
}
function validateDateInputValue(value) {
    const digits = digitsOnly(value);
    if (!digits)
        return '';
    if (digits.length >= 2) {
        const day = Number(digits.slice(0, 2));
        if (day < 1 || day > 31)
            return 'Dia invalido';
    }
    if (digits.length >= 4) {
        const month = Number(digits.slice(2, 4));
        if (month < 1 || month > 12)
            return 'Mes invalido';
    }
    if (digits.length === 8 && !isValidDate(formatDateInput(value)))
        return 'Data invalida';
    return '';
}
function validateTimeInputValue(value) {
    const digits = digitsOnly(value);
    if (!digits)
        return '';
    if (digits.length >= 2) {
        const hour = Number(digits.slice(0, 2));
        if (hour > 23)
            return 'Hora invalida';
    }
    if (digits.length >= 4) {
        const minute = Number(digits.slice(2, 4));
        if (minute > 59)
            return 'Minutos invalidos';
    }
    if (digits.length === 4 && !isValidTime(formatTimeInput(value)))
        return 'Hora invalida';
    return '';
}
function validateLiveField(path, input) {
    if (!input)
        return;
    if (path === 'registro.data_registro' || path === 'registro.data_nascimento') {
        setFieldError(input, validateDateInputValue(input.value));
        return;
    }
    if (path === 'registro.hora_nascimento') {
        setFieldError(input, validateTimeInputValue(input.value));
        return;
    }
    if (path === 'registro.cpf') {
        const digits = normalizeCpfValue(input.value);
        const invalid = !state.registro.cpf_sem_inscricao && !cpfValidator.isValid(digits);
        input.classList.toggle('invalid', invalid);
        clearFieldHint(input);
        return;
    }
    if (path === 'ui.cartorio_oficio') {
        const invalid = !state.ui.cartorio_oficio;
        input.classList.toggle('invalid', invalid);
        clearFieldHint(input);
    }
}
function yearFromDate(value) {
    const normalized = normalizeDateValue(value);
    const match = (normalized || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? match[3] : '';
}
function tipoDigit() {
    // Determine current registro: prefer explicit state, fallback to DOM cues
    let registro = (state.certidao.tipo_registro || '').toString();
    if (!registro) {
        if (document.getElementById('form-casamento'))
            registro = 'casamento';
        else if (document.getElementById('form-obito'))
            registro = 'obito';
        else if (document.getElementById('form-nascimento'))
            registro = 'nascimento';
    }
    if (registro === 'nascimento')
        return '1';
    if (registro === 'casamento') {
        // Garante que o valor do select é usado corretamente
        const raw = String(state.ui.casamento_tipo || '').trim();
        if (raw === '2')
            return '2';
        if (raw === '3')
            return '3';
        if (!raw)
            return '';
        // fallback para casos antigos
        const first = raw[0].toUpperCase();
        if (first === '2' || first === '3')
            return first;
        if (first === 'C')
            return '2';
        if (first === 'R')
            return '3';
        if (raw.toLowerCase().startsWith('civil'))
            return '2';
        if (raw.toLowerCase().startsWith('relig'))
            return '3';
        const selected = digitsOnly(raw).slice(0, 1);
        return selected || '';
    }
    if (registro === 'obito')
        return '4';
    return '';
}
function dvMatricula(base30) {
    let s1 = 0;
    for (let i = 0; i < 30; i++)
        s1 += Number(base30[i]) * (31 - i);
    let d1 = 11 - (s1 % 11);
    d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;
    const seq31 = base30 + String(d1);
    let s2 = 0;
    for (let i = 0; i < 31; i++)
        s2 += Number(seq31[i]) * (32 - i);
    let d2 = 11 - (s2 % 11);
    d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;
    return `${d1}${d2}`;
}
function buildMatriculaParts() {
    const cns = digitsOnly(state.certidao.cartorio_cns || '');
    const ano = yearFromDate(state.registro.data_registro || '');
    const tipo = tipoDigit();
    const livro = padDigits(state.ui.matricula_livro || '', 5);
    const folha = padDigits(state.ui.matricula_folha || '', 3);
    const termo = padDigits(state.ui.matricula_termo || '', 7);
    if (cns.length !== 6 || !ano || !tipo || !livro || !folha || !termo) {
        return { base: '', dv: '', final: '' };
    }
    const base30 = `${cns}01` + `55${ano}${tipo}${livro}${folha}${termo}`;
    if (base30.length !== 30)
        return { base: '', dv: '', final: '' };
    const dv = dvMatricula(base30);
    return { base: base30, dv, final: dv ? base30 + dv : '' };
}
function buildMatricula() {
    return buildMatriculaParts().final;
}
export function updateMatricula() {
    const parts = buildMatriculaParts();
    state.registro.matricula = parts.final || '';
    const matEl = byId('matricula');
    if (matEl)
        matEl.value = parts.final || '';
}
function applyCartorioChange() {
    const oficio = state.ui.cartorio_oficio || '';
    if (!oficio) {
        updateMatricula();
        return;
    }
    const cns = CNS_CARTORIOS[oficio];
    if (cns) {
        state.certidao.cartorio_cns = cns;
        const cnsInput = qs('[data-bind="certidao.cartorio_cns"]');
        if (cnsInput)
            cnsInput.value = cns;
    }
    updateMatricula();
}
function escapeXml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function toXml(obj, nodeName, indent = 0) {
    const pad = '  '.repeat(indent);
    if (obj === null || obj === undefined)
        return `${pad}<${nodeName}></${nodeName}>`;
    if (typeof obj !== 'object')
        return `${pad}<${nodeName}>${escapeXml(obj)}</${nodeName}>`;
    if (Array.isArray(obj))
        return obj.map((item) => toXml(item, nodeName, indent)).join('\n');
    const children = Object.keys(obj)
        .map((key) => toXml(obj[key], key, indent + 1))
        .join('\n');
    return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}
function downloadFile(name, content, mime) {
    try {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return true;
    }
    catch (e) { void e;
        return false;
    }
}
const store = createKeyValueStore({ storageKeyPrefix: '' });
const draftKey = 'draft_certidao';
async function saveDraft() {
    const data = normalizeData();
    if (!validateData(data, setStatus, {
        tipoRegistro: state.certidao.tipo_registro,
        casamentoTipo: state.ui.casamento_tipo,
    }))
        return;
    recordPlaceMappingFromState();
    try {
        if (window.api && window.api.dbSaveDraft) {
            const res = await window.api.dbSaveDraft({
                id: lastSavedId || null,
                data,
                sourceFormat: 'manual',
                kind: data.certidao.tipo_registro || 'nascimento',
            });
            if (res && res.id)
                lastSavedId = res.id;
        }
        else {
            store.setItem(draftKey, JSON.stringify(data));
        }
        lastSavedSnapshot = computeSnapshot();
        setDirty(false);
        setStatus('Salvo');
    }
    catch (e) { void e;
        setStatus('Falha ao salvar', true);
    }
}
async function generateFile(format) {
    const data = normalizeData();
    if (!validateData(data, setStatus, {
        tipoRegistro: state.certidao.tipo_registro,
        casamentoTipo: state.ui.casamento_tipo,
    }))
        return;
    const ext = format === 'xml' ? 'xml' : 'json';
    const name = buildFileName(data, ext);
    let content = '';
    if (format === 'xml') {
        const root = `certidao_${data.certidao.tipo_registro || 'registro'}`;
        content = toXml(data, root, 0);
    }
    else {
        content = JSON.stringify(data, null, 2);
    }
    try {
        if (format === 'xml' && window.api && window.api.saveXml) {
            const p = await window.api.saveXml({ name, content });
            setStatus(`XML salvo: ${p || name}`);
        }
        else if (format === 'json' && window.api && window.api.saveJson) {
            const p = await window.api.saveJson({ name, content });
            setStatus(`JSON salvo: ${p || name}`);
        }
        else {
            const mime = format === 'xml' ? 'application/xml' : 'application/json';
            if (downloadFile(name, content, mime)) {
                setStatus(`${format.toUpperCase()} baixado: ${name}`);
            }
            else {
                setStatus('API indisponivel', true);
            }
        }
    }
    catch (e) { void e;
        setStatus('Falha ao gerar arquivo', true);
    }
}
function dateToTime(value) {
    const normalized = normalizeDateValue(value);
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
    if (!m)
        return null;
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d)
        return null;
    return dt.getTime();
}
function updateDebug(data) {
    const parts = buildMatriculaParts();
    const baseEl = byId('debug-matricula-base');
    const dvEl = byId('debug-matricula-dv');
    const finalEl = byId('debug-matricula-final');
    if (baseEl)
        baseEl.value = parts.base || '';
    if (dvEl)
        dvEl.value = parts.dv || '';
    if (finalEl)
        finalEl.value = parts.final || '';
    const invalidEl = byId('debug-invalid');
    const invalids = collectInvalidFields(document);
    if (invalidEl)
        invalidEl.value = invalids.join('\n');
    const alerts = [];
    const dr = dateToTime(data?.registro?.data_registro || '');
    const dn = dateToTime(data?.registro?.data_nascimento || '');
    if (dr && dn && dn > dr)
        alerts.push('Data de nascimento maior que data de registro.');
    const alertsEl = byId('debug-alerts');
    if (alertsEl)
        alertsEl.value = alerts.join('\n');
}
function updateOutputs() {
    const jsonEl = byId('json-output');
    const xmlEl = byId('xml-output');
    if (!jsonEl && !xmlEl)
        return;
    const data = normalizeData();
    if (jsonEl)
        jsonEl.value = JSON.stringify(data, null, 2);
    if (xmlEl) {
        const root = `certidao_${data.certidao.tipo_registro || 'registro'}`;
        xmlEl.value = toXml(data, root, 0);
    }
    updateDebug(data);
}
function updateBadge() {
    const badge = byId('outputDirBadge');
    if (!badge)
        return;
    const json = currentDirs.jsonDir || '...';
    const xml = currentDirs.xmlDir || '...';
    badge.textContent = `JSON: ${json} | XML: ${xml}`;
}
async function refreshConfig() {
    if (!window.api || !window.api.getConfig)
        return;
    try {
        const cfg = await window.api.getConfig();
        currentDirs = { jsonDir: cfg.jsonDir || '', xmlDir: cfg.xmlDir || '' };
        updateBadge();
        const jsonEl = byId('json-dir');
        const xmlEl = byId('xml-dir');
        if (jsonEl)
            jsonEl.value = currentDirs.jsonDir;
        if (xmlEl)
            xmlEl.value = currentDirs.xmlDir;
    }
    catch (e) { void e;
        setStatus('Falha ao ler config', true);
    }
}
function setupConfigPanel() {
    refreshConfig();
    const radios = qsa('input[name="name-validation-mode"]');
    radios.forEach((radio) => {
        radio.checked = radio.value === nameValidationMode;
    });
    byId('config-save')?.addEventListener('click', () => {
        const selected = qs('input[name="name-validation-mode"]:checked');
        if (selected && selected.value) {
            nameValidationMode = selected.value;
            localStorage.setItem(NAME_MODE_KEY, nameValidationMode);
        }
        updateBadge();
    });
    byId('pick-json')?.addEventListener('click', async () => {
        if (!window.api || !window.api.pickJsonDir)
            return;
        const dir = await window.api.pickJsonDir();
        const jsonEl = byId('json-dir');
        if (jsonEl)
            jsonEl.value = dir;
        currentDirs.jsonDir = dir;
        updateBadge();
    });
    byId('pick-xml')?.addEventListener('click', async () => {
        if (!window.api || !window.api.pickXmlDir)
            return;
        const dir = await window.api.pickXmlDir();
        const xmlEl = byId('xml-dir');
        if (xmlEl)
            xmlEl.value = dir;
        currentDirs.xmlDir = dir;
        updateBadge();
    });
    setupAdminPanel();
}
function setupActions() {
    byId('btn-save')?.addEventListener('click', saveDraft);
    byId('btn-json')?.addEventListener('click', () => generateFile('json'));
    byId('btn-xml')?.addEventListener('click', () => generateFile('xml'));
}
let placeAutofill = null;
let placeCache = null;
function recordPlaceMappingFromState(placeTextOverride) {
    if (!placeCache)
        return;
    const localEl = byId('local-nascimento');
    const placeText = trimValue(placeTextOverride || localEl?.value);
    if (!placeText)
        return;
    const cityBirth = trimValue(state.registro.municipio_nascimento);
    const ufBirth = trimValue(state.registro.uf_nascimento).toUpperCase();
    const cityNatural = state.ui.naturalidade_diferente
        ? trimValue(state.registro.municipio_naturalidade)
        : '';
    const ufNatural = state.ui.naturalidade_diferente
        ? trimValue(state.registro.uf_naturalidade).toUpperCase()
        : '';
    if (!cityBirth || !ufBirth)
        return;
    placeCache.recordMapping({ placeText, cityBirth, ufBirth, cityNatural, ufNatural });
}
function setupNaturalidadeToggle() {
    const toggle = byId('naturalidade-diferente');
    if (!toggle)
        return;
    toggle.addEventListener('change', () => {
        state.ui.naturalidade_diferente = !!toggle.checked;
        updateNaturalidadeVisibility(true);
        updateDirty();
    });
}
function setupShortcuts() {
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            saveDraft();
        }
    });
}
function setupActSelect() {
    const select = byId('ato-select');
    if (!select)
        return;
    select.value = 'nascimento';
    select.addEventListener('change', () => {
        const value = select.value;
        const map = {
            nascimento: './Nascimento2Via.html',
            casamento: './Casamento2Via.html',
            obito: './Obito2Via.html',
        };
        const next = map[value];
        if (next)
            window.location.href = next;
    });
}
function setupCartorioTyping() {
    const select = byId('cartorio-oficio');
    if (!select)
        return;
    let buffer = '';
    let timer = null;
    const clearBuffer = () => {
        buffer = '';
        if (timer)
            clearTimeout(timer);
        timer = null;
    };
    select.addEventListener('keydown', (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey)
            return;
        const key = e.key;
        if (key >= '0' && key <= '9') {
            e.preventDefault();
            buffer += key;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(() => {
                buffer = '';
            }, 700);
            const match = Array.from(select.options).find((opt) => opt.value === buffer);
            if (match) {
                select.value = buffer;
                select.dispatchEvent(new Event('input', { bubbles: true }));
                select.dispatchEvent(new Event('change', { bubbles: true }));
                clearBuffer();
            }
            return;
        }
        if (key === 'Backspace') {
            e.preventDefault();
            buffer = buffer.slice(0, -1);
            return;
        }
    });
}
function setupNameValidation() {
    const validator = createNameValidator();
    const fields = qsa('[data-name-validate]');
    const timers = new Map();
    fields.forEach((input) => {
        const field = input.closest('.field');
        if (field)
            field.classList.add('name-field');
        let hint = field ? field.querySelector('.name-suggest') : null;
        if (field && !hint) {
            hint = document.createElement('button');
            hint.type = 'button';
            hint.className = 'name-suggest';
            hint.textContent = 'Parece incorreto - adicionar ao dicionario?';
            field.appendChild(hint);
        }
        if (hint) {
            hint.addEventListener('click', (e) => {
                e.preventDefault();
                const value = input.value;
                if (!value)
                    return;
                validator.repo.addException(value);
                input.classList.remove('invalid');
                if (field)
                    field.classList.remove('name-suspect');
                const t = timers.get(input);
                if (t)
                    clearInterval(t);
                timers.delete(input);
            });
        }
        const runCheck = () => {
            const value = input.value || '';
            const result = validator.check(value);
            const suspect = !!result.suspicious;
            input.classList.toggle('invalid', suspect);
            if (field)
                field.classList.toggle('name-suspect', suspect);
            if (suspect) {
                showToast('Nome possivelmente incorreto');
                if (!timers.has(input)) {
                    const id = setInterval(() => {
                        if (input.classList.contains('invalid'))
                            showToast('Nome possivelmente incorreto');
                    }, 180000);
                    timers.set(input, id);
                }
            }
            else {
                const t = timers.get(input);
                if (t)
                    clearInterval(t);
                timers.delete(input);
            }
        };
        input.addEventListener('input', () => {
            if (nameValidationMode === 'input')
                runCheck();
        });
        input.addEventListener('blur', () => {
            if (nameValidationMode === 'blur' || nameValidationMode === 'input')
                runCheck();
        });
    });
    validator.ready.then(() => {
        fields.forEach((input) => {
            const field = input.closest('.field');
            if (field)
                field.classList.remove('name-suspect');
            const value = input.value || '';
            if (value) {
                const result = validator.check(value);
                const suspect = !!result.suspicious;
                input.classList.toggle('invalid', suspect);
                if (field)
                    field.classList.toggle('name-suspect', suspect);
            }
        });
    });
}
function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, 2000);
}
function setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
        if (!isDirty)
            return;
        e.preventDefault();
        e.returnValue = '';
    });
}
function onPathChange(path) {
    if (path === 'registro.sexo')
        updateSexoOutros();
    if (path === 'registro.data_nascimento_ignorada' || path === 'registro.hora_nascimento_ignorada')
        updateIgnoreFields();
    if (path === 'registro.cpf')
        updateCpfState();
    if (path === 'registro.cpf_sem_inscricao')
        updateCpfFromToggle();
    if (path === 'ui.cartorio_oficio')
        applyCartorioChange();
    if (path === 'registro.data_registro')
        updateMatricula();
    if (path === 'ui.casamento_tipo' ||
        path === 'ui.matricula_livro' ||
        path === 'ui.matricula_folha' ||
        path === 'ui.matricula_termo')
        updateMatricula();
    if (path === 'ui.naturalidade_diferente')
        updateNaturalidadeVisibility(true);
    if (path === 'registro.municipio_naturalidade' || path === 'registro.uf_naturalidade')
        rememberNaturalidadeEdit();
    if (path === 'registro.municipio_nascimento' || path === 'registro.uf_nascimento')
        syncNaturalidadeLockedToBirth();
    const liveInput = qs(`[data-bind="${path}"]`);
    if (liveInput)
        validateLiveField(path, liveInput);
    if (path === 'registro.cpf_sem_inscricao') {
        const cpfEl = byId('cpf');
        if (cpfEl)
            validateLiveField('registro.cpf', cpfEl);
    }
    updateOutputs();
    updateDirty();
}
async function bootstrap() {
    state.certidao.tipo_registro = 'nascimento';
    syncInputsFromState();
    updateTipoButtons();
    updateSexoOutros();
    updateIgnoreFields();
    updateNaturalidadeVisibility(false);
    updateCpfState();
    updateMatricula();
    bindDataBindInputs(onPathChange);
    setupMasks();
    setupActions();
    setupConfigPanel();
    setupDrawer({ defaultTab: 'tab-config' });
    setupActSelect();
    placeAutofill = createPlaceAutofill({
        state,
        setBoundValue,
        updateDirty,
        syncNaturalidadeLockedToBirth,
        copyBirthToNaturalidade,
        recordPlaceMappingFromState,
    });
    placeCache = placeAutofill.placeCache;
    placeAutofill.setupLocalAutofill();
    setupNaturalidadeToggle();
    setupShortcuts();
    setupPrimaryShortcut(() => byId('btn-save') || byId('btn-json'));
    setupCartorioTyping();
    setupNameValidation();
    setupBeforeUnload();
    validateLiveField('registro.cpf', byId('cpf'));
    validateLiveField('ui.cartorio_oficio', qs('[data-bind="ui.cartorio_oficio"]'));
    updateDirty();
    updateOutputs();
}
bootstrap();
