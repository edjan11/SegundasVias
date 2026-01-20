function lockInput(input) {
    if (!input)
        return;
    input.readOnly = true;
    input.tabIndex = -1;
    input.classList.add('input-locked');
}
function unlockInput(input) {
    if (!input)
        return;
    input.readOnly = false;
    input.tabIndex = 0;
    input.classList.remove('input-locked');
}
export function setupPrimaryShortcut(getPrimary) {
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.code === 'Space') {
            e.preventDefault();
            const target = typeof getPrimary === 'function' ? getPrimary() : null;
            target?.click();
        }
    });
}
export function setupNameCopy(sourceSelector, targetSelector) {
    const source = document.querySelector(sourceSelector);
    const target = document.querySelector(targetSelector);
    if (!source || !target)
        return;
    let lastAuto = '';
    const applyCopy = () => {
        const value = String(source.value || '').trim();
        if (!value)
            return;
        if (!target.value || target.value === lastAuto) {
            target.value = value;
            lastAuto = value;
            target.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };
    source.addEventListener('blur', applyCopy);
    source.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            applyCopy();
        }
    });
}
export function setupAutoNationality(selector, value) {
    const input = document.querySelector(selector);
    if (!input)
        return;
    if (String(input.value || '').trim())
        return;
    input.value = value;
    lockInput(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
export function setupCasamentoDates(opts = {}) {
    const dataTermo = document.querySelector(opts.dataTermoSelector || 'input[name="dataTermo"]');
    const tipo = document.querySelector(opts.tipoSelector || 'select[name="tipoCasamento"]');
    const dataCasamento = document.querySelector(opts.dataCasamentoSelector || 'input[name="dataCasamento"]');
    const regime = document.querySelector(opts.regimeSelector || 'select[name="regimeBens"]');
    if (!dataTermo || !tipo || !dataCasamento || !regime)
        return;
    const lock = () => {
        dataCasamento.value = dataTermo.value;
        lockInput(dataCasamento);
        dataCasamento.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const unlock = () => {
        unlockInput(dataCasamento);
        if (!dataCasamento.value)
            dataCasamento.focus();
    };
    const apply = () => {
        if (tipo.value === 'R') {
            unlock();
        }
        else {
            lock();
            tipo.focus();
        }
    };
    dataTermo.addEventListener('input', () => {
        if (dataTermo.value)
            lock();
    });
    tipo.addEventListener('change', apply);
    dataTermo.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            tipo.focus();
        }
    });
    dataCasamento.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            regime.focus();
        }
    });
    apply();
}
