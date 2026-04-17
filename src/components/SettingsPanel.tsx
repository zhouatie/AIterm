import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, EyeOff, Keyboard, Plus, Settings2, Trash2, X } from 'lucide-react';
import {
  SHORTCUT_ACTIONS,
  type ShortcutActionId,
  type ShortcutBindings,
  eventToShortcut,
  formatShortcutForDisplay,
  validateShortcutBindings,
} from '../ShortcutContext';
import { getIconButtonTooltip } from '../utils/icon-button-tooltips';
import { normalizeSpecDirectoryNames } from '../utils/file-tree-settings';
import { normalizeTerminalStartDirectory } from '../utils/terminal-settings';

interface SettingsPanelProps {
  isOpen: boolean;
  bindings: ShortcutBindings;
  specDirectoryNames: string[];
  terminalStartDirectory: string;
  terminalRendererPreferWebgl: boolean;
  hiddenFolderNames: string[];
  onSave: (bindings: ShortcutBindings) => void;
  onSaveSpecDirectoryNames: (names: string[]) => void;
  onSaveTerminalStartDirectory: (value: string) => void;
  onSaveTerminalRendererPreferWebgl: (value: boolean) => void;
  onSaveHiddenFolderNames: (names: string[]) => void;
  onClose: () => void;
}

interface ShortcutRecorderProps {
  actionId: ShortcutActionId;
  value: string;
  error?: string;
  onChange: (nextValue: string) => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.22)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 200,
};

const panelStyle: React.CSSProperties = {
  width: 'min(920px, 100%)',
  height: 'min(680px, calc(100vh - 48px))',
  display: 'flex',
  overflow: 'hidden',
  borderRadius: 22,
  backgroundColor: 'var(--color-bg-primary)',
  border: '1px solid color-mix(in srgb, var(--color-border-primary) 92%, transparent)',
  boxShadow: '0 28px 70px rgba(15, 23, 42, 0.18)',
};

const sidebarStyle: React.CSSProperties = {
  width: 180,
  padding: '18px 12px 14px',
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-bg-secondary) 94%, white) 0%, var(--color-bg-secondary) 100%)',
  borderRight: '1px solid var(--color-border-light)',
  display: 'flex',
  flexDirection: 'column',
};

function ShortcutRecorder({ actionId, value, error, onChange }: ShortcutRecorderProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <button
      type="button"
      data-shortcut-id={actionId}
      onKeyDown={(event) => {
        if (event.key === 'Tab') return;

        event.preventDefault();
        event.stopPropagation();

        if (event.key === 'Escape') {
          event.currentTarget.blur();
          return;
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
          onChange('');
          return;
        }

        const shortcut = eventToShortcut(event);
        if (!shortcut) return;

        onChange(shortcut);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        width: '100%',
        minHeight: 42,
        padding: '0 14px',
        borderRadius: 12,
        border: error
          ? '1px solid #d14343'
          : isFocused
            ? '1px solid var(--color-accent-primary)'
            : '1px solid var(--color-border-primary)',
        backgroundColor: isFocused ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
        color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'left',
        cursor: 'text',
        outline: 'none',
        boxShadow: isFocused ? '0 0 0 3px rgba(4, 81, 165, 0.12)' : 'none',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500 }}>
        {value ? formatShortcutForDisplay(value) : '未设置'}
      </span>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
        {isFocused ? '按下新的快捷键' : '点击录入'}
      </span>
    </button>
  );
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  bindings,
  specDirectoryNames,
  terminalStartDirectory,
  terminalRendererPreferWebgl,
  hiddenFolderNames,
  onSave,
  onSaveSpecDirectoryNames,
  onSaveTerminalStartDirectory,
  onSaveTerminalRendererPreferWebgl,
  onSaveHiddenFolderNames,
  onClose,
}) => {
  const [draftBindings, setDraftBindings] = useState<ShortcutBindings>(bindings);
  const [draftSpecDirectories, setDraftSpecDirectories] = useState(specDirectoryNames.join('\n'));
  const [draftTerminalStartDirectory, setDraftTerminalStartDirectory] = useState(terminalStartDirectory);
  const [draftTerminalRendererPreferWebgl, setDraftTerminalRendererPreferWebgl] = useState(
    terminalRendererPreferWebgl,
  );
  const [draftHiddenFolderNames, setDraftHiddenFolderNames] = useState<string[]>(hiddenFolderNames);
  const [newHiddenFolderInput, setNewHiddenFolderInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ShortcutActionId, string>>>({});
  const [specDirectoryError, setSpecDirectoryError] = useState('');
  const [terminalDirectoryError, setTerminalDirectoryError] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setDraftBindings(bindings);
    setDraftSpecDirectories(specDirectoryNames.join('\n'));
    setDraftTerminalStartDirectory(terminalStartDirectory);
    setDraftTerminalRendererPreferWebgl(terminalRendererPreferWebgl);
    setDraftHiddenFolderNames(hiddenFolderNames);
    setNewHiddenFolderInput('');
    setFieldErrors({});
    setSpecDirectoryError('');
    setTerminalDirectoryError('');
    setSaveFeedback('');
  }, [
    isOpen,
    bindings,
    specDirectoryNames,
    terminalStartDirectory,
    terminalRendererPreferWebgl,
    hiddenFolderNames,
  ]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const normalizedDraftSpecDirectories = useMemo(
    () => normalizeSpecDirectoryNames(draftSpecDirectories),
    [draftSpecDirectories],
  );
  const normalizedTerminalStartDirectory = useMemo(
    () => normalizeTerminalStartDirectory(draftTerminalStartDirectory),
    [draftTerminalStartDirectory],
  );
  const normalizedSpecDirectoryKey = specDirectoryNames.join('\n');
  const draftSpecDirectoryKey = normalizedDraftSpecDirectories.join('\n');
  const closeButtonTitle = getIconButtonTooltip({
    label: '关闭设置',
    bindings,
  });

  const isDirty = useMemo(
    () => SHORTCUT_ACTIONS.some((action) => draftBindings[action.id] !== bindings[action.id])
      || draftSpecDirectoryKey !== normalizedSpecDirectoryKey
      || normalizedTerminalStartDirectory !== terminalStartDirectory
      || draftTerminalRendererPreferWebgl !== terminalRendererPreferWebgl
      || [...draftHiddenFolderNames].sort().join('\n') !== [...hiddenFolderNames].sort().join('\n'),
    [
      draftBindings,
      bindings,
      draftSpecDirectoryKey,
      normalizedSpecDirectoryKey,
      normalizedTerminalStartDirectory,
      terminalStartDirectory,
      draftTerminalRendererPreferWebgl,
      terminalRendererPreferWebgl,
      draftHiddenFolderNames,
      hiddenFolderNames,
    ],
  );

  const handleSave = async () => {
    const errors = validateShortcutBindings(draftBindings);
    setFieldErrors(errors);
    setSpecDirectoryError('');
    setTerminalDirectoryError('');

    if (Object.keys(errors).length > 0) {
      setSaveFeedback('存在未解决的快捷键冲突或空值');
      return;
    }

    if (normalizedDraftSpecDirectories.length === 0) {
      setSpecDirectoryError('至少保留一个目录名');
      setSaveFeedback('存在未解决的配置错误');
      return;
    }

    if (normalizedTerminalStartDirectory && !normalizedTerminalStartDirectory.startsWith('/')) {
      setTerminalDirectoryError('请输入绝对路径，或留空使用 Home (~)');
      setSaveFeedback('存在未解决的配置错误');
      return;
    }

    if (normalizedTerminalStartDirectory) {
      const { error } = await window.fileApi.readDir(normalizedTerminalStartDirectory);
      if (error) {
        setTerminalDirectoryError('目录不存在或不可访问');
        setSaveFeedback('存在未解决的配置错误');
        return;
      }
    }

    onSave(draftBindings);
    onSaveSpecDirectoryNames(normalizedDraftSpecDirectories);
    onSaveTerminalStartDirectory(normalizedTerminalStartDirectory);
    onSaveTerminalRendererPreferWebgl(draftTerminalRendererPreferWebgl);
    onSaveHiddenFolderNames(draftHiddenFolderNames);
    setSaveFeedback('所有更改已保存');
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={panelStyle} onMouseDown={(event) => event.stopPropagation()}>
        <aside style={sidebarStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 10px 18px',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) 22%, white) 0%, transparent 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent-primary)',
              }}
            >
              <Settings2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                设置
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Command + ,
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <button
              type="button"
              style={{
                height: 38,
                border: 'none',
                borderRadius: 10,
                backgroundColor: 'var(--color-bg-selected)',
                color: 'var(--color-text-primary)',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Settings2 size={14} />
              通用
            </button>
            <button
              type="button"
              style={{
                height: 38,
                border: 'none',
                borderRadius: 10,
                backgroundColor: 'transparent',
                color: 'var(--color-text-tertiary)',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              <Keyboard size={14} />
              快捷键
            </button>
          </div>
        </aside>

        <section
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-bg-primary) 88%, white) 0%, var(--color-bg-primary) 100%)',
          }}
        >
          <header
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px 0 28px',
              borderBottom: '1px solid var(--color-border-light)',
            }}
          >
            <div>
              <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                通用
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                管理 terminal 默认目录、应用内快捷键与基础操作入口
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              title={closeButtonTitle}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                border: '1px solid var(--color-border-primary)',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-tertiary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </header>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px 18px',
            }}
          >
            <div
              style={{
                borderRadius: 18,
                border: '1px solid var(--color-border-primary)',
                backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 94%, white)',
                padding: 20,
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <Keyboard size={15} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  快捷键
                </div>
              </div>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--color-text-tertiary)',
                  marginBottom: 18,
                }}
              >
                支持配置文件树展示/收起、文件预览内容查找，以及 terminal 的创建、重命名、关闭和 tab 切换快捷键。
                设置入口固定为 <strong style={{ color: 'var(--color-text-primary)' }}>Command + ,</strong>。
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 260px',
                  gap: 16,
                  alignItems: 'start',
                  padding: '16px 0',
                  borderTop: '1px solid var(--color-border-light)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    <BookOpen size={14} />
                    Spec 目录
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    文件树开启 spec 模式时，只展示这些目录名下的文件。每行或逗号分隔一个目录名。
                  </div>
                  {specDirectoryError && (
                    <div style={{ fontSize: 12, color: '#d14343', marginTop: 8 }}>
                      {specDirectoryError}
                    </div>
                  )}
                </div>
                <textarea
                  value={draftSpecDirectories}
                  onChange={(event) => {
                    setDraftSpecDirectories(event.target.value);
                    setSpecDirectoryError('');
                    setSaveFeedback('');
                  }}
                  rows={4}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    minHeight: 92,
                    resize: 'vertical',
                    borderRadius: 10,
                    border: specDirectoryError
                      ? '1px solid #d14343'
                      : '1px solid var(--color-border-primary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    padding: '10px 12px',
                    fontSize: 13,
                    lineHeight: 1.45,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 260px',
                  gap: 16,
                  alignItems: 'start',
                  padding: '16px 0',
                  borderTop: '1px solid var(--color-border-light)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    Terminal Renderer
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    默认优先尝试 WebGL renderer；如果关闭，将使用 Canvas renderer（支持内联图片显示）。
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draftTerminalRendererPreferWebgl}
                  onClick={() => {
                    setDraftTerminalRendererPreferWebgl((prev) => !prev);
                    setSaveFeedback('');
                  }}
                  style={{
                    width: '100%',
                    minHeight: 44,
                    borderRadius: 12,
                    border: '1px solid var(--color-border-primary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span>{draftTerminalRendererPreferWebgl ? '优先尝试 WebGL renderer' : '使用 Canvas renderer（支持内联图片）'}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: draftTerminalRendererPreferWebgl ? 'flex-end' : 'flex-start',
                      width: 34,
                      height: 20,
                      borderRadius: 999,
                      padding: 2,
                      backgroundColor: draftTerminalRendererPreferWebgl
                        ? 'var(--color-accent-primary)'
                        : 'var(--color-border-primary)',
                      transition: 'background-color 0.16s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </span>
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 260px',
                  gap: 16,
                  alignItems: 'start',
                  padding: '16px 0',
                  borderTop: '1px solid var(--color-border-light)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    Terminal 默认目录
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    首次打开 terminal 或新建 workspace 时使用。留空表示 Home (~)，否则请输入绝对路径。
                  </div>
                  {terminalDirectoryError && (
                    <div style={{ fontSize: 12, color: '#d14343', marginTop: 8 }}>
                      {terminalDirectoryError}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={draftTerminalStartDirectory}
                  onChange={(event) => {
                    setDraftTerminalStartDirectory(event.target.value);
                    setTerminalDirectoryError('');
                    setSaveFeedback('');
                  }}
                  placeholder="留空使用 Home (~)"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    minHeight: 42,
                    borderRadius: 10,
                    border: terminalDirectoryError
                      ? '1px solid #d14343'
                      : '1px solid var(--color-border-primary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    padding: '0 12px',
                    fontSize: 13,
                    lineHeight: 1.45,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 260px',
                  gap: 16,
                  alignItems: 'start',
                  padding: '16px 0',
                  borderTop: '1px solid var(--color-border-light)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    <EyeOff size={14} />
                    隐藏文件夹
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    文件树中需要隐藏的文件夹名称，精确匹配，保存后立即生效。
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {draftHiddenFolderNames.map((name) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0 10px',
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-primary)',
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftHiddenFolderNames((prev) => prev.filter((n) => n !== name));
                          setSaveFeedback('');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          border: 'none',
                          background: 'transparent',
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: 'var(--color-text-muted)',
                          flexShrink: 0,
                          padding: 0,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={newHiddenFolderInput}
                      onChange={(e) => setNewHiddenFolderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        const trimmed = newHiddenFolderInput.trim();
                        if (trimmed && !draftHiddenFolderNames.includes(trimmed)) {
                          setDraftHiddenFolderNames((prev) => [...prev, trimmed]);
                          setSaveFeedback('');
                        }
                        setNewHiddenFolderInput('');
                      }}
                      placeholder="输入文件夹名称"
                      spellCheck={false}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: 36,
                        borderRadius: 8,
                        border: '1px solid var(--color-border-primary)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        padding: '0 10px',
                        fontSize: 13,
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newHiddenFolderInput.trim();
                        if (trimmed && !draftHiddenFolderNames.includes(trimmed)) {
                          setDraftHiddenFolderNames((prev) => [...prev, trimmed]);
                          setSaveFeedback('');
                        }
                        setNewHiddenFolderInput('');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: '1px solid var(--color-border-primary)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {SHORTCUT_ACTIONS.map((action) => (
                  <div
                    key={action.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 260px',
                      gap: 16,
                      alignItems: 'center',
                      padding: '16px 0',
                      borderTop: '1px solid var(--color-border-light)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          marginBottom: 4,
                        }}
                      >
                        {action.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {action.description}
                      </div>
                      {fieldErrors[action.id] && (
                        <div style={{ fontSize: 12, color: '#d14343', marginTop: 8 }}>
                          {fieldErrors[action.id]}
                        </div>
                      )}
                    </div>
                    <ShortcutRecorder
                      actionId={action.id}
                      value={draftBindings[action.id]}
                      error={fieldErrors[action.id]}
                      onChange={(nextValue) => {
                        setDraftBindings((prev) => ({ ...prev, [action.id]: nextValue }));
                        setFieldErrors((prev) => ({ ...prev, [action.id]: undefined }));
                        setSaveFeedback('');
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer
            style={{
              minHeight: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '14px 24px 18px 28px',
              borderTop: '1px solid var(--color-border-light)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: saveFeedback
                  ? saveFeedback === '所有更改已保存'
                    ? '#2f7d32'
                    : '#d14343'
                  : 'var(--color-text-muted)',
              }}
            >
              {saveFeedback === '所有更改已保存' && <Check size={14} />}
              <span>{saveFeedback || (isDirty ? '存在未保存更改' : '所有更改已保存')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 999,
                  border: '1px solid var(--color-border-primary)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                关闭
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  height: 36,
                  padding: '0 18px',
                  borderRadius: 999,
                  border: 'none',
                  backgroundColor: isDirty ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
                  color: isDirty ? '#ffffff' : 'var(--color-text-muted)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                保存
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default SettingsPanel;
