const DEBOUNCE_MS = 2000;
const FALLBACK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export type AutoSaveStatus = 'saved' | 'editing' | 'saving';

interface AutoSaveEntry {
  filePath: string;
  lastSavedContent: string;
  pendingContent: string | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  status: AutoSaveStatus;
}

const entries = new Map<string, AutoSaveEntry>();
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let writing = false;
const writeQueue: Array<{ filePath: string; content: string }> = [];
const listeners = new Set<(filePath: string, status: AutoSaveStatus) => void>();

function emitStatus(filePath: string, status: AutoSaveStatus): void {
  for (const listener of listeners) {
    listener(filePath, status);
  }
}

function setStatus(entry: AutoSaveEntry, status: AutoSaveStatus): void {
  if (entry.status === status) return;
  entry.status = status;
  emitStatus(entry.filePath, status);
}

function getEntry(filePath: string): AutoSaveEntry {
  let entry = entries.get(filePath);
  if (!entry) {
    entry = {
      filePath,
      lastSavedContent: '',
      pendingContent: null,
      debounceTimer: null,
      status: 'saved',
    };
    entries.set(filePath, entry);
  }
  return entry;
}

async function processWriteQueue(): Promise<void> {
  if (writing) return;
  writing = true;
  while (writeQueue.length > 0) {
    const job = writeQueue.shift()!;
    try {
      const entry = entries.get(job.filePath);
      if (entry) {
        setStatus(entry, 'saving');
      }
      const result = await window.fileApi.writeFile(job.filePath, job.content);
      if (result.error) {
        throw new Error(result.error);
      }
      const savedEntry = entries.get(job.filePath);
      if (savedEntry) {
        savedEntry.lastSavedContent = job.content;
        if (savedEntry.pendingContent === job.content) {
          savedEntry.pendingContent = null;
        }
        setStatus(savedEntry, savedEntry.pendingContent === null ? 'saved' : 'editing');
      }
    } catch (err) {
      console.error('[note-autosave] write failed:', job.filePath, err);
      const entry = entries.get(job.filePath);
      if (entry) {
        setStatus(entry, 'editing');
      }
    }
  }
  writing = false;
}

function enqueueWrite(filePath: string, content: string): void {
  // Remove any pending write for the same file to avoid duplicates
  const idx = writeQueue.findIndex((j) => j.filePath === filePath);
  if (idx >= 0) writeQueue.splice(idx, 1);
  writeQueue.push({ filePath, content });
  void processWriteQueue();
}

function doSave(filePath: string): void {
  const entry = entries.get(filePath);
  if (!entry || entry.pendingContent === null) return;
  if (entry.pendingContent === entry.lastSavedContent) {
    entry.pendingContent = null;
    setStatus(entry, 'saved');
    return;
  }
  enqueueWrite(filePath, entry.pendingContent);
}

/**
 * Register a file for auto-save and set its initial saved content.
 */
export function registerFile(filePath: string, content: string): void {
  const entry = getEntry(filePath);
  entry.lastSavedContent = content;
  entry.pendingContent = null;
  setStatus(entry, 'saved');
}

/**
 * Called on every content change from the editor.
 * Resets the debounce timer.
 */
export function onContentChange(filePath: string, content: string): void {
  const entry = getEntry(filePath);
  entry.pendingContent = content;
  setStatus(entry, content === entry.lastSavedContent ? 'saved' : 'editing');

  if (entry.debounceTimer) {
    clearTimeout(entry.debounceTimer);
  }
  entry.debounceTimer = setTimeout(() => {
    entry.debounceTimer = null;
    doSave(filePath);
  }, DEBOUNCE_MS);
}

/**
 * Immediately flush pending changes for a specific file (e.g., on tab switch).
 */
export function flush(filePath: string): void {
  const entry = entries.get(filePath);
  if (!entry) return;
  if (entry.debounceTimer) {
    clearTimeout(entry.debounceTimer);
    entry.debounceTimer = null;
  }
  doSave(filePath);
}

/**
 * Immediately flush ALL pending changes (e.g., on panel close, window blur).
 */
export function flushAll(): void {
  for (const [filePath, entry] of entries) {
    if (entry.debounceTimer) {
      clearTimeout(entry.debounceTimer);
      entry.debounceTimer = null;
    }
    if (entry.pendingContent !== null && entry.pendingContent !== entry.lastSavedContent) {
      enqueueWrite(filePath, entry.pendingContent);
    }
  }
}

/**
 * Synchronously flush all pending changes using synchronous write.
 * Used in beforeunload handler where async is unreliable.
 */
export function flushAllSync(): void {
  for (const [, entry] of entries) {
    if (entry.debounceTimer) {
      clearTimeout(entry.debounceTimer);
      entry.debounceTimer = null;
    }
    if (entry.pendingContent !== null && entry.pendingContent !== entry.lastSavedContent) {
      // Best-effort: fire-and-forget async write (beforeunload can't truly await)
      void window.fileApi.writeFile(entry.filePath, entry.pendingContent);
      entry.lastSavedContent = entry.pendingContent;
      entry.pendingContent = null;
      setStatus(entry, 'saved');
    }
  }
}

/**
 * Unregister a file from auto-save (e.g., when closing a tab).
 * Flushes any pending content first.
 */
export function unregisterFile(filePath: string): void {
  flush(filePath);
  const entry = entries.get(filePath);
  if (entry?.debounceTimer) {
    clearTimeout(entry.debounceTimer);
  }
  entries.delete(filePath);
}

/**
 * Check if a file has unsaved changes.
 */
export function isDirty(filePath: string): boolean {
  const entry = entries.get(filePath);
  if (!entry || entry.pendingContent === null) return false;
  return entry.pendingContent !== entry.lastSavedContent;
}

export function getStatus(filePath: string | null): AutoSaveStatus {
  if (!filePath) return 'saved';
  return entries.get(filePath)?.status ?? 'saved';
}

export function subscribeStatus(
  listener: (filePath: string, status: AutoSaveStatus) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Start the fallback interval timer and register global event handlers.
 */
export function startGlobalHandlers(): void {
  if (fallbackTimer) return;

  fallbackTimer = setInterval(() => {
    flushAll();
  }, FALLBACK_INTERVAL_MS);

  window.addEventListener('blur', flushAll);
  window.addEventListener('beforeunload', flushAllSync);
}

/**
 * Stop the fallback interval timer and remove global event handlers.
 */
export function stopGlobalHandlers(): void {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  window.removeEventListener('blur', flushAll);
  window.removeEventListener('beforeunload', flushAllSync);
}
