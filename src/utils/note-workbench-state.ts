export const NOTE_WORKBENCH_STATE_KEY = 'note-workbench-state';

export interface NoteVaultWorkbenchState {
  selectedFolderPath: string | null;
  currentNotePath: string | null;
}

export interface NoteWorkbenchState {
  vaultStates: Record<string, NoteVaultWorkbenchState>;
}

function createDefaultVaultState(): NoteVaultWorkbenchState {
  return {
    selectedFolderPath: null,
    currentNotePath: null,
  };
}

function createDefaultState(): NoteWorkbenchState {
  return {
    vaultStates: {},
  };
}

function sanitizeVaultState(value: unknown): NoteVaultWorkbenchState {
  if (!value || typeof value !== 'object') return createDefaultVaultState();
  const parsed = value as Partial<NoteVaultWorkbenchState>;

  return {
    selectedFolderPath:
      typeof parsed.selectedFolderPath === 'string' && parsed.selectedFolderPath.trim()
        ? parsed.selectedFolderPath
        : null,
    currentNotePath:
      typeof parsed.currentNotePath === 'string' && parsed.currentNotePath.trim()
        ? parsed.currentNotePath
        : null,
  };
}

export function readNoteWorkbenchState(): NoteWorkbenchState {
  const raw = localStorage.getItem(NOTE_WORKBENCH_STATE_KEY);
  if (!raw) return createDefaultState();

  try {
    const parsed = JSON.parse(raw) as Partial<NoteWorkbenchState>;
    const vaultStatesSource = parsed.vaultStates && typeof parsed.vaultStates === 'object'
      ? parsed.vaultStates
      : {};

    const vaultStates = Object.entries(vaultStatesSource).reduce<Record<string, NoteVaultWorkbenchState>>(
      (result, [vaultId, state]) => {
        if (!vaultId.trim()) return result;
        result[vaultId] = sanitizeVaultState(state);
        return result;
      },
      {},
    );

    return { vaultStates };
  } catch {
    return createDefaultState();
  }
}

export function saveNoteWorkbenchState(state: NoteWorkbenchState): void {
  localStorage.setItem(NOTE_WORKBENCH_STATE_KEY, JSON.stringify(state));
}

export function getVaultWorkbenchState(state: NoteWorkbenchState, vaultId: string): NoteVaultWorkbenchState {
  return state.vaultStates[vaultId] ?? createDefaultVaultState();
}

export function updateVaultWorkbenchState(
  state: NoteWorkbenchState,
  vaultId: string,
  updater: (prev: NoteVaultWorkbenchState) => NoteVaultWorkbenchState,
): NoteWorkbenchState {
  const previousVaultState = getVaultWorkbenchState(state, vaultId);
  const nextVaultState = updater(previousVaultState);

  return {
    ...state,
    vaultStates: {
      ...state.vaultStates,
      [vaultId]: nextVaultState,
    },
  };
}

function replacePath(path: string | null, oldPath: string, newPath: string, isDirectory: boolean): string | null {
  if (!path) return null;
  if (path === oldPath) return newPath;
  if (!isDirectory) return path;
  if (!path.startsWith(oldPath + '/')) return path;
  return newPath + path.slice(oldPath.length);
}

export function renameWorkbenchPath(
  state: NoteWorkbenchState,
  vaultId: string,
  oldPath: string,
  newPath: string,
  isDirectory: boolean,
): NoteWorkbenchState {
  return updateVaultWorkbenchState(state, vaultId, (prev) => ({
    selectedFolderPath: replacePath(prev.selectedFolderPath, oldPath, newPath, isDirectory),
    currentNotePath: replacePath(prev.currentNotePath, oldPath, newPath, isDirectory),
  }));
}

export function removeWorkbenchPath(
  state: NoteWorkbenchState,
  vaultId: string,
  targetPath: string,
  isDirectory: boolean,
): NoteWorkbenchState {
  const shouldRemove = (path: string): boolean =>
    path === targetPath || (isDirectory && path.startsWith(targetPath + '/'));

  return updateVaultWorkbenchState(state, vaultId, (prev) => ({
    selectedFolderPath:
      prev.selectedFolderPath && shouldRemove(prev.selectedFolderPath)
        ? null
        : prev.selectedFolderPath,
    currentNotePath:
      prev.currentNotePath && shouldRemove(prev.currentNotePath)
        ? null
        : prev.currentNotePath,
  }));
}

export function cleanupWorkbenchState(
  state: NoteWorkbenchState,
  vaultId: string,
  existingNotePaths: Set<string>,
  existingFolderPaths: Set<string>,
): NoteWorkbenchState {
  return updateVaultWorkbenchState(state, vaultId, (prev) => ({
    selectedFolderPath:
      prev.selectedFolderPath && existingFolderPaths.has(prev.selectedFolderPath)
        ? prev.selectedFolderPath
        : null,
    currentNotePath:
      prev.currentNotePath && existingNotePaths.has(prev.currentNotePath)
        ? prev.currentNotePath
        : null,
  }));
}
