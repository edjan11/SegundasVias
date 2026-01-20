export function applyTimeMask(input: HTMLInputElement | { value: string } | null | undefined): void {
	if (!input) return;
	const digits = digitsOnly((input as any).value).slice(0, 4);
	let out = '';
	if (digits.length >= 1) out += digits.slice(0, 2);
	if (digits.length > 2) out += ':' + digits.slice(2, 4);
	(input as any).value = out;
}

export function digitsOnly(value: string | number): string {
	return String(value || '').replace(/\D/g, '');
}

export function applyDateMask(input: HTMLInputElement | { value: string } | null | undefined): void {
	if (!input) return;
	const digits = digitsOnly((input as any).value).slice(0, 8);
	let out = '';
	if (digits.length >= 1) out += digits.slice(0, 2);
	if (digits.length >= 3) out += '/' + digits.slice(2, 4);
	else if (digits.length > 2) out += '/' + digits.slice(2);
	if (digits.length >= 5) out += '/' + digits.slice(4, 8);
	(input as any).value = out;
}
