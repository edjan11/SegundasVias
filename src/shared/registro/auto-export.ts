type SavePayload = { name: string; content: string; subdir?: string };

type AutoExportDeps = {
  saveJson?: (payload: SavePayload) => Promise<string> | string;
  saveXml?: (payload: SavePayload) => Promise<string> | string;
  download?: (name: string, content: string, mime: string) => boolean;
  onStatus?: (msg: string, isError?: boolean) => void;
};

type AutoExportInput = {
  json: string;
  xml: string;
  jsonName: string;
  xmlName: string;
  subdir: string;
  allowDownloadFallback?: boolean;
};

export function buildDateFolder(date = new Date()): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function buildDateFolderFromValue(value?: string): string {
  const raw = String(value || '').trim();
  if (!raw) return buildDateFolder();
  const m1 = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return buildDateFolder();
}

export async function autoExportJsonXml(input: AutoExportInput, deps: AutoExportDeps): Promise<void> {
  const { json, xml, jsonName, xmlName, subdir, allowDownloadFallback = true } = input;
  const { saveJson, saveXml, download, onStatus } = deps;

  const report = (msg: string, isError?: boolean) => {
    if (typeof onStatus === 'function') onStatus(msg, isError);
  };

  if (typeof saveJson === 'function') {
    await Promise.resolve(saveJson({ name: jsonName, content: json, subdir }));
  } else if (allowDownloadFallback && typeof download === 'function') {
    const ok = download(`${subdir}_${jsonName}`, json, 'application/json');
    if (!ok) report('Falha ao baixar JSON automatico', true);
  } else {
    report('Auto JSON indisponivel (sem API)', true);
  }

  if (typeof saveXml === 'function') {
    await Promise.resolve(saveXml({ name: xmlName, content: xml, subdir }));
  } else if (allowDownloadFallback && typeof download === 'function') {
    const ok = download(`${subdir}_${xmlName}`, xml, 'application/xml');
    if (!ok) report('Falha ao baixar XML automatico', true);
  } else {
    report('Auto XML indisponivel (sem API)', true);
  }

  report(`Auto salvar concluido (${subdir})`);
}
