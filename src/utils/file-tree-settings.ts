export const DEFAULT_SPEC_DIRECTORY_NAMES = ['openspec', 'ravenspec'];
export const SPEC_DIRECTORY_NAMES_KEY = 'file-tree-spec-directory-names';
export const SPEC_ONLY_KEY = 'file-tree-spec-only';
export const SPEC_DIRECTORY_NAMES_CHANGED_EVENT = 'file-tree-spec-directory-names-changed';

export function normalizeSpecDirectoryNames(value: string): string[] {
  const names = value
    .split(/[\n,]+/)
    .map((item) => item.trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);

  return [...new Set(names)];
}

export function readSpecDirectoryNames(): string[] {
  const stored = localStorage.getItem(SPEC_DIRECTORY_NAMES_KEY);
  if (!stored) return DEFAULT_SPEC_DIRECTORY_NAMES;

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      const names = parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);
      return names.length > 0 ? [...new Set(names)] : DEFAULT_SPEC_DIRECTORY_NAMES;
    }
  } catch {
    const names = normalizeSpecDirectoryNames(stored);
    if (names.length > 0) return names;
  }

  return DEFAULT_SPEC_DIRECTORY_NAMES;
}

export function saveSpecDirectoryNames(names: string[]): void {
  const normalized = [...new Set(
    names
      .map((item) => item.trim().replace(/^\/+|\/+$/g, ''))
      .filter(Boolean),
  )];
  localStorage.setItem(
    SPEC_DIRECTORY_NAMES_KEY,
    JSON.stringify(normalized.length > 0 ? normalized : DEFAULT_SPEC_DIRECTORY_NAMES),
  );
  window.dispatchEvent(new Event(SPEC_DIRECTORY_NAMES_CHANGED_EVENT));
}
