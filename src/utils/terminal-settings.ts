export const TERMINAL_START_DIRECTORY_KEY = 'terminal-start-directory';
export const TERMINAL_START_DIRECTORY_CHANGED_EVENT = 'terminal-start-directory-changed';

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
