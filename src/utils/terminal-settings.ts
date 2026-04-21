export const TERMINAL_START_DIRECTORY_KEY = 'terminal-start-directory';
export const TERMINAL_START_DIRECTORY_CHANGED_EVENT = 'terminal-start-directory-changed';
export const TERMINAL_RENDERER_PREFER_WEBGL_KEY = 'terminal-renderer-prefer-webgl';
export const TERMINAL_RENDERER_CHANGED_EVENT = 'terminal-renderer-changed';

export function normalizeTerminalStartDirectory(value: string): string {
  return value.trim();
}

export function readTerminalStartDirectory(): string {
  const stored = localStorage.getItem(TERMINAL_START_DIRECTORY_KEY);
  if (!stored) return '';
  return normalizeTerminalStartDirectory(stored);
}

export function saveTerminalStartDirectory(value: string): void {
  localStorage.setItem(
    TERMINAL_START_DIRECTORY_KEY,
    normalizeTerminalStartDirectory(value),
  );
  window.dispatchEvent(new Event(TERMINAL_START_DIRECTORY_CHANGED_EVENT));
}

export function readTerminalRendererPreferWebgl(): boolean {
  const stored = localStorage.getItem(TERMINAL_RENDERER_PREFER_WEBGL_KEY);
  if (stored === null) return false;
  return stored !== 'false';
}

export function saveTerminalRendererPreferWebgl(value: boolean): void {
  localStorage.setItem(TERMINAL_RENDERER_PREFER_WEBGL_KEY, String(value));
  window.dispatchEvent(new Event(TERMINAL_RENDERER_CHANGED_EVENT));
}
