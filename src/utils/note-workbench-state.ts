export const NOTE_WORKBENCH_STATE_KEY = 'note-workbench-state';
export const RECENT_NOTES_LIMIT = 10;

export type NoteWorkbenchView = 'recent' | 'favorites' | 'all';

export interface NoteRecentEntry {
  path: string;
  accessedAt: number;
}

export interface NoteWorkbenchState {
  activeView: NoteWorkbenchView;
  selectedFolderPath: string | null;
  currentNotePath: string | null;
  favorites: string[];
  recent: NoteRecentEntry[];
}

function createDefaultState(): NoteWorkbenchState {
  return {
    activeView: 'all',
    selectedFolderPath: null,
    currentNotePath: null,
    favorites: [],
    recent: [],
  };
}

function sanitizeRecentEntries(value: unknown): NoteRecentEntry[] {
  if (!Array.isArray(value)) return [];

  const deduped = new Map<string, number>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const path = typeof item.path === 'string' ? item.path.trim() : '';
    const accessedAt = typeof item.accessedAt === 'number' ? item.accessedAt : Number.NaN;
    if (!path || !Number.isFinite(accessedAt)) continue;

    const prev = deduped.get(path);
    deduped.set(path, prev === undefined ? accessedAt : Math.max(prev, accessedAt));
  }

  return Array.from(deduped.entries())
    .map(([path, accessedAt]) => ({ path, accessedAt }))
    .sort((a, b) => b.accessedAt - a.accessedAt)
    .slice(0, RECENT_NOTES_LIMIT);
}

function sanitizeFavorites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const paths = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(paths));
}

export function readNoteWorkbenchState(): NoteWorkbenchState {
  const raw = localStorage.getItem(NOTE_WORKBENCH_STATE_KEY);
  if (!raw) return createDefaultState();

  try {
    const parsed = JSON.parse(raw) as Partial<NoteWorkbenchState>;
    const activeView: NoteWorkbenchView =
      parsed.activeView === 'recent' || parsed.activeView === 'favorites' || parsed.activeView === 'all'
        ? parsed.activeView
        : 'all';

    return {
      activeView,
      selectedFolderPath:
        typeof parsed.selectedFolderPath === 'string' && parsed.selectedFolderPath.trim()
          ? parsed.selectedFolderPath
          : null,
      currentNotePath:
        typeof parsed.currentNotePath === 'string' && parsed.currentNotePath.trim()
          ? parsed.currentNotePath
          : null,
      favorites: sanitizeFavorites(parsed.favorites),
      recent: sanitizeRecentEntries(parsed.recent),
    };
  } catch {
    return createDefaultState();
  }
}

export function saveNoteWorkbenchState(state: NoteWorkbenchState): void {
  localStorage.setItem(NOTE_WORKBENCH_STATE_KEY, JSON.stringify(state));
}

export function touchRecentNote(state: NoteWorkbenchState, filePath: string): NoteWorkbenchState {
  const recent = sanitizeRecentEntries([
    { path: filePath, accessedAt: Date.now() },
    ...state.recent,
  ]);

  return {
    ...state,
    currentNotePath: filePath,
    recent,
  };
}

export function toggleFavoritePath(state: NoteWorkbenchState, filePath: string): NoteWorkbenchState {
  const favorites = state.favorites.includes(filePath)
    ? state.favorites.filter((path) => path !== filePath)
    : [...state.favorites, filePath];

  return {
    ...state,
    favorites,
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
  oldPath: string,
  newPath: string,
  isDirectory: boolean,
): NoteWorkbenchState {
  const favorites = Array.from(
    new Set(
      state.favorites
        .map((path) => replacePath(path, oldPath, newPath, isDirectory))
        .filter((path): path is string => Boolean(path)),
    ),
  );

  const recent = sanitizeRecentEntries(
    state.recent.map((entry) => ({
      ...entry,
      path: replacePath(entry.path, oldPath, newPath, isDirectory) ?? entry.path,
    })),
  );

  return {
    ...state,
    selectedFolderPath: replacePath(state.selectedFolderPath, oldPath, newPath, isDirectory),
    currentNotePath: replacePath(state.currentNotePath, oldPath, newPath, isDirectory),
    favorites,
    recent,
  };
}

export function removeWorkbenchPath(
  state: NoteWorkbenchState,
  targetPath: string,
  isDirectory: boolean,
): NoteWorkbenchState {
  const shouldRemove = (path: string): boolean =>
    path === targetPath || (isDirectory && path.startsWith(targetPath + '/'));

  return {
    ...state,
    selectedFolderPath:
      state.selectedFolderPath && shouldRemove(state.selectedFolderPath)
        ? null
        : state.selectedFolderPath,
    currentNotePath:
      state.currentNotePath && shouldRemove(state.currentNotePath)
        ? null
        : state.currentNotePath,
    favorites: state.favorites.filter((path) => !shouldRemove(path)),
    recent: state.recent.filter((entry) => !shouldRemove(entry.path)),
  };
}

export function cleanupWorkbenchState(
  state: NoteWorkbenchState,
  existingNotePaths: Set<string>,
  existingFolderPaths: Set<string>,
): NoteWorkbenchState {
  const nextActiveView =
    state.activeView === 'recent' || state.activeView === 'favorites' || state.activeView === 'all'
      ? state.activeView
      : 'all';

  return {
    activeView: nextActiveView,
    selectedFolderPath:
      state.selectedFolderPath && existingFolderPaths.has(state.selectedFolderPath)
        ? state.selectedFolderPath
        : null,
    currentNotePath:
      state.currentNotePath && existingNotePaths.has(state.currentNotePath)
        ? state.currentNotePath
        : null,
    favorites: state.favorites.filter((path) => existingNotePaths.has(path)),
    recent: state.recent.filter((entry) => existingNotePaths.has(entry.path)).slice(0, RECENT_NOTES_LIMIT),
  };
}
