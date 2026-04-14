import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface LiveViewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with `true` when live view starts, `false` when it stops */
  onActiveChange: (active: boolean) => void;
}

type PanelState = 'idle' | 'active' | 'error';



const panelStyle: React.CSSProperties = {
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 12,
  boxShadow: '0 28px 70px rgba(15, 23, 42, 0.18)',
  width: 320,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  color: 'var(--color-text-primary)',
  fontFamily: 'inherit',
};

const btnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 18px',
  borderRadius: 8,
  border: '1px solid var(--color-border-primary)',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--color-text-primary)',
  background: 'transparent',
  transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
};

const LiveViewPanel: React.FC<LiveViewPanelProps> = ({ isOpen, onClose, onActiveChange }) => {
  const [state, setState] = useState<PanelState>('idle');
  const [viewUrl, setViewUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const activeRef = useRef(false);

  const handleStop = useCallback(() => {
    window.liveViewApi.stop();
    activeRef.current = false;
    setState('idle');
    setViewUrl('');
    setQrSvg('');
    onActiveChange(false);
  }, [onActiveChange]);

  // Generate QR code SVG whenever viewUrl changes
  useEffect(() => {
    if (!viewUrl) { setQrSvg(''); return; }
    QRCode.toString(viewUrl, { type: 'svg', margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then((svg) => {
        // Inject explicit size so the SVG renders at the right dimensions
        const sized = svg.replace('<svg ', '<svg width="200" height="200" ');
        setQrSvg(sized);
      })
      .catch(() => setQrSvg('error'));
  }, [viewUrl]);

  const handleStart = useCallback(async () => {
    setState('idle');
    setErrorMsg('');
    const result = await window.liveViewApi.start();
    if ('error' in result) {
      setState('error');
      setErrorMsg(result.error);
      return;
    }
    activeRef.current = true;
    setViewUrl(result.url);
    setState('active');
    onActiveChange(true);
  }, [onActiveChange]);

  if (!isOpen && !activeRef.current) return null;

  const overlayComputedStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1000,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    pointerEvents: isOpen ? 'auto' : 'none',
    transition: 'opacity 0.15s, visibility 0.15s',
  };

  return (
    <div style={overlayComputedStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Live View</span>
          <button
            onClick={onClose}
            style={{
              ...btnBase,
              padding: '4px 8px',
              fontSize: 14,
              lineHeight: 1,
              border: 'none',
              color: 'var(--color-icon-default)',
            }}
            title="关闭"
          >
            ✕
          </button>
        </div>

        {/* Idle state */}
        {state === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              开启后，局域网内的设备可扫码实时查看此 app 的界面。
            </p>
            <button
              onClick={handleStart}
              style={{
                ...btnBase,
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-strong)',
              }}
            >
              开启 Live View
            </button>
          </div>
        )}

        {/* Active state: QR code */}
        {state === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              用手机扫描二维码或访问下方地址
            </p>

            {/* QR code */}
            {qrSvg === 'error' ? (
              <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                二维码生成失败
              </div>
            ) : qrSvg ? (
              <div
                style={{ background: '#fff', padding: 4, borderRadius: 8, lineHeight: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                生成二维码中…
              </div>
            )}

            {/* URL text */}
            <code style={{
              fontSize: 11,
              background: 'var(--color-bg-secondary)',
              padding: '4px 8px',
              borderRadius: 4,
              wordBreak: 'break-all',
              textAlign: 'center',
              color: 'var(--color-text-primary)',
            }}>
              {viewUrl}
            </code>

            <button
              onClick={handleStop}
              style={{
                ...btnBase,
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border-primary)',
                width: '100%',
              }}
            >
              关闭 Live View
            </button>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--color-status-error, #e53e3e)', lineHeight: 1.5 }}>
              {errorMsg}
            </p>
            <button
              onClick={handleStart}
              style={{
                ...btnBase,
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-strong)',
              }}
            >
              重试
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveViewPanel;
