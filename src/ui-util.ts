// Funções relacionadas à interface do usuário (migradas de ui.js, apenas utilitários)

export function showToast(message: string): void {
  let container = document.getElementById('toast-container') as HTMLElement | null;
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

export function setupConfigPanel(): void {
  // Configuração do painel de configurações
}

export function setFieldHint(field: HTMLElement | null, message: string): void {
  if (!field) return;
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
  } else {
    hint.innerHTML = '';
    hint.classList.remove('visible');
  }
}

export function clearFieldHint(field: HTMLElement | null): void {
  setFieldHint(field, '');
}

export function updateActionButtons(): void {
  // Atualiza os botões de ação com base no estado dos campos
}
