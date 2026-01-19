
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
  } catch (e) { void e;
    return [];
  }
}

export function getAdminSigners() {
  return loadSigners();
}

function saveSigners(list) {
  localStorage.setItem(SIGNERS_KEY, JSON.stringify(list));
}

function buildSignerOption(name) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  opt.dataset.localSigner = '1';
  return opt;
}

function syncSignerSelects(signers) {
  const selects = document.querySelectorAll(
    'select[data-signer-select], select[name="idAssinante"]',
  );
  selects.forEach((select) => {
    Array.from(select.options).forEach((opt) => {
      if (opt.dataset && opt.dataset.localSigner === '1') opt.remove();
    });
    signers.forEach((name) => {
      const exists = Array.from(select.options).some((opt) => opt.value === name);
      if (!exists) select.appendChild(buildSignerOption(name));
    });
  });
}

function renderList(container, signers) {
  if (!container) return;
  container.innerHTML = '';
  if (!signers.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'Nenhum assinante cadastrado.';
    container.appendChild(empty);
    return;
  }
  signers.forEach((name, index) => {
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

export function setupAdminPanel() {
  const input = document.getElementById('admin-signer-name');
  const addBtn = document.getElementById('admin-signer-add');
  const list = document.getElementById('admin-signer-list');

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

// UI enhancements usable across pages
function setupEditableDefaults() {
  document.querySelectorAll('[data-default]').forEach((el) => {
    const input =
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
        ? el
        : null;
    if (!input) return;
    const def = String(input.getAttribute('data-default') || '').trim();
    if (!input.value) {
      input.value = def;
      input.classList.add('input-locked');
      input.setAttribute('data-locked', '1');
    }
    input.addEventListener('click', () => {
      if (input.getAttribute('data-locked') === '1') {
        input.removeAttribute('data-locked');
        input.classList.add('editing');
        input.classList.remove('input-locked');
        input.focus();
      }
    });
    input.addEventListener('blur', () => {
      if (!String(input.value || '').trim()) {
        input.value = def;
        input.setAttribute('data-locked', '1');
        input.classList.remove('editing');
        input.classList.add('input-locked');
      }
    });
  });
}

// Auto-run basic UI enhancements when admin panel is set up
try {
  setTimeout(() => setupEditableDefaults(), 50);
} catch (e) {
  /* ignore */
}
