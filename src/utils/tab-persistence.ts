const CURRENT_VERSION = 2;

export interface PersistedWorkspace {
  id: string;
  name: string;
  currentPath: string | null;
  isExpanded: boolean;
  sessions: Array<{
    id: string;
    cwd: string;
    transcriptId: string;
  }>;
}

export interface PersistedTabState {
  version: number;
  workspaces: PersistedWorkspace[];
  activeSessionId: string;
  sessionNameOverrides: Record<string, string>;
  sidebarCollapsed: boolean;
}

/**
 * Fire-and-forget save via IPC → main process writes to disk.
 * Used during normal operation (non-blocking).
 */
export function saveTabState(state: PersistedTabState): void {
  try {
    window.tabStateApi.save(JSON.stringify(state));
  } catch (error) {
    console.warn('[tab-persistence] Failed to save tab state:', error);
  }
}

/**
 * Synchronous save via IPC sendSync → blocks until main process writes to disk.
 * Used in beforeunload to guarantee the write completes before the window closes.
 */
export function saveTabStateSync(state: PersistedTabState): void {
  try {
    window.tabStateApi.saveSync(JSON.stringify(state));
  } catch (error) {
    console.warn('[tab-persistence] Failed to save tab state (sync):', error);
  }
}

/**
 * Load persisted tab state from disk via IPC.
 * Returns null if no data exists or data is invalid.
 */
export async function loadTabState(): Promise<PersistedTabState | null> {
  try {
    const raw = await window.tabStateApi.load();
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.version !== CURRENT_VERSION ||
      !Array.isArray(parsed.workspaces) ||
      parsed.workspaces.length === 0 ||
      typeof parsed.activeSessionId !== 'string' ||
      typeof parsed.sessionNameOverrides !== 'object' ||
      typeof parsed.sidebarCollapsed !== 'boolean'
    ) {
      return null;
    }

    for (const workspace of parsed.workspaces) {
      if (
        typeof workspace.id !== 'string' ||
        typeof workspace.name !== 'string' ||
        typeof workspace.isExpanded !== 'boolean' ||
        !Array.isArray(workspace.sessions) ||
        workspace.sessions.length === 0
      ) {
        return null;
      }
      for (const session of workspace.sessions) {
        if (
          typeof session.id !== 'string' ||
          typeof session.cwd !== 'string' ||
          typeof session.transcriptId !== 'string'
        ) {
          return null;
        }
      }
    }

    return parsed as PersistedTabState;
  } catch {
    return null;
  }
}
