import React, { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { CanvasAddon } from '@xterm/addon-canvas';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { ImageAddon } from '@xterm/addon-image';
import { useTheme } from '../ThemeContext';
import type { ITheme } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import './TerminalInstance.css';

// --- xterm.js color schemes ---

const LIGHT_THEME: ITheme = {
  background: '#ffffff',
  foreground: '#1e1e1e',
  cursor: '#000000',
  selectionBackground: '#add6ff',
  black: '#000000',
  red: '#cd3131',
  green: '#00bc00',
  yellow: '#949800',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#555555',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#b5ba00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc',
  brightWhite: '#a5a5a5',
};

const DARK_THEME: ITheme = {
  background: '#1e1e1e',
  foreground: '#cccccc',
  cursor: '#ffffff',
  selectionBackground: '#094771',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
};

function getXtermTheme(theme: 'light' | 'dark'): ITheme {
  return theme === 'dark' ? DARK_THEME : LIGHT_THEME;
}

function openTerminalLinkInDefaultBrowser(_event: MouseEvent, uri: string): void {
  void window.externalLinkApi.open(uri).then((result) => {
    if (!result.ok) {
      console.warn('[TerminalInstance] Failed to open external link:', result.error);
    }
  }).catch((error) => {
    console.warn('[TerminalInstance] Failed to open external link:', error);
  });
}

// --- Renderer type tracking ---

type RendererType = 'webgl' | 'canvas' | 'dom';

export interface TerminalScrollState {
  isNormalBuffer: boolean;
  hasScrollback: boolean;
  isAtTop: boolean;
  isAtBottom: boolean;
}

/**
 * Custom fit that measures the **actual** scrollbar width instead of using
 * FitAddon's hardcoded `DEFAULT_SCROLL_BAR_WIDTH` (~14 px).
 *
 * On macOS the scrollbar is an overlay that occupies 0 px of layout space,
 * but FitAddon always subtracts ~14 px when `scrollback > 0`, which causes
 * the terminal canvas to be narrower than its container.
 */
function fitTerminal(terminal: Terminal): void {
  if (!terminal.element || !terminal.element.parentElement) return;

  // Access private render-service dimensions (same approach as FitAddon)
  const core = (terminal as any)._core;
  const dims = core._renderService.dimensions;

  if (dims.css.cell.width === 0 || dims.css.cell.height === 0) return;

  // Measure *real* scrollbar width from the viewport element
  const viewport = terminal.element.querySelector('.xterm-viewport') as HTMLElement | null;
  const scrollbarWidth = viewport ? viewport.offsetWidth - viewport.clientWidth : 0;

  const parentStyle = window.getComputedStyle(terminal.element.parentElement);
  const parentWidth = Math.max(0, parseInt(parentStyle.getPropertyValue('width')));
  const parentHeight = parseInt(parentStyle.getPropertyValue('height'));

  const elemStyle = window.getComputedStyle(terminal.element);
  const paddingHor =
    parseInt(elemStyle.getPropertyValue('padding-right')) +
    parseInt(elemStyle.getPropertyValue('padding-left'));
  const paddingVer =
    parseInt(elemStyle.getPropertyValue('padding-top')) +
    parseInt(elemStyle.getPropertyValue('padding-bottom'));

  const availableWidth = parentWidth - paddingHor - scrollbarWidth;
  const availableHeight = parentHeight - paddingVer;

  const cols = Math.max(2, Math.floor(availableWidth / dims.css.cell.width));
  const rows = Math.max(1, Math.floor(availableHeight / dims.css.cell.height));

  if (isNaN(cols) || isNaN(rows)) return;

  if (terminal.rows !== rows || terminal.cols !== cols) {
    core._renderService.clear();
    terminal.resize(cols, rows);
  }
}

// --- Buffer API helpers ---

/**
 * Read the last `count` lines from the terminal's active buffer as plain text.
 */
function getBufferLinesFromTerminal(terminal: Terminal, count: number): string[] {
  const buffer = terminal.buffer.active;
  const totalRows = buffer.length;
  const start = Math.max(0, totalRows - count);
  const lines: string[] = [];
  for (let i = start; i < totalRows; i++) {
    const line = buffer.getLine(i);
    lines.push(line ? line.translateToString(true) : '');
  }
  return lines;
}

/**
 * Read the currently visible viewport content from the terminal.
 */
function getVisibleContentFromTerminal(terminal: Terminal): string {
  const buffer = terminal.buffer.active;
  const viewportY = buffer.viewportY;
  const rows = terminal.rows;
  const lines: string[] = [];
  for (let i = viewportY; i < viewportY + rows; i++) {
    const line = buffer.getLine(i);
    lines.push(line ? line.translateToString(true) : '');
  }
  return lines.join('\n');
}

/**
 * Read the entire buffer content from the terminal.
 */
function getAllContentFromTerminal(terminal: Terminal): string {
  const buffer = terminal.buffer.active;
  const totalRows = buffer.length;
  const lines: string[] = [];
  for (let i = 0; i < totalRows; i++) {
    const line = buffer.getLine(i);
    lines.push(line ? line.translateToString(true) : '');
  }
  return lines.join('\n');
}

function getScrollStateFromTerminal(terminal: Terminal): TerminalScrollState {
  const buffer = terminal.buffer.active;
  const isNormalBuffer = buffer.type === 'normal';
  const isAtTop = buffer.viewportY <= 0;
  const isAtBottom = buffer.viewportY >= buffer.baseY;

  return {
    isNormalBuffer,
    hasScrollback: isNormalBuffer && buffer.baseY > 0,
    isAtTop,
    isAtBottom,
  };
}

function scrollNormalBufferToBottom(terminal: Terminal): void {
  if (terminal.buffer.active.type !== 'normal') return;
  terminal.scrollToBottom();
}

// --- Public handle interface ---

export interface TerminalInstanceHandle {
  /** Get the SearchAddon instance for search bar integration */
  getSearchAddon(): SearchAddon | null;
  /** Get the SerializeAddon instance for content persistence */
  getSerializeAddon(): SerializeAddon | null;
  /** Get the Terminal instance (e.g. for link provider registration) */
  getTerminal(): Terminal | null;
  /** Get the current renderer type */
  getRendererType(): RendererType;
  /** Read the last N lines from the buffer as plain text */
  getBufferLines(count: number): string[];
  /** Read the current viewport content */
  getVisibleContent(): string;
  /** Read the entire buffer content */
  getAllContent(): string;
  /** Get the selected text in the terminal */
  getSelection(): string;
  /** Scroll the terminal viewport to the top of the retained scrollback */
  scrollToTop(): void;
  /** Scroll the terminal viewport to the bottom */
  scrollToBottom(): void;
  /** Read the current terminal scroll state */
  getScrollState(): TerminalScrollState | null;
}

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
  preferWebglRenderer: boolean;
  onUserInput?: (sessionId: string) => void;
  onScrollStateChange?: (sessionId: string, state: TerminalScrollState) => void;
}

const TerminalInstance = forwardRef<TerminalInstanceHandle, TerminalInstanceProps>(
  ({ sessionId, isActive, preferWebglRenderer, onUserInput, onScrollStateChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const initializedRef = useRef(false);
    const activeCleanupRef = useRef<(() => void) | null>(null);
    const initialPreferWebglRendererRef = useRef(preferWebglRenderer);
    const searchAddonRef = useRef<SearchAddon | null>(null);
    const serializeAddonRef = useRef<SerializeAddon | null>(null);
    const rendererTypeRef = useRef<RendererType>('dom');
    const onScrollStateChangeRef = useRef(onScrollStateChange);
    const onUserInputRef = useRef(onUserInput);
    const { theme } = useTheme();

    useEffect(() => {
      onScrollStateChangeRef.current = onScrollStateChange;
    }, [onScrollStateChange]);

    useEffect(() => {
      onUserInputRef.current = onUserInput;
    }, [onUserInput]);

    const emitScrollState = useCallback(() => {
      if (!terminalRef.current) return;
      onScrollStateChangeRef.current?.(
        sessionId,
        getScrollStateFromTerminal(terminalRef.current),
      );
    }, [sessionId]);

    // Expose methods via ref for parent components
    useImperativeHandle(ref, () => ({
      getSearchAddon: () => searchAddonRef.current,
      getSerializeAddon: () => serializeAddonRef.current,
      getTerminal: () => terminalRef.current,
      getRendererType: () => rendererTypeRef.current,
      getBufferLines: (count: number) => {
        if (!terminalRef.current) return [];
        return getBufferLinesFromTerminal(terminalRef.current, count);
      },
      getVisibleContent: () => {
        if (!terminalRef.current) return '';
        return getVisibleContentFromTerminal(terminalRef.current);
      },
      getAllContent: () => {
        if (!terminalRef.current) return '';
        return getAllContentFromTerminal(terminalRef.current);
      },
      getSelection: () => {
        if (!terminalRef.current) return '';
        return terminalRef.current.getSelection();
      },
      scrollToTop: () => {
        if (!terminalRef.current) return;
        terminalRef.current.scrollToTop();
        terminalRef.current.focus();
        emitScrollState();
      },
      scrollToBottom: () => {
        if (!terminalRef.current) return;
        terminalRef.current.scrollToBottom();
        terminalRef.current.focus();
        emitScrollState();
      },
      getScrollState: () => {
        if (!terminalRef.current) return null;
        return getScrollStateFromTerminal(terminalRef.current);
      },
    }));

    // Initialize xterm.js + PTY binding (once per mount)
    useEffect(() => {
      if (!containerRef.current || initializedRef.current) return;
      initializedRef.current = true;

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrainsMono Nerd Font", Menlo, Monaco, "Courier New", monospace',
        theme: getXtermTheme(theme),
        scrollback: 10000,
        allowProposedApi: true,
      });
      terminalRef.current = terminal;

      // --- Addon loading ---

      // Web links (clickable URLs)
      terminal.loadAddon(new WebLinksAddon(openTerminalLinkInDefaultBrowser));

      // Unicode 11 (correct CJK / Emoji width calculation)
      const unicode11 = new Unicode11Addon();
      terminal.loadAddon(unicode11);
      terminal.unicode.activeVersion = '11';

      // Search addon
      const searchAddon = new SearchAddon();
      terminal.loadAddon(searchAddon);
      searchAddonRef.current = searchAddon;

      // Serialize addon (for content persistence)
      const serializeAddon = new SerializeAddon();
      terminal.loadAddon(serializeAddon);
      serializeAddonRef.current = serializeAddon;

      // --- Renderer: default Canvas → DOM, explicit opt-in WebGL → Canvas → DOM ---
      let activeRendererType: RendererType = 'dom';

      if (initialPreferWebglRendererRef.current) {
        try {
          terminal.loadAddon(new WebglAddon());
          activeRendererType = 'webgl';
        } catch (error) {
          console.warn('[TerminalInstance] WebGL renderer failed, trying Canvas:', error);
          try {
            terminal.loadAddon(new CanvasAddon());
            activeRendererType = 'canvas';
          } catch (canvasError) {
            console.warn('[TerminalInstance] Canvas renderer failed, using DOM:', canvasError);
            activeRendererType = 'dom';
          }
        }
      } else {
        // Default path: prefer Canvas, then fall back to DOM.
        try {
          terminal.loadAddon(new CanvasAddon());
          activeRendererType = 'canvas';
        } catch (canvasError) {
          console.warn('[TerminalInstance] Canvas renderer failed, using DOM:', canvasError);
          activeRendererType = 'dom';
        }
      }

      rendererTypeRef.current = activeRendererType;

      // Image addon (only works with Canvas renderer)
      if (activeRendererType === 'canvas') {
        try {
          terminal.loadAddon(new ImageAddon());
        } catch (error) {
          console.warn('[TerminalInstance] Failed to load Image addon:', error);
        }
      }

      terminal.open(containerRef.current);

      // xterm's renderer may not have finished measuring cell dimensions
      // right after open() (font loading, first paint, etc.).  Poll via
      // requestAnimationFrame until dimensions are available, then fit.
      let fitRetries = 0;
      const MAX_FIT_RETRIES = 30; // ~500 ms at 60 fps
      const scheduleInitialFit = () => {
        requestAnimationFrame(() => {
          if (!terminalRef.current) return;
          const core = (terminalRef.current as any)._core;
          const d = core._renderService?.dimensions;
          if (d && d.css.cell.width > 0 && d.css.cell.height > 0) {
            fitTerminal(terminalRef.current);
            emitScrollState();
          } else if (++fitRetries < MAX_FIT_RETRIES) {
            scheduleInitialFit();
          }
        });
      };
      scheduleInitialFit();

      // User input → PTY stdin
      const dataDisposable = terminal.onData((data: string) => {
        onUserInputRef.current?.(sessionId);
        window.terminalApi.input(sessionId, data);
      });

      // Sync terminal size to PTY when xterm resizes
      const resizeDisposable = terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        window.terminalApi.resize(sessionId, cols, rows);
        emitScrollState();
      });
      const scrollDisposable = terminal.onScroll(() => emitScrollState());
      const writeParsedDisposable = terminal.onWriteParsed(() => emitScrollState());

      // PTY exit → show message
      const removeExitListener = window.terminalApi.onExit(
        sessionId,
        ({ exitCode }: { exitCode: number }) => {
          terminal.writeln(`\r\n[Process exited with code ${exitCode}]`);
        },
      );

      return () => {
        activeCleanupRef.current?.();
        activeCleanupRef.current = null;
        removeExitListener();
        dataDisposable.dispose();
        resizeDisposable.dispose();
        scrollDisposable.dispose();
        writeParsedDisposable.dispose();
        searchAddonRef.current = null;
        serializeAddonRef.current = null;
        terminal.dispose();
      };
    }, [emitScrollState, sessionId]);

    useEffect(() => {
      const terminal = terminalRef.current;
      const container = containerRef.current;
      if (!terminal || !container) return;

      activeCleanupRef.current?.();
      activeCleanupRef.current = null;

      if (!isActive) {
        window.terminalApi.detachOutput(sessionId);
        return;
      }

      let cancelled = false;
      const handleResize = () => {
        requestAnimationFrame(() => {
          if (terminalRef.current) fitTerminal(terminalRef.current);
        });
      };

      const resizeObserver = new ResizeObserver(handleResize);
      const removeOutputListener = window.terminalApi.onOutput(sessionId, (data: string) => {
        terminal.write(data, emitScrollState);
      });

      resizeObserver.observe(container);
      window.addEventListener('resize', handleResize);

      activeCleanupRef.current = () => {
        window.terminalApi.detachOutput(sessionId);
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleResize);
        removeOutputListener();
      };

      void window.terminalApi.attachOutput(sessionId).then(({ bufferedData }) => {
        if (cancelled) return;
        const finalizeAttach = () => {
          requestAnimationFrame(() => {
            if (terminalRef.current && !cancelled) {
              fitTerminal(terminalRef.current);
              scrollNormalBufferToBottom(terminalRef.current);
              terminalRef.current.focus();
              emitScrollState();

              requestAnimationFrame(() => {
                if (!terminalRef.current || cancelled) return;
                scrollNormalBufferToBottom(terminalRef.current);
                emitScrollState();
              });
            }
          });
        };
        if (bufferedData) {
          terminal.write(bufferedData, finalizeAttach);
        } else {
          finalizeAttach();
        }
      });

      return () => {
        cancelled = true;
        activeCleanupRef.current?.();
        activeCleanupRef.current = null;
      };
    }, [emitScrollState, isActive, sessionId]);

    // Dynamically update terminal colorscheme when theme changes
    useEffect(() => {
      if (terminalRef.current) {
        terminalRef.current.options.theme = getXtermTheme(theme);
      }
    }, [theme]);

    return (
      <div
        ref={containerRef}
        className="terminal-instance"
        style={{
          overflow: 'hidden',
          visibility: isActive ? 'visible' : 'hidden',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: isActive ? 'auto' : 'none',
        }}
      />
    );
  },
);

TerminalInstance.displayName = 'TerminalInstance';

export default TerminalInstance;
