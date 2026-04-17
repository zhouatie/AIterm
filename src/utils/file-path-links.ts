import type { Terminal, ILinkProvider, ILink, IBufferCellPosition } from '@xterm/xterm';

// --- File path detection regex ---
// Matches patterns like:
//   /absolute/path/file.ts:47:12
//   ./relative/path/file.ts:47
//   ../parent/file.ts
//   src/auth/session.ts:47:12
const FILE_PATH_REGEX =
  /((?:\/|\.\/|\.\.\/)?(?:[\w@.-]+\/)*[\w@.-]+\.\w+)(?::(\d+))?(?::(\d+))?/g;

interface FilePathMatch {
  filePath: string;
  line?: number;
  col?: number;
  startIndex: number;
  length: number;
}

function findFilePathsInLine(text: string): FilePathMatch[] {
  const matches: FilePathMatch[] = [];
  FILE_PATH_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FILE_PATH_REGEX.exec(text)) !== null) {
    const filePath = match[1];
    const line = match[2] ? parseInt(match[2], 10) : undefined;
    const col = match[3] ? parseInt(match[3], 10) : undefined;

    // Skip very short paths that are likely false positives
    if (filePath.length < 4) continue;
    // Skip paths that look like version numbers (e.g., v1.2)
    if (/^v?\d+\.\d+/.test(filePath)) continue;
    // Skip common non-path patterns
    if (/^https?:/.test(filePath)) continue;

    matches.push({
      filePath,
      line,
      col,
      startIndex: match.index,
      length: match[0].length,
    });
  }

  return matches;
}

// --- Link Provider ---

export interface FilePathLinkCallbacks {
  /** Resolve a relative path to absolute using terminal CWD */
  resolvePath: (relativePath: string) => string;
  /** Check if a file path exists */
  fileExists: (absolutePath: string) => Promise<boolean>;
  /** Handle file path click — open in preview panel */
  onActivate: (filePath: string, line?: number, col?: number) => void;
}

export function createFilePathLinkProvider(
  callbacks: FilePathLinkCallbacks,
): ILinkProvider {
  return {
    provideLinks(
      bufferLineNumber: number,
      callback: (links: ILink[] | undefined) => void,
    ): void {
      // We need to access the terminal buffer to get line text
      // The provideLinks callback is synchronous in registration but
      // we can call callback asynchronously
      callback(undefined);
    },
  };
}

/**
 * Register a file path link provider on the terminal.
 * Returns a dispose function.
 */
export function registerFilePathLinks(
  terminal: Terminal,
  callbacks: FilePathLinkCallbacks,
): () => void {
  const provider: ILinkProvider = {
    provideLinks(
      bufferLineNumber: number,
      callback: (links: ILink[] | undefined) => void,
    ): void {
      const buffer = terminal.buffer.active;
      const line = buffer.getLine(bufferLineNumber - 1); // 0-indexed
      if (!line) {
        callback(undefined);
        return;
      }

      const text = line.translateToString(true);
      const pathMatches = findFilePathsInLine(text);

      if (pathMatches.length === 0) {
        callback(undefined);
        return;
      }

      // Validate paths asynchronously, then provide links
      Promise.all(
        pathMatches.map(async (match) => {
          let absolutePath = match.filePath;

          // Resolve relative paths
          if (!match.filePath.startsWith('/')) {
            absolutePath = callbacks.resolvePath(match.filePath);
          }

          const exists = await callbacks.fileExists(absolutePath);
          if (!exists) return null;

          const link: ILink = {
            range: {
              start: {
                x: match.startIndex + 1, // 1-indexed
                y: bufferLineNumber,
              },
              end: {
                x: match.startIndex + match.length + 1,
                y: bufferLineNumber,
              },
            },
            text: match.filePath,
            decorations: {
              underline: true,
              pointerCursor: true,
            },
            activate: () => {
              callbacks.onActivate(absolutePath, match.line, match.col);
            },
            hover: (_event: MouseEvent, _text: string) => {
              // Tooltip is handled by xterm's built-in link hover
            },
          };

          return link;
        }),
      ).then((results) => {
        const links = results.filter((r): r is ILink => r !== null);
        callback(links.length > 0 ? links : undefined);
      });
    },
  };

  return terminal.registerLinkProvider(provider).dispose;
}
