export function setFieldHint(el: HTMLElement | null, hint: string): void {
  if (!el) return;
  el.setAttribute('data-field-hint', hint);
  el.title = hint;
}

export function clearFieldHint(el?: HTMLElement | null): void {
  if (!el) return;
  el.removeAttribute('data-field-hint');
  el.title = '';
}
