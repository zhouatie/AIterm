import React, { useCallback, useState } from 'react';
import {
  Bell,
  BookOpen,
  Cast,
  Check,
  CircleQuestionMark,
  Copy,
  FileText,
  Monitor,
  PanelLeft,
  RefreshCw,
  TerminalSquare,
  Wrench,
  X,
} from 'lucide-react';

interface HelpGuidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpGuideTab = 'guide' | 'hooks';
type CopyState = 'idle' | 'copied' | 'failed';
type CopyTarget = 'codexConfig' | 'envCheck' | 'notifyTest';

interface HelpTabDefinition {
  id: HelpGuideTab;
  label: string;
}

interface UsageItem {
  title: string;
  body: string;
  icon: React.ReactNode;
}

interface CodeBlockProps {
  title: string;
  text: string;
  copyState: CopyState;
  onCopy: (text: string) => void;
}

const TABS: HelpTabDefinition[] = [
  { id: 'guide', label: '使用指南' },
  { id: 'hooks', label: 'Agent Hook 安装' },
];

const USAGE_ITEMS: UsageItem[] = [
  {
    title: '文件预览',
    body: '浏览当前工作区文件，预览 Markdown、代码和 OpenSpec 文档，并把 Markdown 评论发送给当前活跃 terminal 中的 agent。',
    icon: <PanelLeft size={16} />,
  },
  {
    title: 'Terminal 工作区',
    body: '在右侧工作区管理 terminal session，运行 Codex、Claude Code、OpenCode 或普通 shell 命令。',
    icon: <TerminalSquare size={16} />,
  },
  {
    title: '开发者工具',
    body: '打开 JSON 格式化、二维码生成和 Mermaid 图表预览等本地工具。',
    icon: <Wrench size={16} />,
  },
  {
    title: 'Live View',
    body: '开启当前窗口录制和局域网预览，用于把操作过程展示给其它设备。',
    icon: <Cast size={16} />,
  },
  {
    title: 'Agent Inbox',
    body: '集中查看 Codex、Claude Code 和 OpenCode 的运行、等待确认、完成或异常状态。',
    icon: <Bell size={16} />,
  },
  {
    title: '主题与更新',
    body: '在浅色、深色、跟随系统之间切换主题，并手动检查 AIterm 客户端更新。',
    icon: <Monitor size={16} />,
  },
];

const CODEX_CONFIG_SNIPPET = `[features]
hooks = true

[[hooks.UserPromptSubmit]]

[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "/absolute/path/to/AIterm/scripts/aiterm-notify.mjs --preset codex-running || true"
timeout = 10

[[hooks.PermissionRequest]]

[[hooks.PermissionRequest.hooks]]
type = "command"
command = "/absolute/path/to/AIterm/scripts/aiterm-notify.mjs --preset codex-needs-user || true"
timeout = 10

[[hooks.Stop]]

[[hooks.Stop.hooks]]
type = "command"
command = "/absolute/path/to/AIterm/scripts/aiterm-notify.mjs --preset codex-stop || true"
timeout = 10`;

const ENV_CHECK_COMMAND = `env | rg '^AITEM_(TERMINAL_SESSION_ID|NOTIFY_URL|NOTIFY_TOKEN)='`;

const NOTIFY_TEST_COMMAND = `/absolute/path/to/AIterm/scripts/aiterm-notify.mjs --preset codex-needs-user
/absolute/path/to/AIterm/scripts/aiterm-notify.mjs --preset codex-stop`;

function getCopyLabel(state: CopyState): string {
  if (state === 'copied') return '已复制';
  if (state === 'failed') return '复制失败';
  return '复制';
}

const createInitialCopyState = (): Record<CopyTarget, CopyState> => ({
  codexConfig: 'idle',
  envCheck: 'idle',
  notifyTest: 'idle',
});

const CodeBlock: React.FC<CodeBlockProps> = ({
  title,
  text,
  copyState,
  onCopy,
}) => (
  <div className="help-guide-code-block">
    <div className="help-guide-code-header">
      <span>{title}</span>
      <button
        type="button"
        className={'help-guide-copy-button ' + copyState}
        onClick={() => onCopy(text)}
        title={getCopyLabel(copyState)}
        aria-label={getCopyLabel(copyState)}
      >
        {copyState === 'copied' ? <Check size={13} /> : <Copy size={13} />}
        <span>{getCopyLabel(copyState)}</span>
      </button>
    </div>
    <pre className="help-guide-code"><code>{text}</code></pre>
  </div>
);

const HelpGuidePanel: React.FC<HelpGuidePanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<HelpGuideTab>('guide');
  const [copyStateByTarget, setCopyStateByTarget] = useState<Record<CopyTarget, CopyState>>(
    createInitialCopyState,
  );

  const copyToClipboard = useCallback(async (target: CopyTarget, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStateByTarget((current) => ({ ...current, [target]: 'copied' }));
    } catch {
      setCopyStateByTarget((current) => ({ ...current, [target]: 'failed' }));
    }

    window.setTimeout(() => {
      setCopyStateByTarget((current) => ({ ...current, [target]: 'idle' }));
    }, 1400);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="help-guide-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="help-guide-panel"
        role="dialog"
        aria-modal="true"
        aria-label="AIterm 帮助指南"
      >
        <div className="help-guide-header">
          <div className="help-guide-title">
            <CircleQuestionMark size={17} />
            <span>AIterm 帮助指南</span>
          </div>
          <div className="help-guide-tabs" role="tablist" aria-label="帮助内容">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={'help-guide-tab' + (activeTab === tab.id ? ' active' : '')}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="help-guide-close-button"
            onClick={onClose}
            title="关闭帮助指南"
            aria-label="关闭帮助指南"
          >
            <X size={15} />
          </button>
        </div>

        <div className="help-guide-content">
          {activeTab === 'guide' ? (
            <div className="help-guide-section">
              <div className="help-guide-section-heading">
                <BookOpen size={17} />
                <div>
                  <h2>当前应用程序使用指南</h2>
                  <p>这些入口都在当前窗口内工作，打开帮助面板不会重置底层 terminal、文件预览或工具状态。</p>
                </div>
              </div>

              <div className="help-guide-usage-grid">
                {USAGE_ITEMS.map((item) => (
                  <div className="help-guide-usage-item" key={item.title}>
                    <span className="help-guide-usage-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="help-guide-section">
              <div className="help-guide-section-heading">
                <FileText size={17} />
                <div>
                  <h2>Codex Hook 通知安装</h2>
                  <p>将下面片段合并进 Codex 配置后，从 AIterm 内置 terminal 启动 Codex，状态会同步到 terminal tab 和 Agent Inbox。</p>
                </div>
              </div>

              <div className="help-guide-note">
                <strong>不会自动安装：</strong>
                此面板只负责展示和复制配置片段，不会写入 <code>~/.codex/config.toml</code> 或 <code>$CODEX_HOME/config.toml</code>。
              </div>

              <div className="help-guide-steps">
                <h3>安装步骤</h3>
                <ol>
                  <li>确认当前 AIterm 仓库存在 <code>scripts/aiterm-notify.mjs</code>。</li>
                  <li>打开 <code>~/.codex/config.toml</code>；如果设置了 <code>CODEX_HOME</code>，使用 <code>$CODEX_HOME/config.toml</code>。</li>
                  <li>把配置片段合并到文件中，并将 <code>/absolute/path/to/AIterm</code> 替换为本机 AIterm 仓库绝对路径。</li>
                  <li>如已有相同 hook 命令，避免重复追加。</li>
                  <li>从 AIterm 内置 terminal 重新启动 Codex，首次运行新增 hook 时按 Codex 提示信任该 hook。</li>
                </ol>
              </div>

              <CodeBlock
                title="Codex config.toml 片段"
                text={CODEX_CONFIG_SNIPPET}
                copyState={copyStateByTarget.codexConfig}
                onCopy={(text) => copyToClipboard('codexConfig', text)}
              />

              <div className="help-guide-steps">
                <h3>验证</h3>
                <p>在 AIterm 内置 terminal 中先确认三个环境变量存在：</p>
              </div>

              <CodeBlock
                title="检查 AIterm 通知环境变量"
                text={ENV_CHECK_COMMAND}
                copyState={copyStateByTarget.envCheck}
                onCopy={(text) => copyToClipboard('envCheck', text)}
              />

              <div className="help-guide-steps">
                <p>再手动模拟等待确认和完成事件：</p>
              </div>

              <CodeBlock
                title="模拟 Codex hook 通知"
                text={NOTIFY_TEST_COMMAND}
                copyState={copyStateByTarget.notifyTest}
                onCopy={(text) => copyToClipboard('notifyTest', text)}
              />

              <div className="help-guide-troubleshooting">
                <h3>排查</h3>
                <ul>
                  <li>没有通知：确认 Codex 是从 AIterm 内置 terminal 启动的。</li>
                  <li>没有环境变量：重启 AIterm 后重新打开一个 terminal session。</li>
                  <li>hook 没执行：确认 <code>[features].hooks = true</code>，并确认 Codex 已信任新增 hook。</li>
                  <li>重复通知：检查配置中是否重复追加了相同的 <code>aiterm-notify.mjs</code> hook。</li>
                </ul>
              </div>

              <div className="help-guide-result">
                <RefreshCw size={15} />
                <span>验证成功后，terminal tab 会显示 agent 状态；等待确认、完成或异常状态也会进入 Agent Inbox，并触发系统通知。</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpGuidePanel;
