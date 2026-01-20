
export function pad2(value: string | number): string {
	return String(value).padStart(2, '0');
}

export function toYear(yearRaw: string | number): number {
	const y = Number(yearRaw);
	if (String(yearRaw).length === 2) {
		return y <= 29 ? 2000 + y : 1900 + y;
	}
	return y;
}

export function isValidDateParts(day: number, month: number, year: number): boolean {
	if (month < 1 || month > 12) return false;
	if (day < 1 || day > 31) return false;
	const d = new Date(year, month - 1, day);
	return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function normalizeDate(raw: string): string {
	const input = String(raw || '').trim();
	if (!input) return '';
	const m = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.exec(input);
	let day = '';
	let month = '';
	let year = '';
	if (m) {
		[day, month, year] = input.split(/[/-]/);
	} else {
		const digits = input.replace(/\D/g, '');
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
	if (!day || !month || !year) return '';
	const yyyy = toYear(year);
	const dd = Number(day);
	const mm = Number(month);
	if (!isValidDateParts(dd, mm, yyyy)) return '';
	return `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
}

export function validateDateDetailed(raw: string): { ok: boolean; code: string; message: string } {
	const input = String(raw || '').trim();
	if (!input) return { ok: false, code: 'EMPTY', message: 'Campo vazio' };
	const m = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.exec(input);
	let day = '';
	let month = '';
	let year = '';
	if (m) {
		[day, month, year] = input.split(/[/-]/);
	} else {
		const digits = input.replace(/\D/g, '');
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
				code: 'FORMAT',
				message: 'Formato inválido — use DD/MM/AAAA (ex.: 31/12/2024)',
			};
		}
	}
	const dd = Number(day);
	const mm = Number(month);
	const yyyy = toYear(year);
	if (isNaN(mm) || mm < 1 || mm > 12)
		return { ok: false, code: 'MONTH', message: 'Mês inválido (01–12)' };
	if (isNaN(dd) || dd < 1 || dd > 31)
		return { ok: false, code: 'DAY', message: 'Dia inválido (1–31)' };
	const d = new Date(yyyy, mm - 1, dd);
	if (!(d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd)) {
		return {
			ok: false,
			code: 'NONEXISTENT',
			message: 'Data inexistente — verifique dia e mês (ex.: 31/02/2024 não existe)',
		};
	}
	return {
		ok: true,
		code: 'OK',
		message: `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`,
	};
}

export function yearFromDate(value: string): string {
	const normalized = normalizeDate(value);
	const match = (normalized || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	return match ? match[3] : '';
}
