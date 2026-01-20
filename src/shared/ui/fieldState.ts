
export function getFieldState(args: { required?: boolean; value?: string; isValid?: boolean; warn?: boolean }): string {
	const required = !!args.required;
	const value = String(args.value || '').trim();
	const isValid = args.isValid !== false;
	const warn = !!args.warn;
	if (!required && !value) return 'valid';
	if (required && !value) return 'empty';
	if (!isValid) return 'invalid';
	if (warn) return 'warn';
	return value ? 'valid' : 'empty';
}

export function applyFieldState(el: HTMLElement, state: string): void {
	if (!el) return;
	el.classList.toggle('field--error', state === 'empty' || state === 'invalid');
	el.classList.toggle('field--empty', state === 'empty');
	el.classList.toggle('field--invalid', state === 'invalid');
	el.classList.toggle('field--warn', state === 'warn');
}
