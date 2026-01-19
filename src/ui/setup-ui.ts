// setup-ui.ts: Versão TypeScript das funções de setup extraídas do bundle original.
// Apenas migração estrutural, sem alteração de comportamento.

export function setStatus(text: string, isError?: boolean): void {
  const el = document.getElementById('statusText') as HTMLElement | null;
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#dc2626' : '#64748b';
  clearTimeout((el as any)._timer);
  (el as any)._timer = setTimeout(() => {
    el.textContent = 'Pronto';
    el.style.color = '#64748b';
  }, 2000);
}

export function setDirty(flag: boolean): void {
  try {
    const btn = document.getElementById('btn-save') as HTMLElement | null;
    if (!btn) return;
    btn.classList.toggle('dirty', !!flag);
  } catch (e) { /* ignore */ }
}

// ensure drawer toggle works even if per-act setup skipped or button recreated
try {
  if (!(window as any)._drawerDelegated) {
    (window as any)._drawerDelegated = true;
    document.addEventListener('click', (e) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.id === 'drawer-toggle' || target.closest?.('#drawer-toggle')) {
          const d = document.getElementById('drawer');
          if (!d) return;
          d.classList.toggle('open');
        }
        if (target.id === 'drawer-close' || target.closest?.('#drawer-close')) {
          const d = document.getElementById('drawer');
          if (!d) return;
          d.classList.remove('open');
        }
      } catch (err) { /* ignore */ }
    }, true);
  }
} catch (e) { /* ignore */ }

export function updateTipoButtons(state: any): void {
  const tipo = (state && state.certidao && state.certidao.tipo_registro) || 'nascimento';
  const input = document.querySelector('[data-bind="certidao.tipo_registro"]');
  if (input) (input as any).value = tipo;
  const casamentoWrap = document.getElementById('casamento-tipo-wrap') as HTMLElement | null;
  if (casamentoWrap) casamentoWrap.style.display = tipo === 'casamento' ? 'flex' : 'none';
}

export function updateSexoOutros(state: any): void {
  const sexo = state && state.registro && state.registro.sexo;
  const wrap = document.getElementById('sexo-outros-wrap') as HTMLElement | null;
  const input = document.getElementById('sexo-outros') as HTMLElement | null;
  if (!wrap || !input) return;
  const enabled = sexo === 'outros';
  wrap.style.display = enabled ? 'flex' : 'none';
  if (!enabled) {
    (input as any).value = '';
    if (state && state.registro) state.registro.sexo_outros = '';
  }
}

export function updateIgnoreFields(state: any): void {
  const dnIgn = !!(state && state.registro && state.registro.data_nascimento_ignorada);
  const hnIgn = !!(state && state.registro && state.registro.hora_nascimento_ignorada);
  const dn = document.getElementById('dn') as HTMLElement | null;
  const hn = document.getElementById('hn') as HTMLElement | null;
  if (dn) {
    (dn as any).disabled = dnIgn;
    if (dnIgn) {
      (dn as any).value = '';
      if (state && state.registro) state.registro.data_nascimento = '';
    }
  }
  if (hn) {
    (hn as any).disabled = hnIgn;
    if (hnIgn) {
      (hn as any).value = '';
      if (state && state.registro) state.registro.hora_nascimento = '';
    }
  }
}

export function setupConfigPanel(registerHandlers?: any): void {
  const NAME_MODE_KEY = 'ui.nameValidationMode';
  const NAME_MODE = localStorage.getItem(NAME_MODE_KEY) || 'input';
  const radios = Array.from(document.querySelectorAll('input[name="name-validation-mode"]'));
  radios.forEach((radio) => {
    (radio as any).checked = (radio as any).value === NAME_MODE;
  });
  const saveBtn = document.getElementById('config-save') as HTMLElement | null;
  if (saveBtn)
    saveBtn.addEventListener('click', () => {
      const selected = document.querySelector('input[name="name-validation-mode"]:checked');
      if (selected && (selected as any).value) {
        localStorage.setItem(NAME_MODE_KEY, (selected as any).value);
      }
      if (registerHandlers && typeof registerHandlers.onSave === 'function')
        registerHandlers.onSave();
    });
  const pickJson = document.getElementById('pick-json') as HTMLElement | null;
  if (pickJson && registerHandlers && typeof registerHandlers.onPickJson === 'function')
    pickJson.addEventListener('click', registerHandlers.onPickJson);
  const pickXml = document.getElementById('pick-xml') as HTMLElement | null;
  if (pickXml && registerHandlers && typeof registerHandlers.onPickXml === 'function')
    pickXml.addEventListener('click', registerHandlers.onPickXml);
}

export function setupActions(handlers: any = {}): void {
  const btnSave = document.getElementById('btn-save') as HTMLElement | null;
  const btnJson = document.getElementById('btn-json') as HTMLElement | null;
  const btnXml = document.getElementById('btn-xml') as HTMLElement | null;
  if (btnSave && typeof handlers.onSave === 'function')
    btnSave.addEventListener('click', handlers.onSave);
  if (btnJson && typeof handlers.onJson === 'function')
    btnJson.addEventListener('click', handlers.onJson);
  if (btnXml && typeof handlers.onXml === 'function')
    btnXml.addEventListener('click', handlers.onXml);
}

export function setupNaturalidadeToggle(state: any, onChange?: (changed: boolean) => void): void {
  const toggle = document.getElementById('naturalidade-diferente') as HTMLElement | null;
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    if (state && state.ui) state.ui.naturalidade_diferente = !!(toggle as any).checked;
    if (typeof onChange === 'function') onChange(true);
  });
}

export function setupShortcuts(saveHandler?: () => void): void {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (typeof saveHandler === 'function') saveHandler();
    }
  });
}

export function setupActSelect(defaultValue?: string): void {
  const select = document.getElementById('ato-select') as HTMLSelectElement | null;
  if (!select) return;
  try {
    if (defaultValue) select.value = defaultValue;
    else select.value = select.value || 'nascimento';
  } catch (e) { /* ignore */ }

  const goTo = (val: string) => {
    try {
      const map: Record<string, string> = {
        nascimento: './Nascimento2Via.html',
        casamento: './Casamento2Via.html',
        obito: './Obito2Via.html',
      };
      const next = map[val];
      if (next) {
        // small debug log to help trace issues in browser console
        try { console.debug('setupActSelect -> navigating to', next); } catch (e) { /* ignore */ }
        window.location.href = next;
      }
    } catch (err) { /* ignore */ }
  };

  // attach after a tiny delay to avoid being overwritten by other setup code
  setTimeout(() => {
    select.addEventListener('change', () => goTo(select.value));
    select.addEventListener('input', () => goTo(select.value));
  }, 10);

  // delegation fallback: listen at document level so replaced/recreated select still triggers
  try {
    if (!(window as any)._atoSelectDelegated) {
      (window as any)._atoSelectDelegated = true;
      document.addEventListener('change', (e) => {
        try {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if ((target.id && target.id === 'ato-select') || target.closest?.('#ato-select')) {
            const val = ((document.getElementById('ato-select') as HTMLSelectElement | null)?.value) || '';
            goTo(val);
          }
        } catch (err) { /* ignore */ }
      }, true);
      document.addEventListener('input', (e) => {
        try {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if ((target.id && target.id === 'ato-select') || target.closest?.('#ato-select')) {
            const val = ((document.getElementById('ato-select') as HTMLSelectElement | null)?.value) || '';
            goTo(val);
          }
        } catch (err) { /* ignore */ }
      }, true);
    }
  } catch (e) { /* ignore */ }
}

  // Global settings save/apply fallback: persist validation prefs and panel inline/default
  try {
    if (!(window as any)._globalSettingsHandlers) {
      (window as any)._globalSettingsHandlers = true;
      // initialize checkbox states from localStorage when DOM is ready
      const initSettings = () => {
        try {
          const cbCpf = document.getElementById('settings-enable-cpf') as HTMLInputElement | null;
          const cbName = document.getElementById('settings-enable-name') as HTMLInputElement | null;
          const cbInline = document.getElementById('settings-panel-inline') as HTMLInputElement | null;
          const posSelect = document.getElementById('settings-drawer-position') as HTMLSelectElement | null;
          const ENABLE_CPF = localStorage.getItem('ui.enableCpfValidation') !== 'false';
          const ENABLE_NAME = localStorage.getItem('ui.enableNameValidation') !== 'false';
          const PANEL_INLINE = localStorage.getItem('ui.panelInline') === 'true';
          const POS = localStorage.getItem('ui.drawerPosition') || 'bottom-right';
          if (cbCpf) cbCpf.checked = !!ENABLE_CPF;
          if (cbName) cbName.checked = !!ENABLE_NAME;
          if (cbInline) cbInline.checked = !!PANEL_INLINE;
          if (posSelect) posSelect.value = POS;
        } catch (e) { /* ignore */ }
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSettings); else initSettings();

      document.addEventListener('click', (e) => {
        try {
          const t = e.target as HTMLElement | null;
          if (!t) return;
          if (t.id === 'settings-save' || t.closest?.('#settings-save')) {
            const pos = (document.getElementById('settings-drawer-position') as HTMLSelectElement | null)?.value || 'bottom-right';
            const newCpf = (document.getElementById('settings-enable-cpf') as HTMLInputElement | null)?.checked ? 'true' : 'false';
            const newName = (document.getElementById('settings-enable-name') as HTMLInputElement | null)?.checked ? 'true' : 'false';
            const newInline = (document.getElementById('settings-panel-inline') as HTMLInputElement | null)?.checked ? 'true' : 'false';
            localStorage.setItem('ui.drawerPosition', pos);
            localStorage.setItem('ui.enableCpfValidation', newCpf);
            localStorage.setItem('ui.enableNameValidation', newName);
            localStorage.setItem('ui.panelInline', newInline);
            try { console.debug('settings saved', { pos, newCpf, newName, newInline }); } catch (e) {}
            setTimeout(() => window.location.reload(), 250);
          }
          if (t.id === 'settings-apply' || t.closest?.('#settings-apply')) {
            const pos = (document.getElementById('settings-drawer-position') as HTMLSelectElement | null)?.value || 'bottom-right';
            try { const drawer = document.getElementById('drawer'); if (drawer) {
              drawer.classList.remove('position-top','position-bottom-right','position-side');
              if (pos === 'top') drawer.classList.add('position-top'); else if (pos === 'side') drawer.classList.add('position-side'); else drawer.classList.add('position-bottom-right');
            } } catch (e) {}
            try { console.debug('settings applied', pos); } catch (e) {}
          }
        } catch (e) { /* ignore */ }
      }, true);
    }
  } catch (e) { /* ignore */ }

export function setupCartorioTyping(): void {
  const select = document.getElementById('cartorio-oficio') as HTMLElement | null;
  if (!select) return;
  let buffer = '';
  let timer: any = null;
  const clearBuffer = () => {
    buffer = '';
    if (timer) clearTimeout(timer);
    timer = null;
  };
  select.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
      e.preventDefault();
      buffer += key;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        buffer = '';
      }, 700);
      const match = Array.from((select as any).options).find((opt: any) => opt.value === buffer);
      if (match) {
        (select as any).value = buffer;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        clearBuffer();
      }
      return;
    }
    if (key === 'Backspace') {
      e.preventDefault();
      buffer = buffer.slice(0, -1);
      return;
    }
  });
}

export function setupNameValidation(validator: any, opts: any = {}): void {
  // validator should provide: ready (Promise), check(value), repo.addException
  const fields = Array.from(document.querySelectorAll('[data-name-validate]'));
  const timers = new Map();
  fields.forEach((input) => {
    const field = input.closest('.field');
    if (field) field.classList.add('name-field');
    let hint = field ? (field as any).querySelector('.name-suggest') : null;
    if (field && !hint) {
      hint = document.createElement('button');
      hint.type = 'button';
      hint.className = 'name-suggest';
      hint.textContent = 'Parece incorreto - adicionar ao dicionario?';
      field.appendChild(hint);
    }
    if (hint) {
      hint.addEventListener('click', (e) => {
        e.preventDefault();
        const value = (input as any).value;
        if (!value) return;
        if (validator && validator.repo && typeof validator.repo.addException === 'function') {
          validator.repo.addException(value);
        }
        input.classList.remove('invalid');
        if (field) field.classList.remove('name-suspect');
        const t = timers.get(input);
        if (t) clearInterval(t);
        timers.delete(input);
      });
    }
    const runCheck = () => {
      const value = (input as any).value || '';
      const result = validator ? validator.check(value) : { suspicious: false };
      const suspect = !!result.suspicious;
      input.classList.toggle('invalid', suspect);
      if (field) field.classList.toggle('name-suspect', suspect);
      if (suspect) {
        const toastFn =
          typeof (window as any).showToast === 'function'
            ? (window as any).showToast
            : (m: string) => console.warn('toast:', m);
        toastFn('Nome possivelmente incorreto');
        if (!timers.has(input)) {
          const id = setInterval(() => {
            if (input.classList.contains('invalid')) toastFn('Nome possivelmente incorreto');
          }, 180000);
          timers.set(input, id);
        }
      } else {
        const t = timers.get(input);
        if (t) clearInterval(t);
        timers.delete(input);
      }
    };
    input.addEventListener('input', () => {
      const mode = localStorage.getItem('ui.nameValidationMode') || 'input';
      if (mode === 'input') runCheck();
    });
    input.addEventListener('blur', () => {
      const mode = localStorage.getItem('ui.nameValidationMode') || 'input';
      if (mode === 'blur' || mode === 'input') runCheck();
    });
  });
  if (validator && validator.ready && typeof validator.ready.then === 'function') {
    validator.ready
      .then(() => {
        fields.forEach((input) => {
          const field = input.closest('.field');
          if (field) field.classList.remove('name-suspect');
          const value = (input as any).value || '';
          if (value) {
            const result = validator.check(value);
            const suspect = !!result.suspicious;
            input.classList.toggle('invalid', suspect);
            if (field) field.classList.toggle('name-suspect', suspect);
          }
        });
      })
      .catch(() => {});
  }
}

export function setupBeforeUnload(isDirtyFn?: () => boolean): void {
  window.addEventListener('beforeunload', (e) => {
    try {
      if (!isDirtyFn || !isDirtyFn()) return;
      e.preventDefault();
      (e as any).returnValue = '';
    } catch (err) { /* ignore */ }
  });
}
