export type ThemeMode = 'light' | 'dark';

export function applyFontFamily(fontFamily: string): void {
  const value = String(fontFamily || '').trim();
  if (!value) return;
  document.documentElement.style.setProperty('--ui-font-family', value);
}

export function applyTheme(mode: ThemeMode): void {
  document.body.classList.toggle('theme-dark', mode === 'dark');
}
