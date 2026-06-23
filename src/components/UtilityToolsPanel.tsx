import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  FileJson,
  History,
  Minimize2,
  Pin,
  PinOff,
  QrCode,
  Trash2,
  WandSparkles,
  Workflow,
  X,
} from 'lucide-react';
import mermaid from 'mermaid';
import QRCode from 'qrcode';
import { useTheme } from '../ThemeContext';

export type UtilityToolId = 'json' | 'qr' | 'mermaid';

interface UtilityToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type CopyState = 'idle' | 'copied' | 'failed';
type RenderState = 'empty' | 'loading' | 'ready' | 'error';

interface QrToolItem {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

interface QrToolStorageV1 {
  version: 1;
  recent: QrToolItem[];
  pinned: QrToolItem[];
}

interface ToolDefinition {
  id: UtilityToolId;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

const TOOLS: ToolDefinition[] = [
  { id: 'json', label: 'JSON', icon: FileJson },
  { id: 'qr', label: '二维码', icon: QrCode },
  { id: 'mermaid', label: 'Mermaid', icon: Workflow },
];

const QR_TOOL_STORAGE_KEY = 'utility-tools-qr-records';
const QR_TOOL_STORAGE_VERSION = 1;
const QR_RECENT_LIMIT = 10;
const QR_RECENT_SAVE_DELAY_MS = 700;

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1001,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  backgroundColor: 'rgba(15, 23, 42, 0.24)',
  backdropFilter: 'blur(8px)',
  transition: 'opacity 0.16s ease, visibility 0.16s ease',
};

const panelStyle: React.CSSProperties = {
  width: 'min(1280px, calc(100vw - 24px))',
  height: 'min(880px, calc(100vh - 48px))',
  minHeight: 'min(620px, calc(100vh - 48px))',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface-content-elevated)',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 8,
  boxShadow: 'var(--color-shadow-medium)',
};

const headerStyle: React.CSSProperties = {
  height: 46,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 12px',
  borderBottom: '1px solid var(--color-border-secondary)',
  background: 'var(--color-window-chrome-bg)',
};

const tabListStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
};

const baseTabStyle: React.CSSProperties = {
  height: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '0 10px',
  border: '1px solid transparent',
  borderRadius: 8,
  color: 'var(--color-text-tertiary)',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 650,
  letterSpacing: 0,
  fontFamily: 'inherit',
};

const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid transparent',
  borderRadius: 8,
  padding: 0,
  color: 'var(--color-icon-default)',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(320px, 0.85fr) minmax(480px, 1.15fr)',
  gap: 0,
};

const paneStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

const leftPaneStyle: React.CSSProperties = {
  ...paneStyle,
  borderRight: '1px solid var(--color-border-secondary)',
};

const paneHeaderStyle: React.CSSProperties = {
  height: 42,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '0 12px',
  borderBottom: '1px solid var(--color-border-secondary)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0,
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const actionButtonStyle: React.CSSProperties = {
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '0 10px',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 8,
  color: 'var(--color-text-secondary)',
  background: 'var(--color-surface-content)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 650,
  letterSpacing: 0,
  fontFamily: 'inherit',
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  padding: 14,
  border: 'none',
  outline: 'none',
  resize: 'none',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface-terminal)',
  fontFamily: "'JetBrainsMono Nerd Font', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  fontSize: 12,
  lineHeight: 1.55,
  letterSpacing: 0,
};

const outputPreStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  margin: 0,
  padding: 14,
  overflow: 'auto',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface-terminal)',
  fontFamily: "'JetBrainsMono Nerd Font', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  fontSize: 12,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const emptyStateStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  color: 'var(--color-text-muted)',
  background: 'var(--color-surface-terminal)',
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: '8px 12px',
  borderTop: '1px solid var(--color-border-secondary)',
  color: 'var(--color-agent-status-error)',
  background: 'var(--color-agent-status-error-soft)',
  fontSize: 12,
  lineHeight: 1.45,
  wordBreak: 'break-word',
};

const previewWrapStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'auto',
  padding: 24,
  background: 'var(--color-surface-terminal)',
};

const qrPreviewStyle: React.CSSProperties = {
  width: 256,
  height: 256,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 10,
  background: '#ffffff',
  border: '1px solid rgba(15, 23, 42, 0.12)',
  borderRadius: 8,
  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
  lineHeight: 0,
};

const qrInputTextareaStyle: React.CSSProperties = {
  ...textareaStyle,
  flex: '1 1 210px',
  minHeight: 180,
  borderBottom: '1px solid var(--color-border-secondary)',
};

const qrRecordsWrapStyle: React.CSSProperties = {
  flex: '1 1 240px',
  minHeight: 220,
  display: 'grid',
  gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
  background: 'var(--color-surface-terminal)',
};

const qrRecordSectionStyle: React.CSSProperties = {
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

const qrRecordSectionBorderStyle: React.CSSProperties = {
  ...qrRecordSectionStyle,
  borderBottom: '1px solid var(--color-border-secondary)',
};

const qrRecordHeaderStyle: React.CSSProperties = {
  height: 34,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '0 12px',
  color: 'var(--color-text-secondary)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0,
};

const qrRecordHeaderTitleStyle: React.CSSProperties = {
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const qrRecordListStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  overflow: 'auto',
  padding: '0 8px 8px',
};

const qrRecordEmptyStyle: React.CSSProperties = {
  padding: '10px 8px',
  color: 'var(--color-text-muted)',
  fontSize: 12,
  lineHeight: 1.45,
};

const qrRecordItemStyle: React.CSSProperties = {
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  border: '1px solid var(--color-border-secondary)',
  borderRadius: 8,
  background: 'var(--color-surface-content)',
};

const qrRecordTextButtonStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 8px',
  border: 'none',
  borderRadius: 8,
  color: 'var(--color-text-secondary)',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12,
  letterSpacing: 0,
};

const qrRecordTextStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const qrRecordIconButtonStyle: React.CSSProperties = {
  ...iconButtonStyle,
  width: 26,
  height: 26,
  marginRight: 3,
  borderRadius: 6,
  color: 'var(--color-text-tertiary)',
};

const qrRecordClearButtonStyle: React.CSSProperties = {
  height: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 8px',
  border: '1px solid var(--color-border-secondary)',
  borderRadius: 7,
  color: 'var(--color-text-tertiary)',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: 0,
  fontFamily: 'inherit',
};

const mermaidPreviewStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 0,
  color: 'var(--color-text-primary)',
};

function getButtonCopyTitle(state: CopyState): string {
  if (state === 'copied') return '已复制';
  if (state === 'failed') return '复制失败';
  return '复制';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createEmptyQrToolStorage(): QrToolStorageV1 {
  return { version: QR_TOOL_STORAGE_VERSION, recent: [], pinned: [] };
}

function createQrToolItem(text: string, now: number): QrToolItem {
  return {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    createdAt: now,
    updatedAt: now,
  };
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeQrToolItems(value: unknown, limit?: number): QrToolItem[] {
  if (!Array.isArray(value)) return [];

  const itemsByText = new Map<string, QrToolItem>();

  value.forEach((item) => {
    if (!isRecordObject(item) || typeof item.text !== 'string' || item.text.length === 0) return;

    const createdAt = typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
      ? item.createdAt
      : Date.now();
    const updatedAt = typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)
      ? item.updatedAt
      : createdAt;
    const existing = itemsByText.get(item.text);

    if (existing && existing.updatedAt >= updatedAt) return;

    itemsByText.set(item.text, {
      id: typeof item.id === 'string' && item.id.length > 0
        ? item.id
        : createQrToolItem(item.text, createdAt).id,
      text: item.text,
      createdAt,
      updatedAt,
    });
  });

  const items = Array.from(itemsByText.values()).sort((left, right) => right.updatedAt - left.updatedAt);
  return typeof limit === 'number' ? items.slice(0, limit) : items;
}

function normalizeQrToolStorage(value: unknown): QrToolStorageV1 {
  if (!isRecordObject(value)) return createEmptyQrToolStorage();

  return {
    version: QR_TOOL_STORAGE_VERSION,
    recent: normalizeQrToolItems(value.recent, QR_RECENT_LIMIT),
    pinned: normalizeQrToolItems(value.pinned),
  };
}

function loadQrToolStorage(): QrToolStorageV1 {
  try {
    const rawValue = window.localStorage.getItem(QR_TOOL_STORAGE_KEY);
    if (!rawValue) return createEmptyQrToolStorage();
    return normalizeQrToolStorage(JSON.parse(rawValue));
  } catch {
    return createEmptyQrToolStorage();
  }
}

function saveQrToolStorage(storage: QrToolStorageV1): void {
  try {
    window.localStorage.setItem(QR_TOOL_STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // localStorage can fail in restricted environments; keep the in-memory state usable.
  }
}

function upsertQrToolItem(items: QrToolItem[], text: string, limit?: number): QrToolItem[] {
  const now = Date.now();
  const existing = items.find((item) => item.text === text);
  const nextItem = existing
    ? { ...existing, updatedAt: now }
    : createQrToolItem(text, now);
  const nextItems = [nextItem, ...items.filter((item) => item.text !== text)];

  return typeof limit === 'number' ? nextItems.slice(0, limit) : nextItems;
}

async function copyText(text: string, setState: (state: CopyState) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    setState('copied');
  } catch {
    setState('failed');
  }

  window.setTimeout(() => setState('idle'), 1400);
}

const UtilityToolsPanel: React.FC<UtilityToolsPanelProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [currentTool, setCurrentTool] = useState<UtilityToolId>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonCopyState, setJsonCopyState] = useState<CopyState>('idle');
  const [qrInput, setQrInput] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [qrState, setQrState] = useState<RenderState>('empty');
  const [qrError, setQrError] = useState('');
  const [qrCopyState, setQrCopyState] = useState<CopyState>('idle');
  const [qrStorage, setQrStorage] = useState<QrToolStorageV1>(() => loadQrToolStorage());
  const [mermaidInput, setMermaidInput] = useState('');
  const [mermaidSvg, setMermaidSvg] = useState('');
  const [mermaidState, setMermaidState] = useState<RenderState>('empty');
  const [mermaidError, setMermaidError] = useState('');
  const qrRenderVersionRef = useRef(0);
  const mermaidRenderVersionRef = useRef(0);

  const updateQrStorage = useCallback((updater: (storage: QrToolStorageV1) => QrToolStorageV1) => {
    setQrStorage((currentStorage) => {
      const nextStorage = normalizeQrToolStorage(updater(currentStorage));
      saveQrToolStorage(nextStorage);
      return nextStorage;
    });
  }, []);

  const addQrRecent = useCallback((text: string) => {
    if (text.length === 0) return;

    updateQrStorage((storage) => ({
      ...storage,
      recent: upsertQrToolItem(storage.recent, text, QR_RECENT_LIMIT),
    }));
  }, [updateQrStorage]);

  const restoreQrText = useCallback((text: string) => {
    setQrInput(text);
  }, []);

  const deleteQrRecent = useCallback((id: string) => {
    updateQrStorage((storage) => ({
      ...storage,
      recent: storage.recent.filter((item) => item.id !== id),
    }));
  }, [updateQrStorage]);

  const clearQrRecent = useCallback(() => {
    updateQrStorage((storage) => ({
      ...storage,
      recent: [],
    }));
  }, [updateQrStorage]);

  const pinCurrentQrText = useCallback(() => {
    if (qrInput.length === 0 || qrState !== 'ready' || !qrSvg) return;

    updateQrStorage((storage) => ({
      ...storage,
      pinned: upsertQrToolItem(storage.pinned, qrInput),
    }));
  }, [qrInput, qrState, qrSvg, updateQrStorage]);

  const unpinQrItem = useCallback((id: string) => {
    updateQrStorage((storage) => ({
      ...storage,
      pinned: storage.pinned.filter((item) => item.id !== id),
    }));
  }, [updateQrStorage]);

  useEffect(() => {
    const input = qrInput;
    const version = qrRenderVersionRef.current + 1;
    qrRenderVersionRef.current = version;

    if (input.length === 0) {
      setQrState('empty');
      setQrSvg('');
      setQrError('');
      return;
    }

    setQrState('loading');
    setQrError('');
    QRCode.toString(input, {
      type: 'svg',
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((svg) => {
        if (qrRenderVersionRef.current !== version) return;
        setQrSvg(svg.replace('<svg ', '<svg width="232" height="232" '));
        setQrState('ready');
      })
      .catch((error: unknown) => {
        if (qrRenderVersionRef.current !== version) return;
        setQrState('error');
        setQrSvg('');
        setQrError(getErrorMessage(error));
      });
  }, [qrInput]);

  useEffect(() => {
    if (qrState !== 'ready' || !qrSvg || qrInput.length === 0) return undefined;

    const input = qrInput;
    const timeoutId = window.setTimeout(() => addQrRecent(input), QR_RECENT_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [addQrRecent, qrInput, qrState, qrSvg]);

  useEffect(() => {
    const source = mermaidInput.trim();
    const version = mermaidRenderVersionRef.current + 1;
    mermaidRenderVersionRef.current = version;

    if (!source) {
      setMermaidState('empty');
      setMermaidSvg('');
      setMermaidError('');
      return;
    }

    setMermaidState('loading');
    setMermaidError('');

    const render = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: theme === 'dark' ? 'dark' : 'default',
        });
        const result = await mermaid.render(`utility-mermaid-${version}`, source);
        if (mermaidRenderVersionRef.current !== version) return;
        setMermaidSvg(result.svg);
        setMermaidState('ready');
      } catch (error: unknown) {
        if (mermaidRenderVersionRef.current !== version) return;
        setMermaidSvg('');
        setMermaidState('error');
        setMermaidError(getErrorMessage(error));
      }
    };

    void render();
  }, [mermaidInput, theme]);

  const formatJson = useCallback((compact: boolean) => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed, null, compact ? 0 : 2));
      setJsonError('');
    } catch (error: unknown) {
      setJsonError(getErrorMessage(error));
    }
  }, [jsonInput]);

  const overlayComputedStyle: React.CSSProperties = {
    ...overlayStyle,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    pointerEvents: isOpen ? 'auto' : 'none',
  };

  const canPinCurrentQr = qrInput.length > 0 && qrState === 'ready' && Boolean(qrSvg);
  const currentQrPinned = qrStorage.pinned.some((item) => item.text === qrInput);

  const renderQrRecordList = (
    items: QrToolItem[],
    emptyText: string,
    icon: React.ReactNode,
    onDelete: (id: string) => void,
    deleteTitle: string,
  ) => {
    if (items.length === 0) {
      return <div style={qrRecordEmptyStyle}>{emptyText}</div>;
    }

    return (
      <div style={qrRecordListStyle}>
        {items.map((item) => (
          <div key={item.id} style={qrRecordItemStyle}>
            <button
              type="button"
              style={qrRecordTextButtonStyle}
              title={item.text}
              onClick={() => restoreQrText(item.text)}
            >
              {icon}
              <span style={qrRecordTextStyle}>{item.text}</span>
            </button>
            <button
              type="button"
              style={qrRecordIconButtonStyle}
              title={deleteTitle}
              onClick={() => onDelete(item.id)}
            >
              {deleteTitle === '取消固定' ? <PinOff size={13} /> : <Trash2 size={13} />}
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderJsonTool = () => (
    <div style={contentStyle}>
      <section style={leftPaneStyle}>
        <div style={paneHeaderStyle}>
          <span>输入</span>
          <div style={actionRowStyle}>
            <button type="button" style={actionButtonStyle} onClick={() => formatJson(false)}>
              <WandSparkles size={13} />
              格式化
            </button>
            <button type="button" style={actionButtonStyle} onClick={() => formatJson(true)}>
              <Minimize2 size={13} />
              压缩
            </button>
          </div>
        </div>
        <textarea
          value={jsonInput}
          onChange={(event) => setJsonInput(event.target.value)}
          spellCheck={false}
          placeholder='{"name":"AIterm"}'
          style={textareaStyle}
        />
      </section>
      <section style={paneStyle}>
        <div style={paneHeaderStyle}>
          <span>输出</span>
          <button
            type="button"
            style={{
              ...actionButtonStyle,
              opacity: jsonOutput ? 1 : 0.48,
              cursor: jsonOutput ? 'pointer' : 'default',
            }}
            disabled={!jsonOutput}
            title={getButtonCopyTitle(jsonCopyState)}
            onClick={() => {
              if (jsonOutput) void copyText(jsonOutput, setJsonCopyState);
            }}
          >
            {jsonCopyState === 'copied' ? <Check size={13} /> : <Copy size={13} />}
            {getButtonCopyTitle(jsonCopyState)}
          </button>
        </div>
        {jsonOutput ? (
          <pre style={outputPreStyle}>{jsonOutput}</pre>
        ) : (
          <div style={emptyStateStyle}>等待输出</div>
        )}
        {jsonError && <div style={errorStyle}>{jsonError}</div>}
      </section>
    </div>
  );

  const renderQrTool = () => (
    <div style={contentStyle}>
      <section style={leftPaneStyle}>
        <div style={paneHeaderStyle}>
          <span>文本</span>
          <button
            type="button"
            style={{
              ...actionButtonStyle,
              opacity: canPinCurrentQr ? 1 : 0.48,
              cursor: canPinCurrentQr ? 'pointer' : 'default',
            }}
            disabled={!canPinCurrentQr}
            title={currentQrPinned ? '更新固定时间' : '固定当前文本'}
            onClick={pinCurrentQrText}
          >
            <Pin size={13} />
            固定
          </button>
        </div>
        <textarea
          value={qrInput}
          onChange={(event) => setQrInput(event.target.value)}
          spellCheck={false}
          placeholder="https://example.com"
          style={qrInputTextareaStyle}
        />
        <div style={qrRecordsWrapStyle}>
          <section style={qrRecordSectionBorderStyle}>
            <div style={qrRecordHeaderStyle}>
              <span style={qrRecordHeaderTitleStyle}>
                <Pin size={12} />
                常驻链接 {qrStorage.pinned.length}
              </span>
            </div>
            {renderQrRecordList(
              qrStorage.pinned,
              '暂无固定链接',
              <Pin size={12} />,
              unpinQrItem,
              '取消固定',
            )}
          </section>
          <section style={qrRecordSectionStyle}>
            <div style={qrRecordHeaderStyle}>
              <span style={qrRecordHeaderTitleStyle}>
                <History size={12} />
                最近生成 {qrStorage.recent.length}/10
              </span>
              {qrStorage.recent.length > 0 && (
                <button type="button" style={qrRecordClearButtonStyle} onClick={clearQrRecent}>
                  清空
                </button>
              )}
            </div>
            {renderQrRecordList(
              qrStorage.recent,
              '暂无最近记录',
              <Clock size={12} />,
              deleteQrRecent,
              '删除记录',
            )}
          </section>
        </div>
      </section>
      <section style={paneStyle}>
        <div style={paneHeaderStyle}>
          <span>二维码</span>
          <button
            type="button"
            style={{
              ...actionButtonStyle,
              opacity: qrSvg ? 1 : 0.48,
              cursor: qrSvg ? 'pointer' : 'default',
            }}
            disabled={!qrSvg}
            title={getButtonCopyTitle(qrCopyState)}
            onClick={() => {
              if (qrSvg) void copyText(qrSvg, setQrCopyState);
            }}
          >
            {qrCopyState === 'copied' ? <Check size={13} /> : <Copy size={13} />}
            复制 SVG
          </button>
        </div>
        <div style={previewWrapStyle}>
          {qrState === 'ready' && qrSvg ? (
            <div style={qrPreviewStyle} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          ) : qrState === 'loading' ? (
            <div style={emptyStateStyle}>生成中</div>
          ) : (
            <div style={emptyStateStyle}>等待输入</div>
          )}
        </div>
        {qrState === 'error' && <div style={errorStyle}>{qrError || '二维码生成失败'}</div>}
      </section>
    </div>
  );

  const renderMermaidTool = () => (
    <div style={contentStyle}>
      <section style={leftPaneStyle}>
        <div style={paneHeaderStyle}>
          <span>源码</span>
        </div>
        <textarea
          value={mermaidInput}
          onChange={(event) => setMermaidInput(event.target.value)}
          spellCheck={false}
          placeholder={'flowchart TD\n  A[Start] --> B[Done]'}
          style={textareaStyle}
        />
      </section>
      <section style={paneStyle}>
        <div style={paneHeaderStyle}>
          <span>预览</span>
        </div>
        <div style={previewWrapStyle}>
          {mermaidState === 'ready' && mermaidSvg ? (
            <div style={mermaidPreviewStyle} dangerouslySetInnerHTML={{ __html: mermaidSvg }} />
          ) : mermaidState === 'loading' ? (
            <div style={emptyStateStyle}>渲染中</div>
          ) : (
            <div style={emptyStateStyle}>等待输入</div>
          )}
        </div>
        {mermaidState === 'error' && (
          <div style={errorStyle}>{mermaidError || 'Mermaid 渲染失败'}</div>
        )}
      </section>
    </div>
  );

  const renderCurrentTool = () => {
    switch (currentTool) {
      case 'qr':
        return renderQrTool();
      case 'mermaid':
        return renderMermaidTool();
      case 'json':
      default:
        return renderJsonTool();
    }
  };

  return (
    <div
      style={overlayComputedStyle}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label="开发者工具"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={headerStyle}>
          <div style={tabListStyle} role="tablist" aria-label="开发者工具">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const active = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  style={{
                    ...baseTabStyle,
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    background: active ? 'var(--color-bg-pill-active)' : 'transparent',
                    borderColor: active ? 'var(--color-border-primary)' : 'transparent',
                    boxShadow: active ? 'var(--color-shadow-inset)' : 'none',
                  }}
                  onClick={() => setCurrentTool(tool.id)}
                >
                  <Icon size={14} />
                  {tool.label}
                </button>
              );
            })}
          </div>
          <button type="button" style={{ ...iconButtonStyle, marginLeft: 'auto' }} title="关闭" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        {renderCurrentTool()}
      </div>
    </div>
  );
};

export default UtilityToolsPanel;
