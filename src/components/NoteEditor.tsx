import React, { useCallback, useEffect, useRef } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import 'vditor/dist/js/i18n/zh_CN.js';
import { useTheme } from '../ThemeContext';

const editorWrapperStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-content-elevated) 72%, transparent) 0%, transparent 120px)',
  cursor: 'text',
};

interface NoteEditorProps {
  /** The markdown content to initialize/replace the editor with. */
  content: string;
  /** Unique key to detect when a different file is loaded (e.g. filePath). */
  fileKey: string;
  /** Called whenever the editor's markdown content changes. */
  onContentChange: (markdown: string) => void;
  /** If true, auto-focus the editor after mount. */
  autoFocus?: boolean;
}

const NoteEditor: React.FC<NoteEditorProps> = (props) => {
  const { content, onContentChange, autoFocus } = props;
  const { theme } = useTheme();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const vditorRef = useRef<Vditor | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const isSyncingRef = useRef(false);
  const lastKnownContentRef = useRef(content);

  onContentChangeRef.current = onContentChange;

  const focusEditor = useCallback(() => {
    vditorRef.current?.focus();
  }, []);

  const isVditorInitialized = useCallback((instance: Vditor) => {
    return Boolean((instance as Vditor & { vditor?: { element?: HTMLElement } }).vditor?.element);
  }, []);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;

    let disposed = false;

    const vditor = new Vditor(root, {
      value: content,
      mode: 'ir',
      i18n: window.VditorI18n,
      theme: theme === 'dark' ? 'dark' : 'classic',
      cache: { enable: false },
      toolbar: [],
      toolbarConfig: {
        hide: true,
        pin: false,
      },
      counter: { enable: false },
      outline: {
        enable: false,
        position: 'left',
      },
      height: '100%',
      minHeight: 0,
      placeholder: '输入 Markdown，支持任务列表、标题、代码块',
      input(value) {
        lastKnownContentRef.current = value;
        if (isSyncingRef.current) return;
        onContentChangeRef.current(value);
      },
      after() {
        if (!disposed && autoFocus) {
          window.setTimeout(() => {
            if (!disposed) {
              vditor.focus();
            }
          }, 80);
        }
      },
    });

    vditorRef.current = vditor;
    lastKnownContentRef.current = content;

    return () => {
      disposed = true;
      vditorRef.current = null;
      if (isVditorInitialized(vditor)) {
        vditor.destroy();
      }
      root.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    const vditor = vditorRef.current;
    if (!vditor) return;

    const nextTheme = theme === 'dark' ? 'dark' : 'classic';
    vditor.setTheme(nextTheme);
  }, [theme]);

  useEffect(() => {
    const vditor = vditorRef.current;
    if (!vditor) return;
    if (content === lastKnownContentRef.current) return;
    if (content === vditor.getValue()) {
      lastKnownContentRef.current = content;
      return;
    }

    isSyncingRef.current = true;
    vditor.setValue(content, true);
    lastKnownContentRef.current = content;
    window.setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
  }, [content]);

  useEffect(() => {
    if (!autoFocus) return;

    const timer = window.setTimeout(() => {
      focusEditor();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [autoFocus, focusEditor]);

  return <div ref={wrapperRef} style={editorWrapperStyle} className="note-editor" />;
};

export default NoteEditor;
