
export function setupAdminPanel() {
	const SIGNERS_KEY = 'ui.admin.signers';
	function loadSigners() {
		try {
			const raw = localStorage.getItem(SIGNERS_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed
				.filter((item) => typeof item === 'string' && item.trim())
				.map((item) => item.trim());
		} catch (e) { void e; return []; }
	}
	function saveSigners(list: string[]) {
		localStorage.setItem(SIGNERS_KEY, JSON.stringify(list));
	}
	function buildSignerOption(name: string) {
		const opt = document.createElement('option');
		opt.value = name;
		opt.textContent = name;
		(opt as any).dataset.localSigner = '1';
		return opt;
	}
	function syncSignerSelects(signers: string[]) {
		const selects = document.querySelectorAll(
			'select[data-signer-select], select[name="idAssinante"]',
		);
		selects.forEach((select) => {
			Array.from((select as HTMLSelectElement).options).forEach((opt) => {
				if ((opt as any).dataset && (opt as any).dataset.localSigner === '1') (opt as any).remove();
			});
			signers.forEach((name) => {
				const exists = Array.from((select as HTMLSelectElement).options).some((opt) => opt.value === name);
				if (!exists) (select as HTMLSelectElement).appendChild(buildSignerOption(name));
			});
		});
	}
	function renderList(container: HTMLElement, signers: string[]) {
		if (!container) return;
		container.innerHTML = '';
		if (!signers.length) {
			const empty = document.createElement('div');
			empty.className = 'muted';
			empty.textContent = 'Nenhum assinante cadastrado.';
			container.appendChild(empty);
			return;
		}
		signers.forEach((name) => {
			const row = document.createElement('div');
			row.className = 'admin-row';
			const label = document.createElement('span');
			label.textContent = name;
			const remove = document.createElement('button');
			remove.type = 'button';
			remove.className = 'btn tiny secondary';
			remove.textContent = 'Remover';
			remove.addEventListener('click', () => {
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
	const input = document.getElementById('admin-signer-name') as HTMLInputElement | null;
	const addBtn = document.getElementById('admin-signer-add') as HTMLButtonElement | null;
	const list = document.getElementById('admin-signer-list') as HTMLElement | null;
	if (!input || !addBtn || !list) {
		syncSignerSelects(loadSigners());
		return;
	}
	const render = () => {
		const signers = loadSigners();
		renderList(list, signers);
		syncSignerSelects(signers);
	};
	addBtn.addEventListener('click', () => {
		const value = String(input.value || '').trim();
		if (!value) return;
		const signers = loadSigners();
		if (!signers.includes(value)) {
			signers.push(value);
			saveSigners(signers);
		}
		input.value = '';
		render();
	});
	render();
}
