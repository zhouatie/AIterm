import React, { useCallback, useEffect, useRef } from 'react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { replaceAll } from '@milkdown/kit/utils';

// ---------------------------------------------------------------------------
// Styles (CSS-in-JS, using app CSS variables for theme integration)
// ---------------------------------------------------------------------------

const editorWrapperStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '20px 28px',
  fontSize: 14,
  lineHeight: 1.7,
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-primary)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  cursor: 'text',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Inner component (must be inside MilkdownProvider)
// ---------------------------------------------------------------------------

const MilkdownEditor: React.FC<NoteEditorProps> = ({ content, fileKey, onContentChange, autoFocus }) => {
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  // Track whether this is the initial load to suppress the first markdownUpdated callback
  const suppressNextRef = useRef(true);

  const editorReturn = useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.get(listenerCtx)
          .markdownUpdated((_ctx, markdown, _prevMarkdown) => {
            if (suppressNextRef.current) {
              suppressNextRef.current = false;
              return;
            }
            onContentChangeRef.current(markdown);
          });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(clipboard);
  }, []);

  // Auto-focus the editor after mount
  useEffect(() => {
    if (!autoFocus) return;
    if (editorReturn.loading) return;
    // Give the editor a tick to fully render
    const timer = setTimeout(() => {
      const editorEl = document.querySelector('.milkdown-theme .milkdown .editor') as HTMLElement | null;
      if (editorEl) {
        editorEl.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [autoFocus, editorReturn.loading]);

  // When fileKey changes (user switches to different note), replace editor content
  const [loading, getInstance] = useInstance();
  const prevFileKeyRef = useRef(fileKey);

  useEffect(() => {
    if (loading) return;
    if (prevFileKeyRef.current === fileKey) return;
    prevFileKeyRef.current = fileKey;

    const editor = getInstance();
    if (editor) {
      suppressNextRef.current = true;
      editor.action(replaceAll(content));
    }
  }, [fileKey, content, loading, getInstance]);

  return <Milkdown />;
};

// ---------------------------------------------------------------------------
// Outer component (provides MilkdownProvider)
// ---------------------------------------------------------------------------

const NoteEditor: React.FC<NoteEditorProps> = (props) => {
  const handleWrapperClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // If the click target is the wrapper itself (not the editor content),
    // focus the ProseMirror editor so clicking empty space works
    const target = e.target as HTMLElement;
    const editorEl = target.closest('.milkdown-theme')?.querySelector('.milkdown .editor') as HTMLElement | null;
    if (editorEl && !editorEl.contains(target)) {
      editorEl.focus();
    }
  }, []);

  return (
    <div style={editorWrapperStyle} className="milkdown-theme" onClick={handleWrapperClick}>
      <MilkdownProvider>
        <MilkdownEditor {...props} />
      </MilkdownProvider>
    </div>
  );
};

export default NoteEditor;
