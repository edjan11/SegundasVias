// EXPERIMENTAL (isolated toggle + mount)
// Safe to remove: only injects a toggle button in the toolbar and mounts the shell on demand.

import { isChatSearchEnabled } from './chat-search-shell';

type ToggleOptions = {
  enabledKey?: string;
  defaultEnabled?: boolean;
  toolbarSelector?: string;
};

const TOGGLE_ID = 'chat-search-toggle';

export function setupChatSearchToggle(options: ToggleOptions = {}): void {
  if (!isChatSearchEnabled({ enabledKey: options.enabledKey, defaultEnabled: options.defaultEnabled })) {
    return;
  }

  // Toolbar toggle removed by request (taskbar now controls panels).
  // Clean up any previous toggle if it exists.
  const existing = document.getElementById(TOGGLE_ID);
  if (existing && existing.parentElement) existing.parentElement.removeChild(existing);
}
