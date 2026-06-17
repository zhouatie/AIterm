import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, FileJson, Minimize2, QrCode, WandSparkles, Workflow, X } from 'lucide-react';
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
  const [mermaidInput, setMermaidInput] = useState('');
  const [mermaidSvg, setMermaidSvg] = useState('');
  const [mermaidState, setMermaidState] = useState<RenderState>('empty');
  const [mermaidError, setMermaidError] = useState('');
  const qrRenderVersionRef = useRef(0);
  const mermaidRenderVersionRef = useRef(0);

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
        </div>
        <textarea
          value={qrInput}
          onChange={(event) => setQrInput(event.target.value)}
          spellCheck={false}
          placeholder="https://example.com"
          style={textareaStyle}
        />
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
