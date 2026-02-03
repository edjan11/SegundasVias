/**
 * apply-loading.ts
 * 
 * Gerencia a UI de loading e bloqueio de navegação durante a aplicação de payloads.
 * Mostra um overlay visual enquanto o certificado está sendo processado, com indicador
 * de tentativas e progresso.
 */

type LoadingState = {
  visible: boolean;
  attemptsLeft: number;
  maxAttempts: number;
  loadingElement: HTMLElement | null;
  navigationBlocked: boolean;
  originalNavigateHandler: ((e: CustomEvent) => void) | null;
};

const state: LoadingState = {
  visible: false,
  attemptsLeft: 5,
  maxAttempts: 5,
  loadingElement: null,
  navigationBlocked: false,
  originalNavigateHandler: null,
};

/**
 * Cria o elemento de loading visual
 */
function createLoadingElement(attemptsLeft: number): HTMLElement {
  const container = document.createElement('div');
  container.id = '__apply-loading-overlay';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999999;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    color: #fff;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
  `;

  // Spinner animado
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;
  
  // Adicionar animação CSS ao documento
  if (!document.getElementById('__apply-loading-styles')) {
    const style = document.createElement('style');
    style.id = '__apply-loading-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .__apply-loading-text {
        animation: pulse 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  content.appendChild(spinner);

  // Texto principal
  const title = document.createElement('div');
  title.className = '__apply-loading-text';
  title.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.5px;
  `;
  title.textContent = 'Processando certificado...';
  content.appendChild(title);

  // Barra de progresso (retentativas)
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    width: 200px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 10px;
  `;

  const progressBar = document.createElement('div');
  progressBar.id = '__apply-loading-progress';
  const progressPercent = ((state.maxAttempts - attemptsLeft) / state.maxAttempts) * 100;
  progressBar.style.cssText = `
    height: 100%;
    width: ${progressPercent}%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 2px;
    transition: width 0.3s ease-out;
  `;
  progressContainer.appendChild(progressBar);
  content.appendChild(progressContainer);

  // Informação de tentativas
  const attemptsInfo = document.createElement('div');
  attemptsInfo.id = '__apply-loading-attempts';
  attemptsInfo.style.cssText = `
    font-size: 12px;
    opacity: 0.7;
    letter-spacing: 0.3px;
  `;
  attemptsInfo.textContent = `Tentativa ${state.maxAttempts - attemptsLeft + 1} de ${state.maxAttempts}`;
  content.appendChild(attemptsInfo);

  // Mensagem de bloqueio
  const blockMessage = document.createElement('div');
  blockMessage.style.cssText = `
    font-size: 11px;
    opacity: 0.6;
    margin-top: 10px;
    letter-spacing: 0.2px;
  `;
  blockMessage.textContent = 'Aguarde... não feche ou navegue para outra página';
  content.appendChild(blockMessage);

  container.appendChild(content);
  return container;
}

/**
 * Bloqueia eventos de navegação durante o processamento
 */
function blockNavigation(): void {
  if (state.navigationBlocked) return;

  try {
    // Bloquear app:navigate customizado
    const handleNavigate = (e: any) => {
      try {
        e.preventDefault?.();
        e.stopPropagation?.();
      } catch {}
    };

    state.originalNavigateHandler = handleNavigate;
    window.addEventListener('app:navigate', handleNavigate as any, true);

    // Bloquear beforeunload
    window.__applyLoadingBlockBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.visible) {
        e.preventDefault?.();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', window.__applyLoadingBlockBeforeUnload);

    state.navigationBlocked = true;
  } catch (err) {
    try { console.error('[apply-loading] erro ao bloquear navegação:', err); } catch {}
  }
}

/**
 * Desbloqueia eventos de navegação
 */
function unblockNavigation(): void {
  if (!state.navigationBlocked) return;

  try {
    if (state.originalNavigateHandler) {
      window.removeEventListener('app:navigate', state.originalNavigateHandler as any, true);
      state.originalNavigateHandler = null;
    }

    if (window.__applyLoadingBlockBeforeUnload) {
      window.removeEventListener('beforeunload', window.__applyLoadingBlockBeforeUnload);
      delete window.__applyLoadingBlockBeforeUnload;
    }

    state.navigationBlocked = false;
  } catch (err) {
    try { console.error('[apply-loading] erro ao desbloquear navegação:', err); } catch {}
  }
}

/**
 * Mostra o overlay de loading
 */
export function showApplyLoading(attemptsLeft: number = 5): void {
  try {
    // Remover elemento anterior se existir
    const existing = document.getElementById('__apply-loading-overlay');
    if (existing) {
      existing.remove();
    }

    state.attemptsLeft = attemptsLeft;
    state.visible = true;

    const element = createLoadingElement(attemptsLeft);
    document.body.appendChild(element);
    state.loadingElement = element;

    // Forçar reflow para garantir que a animação inicia
    void element.offsetHeight;

    blockNavigation();
  } catch (err) {
    try { console.error('[apply-loading] erro ao mostrar loading:', err); } catch {}
  }
}

/**
 * Atualiza o progresso do loading (quando há retentativa)
 */
export function updateApplyLoading(attemptsLeft: number): void {
  try {
    if (!state.visible) return;

    state.attemptsLeft = attemptsLeft;

    // Atualizar barra de progresso
    const progressBar = document.getElementById('__apply-loading-progress');
    if (progressBar) {
      const progressPercent = ((state.maxAttempts - attemptsLeft) / state.maxAttempts) * 100;
      progressBar.style.width = `${progressPercent}%`;
    }

    // Atualizar texto de tentativas
    const attemptsInfo = document.getElementById('__apply-loading-attempts');
    if (attemptsInfo) {
      attemptsInfo.textContent = `Tentativa ${state.maxAttempts - attemptsLeft + 1} de ${state.maxAttempts}`;
    }

  } catch (err) {
    try { console.error('[apply-loading] erro ao atualizar loading:', err); } catch {}
  }
}

/**
 * Esconde o overlay de loading
 */
export function hideApplyLoading(success: boolean = true): void {
  try {
    if (!state.visible) return;

    const element = state.loadingElement || document.getElementById('__apply-loading-overlay');
    if (element) {
      if (success) {
        // Mostrar mensagem de sucesso brevemente antes de desaparecer
        const title = element.querySelector('.__apply-loading-text');
        if (title) {
          title.textContent = '✓ Formulário carregado com sucesso';
          (title as HTMLElement).style.animation = 'none';
        }

        const spinner = element.querySelector('div[style*="border-radius: 50%"]');
        if (spinner) {
          (spinner as HTMLElement).style.animation = 'none';
          (spinner as HTMLElement).style.borderColor = 'transparent';
          (spinner as HTMLElement).style.borderTopColor = '#10b981';
        }

        // Desaparecer após breve delay
        setTimeout(() => {
          try {
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => {
              element.remove();
              state.loadingElement = null;
            }, 300);
          } catch {}
        }, 500);
      } else {
        // Desaparecer imediatamente sem sucesso
        element.remove();
        state.loadingElement = null;
      }
    }

    state.visible = false;
    unblockNavigation();
  } catch (err) {
    try { console.error('[apply-loading] erro ao esconder loading:', err); } catch {}
  }
}

/**
 * Verifica se o loading está visível
 */
export function isApplyLoadingVisible(): boolean {
  return state.visible;
}

/**
 * Force cleanup (em caso de erro extremo)
 */
export function forceCleanupApplyLoading(): void {
  try {
    const element = document.getElementById('__apply-loading-overlay');
    if (element) element.remove();
    
    unblockNavigation();
    state.visible = false;
    state.loadingElement = null;
  } catch (err) {
    try { console.error('[apply-loading] erro durante limpeza forçada:', err); } catch {}
  }
}

// Expor globalmente para que o layout-router possa acessar durante navegação automática
(window as any).hideApplyLoading = hideApplyLoading;
(window as any).showApplyLoading = showApplyLoading;
(window as any).updateApplyLoading = updateApplyLoading;
(window as any).isApplyLoadingVisible = isApplyLoadingVisible;
(window as any).forceCleanupApplyLoading = forceCleanupApplyLoading;

// Declarar globalmente para que o beforeunload possa acessar
declare global {
  interface Window {
    __applyLoadingBlockBeforeUnload?: (e: BeforeUnloadEvent) => void;
    hideApplyLoading?: typeof hideApplyLoading;
    showApplyLoading?: typeof showApplyLoading;
    updateApplyLoading?: typeof updateApplyLoading;
    isApplyLoadingVisible?: typeof isApplyLoadingVisible;
    forceCleanupApplyLoading?: typeof forceCleanupApplyLoading;
  }
}
