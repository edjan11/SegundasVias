// src/prints/shared/openAndSavePdf.ts
export type BeforePrintHandler = (popup: Window) => Promise<boolean | void> | boolean | void;

export interface OpenHtmlPdfOptions {
  beforePrint?: BeforePrintHandler;
}

export function openHtmlAndSavePdf(
  html: string,
  filenamePrefix: string,
  targetWindow?: Window | null,
  options: OpenHtmlPdfOptions = {},
): Window {
  const w = targetWindow || window.open('', '_blank', 'width=900,height=1100');
  if (!w) throw new Error('Popup bloqueado');

  w.document.open();
  w.document.write(html);
  w.document.close();

  let statusEl: HTMLElement | null = null;
  const setTaskStatus = (text: string, tone: 'idle' | 'ok' | 'warn' | 'error' = 'idle') => {
    if (!statusEl) return;
    statusEl.textContent = text;
    if (tone === 'ok') statusEl.style.color = '#166534';
    else if (tone === 'warn') statusEl.style.color = '#92400e';
    else if (tone === 'error') statusEl.style.color = '#b91c1c';
    else statusEl.style.color = '#334155';
  };

  const ensureTaskbar = () => {
    const doc = w.document;
    if (doc.getElementById('print-taskbar')) return;

    const style = doc.createElement('style');
    style.id = 'print-taskbar-style';
    style.textContent = `
      #print-taskbar {
        position: fixed;
        right: 14px;
        top: 14px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border: 1px solid #d6dde8;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.97);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
        font-family: "Segoe UI", Tahoma, sans-serif;
      }
      #print-taskbar .print-taskbar-btn {
        height: 28px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0 10px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        background: #ffffff;
        color: #1f2937;
      }
      #print-taskbar .print-taskbar-btn:hover {
        background: #f8fafc;
      }
      #print-taskbar .print-taskbar-btn.primary {
        background: #2563eb;
        border-color: #1d4ed8;
        color: #ffffff;
      }
      #print-taskbar .print-taskbar-btn.primary:hover {
        background: #1d4ed8;
      }
      #print-taskbar .print-taskbar-status {
        margin-left: 2px;
        font-size: 11px;
        font-weight: 600;
        color: #334155;
        white-space: nowrap;
      }
      @media print {
        #print-taskbar { display: none !important; }
      }
    `;
    doc.head?.appendChild(style);

    const bar = doc.createElement('div');
    bar.id = 'print-taskbar';

    const sealBtn = doc.createElement('button');
    sealBtn.type = 'button';
    sealBtn.className = 'print-taskbar-btn primary';
    sealBtn.textContent = 'Selagem (Ctrl+Espaco)';
    sealBtn.title = 'Abrir etapa de selagem';
    sealBtn.addEventListener('click', () => {
      void requestSealOnly();
    });

    const printBtn = doc.createElement('button');
    printBtn.type = 'button';
    printBtn.className = 'print-taskbar-btn';
    printBtn.textContent = 'Imprimir (Ctrl+P)';
    printBtn.title = 'Imprimir como esta';
    printBtn.addEventListener('click', () => {
      requestPrintDirect();
    });

    const printWithSealBtn = doc.createElement('button');
    printWithSealBtn.type = 'button';
    printWithSealBtn.className = 'print-taskbar-btn';
    printWithSealBtn.textContent = 'Selar + Imprimir';
    printWithSealBtn.title = 'Abrir selagem e imprimir no final';
    printWithSealBtn.addEventListener('click', () => {
      void requestPrintWithSelagem();
    });

    statusEl = doc.createElement('span');
    statusEl.className = 'print-taskbar-status';
    statusEl.textContent = options.beforePrint ? 'Analise o PDF e sele quando quiser.' : 'PDF pronto para impressao.';

    bar.appendChild(sealBtn);
    bar.appendChild(printBtn);
    bar.appendChild(printWithSealBtn);
    bar.appendChild(statusEl);

    if (!options.beforePrint) {
      sealBtn.disabled = true;
      printWithSealBtn.disabled = true;
      sealBtn.title = 'Selagem indisponivel para este documento';
      printWithSealBtn.title = 'Selagem indisponivel para este documento';
    }

    doc.body.appendChild(bar);
  };

  let printLock = false;
  let sealLock = false;

  const requestPrintDirect = () => {
    setTaskStatus('Enviando para impressao...');
    w.focus();
    w.print();
  };

  const requestSealOnly = async () => {
    if (!options.beforePrint || sealLock) return;
    sealLock = true;
    setTaskStatus('Abrindo selagem...');
    try {
      const result = await options.beforePrint(w);
      if (result === false) setTaskStatus('Selagem cancelada.', 'warn');
      else setTaskStatus('Selagem atualizada.', 'ok');
    } catch (error) {
      console.error('[openHtmlAndSavePdf] selagem manual falhou', error);
      setTaskStatus('Falha na selagem.', 'error');
    } finally {
      sealLock = false;
    }
  };

  const requestPrintWithSelagem = async () => {
    if (printLock) return;
    printLock = true;
    setTaskStatus('Processando selagem...');
    try {
      const allow = options.beforePrint ? await options.beforePrint(w) : true;
      if (allow === false) {
        setTaskStatus('Selagem cancelada.', 'warn');
        return;
      }
      setTaskStatus('Imprimindo...');
      w.focus();
      w.print();
    } catch (error) {
      console.error('[openHtmlAndSavePdf] beforePrint falhou, imprimindo sem selagem', error);
      setTaskStatus('Falha na selagem. Imprimindo sem selo.', 'warn');
      w.focus();
      w.print();
    } finally {
      printLock = false;
    }
  };

  ensureTaskbar();

  const onKeyDown = (event: KeyboardEvent) => {
    const key = String(event.key || '').toLowerCase();
    const isCtrl = event.ctrlKey || event.metaKey;
    if (!isCtrl) return;

    const isCtrlSpace = event.code === 'Space' || key === ' ' || key === 'spacebar';
    if (isCtrlSpace) {
      event.preventDefault();
      void requestSealOnly();
      return;
    }

    if (key !== 'p') return;

    event.preventDefault();
    if (event.altKey) {
      requestPrintDirect();
      return;
    }

    // Ctrl+Shift+P = selar e imprimir. Ctrl+P = imprimir direto.
    if (event.shiftKey) {
      void requestPrintWithSelagem();
      return;
    }
    requestPrintDirect();
  };

  try {
    w.addEventListener('keydown', onKeyDown, true);
  } catch {
    // ignore
  }

  try {
    (w as any).__requestPrintWithSelagem = requestPrintWithSelagem;
    (w as any).__requestSealOnly = requestSealOnly;
    (w as any).__requestPrintDirect = requestPrintDirect;
  } catch {
    // ignore
  }

  void filenamePrefix;
  w.focus();
  return w;
}
