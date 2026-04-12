import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
}

const TerminalInstance: React.FC<TerminalInstanceProps> = ({ sessionId, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);

  // Initialize xterm.js + PTY binding (once per mount)
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrainsMono Nerd Font", Menlo, Monaco, "Courier New", monospace',
      theme: {
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
      },
      scrollback: 10000,
      allowProposedApi: true,
    });
    terminalRef.current = terminal;

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(containerRef.current);
    fitAddon.fit();

    // User input → PTY stdin
    terminal.onData((data: string) => {
      window.terminalApi.input(sessionId, data);
    });

    // Sync terminal size to PTY when xterm resizes
    terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      window.terminalApi.resize(sessionId, cols, rows);
    });

    // PTY stdout → xterm.write
    const removeOutputListener = window.terminalApi.onOutput(
      ({ id, data }: { id: string; data: string }) => {
        if (id === sessionId) {
          terminal.write(data);
        }
      },
    );

    // PTY exit → show message
    const removeExitListener = window.terminalApi.onExit(
      ({ id, exitCode }: { id: string; exitCode: number }) => {
        if (id === sessionId) {
          terminal.writeln(`\r\n[Process exited with code ${exitCode}]`);
        }
      },
    );

    // Resize handling
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      removeOutputListener();
      removeExitListener();
      terminal.dispose();
    };
  }, [sessionId]);

  // Re-fit when becoming active (task 1.3)
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      // Small delay to ensure the container is visible before fitting
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
      });
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: 'hidden',
        visibility: isActive ? 'visible' : 'hidden',
        position: 'absolute',
        top: 0,
        left: 8,
        right: 0,
        bottom: 0,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    />
  );
};

export default TerminalInstance;
