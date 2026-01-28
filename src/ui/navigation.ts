export function getCurrentAct(): string | null {
  const el = document.querySelector('[data-current-act]') as HTMLElement | null;
  return el ? el.getAttribute('data-current-act') : null;
}

export function navigateToAct(act: string): void {
  // lightweight navigation stub - real app may have more behavior
  const event = new CustomEvent('navigateToAct', { detail: { act } });
  window.dispatchEvent(event as Event);
}

export function updateTipoButtons(): void {
  // no-op stub for tests and build
}
