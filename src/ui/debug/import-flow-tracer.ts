// Debug helper: trace who/when writes key fields during import/apply flows
// Enable by setting `localStorage.debug.importTrace = '1'` in the browser console.

export function enableImportFlowTracer(): void {
  try {
    const active = String(localStorage.getItem('debug.importTrace') || '').toLowerCase() === '1';
    if (!active) return;
  } catch (e) {
    return;
  }

  try {
    (window as any).__importLogs = (window as any).__importLogs || [];
    const pushLog = (entry: Record<string, any>) => {
      try {
        (window as any).__importLogs.push(Object.assign({ time: Date.now() }, entry));
        // also console debug for immediate observation
        console.debug('[import-trace]', entry.selector || entry.path || '', entry.prev, '→', entry.val, '\n', entry.stack);
      } catch (e) { /**/ }
    };

    const selectors = [
      '[data-bind="registro.nome_completo"]',
      '[data-bind="registro.cpf"]',
      '[data-bind="registro.data_registro"]',
      '[data-bind="certidao.tipo_registro"]',
      '#cpf', '#data-reg'
    ];

    function instrumentElement(el: HTMLElement, selector: string) {
      try {
        if (!el) return;
        // Patch value property for inputs and textareas
        if ((el as HTMLInputElement).value !== undefined) {
          const input = el as HTMLInputElement & { __importTracerPatched?: boolean };
          if (!input.__importTracerPatched) {
            input.__importTracerPatched = true;
            const proto = Object.getPrototypeOf(input) as any;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.configurable) {
              Object.defineProperty(input, 'value', {
                get() {
                  return desc.get.call(this);
                },
                set(v) {
                  const prev = desc.get.call(this);
                  desc.set.call(this, v);
                  try {
                    pushLog({ selector, prev, val: v, stack: (new Error()).stack });
                  } catch (e) {}
                },
                configurable: true,
                enumerable: desc.enumerable,
              });
            }
            // also listen to input/change events
            input.addEventListener('input', () => {
              try { pushLog({ selector, event: 'input', val: (input as any).value }); } catch (e) {}
            });
            input.addEventListener('change', () => {
              try { pushLog({ selector, event: 'change', val: (input as any).value }); } catch (e) {}
            });
          }
        }

        // Patch setAttribute for value attribute as well
        const origSetAttr = el.setAttribute;
        el.setAttribute = function (name: string, value: string) {
          try {
            if (name === 'value') pushLog({ selector, event: 'setAttribute', prev: (el as any).value, val: value, stack: (new Error()).stack });
          } catch (e) {}
          return origSetAttr.call(this, name, value);
        } as any;

        // Observe mutations to catch outerHTML changes
        const mo = new MutationObserver((records) => {
          for (const r of records) {
            try {
              if (r.type === 'attributes' && (r as any).attributeName === 'value') {
                pushLog({ selector, event: 'mutation-attr', val: (el as any).value });
              }
            } catch (e) {}
          }
        });
        mo.observe(el, { attributes: true, attributeFilter: ['value'] });
      } catch (e) {
        try { console.warn('[import-trace] instrument error', e); } catch {};
      }
    }

    function scanAndInstrument() {
      try {
        selectors.forEach((sel) => {
          try {
            const node = document.querySelector(sel) as HTMLElement | null;
            if (node) instrumentElement(node, sel);
          } catch (e) {}
        });
      } catch (e) {}
    }

    // Initial scan
    scanAndInstrument();

    // watch for future nodes added to DOM
    const bodyObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of Array.from(m.addedNodes || [])) {
          try {
            const el = n as HTMLElement;
            if (!el.querySelector) continue;
            selectors.forEach((sel) => {
              try {
                const found = el.matches?.(sel) ? el : el.querySelector(sel);
                if (found) instrumentElement(found as HTMLElement, sel);
              } catch (e) {}
            });
          } catch (e) {}
        }
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // Expose helper to collect logs and clear
    (window as any).__importTrace = {
      get: () => ((window as any).__importLogs || []).slice(0),
      clear: () => { (window as any).__importLogs = []; },
    };

    console.debug('[import-trace] enabled: watching', selectors);
  } catch (e) {
    try { console.warn('[import-trace] failed to enable', e); } catch {}
  }
}
