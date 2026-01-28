export function downloadBlob(filename: string, mime: string, content: BlobPart | Blob): boolean {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('downloadBlob failed', e);
    return false;
  }
}

export function downloadText(filename: string, content: string, mime: string): boolean {
  return downloadBlob(filename, mime, content);
}
