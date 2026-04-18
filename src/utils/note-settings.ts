export const NOTE_DIRECTORY_KEY = 'note-directory';
export const NOTE_DIRECTORY_CHANGED_EVENT = 'note-directory-changed';

let cachedUserDataPath: string | null = null;

export async function getDefaultNoteDirectory(): Promise<string> {
  if (cachedUserDataPath) return `${cachedUserDataPath}/notes`;
  const result = await window.fileApi.getUserDataPath();
  cachedUserDataPath = result.path;
  return `${result.path}/notes`;
}

export function readNoteDirectory(): string {
  return localStorage.getItem(NOTE_DIRECTORY_KEY)?.trim() || '';
}

export function saveNoteDirectory(value: string): void {
  localStorage.setItem(NOTE_DIRECTORY_KEY, value.trim());
  window.dispatchEvent(new Event(NOTE_DIRECTORY_CHANGED_EVENT));
}

/**
 * Resolve the effective note directory.
 * Returns the user-configured path if set, otherwise the default userData/notes path.
 */
export async function resolveNoteDirectory(): Promise<string> {
  const stored = readNoteDirectory();
  if (stored) return stored;
  return getDefaultNoteDirectory();
}
