// src/prints/shared/openAndSavePdf.ts
export function openHtmlAndSavePdf(html: string, filenamePrefix: string) {
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) throw new Error('Popup bloqueado');

  w.document.open();
  w.document.write(html);
  w.document.close();

  void filenamePrefix;
  w.focus();
}
