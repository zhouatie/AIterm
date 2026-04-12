import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const TerminalPanel: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    useEffect(() => {
        console.log(
            '[TerminalPanel] useEffect fired, container:',
            containerRef.current,
        );
        if (!containerRef.current) return;

        // Create xterm.js instance
        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily:
                '"JetBrainsMono Nerd Font", Menlo, Monaco, "Courier New", monospace',
            theme: {
                // background: '#1e1e1e',
                // foreground: '#d4d4d4',
                // cursor: '#d4d4d4',
                // selectionBackground: '#264f78',
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

        // Load addons
        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(new WebLinksAddon());

        // Mount to DOM
        terminal.open(containerRef.current);
        fitAddon.fit();

        // Create PTY session via IPC
        const initSession = async () => {
            try {
                console.log(
                    '[TerminalPanel] creating PTY session, cols:',
                    terminal.cols,
                    'rows:',
                    terminal.rows,
                );
                const { id } = await window.terminalApi.create(
                    terminal.cols,
                    terminal.rows,
                );
                console.log('[TerminalPanel] PTY session created:', id);
                sessionIdRef.current = id;

                // User input → PTY stdin
                terminal.onData((data: string) => {
                    window.terminalApi.input(id, data);
                });
            } catch (err) {
                console.error(
                    '[TerminalPanel] Failed to create PTY session:',
                    err,
                );
                terminal.writeln(
                    '\r\n[Error: Failed to create terminal session]',
                );
            }
        };

        initSession();

        // PTY stdout → xterm.write
        const removeOutputListener = window.terminalApi.onOutput(
            ({ id, data }: { id: string; data: string }) => {
                if (id === sessionIdRef.current) {
                    terminal.write(data);
                }
            },
        );

        // PTY exit → show message
        const removeExitListener = window.terminalApi.onExit(
            ({ id, exitCode }: { id: string; exitCode: number }) => {
                if (id === sessionIdRef.current) {
                    terminal.writeln('');
                    terminal.writeln(
                        `\r\n[Process exited with code ${exitCode}. Press any key to restart.]`,
                    );
                    terminal.onData(() => {
                        // Restart on any key press
                        terminal.clear();
                        initSession();
                    });
                }
            },
        );

        // Resize handling
        const handleResize = () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
            }
        };

        // Sync terminal size to PTY when xterm resizes
        terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
            if (sessionIdRef.current) {
                window.terminalApi.resize(sessionIdRef.current, cols, rows);
            }
        });

        // Watch container size changes
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);

        // Also listen to window resize
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
            removeOutputListener();
            removeExitListener();
            if (sessionIdRef.current) {
                window.terminalApi.dispose(sessionIdRef.current);
            }
            terminal.dispose();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
            }}
        />
    );
};

export default TerminalPanel;
