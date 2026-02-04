export type OutputDirs = {
  json: string;
  xml: string;
};

const OUTPUT_DIR_KEY_JSON = 'outputDir.json';
const OUTPUT_DIR_KEY_XML = 'outputDir.xml';

type OutputDirKind = 'json' | 'xml';

type PickerOptions = {
  getDocument: () => Document;
  onStatus?: (message: string, isError?: boolean) => void;
};

export function readOutputDirs(): OutputDirs {
  return {
    json: localStorage.getItem(OUTPUT_DIR_KEY_JSON) || '',
    xml: localStorage.getItem(OUTPUT_DIR_KEY_XML) || '',
  };
}

export function writeOutputDir(kind: OutputDirKind, dir: string): OutputDirs {
  if (kind === 'json') {
    localStorage.setItem(OUTPUT_DIR_KEY_JSON, dir);
  } else {
    localStorage.setItem(OUTPUT_DIR_KEY_XML, dir);
  }
  return readOutputDirs();
}

export function applyOutputDirUi(doc: Document, dirs: OutputDirs): void {
  const badge = doc.getElementById('outputDirBadge') as HTMLElement | null;
  if (badge) badge.textContent = `JSON: ${dirs.json || '...'} | XML: ${dirs.xml || '...'}`;
  const jsonEl = doc.getElementById('json-dir') as HTMLInputElement | null;
  const xmlEl = doc.getElementById('xml-dir') as HTMLInputElement | null;
  if (jsonEl) jsonEl.value = dirs.json || '';
  if (xmlEl) xmlEl.value = dirs.xml || '';
}

async function pickDirectory(kind: OutputDirKind, opts: PickerOptions): Promise<string | null> {
  const w = window as Window & {
    api?: { pickJsonDir?: () => Promise<string>; pickXmlDir?: () => Promise<string> };
    currentDirs?: { jsonDir?: string; xmlDir?: string; jsonHandle?: FileSystemDirectoryHandle; xmlHandle?: FileSystemDirectoryHandle };
  };

  if (w.api && ((kind === 'json' && w.api.pickJsonDir) || (kind === 'xml' && w.api.pickXmlDir))) {
    const dir = kind === 'json' ? await w.api.pickJsonDir!() : await w.api.pickXmlDir!();
    return typeof dir === 'string' ? dir : null;
  }

  const wAny = window as any;
  if (typeof wAny.showDirectoryPicker === 'function') {
    try {
      const handle = await wAny.showDirectoryPicker();
      const dir = handle?.name ? String(handle.name) : '';
      if (dir) {
        if (kind === 'json') {
          w.currentDirs = { ...(w.currentDirs || {}), jsonHandle: handle, jsonDir: dir };
        } else {
          w.currentDirs = { ...(w.currentDirs || {}), xmlHandle: handle, xmlDir: dir };
        }
      }
      return dir || null;
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        opts.onStatus?.('Falha ao escolher pasta', true);
      }
      return null;
    }
  }

  const promptLabel = kind === 'json' ? 'Informe a pasta de destino do JSON' : 'Informe a pasta de destino do XML';
  const fallback = window.prompt(promptLabel, readOutputDirs()[kind]);
  if (!fallback) return null;
  return fallback.trim() || null;
}

export async function pickAndStoreOutputDir(kind: OutputDirKind, opts: PickerOptions): Promise<void> {
  const dir = await pickDirectory(kind, opts);
  if (!dir) return;
  const dirs = writeOutputDir(kind, dir);
  applyOutputDirUi(opts.getDocument(), dirs);
}

export function setupOutputDirControls(opts: PickerOptions): void {
  const doc = opts.getDocument();
  const dirs = readOutputDirs();
  applyOutputDirUi(doc, dirs);

  const pickJson = doc.getElementById('pick-json') as HTMLElement | null;
  if (pickJson) pickJson.addEventListener('click', () => void pickAndStoreOutputDir('json', opts));

  const pickXml = doc.getElementById('pick-xml') as HTMLElement | null;
  if (pickXml) pickXml.addEventListener('click', () => void pickAndStoreOutputDir('xml', opts));

  const docAny = doc as any;
  if (docAny.__outputDirDelegatesBound) return;
  docAny.__outputDirDelegatesBound = true;
  doc.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const pickJsonBtn = target.closest('#pick-json');
    if (pickJsonBtn) {
      event.preventDefault();
      void pickAndStoreOutputDir('json', opts);
      return;
    }
    const pickXmlBtn = target.closest('#pick-xml');
    if (pickXmlBtn) {
      event.preventDefault();
      void pickAndStoreOutputDir('xml', opts);
    }
  });
}
