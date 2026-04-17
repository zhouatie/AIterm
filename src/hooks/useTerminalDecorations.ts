import { useEffect, useRef } from 'react';
import type { Terminal, IDisposable } from '@xterm/xterm';

// --- Decoration types ---

interface ManagedDecoration {
  marker: IDisposable;
  decoration: IDisposable | null;
}

// --- Theme-aware decoration colors ---

function getDecorationColors(theme: 'light' | 'dark') {
  return {
    commandBorder: theme === 'dark' ? '#555555' : '#cccccc',
    aiBackground: theme === 'dark' ? 'rgba(0, 122, 204, 0.08)' : 'rgba(0, 122, 204, 0.06)',
    aiBorder: theme === 'dark' ? '#007acc' : '#007acc',
    errorDot: theme === 'dark' ? '#f14c4c' : '#cd3131',
  };
}

// --- Error pattern matching ---

const ERROR_PATTERNS = [
  /\bError[:\s]/i,
  /\bERROR\b/,
  /\bFATAL\b/i,
  /\bfailed\b/i,
  /\bFAILED\b/,
  /\bPanic\b/i,
  /\bException\b/,
];

function isErrorLine(text: string): boolean {
  return ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

// --- Hook ---

/**
 * useTerminalDecorations — registers decorations on the terminal for:
 * 1. Command boundaries (OSC 133 shell integration markers)
 * 2. Error line indicators (red dot on lines matching error patterns)
 *
 * AI region decorations are managed externally via attention events.
 */
export function useTerminalDecorations(
  terminal: Terminal | null,
  theme: 'light' | 'dark',
): {
  markAIRegion: (startLine: number, endLine: number) => void;
  clearAIRegions: () => void;
} {
  const decorationsRef = useRef<ManagedDecoration[]>([]);
  const aiDecorationsRef = useRef<ManagedDecoration[]>([]);
  const disposeListRef = useRef<IDisposable[]>([]);

  // Cleanup all decorations
  const cleanupAll = () => {
    for (const d of decorationsRef.current) {
      d.decoration?.dispose();
      d.marker.dispose();
    }
    decorationsRef.current = [];

    for (const d of aiDecorationsRef.current) {
      d.decoration?.dispose();
      d.marker.dispose();
    }
    aiDecorationsRef.current = [];

    for (const d of disposeListRef.current) {
      d.dispose();
    }
    disposeListRef.current = [];
  };

  // Register command boundary decoration via OSC 133 (shell integration)
  useEffect(() => {
    if (!terminal) return;

    const colors = getDecorationColors(theme);

    // OSC 133 ; A — marks the start of a command prompt
    // This is the standard FinalTerm / shell integration sequence
    const osc133Handler = terminal.parser.registerOscHandler(133, (data) => {
      if (data === 'A' || data.startsWith('A;')) {
        const cursorY = terminal.buffer.active.cursorY;
        const baseY = terminal.buffer.active.baseY;
        const absoluteRow = baseY + cursorY;

        const marker = terminal.registerMarker(absoluteRow - baseY - cursorY);
        if (marker) {
          const decoration = terminal.registerDecoration({
            marker,
            anchor: 'left',
            width: 1,
            overviewRulerOptions: undefined,
          });

          if (decoration) {
            decoration.onRender((element) => {
              element.style.width = '3px';
              element.style.height = '100%';
              element.style.backgroundColor = colors.commandBorder;
              element.style.opacity = '0.5';
              element.style.borderRadius = '1px';
              element.style.marginLeft = '2px';
            });

            decorationsRef.current.push({ marker, decoration });
          } else {
            marker.dispose();
          }
        }
      }
      return false; // Don't consume — let xterm process normally
    });

    disposeListRef.current.push(osc133Handler);

    // Error line detection: scan output for error patterns
    const onWriteParsed = terminal.onWriteParsed(() => {
      const buffer = terminal.buffer.active;
      const cursorY = buffer.cursorY;
      const baseY = buffer.baseY;

      // Check the last few lines for errors (newly written lines)
      for (let offset = 0; offset <= Math.min(cursorY, 3); offset++) {
        const lineIndex = baseY + cursorY - offset;
        const line = buffer.getLine(lineIndex);
        if (!line) continue;

        const text = line.translateToString(true);
        if (isErrorLine(text)) {
          const relativeY = cursorY - offset - cursorY; // relative to cursor
          const marker = terminal.registerMarker(relativeY);
          if (marker) {
            const decoration = terminal.registerDecoration({
              marker,
              anchor: 'left',
              width: 1,
              overviewRulerOptions: {
                color: colors.errorDot,
              },
            });

            if (decoration) {
              decoration.onRender((element) => {
                element.style.width = '6px';
                element.style.height = '6px';
                element.style.borderRadius = '50%';
                element.style.backgroundColor = colors.errorDot;
                element.style.marginLeft = '2px';
                element.style.marginTop = '4px';
              });

              decorationsRef.current.push({ marker, decoration });
            } else {
              marker.dispose();
            }
          }
        }
      }
    });

    disposeListRef.current.push(onWriteParsed);

    return () => {
      cleanupAll();
    };
  }, [terminal, theme]);

  // Mark an AI output region with background highlight
  const markAIRegion = (startLine: number, endLine: number) => {
    if (!terminal) return;

    const colors = getDecorationColors(theme);
    const buffer = terminal.buffer.active;
    const baseY = buffer.baseY;
    const cursorY = buffer.cursorY;

    for (let line = startLine; line <= endLine; line++) {
      const relativeY = line - baseY - cursorY;
      const marker = terminal.registerMarker(relativeY);
      if (marker) {
        const decoration = terminal.registerDecoration({
          marker,
          anchor: 'left',
          x: 0,
          width: terminal.cols,
        });

        if (decoration) {
          decoration.onRender((element) => {
            element.style.width = '100%';
            element.style.height = '100%';
            element.style.backgroundColor = colors.aiBackground;
            element.style.borderLeft = `2px solid ${colors.aiBorder}`;
            element.style.pointerEvents = 'none';
          });

          aiDecorationsRef.current.push({ marker, decoration });
        } else {
          marker.dispose();
        }
      }
    }
  };

  // Clear all AI region decorations
  const clearAIRegions = () => {
    for (const d of aiDecorationsRef.current) {
      d.decoration?.dispose();
      d.marker.dispose();
    }
    aiDecorationsRef.current = [];
  };

  return { markAIRegion, clearAIRegions };
}
