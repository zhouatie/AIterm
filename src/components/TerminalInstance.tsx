import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
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

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
  preferWebglRenderer: boolean;
}

const TerminalInstance: React.FC<TerminalInstanceProps> = ({
  sessionId,
  isActive,
  preferWebglRenderer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const initializedRef = useRef(false);
  const activeCleanupRef = useRef<(() => void) | null>(null);
  const initialPreferWebglRendererRef = useRef(preferWebglRenderer);
  const { theme } = useTheme();

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

    terminal.loadAddon(new WebLinksAddon());
    if (initialPreferWebglRendererRef.current) {
      try {
        terminal.loadAddon(new WebglAddon());
      } catch (error) {
        console.warn('[TerminalInstance] Failed to enable WebGL renderer:', error);
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
        } else if (++fitRetries < MAX_FIT_RETRIES) {
          scheduleInitialFit();
        }
      });
    };
    scheduleInitialFit();

    // User input → PTY stdin
    terminal.onData((data: string) => {
      window.terminalApi.input(sessionId, data);
    });

    // Sync terminal size to PTY when xterm resizes
    terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      window.terminalApi.resize(sessionId, cols, rows);
    });

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
      terminal.dispose();
    };
  }, [sessionId]);

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
      terminal.write(data);
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
      if (bufferedData) {
        terminal.write(bufferedData);
      }
      requestAnimationFrame(() => {
        if (terminalRef.current && !cancelled) {
          fitTerminal(terminalRef.current);
          terminalRef.current.focus();
        }
      });
    });

    return () => {
      cancelled = true;
      activeCleanupRef.current?.();
      activeCleanupRef.current = null;
    };
  }, [isActive, sessionId]);

  // Dynamically update terminal colorscheme when theme changes (task 4.3)
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
};

export default TerminalInstance;
