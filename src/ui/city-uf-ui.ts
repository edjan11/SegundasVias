import { resolveCityToUf, loadIndexFromProjectData } from '../shared/city-uf-resolver';

/**
 * Attach city→UF autofill behavior between cityInput and ufInput
 * - resolverIndex: prebuilt index (pass loadIndexFromProjectData())
 * - onAutofilled callback receives ({ uf, status, reason }) for instrumentation
 */
export function attachCityUfAutofill(
  cityInput: HTMLInputElement,
  ufInput: HTMLInputElement | HTMLSelectElement,
  resolverIndex: Map<string, any>,
  onAutofilled?: (res: any) => void
) {
  let lastAutoFilled = false;

  async function handleCityConfirm() {
    const city = cityInput.value;
    const currentUf = (ufInput as any).value;
    const res = resolveCityToUf(city, currentUf ? currentUf : null, resolverIndex);

    if (res.status === 'inferred' || res.status === 'ok') {
      // Autofill UF and set temporary readonly-ish state
      const ufValue = (res as any).uf || '';
      if ((ufInput as HTMLInputElement).tagName === 'SELECT') {
        (ufInput as HTMLSelectElement).value = ufValue;
        (ufInput as HTMLElement).setAttribute('data-auto-filled', 'true');
        (ufInput as HTMLElement).classList.add('auto-filled');
      } else {
        (ufInput as HTMLInputElement).value = ufValue;
        (ufInput as HTMLInputElement).setAttribute('readonly', 'true');
      }

      lastAutoFilled = true;

      // Move focus forward (like TAB). Use focus on next tabbable element.
      // Prefer nextElementSibling, if it exists and is focusable.
      const next = findNextTabbable(cityInput);
      if (next) next.focus();
    }

    if (typeof onAutofilled === 'function') onAutofilled(res);
  }

  function findNextTabbable(el: HTMLElement): HTMLElement | null {
    // Simple approach: query the form's tab order — walk to nextElementSibling until focusable
    let node: HTMLElement | null = el.nextElementSibling as HTMLElement | null;
    while (node) {
      if (isFocusable(node)) return node;
      node = node.nextElementSibling as HTMLElement | null;
    }
    // fallback: try document.activeElement's nextElementSibling
    return null;
  }

  function isFocusable(el: HTMLElement) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (['input', 'select', 'textarea', 'button', 'a'].includes(tag)) {
      return !(el as HTMLInputElement).disabled && el.getAttribute('tabindex') !== '-1';
    }
    return el.hasAttribute('tabindex');
  }

  function removeReadonlyIfUserFocused(e: FocusEvent) {
    // If user Shift+Tabs into UF or clicks it, allow editing
    if (lastAutoFilled) {
      if ((ufInput as HTMLInputElement).tagName === 'SELECT') {
        (ufInput as HTMLElement).removeAttribute('data-auto-filled');
        (ufInput as HTMLElement).classList.remove('auto-filled');
      } else {
        (ufInput as HTMLInputElement).removeAttribute('readonly');
      }
      lastAutoFilled = false;
    }
  }

  // When city is confirmed (blur or Enter), try to autofill
  cityInput.addEventListener('blur', () => {
    // Slight delay for selection events
    setTimeout(handleCityConfirm, 0);
  });

  cityInput.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === 'Tab') {
      // If user presses Enter while in city, confirm then allow natural Tab behaviour
      handleCityConfirm();
    }
  });

  // If user goes back (Shift+Tab) or clicks UF, allow editing and remove readonly
  ufInput.addEventListener('focus', removeReadonlyIfUserFocused as any);
  ufInput.addEventListener('mousedown', () => {
    // allow click to edit
    if (lastAutoFilled) {
      if ((ufInput as HTMLInputElement).tagName === 'SELECT') {
        (ufInput as HTMLElement).removeAttribute('data-auto-filled');
        (ufInput as HTMLElement).classList.remove('auto-filled');
      } else {
        (ufInput as HTMLInputElement).removeAttribute('readonly');
      }
      lastAutoFilled = false;
    }
  });

  // Return an detach function so caller can remove listeners
  return function detach() {
    cityInput.removeEventListener('blur', handleCityConfirm as any);
    cityInput.removeEventListener('keydown', handleCityConfirm as any);
    ufInput.removeEventListener('focus', removeReadonlyIfUserFocused as any);
    ufInput.removeEventListener('mousedown', removeReadonlyIfUserFocused as any);
  };
}
