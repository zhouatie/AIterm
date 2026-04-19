export const NOTE_DIRECTORY_KEY = 'note-directory';
export const NOTE_VAULT_SETTINGS_KEY = 'note-vault-settings';
export const NOTE_DIRECTORY_CHANGED_EVENT = 'note-directory-changed';

export interface NoteVault {
  id: string;
  name: string;
  rootPath: string;
}

export interface NoteVaultSettings {
  vaults: NoteVault[];
  activeVaultId: string | null;
}

let cachedUserDataPath: string | null = null;

function normalizeRootPath(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/\/+$/, '') || trimmed;
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function getBaseName(filePath: string): string {
  const normalized = normalizeRootPath(filePath);
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function getVaultName(rootPath: string): string {
  return getBaseName(rootPath) || 'notes';
}

function createEmptySettings(): NoteVaultSettings {
  return {
    vaults: [],
    activeVaultId: null,
  };
}

export function createNoteVault(rootPath: string, name?: string): NoteVault {
  const normalizedRootPath = normalizeRootPath(rootPath);
  return {
    id: `vault-${hashString(normalizedRootPath)}`,
    name: name?.trim() || getVaultName(normalizedRootPath),
    rootPath: normalizedRootPath,
  };
}

function sanitizeNoteVaultSettings(value: unknown): NoteVaultSettings {
  if (!value || typeof value !== 'object') return createEmptySettings();

  const parsed = value as Partial<NoteVaultSettings>;
  const vaults = Array.isArray(parsed.vaults) ? parsed.vaults : [];
  const dedupedVaults: NoteVault[] = [];
  const seenRoots = new Set<string>();

  for (const vault of vaults) {
    if (!vault || typeof vault !== 'object') continue;
    const rootPath = typeof vault.rootPath === 'string' ? normalizeRootPath(vault.rootPath) : '';
    if (!rootPath || seenRoots.has(rootPath)) continue;

    const id = typeof vault.id === 'string' && vault.id.trim()
      ? vault.id.trim()
      : createNoteVault(rootPath).id;
    const name = typeof vault.name === 'string' && vault.name.trim()
      ? vault.name.trim()
      : getVaultName(rootPath);

    dedupedVaults.push({ id, name, rootPath });
    seenRoots.add(rootPath);
  }

  const activeVaultId = typeof parsed.activeVaultId === 'string' && parsed.activeVaultId.trim()
    ? parsed.activeVaultId.trim()
    : null;
  const resolvedActiveVaultId = dedupedVaults.some((vault) => vault.id === activeVaultId)
    ? activeVaultId
    : dedupedVaults[0]?.id ?? null;

  return {
    vaults: dedupedVaults,
    activeVaultId: resolvedActiveVaultId,
  };
}

function persistNoteVaultSettings(settings: NoteVaultSettings): void {
  localStorage.setItem(NOTE_VAULT_SETTINGS_KEY, JSON.stringify(settings));
  localStorage.removeItem(NOTE_DIRECTORY_KEY);
}

export async function getDefaultNoteDirectory(): Promise<string> {
  if (cachedUserDataPath) return `${cachedUserDataPath}/notes`;
  const result = await window.fileApi.getUserDataPath();
  cachedUserDataPath = result.path;
  return `${result.path}/notes`;
}

export function readNoteVaultSettings(): NoteVaultSettings {
  const raw = localStorage.getItem(NOTE_VAULT_SETTINGS_KEY);
  if (raw) {
    try {
      return sanitizeNoteVaultSettings(JSON.parse(raw));
    } catch {
      return createEmptySettings();
    }
  }

  const legacyDirectory = localStorage.getItem(NOTE_DIRECTORY_KEY)?.trim();
  if (legacyDirectory) {
    const legacyVault = createNoteVault(legacyDirectory);
    return {
      vaults: [legacyVault],
      activeVaultId: legacyVault.id,
    };
  }

  return createEmptySettings();
}

export function saveNoteVaultSettings(value: NoteVaultSettings): void {
  const sanitized = sanitizeNoteVaultSettings(value);
  persistNoteVaultSettings(sanitized);
  window.dispatchEvent(new Event(NOTE_DIRECTORY_CHANGED_EVENT));
}

export async function resolveNoteVaultSettings(): Promise<NoteVaultSettings> {
  const stored = readNoteVaultSettings();
  if (stored.vaults.length > 0) {
    const sanitized = sanitizeNoteVaultSettings(stored);
    if (JSON.stringify(sanitized) !== JSON.stringify(stored)) {
      persistNoteVaultSettings(sanitized);
    }
    return sanitized;
  }

  const defaultRootPath = await getDefaultNoteDirectory();
  const defaultVault = createNoteVault(defaultRootPath, 'notes');
  const nextSettings: NoteVaultSettings = {
    vaults: [defaultVault],
    activeVaultId: defaultVault.id,
  };
  persistNoteVaultSettings(nextSettings);
  return nextSettings;
}

export function getActiveNoteVault(settings: NoteVaultSettings): NoteVault | null {
  if (settings.vaults.length === 0) return null;
  return settings.vaults.find((vault) => vault.id === settings.activeVaultId) ?? settings.vaults[0] ?? null;
}

export async function resolveActiveNoteVault(): Promise<NoteVault | null> {
  const settings = await resolveNoteVaultSettings();
  return getActiveNoteVault(settings);
}
