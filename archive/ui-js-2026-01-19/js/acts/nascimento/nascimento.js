// This file has been intentionally rendered inert. The original contents were moved to
// ui/js/acts/nascimento/nascimento.js.bak for review. The application should use the
// TypeScript source at src/acts/nascimento/nascimento.ts; rebuild the UI bundle to include it.
console.warn('ui/js/acts/nascimento/nascimento.js is inert. Rebuild using src/acts/nascimento/nascimento.ts');

export default {};
// This file has been intentionally rendered inert. The original contents were moved to
// ui/js/acts/nascimento/nascimento.js.bak for review. The application should use the
// TypeScript source at src/acts/nascimento/nascimento.ts; rebuild the UI bundle to include it.
import { normalizeTime } from '../../shared/validators/time.js';
import { normalizeCpf, isValidCpf } from '../../shared/validators/cpf.js';
import { validateName } from '../../shared/validators/name.js';
import { getFieldState, applyFieldState } from '../../shared/ui/fieldState.js';
import { applyDateMask, applyTimeMask } from '../../shared/ui/mask.js';
import { collectInvalidFields } from '../../shared/ui/debug.js';
import { buildMatriculaBase30, calcDv2Digits, buildMatriculaFinal, } from '../../shared/matricula/cnj.js';
import { setupNameCopy, setupAutoNationality } from '../../shared/productivity/index.js';
import { setupAdminPanel } from '../../shared/ui/admin.js';
console.warn('ui/js/acts/nascimento/nascimento.js is inert. Rebuild using src/acts/nascimento/nascimento.ts');

export default {};
const ENABLE_NAME_KEY = 'ui.enableNameValidation';
const PANEL_INLINE_KEY = 'ui.panelInline';
function setStatus(text, isError) {
    const el = document.getElementById('statusText');
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
function resolveField(input) {
    return (input.closest('td') || input.closest('.campo') || input.closest('.field') || input.parentElement);
}
function setFieldHint(field, message) {
    if (!field)
        return;
    let hint = field.querySelector('.hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.className = 'hint';
        field.appendChild(hint);
    }
    if (message) {
        hint.innerHTML = '';
        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = '⚠';
        icon.setAttribute('aria-hidden', 'true');
        hint.appendChild(icon);
        const txt = document.createElement('span');
        txt.className = 'hint-text';
        txt.textContent = message;
        hint.appendChild(txt);
        hint.classList.add('visible');
        let aria = document.getElementById('aria-live-errors');
        if (!aria) {
            aria = document.createElement('div');
            aria.id = 'aria-live-errors';
            aria.className = 'sr-only';
            aria.setAttribute('aria-live', 'assertive');
            aria.setAttribute('role', 'status');
            document.body.appendChild(aria);
        }
        aria.textContent = message;
    }
    else {
        hint.innerHTML = '';
        hint.classList.remove('visible');
    }
}
function clearFieldHint(field) {
    setFieldHint(field, '');
}
function setupFocusEmphasis() {
    document.addEventListener('focusin', (e) => {
        const el = e.target;
        if (!(el instanceof HTMLElement))
            return;
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            catch (e) {
                void e;
            }
            el.classList.add('focus-emphasis');
        }
    });
    document.addEventListener('focusout', (e) => {
        const el = e.target;
        if (!(el instanceof HTMLElement))
            return;
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName))
            el.classList.remove('focus-emphasis');
    });
}
function formatCpfInput(value) {
    const digits = normalizeCpf(value).slice(0, 11);
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
function toXml(obj, nodeName, indent = 0) {
    const pad = '  '.repeat(indent);
    if (obj === null || obj === undefined)
        return `${pad}<${nodeName}></${nodeName}>`;
    if (typeof obj !== 'object')
        return `${pad}<${nodeName}>${String(obj || '')}</${nodeName}>`;
    if (Array.isArray(obj))
        return obj.map((item) => toXml(item, nodeName, indent)).join('\n');
    const children = Object.keys(obj)
        .map((key) => toXml(obj[key], key, indent + 1))
        .join('\n');
    return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}
function updateDebug(data) {
    const cns = document.querySelector('input[data-bind="certidao.cartorio_cns"]')?.value || '';
    const ano = (document.getElementById('data-reg')?.value || '').slice(-4);
    const livro = document.getElementById('matricula-livro')?.value || '';
    const folha = document.getElementById('matricula-folha')?.value || '';
    const termo = document.getElementById('matricula-termo')?.value || '';
    const base = buildMatriculaBase30({
        cns6: cns,
        ano,
        tipoAto: '1',
        acervo: '01',
        servico: '55',
        livro,
        folha,
        termo,
    });
    const dv = base ? calcDv2Digits(base) : '';
    const final = base && dv
        ? base + dv
        : buildMatriculaFinal({ cns6: cns, ano, tipoAto: '1', livro, folha, termo });
    const baseEl = document.getElementById('debug-matricula-base');
    if (baseEl)
        baseEl.value = base || '';
    const dvEl = document.getElementById('debug-matricula-dv');
    if (dvEl)
        dvEl.value = dv || '';
    const finalEl = document.getElementById('debug-matricula-final');
    if (finalEl)
        finalEl.value = final || '';
    const invalids = collectInvalidFields(document);
    const invalidEl = document.getElementById('debug-invalid');
    if (invalidEl)
        invalidEl.value = invalids.join('\n');
}
function updateOutputs() {
    const data = mapperHtmlToJson(document);
    const jsonEl = document.getElementById('json-output');
    if (jsonEl)
        jsonEl.value = JSON.stringify(data, null, 2);
    const xmlEl = document.getElementById('xml-output');
    if (xmlEl)
        xmlEl.value = toXml(data, 'certidao_nascimento', 0);
    updateDebug(data);
}
function canProceed() {
    const invalids = collectInvalidFields(document);
    if (!invalids || invalids.length === 0)
        return true;
    setStatus(`${invalids.length} campo(s) inválido(s). Corrija antes de prosseguir.`, true);
    showToast('Existem campos inválidos — corrija antes de prosseguir');
    const invalidEl = document.getElementById('debug-invalid');
    if (invalidEl)
        invalidEl.value = invalids.join('\n');
    return false;
}
function updateActionButtons() {
    const invalids = collectInvalidFields(document);
    const disabled = !!(invalids && invalids.length > 0);
    const btnJson = document.getElementById('btn-json');
    if (btnJson)
        btnJson.disabled = disabled;
    const btnXml = document.getElementById('btn-xml');
    if (btnXml)
        btnXml.disabled = disabled;
    const btnSave = document.getElementById('btn-save');
    if (btnSave)
        btnSave.disabled = disabled;
    const statusEl = document.getElementById('statusText');
    if (statusEl && !disabled)
        statusEl.textContent = 'Pronto';
    let summary = document.getElementById('form-error-summary');
    if (!summary) {
        summary = document.createElement('div');
        summary.id = 'form-error-summary';
        summary.style.margin = '6px 0 0 0';
        summary.style.padding = '6px 8px';
        summary.style.borderRadius = '6px';
        summary.style.background = 'transparent';
        summary.style.border = 'none';
        summary.style.color = '#6b7280';
        summary.style.fontSize = '12px';
        summary.style.opacity = '0.85';
        const container = document.querySelector('.container');
        if (container)
            container.appendChild(summary);
    }
    if (disabled) {
        summary.textContent = `Campos inválidos: ${invalids.join(', ')}`;
        summary.style.display = 'block';
    }
    else if (summary) {
        summary.style.display = 'none';
    }
    // update aria-live for assistive tech
    let aria = document.getElementById('aria-live-errors');
    if (!aria) {
        aria = document.createElement('div');
        aria.id = 'aria-live-errors';
        aria.className = 'sr-only';
        aria.setAttribute('aria-live', 'assertive');
        aria.setAttribute('role', 'status');
        document.body.appendChild(aria);
    }
    aria.textContent = disabled
        ? `Existem ${invalids.length} campos inválidos: ${invalids.join(', ')}`
        : '';
}
function generateJson() {
    if (!canProceed())
        return;
    const data = mapperHtmlToJson(document);
    const json = JSON.stringify(data, null, 2);
    const out = document.getElementById('json-output');
    if (out)
        out.value = json;
    const name = `NASCIMENTO_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.json`;
    try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus(`JSON baixado: ${name}`);
    }
    catch (e) {
        void e;
        setStatus('Falha ao gerar JSON', true);
    }
}
function generateXml() {
    if (!canProceed())
        return;
    const data = mapperHtmlToJson(document);
    const xml = toXml(data, 'certidao_nascimento', 0);
    const out = document.getElementById('xml-output');
    if (out)
        out.value = xml;
    const name = `NASCIMENTO_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.xml`;
    try {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus(`XML baixado: ${name}`);
    }
    catch (e) {
        void e;
        setStatus('Falha ao gerar XML', true);
    }
}
function setupValidation() {
    // date fields (.w-date)
    document.querySelectorAll('input.w-date').forEach((input) => {
        const field = resolveField(input);
        const required = input.hasAttribute('data-required') || input.classList.contains('required');
        const onInput = () => {
            applyDateMask(input);
            clearFieldHint(field);
            const normalized = normalizeDate(input.value);
            const isValid = !input.value || !!normalized;
            const state = getFieldState({ required, value: input.value, isValid });
            applyFieldState(field, state);
        };
        const onBlur = () => {
            applyDateMask(input);
            const raw = input.value || '';
            const res = validateDateDetailed(raw);
            const isValid = res.ok;
            const state = getFieldState({ required, value: raw, isValid });
            applyFieldState(field, state);
            if (!isValid && raw)
                setFieldHint(field, res.message || 'Data inválida');
            else
                clearFieldHint(field);
        };
        input.addEventListener('input', onInput);
        input.addEventListener('blur', onBlur);
        onInput();
    });
    // time fields (.w-time)
    document.querySelectorAll('input.w-time').forEach((input) => {
        const field = resolveField(input);
        const required = input.hasAttribute('data-required');
        const handler = () => {
            applyTimeMask(input);
            const normalized = normalizeTime(input.value);
            const isValid = !input.value || !!normalized;
            const state = getFieldState({ required, value: input.value, isValid });
            applyFieldState(field, state);
        };
        input.addEventListener('input', handler);
        input.addEventListener('blur', handler);
        handler();
    });
    // CPF (id cpf)
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        const field = resolveField(cpfInput);
        const handler = () => {
            cpfInput.value = formatCpfInput(cpfInput.value);
            const digits = normalizeCpf(cpfInput.value);
            const isValid = !digits || isValidCpf(digits);
            const state = getFieldState({
                required: false,
                value: digits ? cpfInput.value : '',
                isValid,
            });
            applyFieldState(field, state);
        };
        cpfInput.addEventListener('input', handler);
        cpfInput.addEventListener('blur', () => {
            handler();
            const digits = normalizeCpf(cpfInput.value);
            if (cpfInput.value && (!digits || !isValidCpf(digits)))
                setFieldHint(field, 'CPF inválido');
            else
                clearFieldHint(field);
        });
        handler();
    }
    // name validation
    const enableName = localStorage.getItem('ui.enableNameValidation') !== 'false';
    if (enableName) {
        document.querySelectorAll('[data-name-validate]').forEach((input) => {
            const field = resolveField(input);
            const required = input.hasAttribute('data-required');
            const handler = () => {
                const res = validateName(input.value || '', { minWords: 2 });
                const state = getFieldState({
                    required,
                    value: input.value,
                    isValid: !res.invalid,
                    warn: res.warn,
                });
                applyFieldState(field, state);
            };
            input.addEventListener('input', handler);
            input.addEventListener('blur', handler);
            handler();
        });
    }
}
function setupLiveOutputs() {
    const form = document.querySelector('.container');
    const handler = () => updateOutputs();
    document.addEventListener('input', handler);
    document.addEventListener('change', handler);
    updateOutputs();
}
function setup() {
    document.getElementById('btn-json')?.addEventListener('click', (e) => {
        e.preventDefault();
        generateJson();
    });
    document.getElementById('btn-xml')?.addEventListener('click', (e) => {
        e.preventDefault();
        generateXml();
    });
    // Print PDF button: build printable HTML from current form data or from
    // an existing certificate fragment on the page (preferred when present).
    function buildNascimentoPrintHtml(data, srcDoc = document) {
        const reg = data?.registro || {};
        const cert = data?.certidao || {};
        const name = reg.nome_completo || '';
        const matricula = reg.matricula || '';
        const dataRegistro = reg.data_registro || '';
        const dataNascimento = reg.data_nascimento || '';
        const sexo = reg.sexo || '';
        const mae = (reg.filiacao || '').split(';')[1] || '';
        const pai = (reg.filiacao || '').split(';')[0] || '';
        const cartorio = cert.cartorio_cns || '';
        const livro = document.getElementById('matricula-livro')?.value || '';
        const folha = document.getElementById('matricula-folha')?.value || '';
        const termo = document.getElementById('matricula-termo')?.value || '';
        const cpf = reg.cpf || '';
        const dnv = reg.numero_dnv || '';
        // If the source document already contains a rendered certificate fragment
        // (the official HTML), prefer cloning it so the PDF matches the original
        // layout and CSS.
        const candidate = srcDoc.querySelector('center') ||
            srcDoc.querySelector('.certidao') ||
            srcDoc.querySelector('.container-certidao');
        if (candidate && /CERTIDÃO|CERTIDAO|CERTID/iu.test(candidate.textContent || '')) {
            // build head: copy stylesheet links and inline styles
            const links = Array.from(srcDoc.querySelectorAll('link[rel="stylesheet"]'))
                .map((l) => `<link rel="stylesheet" href="${l.href}">`)
                .join('\n');
            const styles = Array.from(srcDoc.querySelectorAll('style'))
                .map((s) => (s.innerHTML ? `<style>${s.innerHTML}</style>` : ''))
                .join('\n');
            const cloned = candidate.cloneNode(true);
            // remove interactive UI and scripts from the clone
            cloned
                .querySelectorAll('script, .nao-imprimir, button, [role="button"]')
                .forEach((el) => el.remove());
            // remove fixed-position elements (common for buttons added by the page)
            Array.from(cloned.querySelectorAll('*')).forEach((el) => {
                try {
                    const st = (el.getAttribute && el.getAttribute('style')) || '';
                    if (/position\s*:\s*fixed/iu.test(st))
                        el.remove();
                }
                catch (e) { /* ignore */ }
            });
            return `<!doctype html><html><head><meta charset="utf-8"><title>Certidão Nascimento</title>${links}${styles}</head><body>${cloned.outerHTML}
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
							const el = document.body.querySelector('center') || document.body.firstElementChild;
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
				</script>
				</body></html>`;
        }
        // fallback: minimal summary layout (previous behavior)
        return `<!doctype html><html><head><meta charset="utf-8"><title>Certidão Nascimento</title>
			<style>body{font-family:Arial,Helvetica,sans-serif;padding:12px;color:#111} .h{font-size:14pt;font-weight:700;margin-bottom:6px} .label{font-size:9pt;color:#444} .val{font-weight:700;font-size:11pt;margin-bottom:8px} table{width:100%;margin-top:6px} td{vertical-align:top;padding:6px}</style>
		</head><body>
		<div class="h">CERTIDÃO DE NASCIMENTO - 2ª VIA</div>
		<div><span class="label">Nome:</span><div class="val">${escapeHtml(name)}</div></div>
		<table><tr><td><span class="label">Data de registro</span><div class="val">${escapeHtml(dataRegistro)}</div></td>
		<td><span class="label">Data de nascimento</span><div class="val">${escapeHtml(dataNascimento)}</div></td>
		<td><span class="label">Sexo</span><div class="val">${escapeHtml(sexo)}</div></td></tr>
		<tr><td><span class="label">Pai</span><div class="val">${escapeHtml(pai)}</div></td>
		<td><span class="label">Mãe</span><div class="val">${escapeHtml(mae)}</div></td>
		<td><span class="label">CPF</span><div class="val">${escapeHtml(cpf)}</div></td></tr>
		<tr><td colspan="3"><span class="label">Cartório/Matricula</span>
			<div class="val">Cartório CNS: ${escapeHtml(cartorio)} &nbsp; Livro: ${escapeHtml(livro)} &nbsp; Folha: ${escapeHtml(folha)} &nbsp; Termo: ${escapeHtml(termo)}<br/>Matrícula: ${escapeHtml(matricula)}</div>
		</td></tr>
		<tr><td><span class="label">DNV</span><div class="val">${escapeHtml(dnv)}</div></td></tr>
		</table>
		<!-- load html2pdf and trigger download -->
		<script>
			(function(){
				function runHtml2Pdf(){
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
		</script>
		</body></html>`;
    }
    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    document.getElementById('btn-print')?.addEventListener('click', (e) => {
        e.preventDefault();
        const data = window.mapperHtmlToJson
            ? window.mapperHtmlToJson(document)
            : typeof mapperHtmlToJson === 'function'
                ? mapperHtmlToJson(document)
                : null;
        if (!data) {
            showToast('Falha ao coletar dados para impressão');
            return;
        }
        const html = buildNascimentoPrintHtml(data);
        const w = window.open('', '_blank', 'width=900,height=1100');
        if (!w) {
            showToast('Permita popups para imprimir');
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    });
    setupValidation();
    setupFocusEmphasis();
    setupAdminPanel();
    setupSettingsPanel();
    if (localStorage.getItem('ui.enableParentNameCopy') === 'true') {
      setupNameCopy('input[data-bind="ui.mae_nome"]', 'input[data-bind="ui.pai_nome"]');
    }
    setupAutoNationality('input[name="nacionalidadeNoivo"]', 'BRASILEIRO');
    setupLiveOutputs();
    // wire action button state
    updateActionButtons();
    document.addEventListener('input', updateActionButtons);
    document.addEventListener('change', updateActionButtons);
}
function setupSettingsPanel() {
    const select = document.getElementById('settings-drawer-position');
    const cbCpf = document.getElementById('settings-enable-cpf');
    const cbName = document.getElementById('settings-enable-name');
    const saveBtn = document.getElementById('settings-save');
    const applyBtn = document.getElementById('settings-apply');
    const pos = localStorage.getItem(DRAWER_POS_KEY) || 'bottom-right';
    const enableCpf = localStorage.getItem(ENABLE_CPF_KEY) !== 'false';
    const enableName = localStorage.getItem(ENABLE_NAME_KEY) !== 'false';
    const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
    const panelInline = panelInlineStored === null ? false : panelInlineStored === 'true';
    if (select)
        select.value = pos;
    if (cbCpf)
        cbCpf.checked = !!enableCpf;
    if (cbName)
        cbName.checked = !!enableName;
    const cbInline = document.getElementById('settings-panel-inline');
    if (cbInline)
        cbInline.checked = !!panelInline;
    applyBtn?.addEventListener('click', () => {
        const newPos = select?.value || 'bottom-right';
        // apply only (no save)
        const drawer = document.getElementById('drawer');
        if (drawer) {
            drawer.classList.remove('position-top', 'position-bottom-right', 'position-side');
            if (newPos === 'top')
                drawer.classList.add('position-top');
            else if (newPos === 'side')
                drawer.classList.add('position-side');
            else
                drawer.classList.add('position-bottom-right');
        }
        setStatus('Posição aplicada (não salva)', false);
    });
    saveBtn?.addEventListener('click', () => {
        const newPos = select?.value || 'bottom-right';
        const newCpf = cbCpf?.checked ? 'true' : 'false';
        const newName = cbName?.checked ? 'true' : 'false';
        const newInline = document.getElementById('settings-panel-inline')?.checked ? 'true' : 'false';
        localStorage.setItem(DRAWER_POS_KEY, newPos);
        localStorage.setItem(ENABLE_CPF_KEY, newCpf);
        localStorage.setItem(ENABLE_NAME_KEY, newName);
        localStorage.setItem(PANEL_INLINE_KEY, newInline);
        setStatus('Preferências salvas. Atualizando...', false);
        setTimeout(() => window.location.reload(), 300);
    });
}
setup();
