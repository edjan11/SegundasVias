export type ActHtmlPayload = {
  mainHtml: string;
  drawerHtml: string;
  bodyClass: string;
};

const htmlCache = new Map<string, ActHtmlPayload>();

function stripScripts(root: ParentNode): void {
  root.querySelectorAll('script').forEach((el) => el.remove());
}

function extractContainer(doc: Document): Element | null {
  return (
    doc.querySelector('.app-shell .main-pane .container') ||
    doc.querySelector('.container') ||
    doc.querySelector('main') ||
    doc.body
  );
}

export async function loadActHtml(path: string): Promise<ActHtmlPayload> {
  if (htmlCache.has(path)) return htmlCache.get(path) as ActHtmlPayload;

  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Falha ao carregar ${path}: ${res.status}`);

  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');

  const container = extractContainer(doc);
  if (!container) throw new Error(`Conteudo nao encontrado em ${path}`);

  const drawer = doc.querySelector('#drawer');
  const bodyClass = doc.body?.className || '';

  stripScripts(container);
  if (drawer) stripScripts(drawer);

  const payload = {
    mainHtml: container.outerHTML,
    drawerHtml: drawer ? drawer.innerHTML : '',
    bodyClass,
  };

  htmlCache.set(path, payload);
  return payload;
}

export function clearActHtmlCache(): void {
  htmlCache.clear();
}
