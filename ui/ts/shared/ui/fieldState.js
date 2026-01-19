
export function getFieldState(args) {
    const required = !!args.required;
    const value = String(args.value || '').trim();
    const isValid = args.isValid !== false;
    const warn = !!args.warn;
    if (!required && !value)
        return 'valid';
    if (required && !value)
        return 'empty';
    if (!isValid)
        return 'invalid';
    if (warn)
        return 'warn';
    return value ? 'valid' : 'empty';
}
export function applyFieldState(el, state) {
    if (!el)
        return;
    el.classList.toggle('field--error', state === 'empty' || state === 'invalid');
    el.classList.toggle('field--empty', state === 'empty');
    el.classList.toggle('field--invalid', state === 'invalid');
    el.classList.toggle('field--warn', state === 'warn');
}
