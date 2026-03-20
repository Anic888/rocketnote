import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { confirm } from '@tauri-apps/api/dialog';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Terminal as TerminalIcon, FolderOpen } from '../icons';
import 'xterm/css/xterm.css';
import './Terminal.css';

interface TerminalProps {
  cwd: string | null;
}

function Terminal({ cwd }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef(`pty-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create xterm instance
    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace",
      theme: {
        background: '#1a1a1a',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1a1a1a',
        selectionBackground: 'rgba(100, 150, 255, 0.3)',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f44747',
        brightGreen: '#6a9955',
        brightYellow: '#dcdcaa',
        brightBlue: '#569cd6',
        brightMagenta: '#c586c0',
        brightCyan: '#4ec9b0',
        brightWhite: '#ffffff',
      },
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // Open terminal
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && isConnectedRef.current) {
          invoke('pty_resize', { 
            id: sessionIdRef.current, 
            rows: dims.rows, 
            cols: dims.cols 
          }).catch(() => {});
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    // Handle user input
    xterm.onData((data) => {
      if (isConnectedRef.current) {
        invoke('pty_write', { id: sessionIdRef.current, data }).catch(console.error);
      }
    });

    // Setup PTY connection
    let unlistenOutput: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;
    let unlistenDanger: UnlistenFn | null = null;

    const setupPty = async () => {
      try {
        // Listen for output
        unlistenOutput = await listen<[string, string]>('pty-output', (event) => {
          const [id, data] = event.payload;
          if (id === sessionIdRef.current && xtermRef.current) {
            xtermRef.current.write(data);
          }
        });

        // Listen for exit
        unlistenExit = await listen<string>('pty-exit', (event) => {
          if (event.payload === sessionIdRef.current && xtermRef.current) {
            isConnectedRef.current = false;
            xtermRef.current.write('\r\n\x1b[33m[Process exited]\x1b[0m\r\n');
          }
        });

        // Listen for dangerous command warnings
        unlistenDanger = await listen<[string, string, string]>('pty-danger-warning', async (event) => {
          const [id, command, warning] = event.payload;
          if (id !== sessionIdRef.current || !xtermRef.current) return;

          const shouldProceed = await confirm(
            `Dangerous Command Detected\n\nCommand: ${command}\nWarning: ${warning}\n\nAre you sure you want to execute this command?`,
            { title: 'Terminal Safety Warning', type: 'warning' }
          );

          if (shouldProceed) {
            // User confirmed — force-send the Enter key
            await invoke('pty_write_force', { id: sessionIdRef.current, data: '\r' });
          } else {
            // User cancelled — send Ctrl+C to clear the line
            xtermRef.current.write('\r\n\x1b[31m[Command blocked]\x1b[0m\r\n');
            await invoke('pty_write_force', { id: sessionIdRef.current, data: '\x03' });
          }
        });

        // Kill any existing session first
        await invoke('pty_kill', { id: sessionIdRef.current }).catch(() => {});

        // Spawn PTY
        await invoke('pty_spawn', {
          id: sessionIdRef.current,
          cwd: cwd || undefined,
        });

        isConnectedRef.current = true;
        
        // Initial fit
        handleResize();
      } catch (error) {
        console.error('Failed to spawn PTY:', error);
        if (xtermRef.current) {
          xtermRef.current.write(`\x1b[31mError: Failed to start terminal - ${error}\x1b[0m\r\n`);
        }
      }
    };

    setupPty();

    // Focus terminal
    xterm.focus();

    // Cleanup
    return () => {
      unlistenOutput?.();
      unlistenExit?.();
      unlistenDanger?.();
      invoke('pty_kill', { id: sessionIdRef.current }).catch(() => {});
      resizeObserver.disconnect();
      xterm.dispose();
    };
  }, [cwd]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span className="terminal-title"><TerminalIcon size={14} strokeWidth={1.75} /> Terminal</span>
        <span className="terminal-cwd"><FolderOpen size={14} strokeWidth={1.75} /> {cwd || '~'}</span>
      </div>
      <div ref={terminalRef} className="terminal-xterm" />
    </div>
  );
}

export default Terminal;
