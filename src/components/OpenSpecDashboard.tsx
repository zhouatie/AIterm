import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderGit2,
  ListChecks,
  Send,
  RefreshCw,
  Star,
  X,
} from 'lucide-react';
import type {
  OpenSpecArtifactId,
  OpenSpecArtifactStatus,
  OpenSpecChangeSummary,
  OpenSpecNextAction,
  OpenSpecWorkflowSummary,
} from '../utils/openspec-workflow';
import {
  buildSddCommandPayload,
  createDashboardCommandText,
  getSddArtifactLabel,
  getSddIntentSummary,
  isHighRiskSddAction,
  parseSddCommand,
  type CurrentSddChange,
  type SddCommandIntent,
  type SddCommandPayload,
} from '../utils/sdd-command-router';
import { wrapBracketedPaste } from '../utils/bracketed-paste';

interface OpenSpecDashboardProps {
  rootPath: string;
  activeSessionId: string | null;
  onOpenFile: (filePath: string) => void;
}

const ACTION_LABELS: Record<OpenSpecNextAction, string> = {
  'create-proposal': '补 proposal',
  'create-prd': '补 PRD',
  'continue-design-specs': '补 design/specs',
  'create-tasks': '补 tasks',
  apply: 'Apply',
  'verify-review-archive': 'Verify / Review / Archive',
  inspect: '检查 tasks',
};

const ARTIFACT_LABELS: Record<OpenSpecArtifactId, string> = {
  proposal: 'proposal',
  prd: 'PRD',
  design: 'design',
  specs: 'specs',
  tasks: 'tasks',
  task: 'TASK',
};

function getWorkflowLabel(workflow: OpenSpecChangeSummary['workflow']): string {
  return workflow === 'raven' ? 'RavenSpec' : 'OpenSpec';
}

function getChangeKey(change: Pick<OpenSpecChangeSummary, 'workflow' | 'name'>): string {
  return `${change.workflow}:${change.name}`;
}

function getArtifactPath(artifact: OpenSpecArtifactStatus): string | null {
  if (artifact.state !== 'present') return null;
  return artifact.path;
}

function getTaskProgressLabel(change: OpenSpecChangeSummary): string {
  const progress = change.taskProgress;
  if (!progress.hasTasksFile) return 'tasks 缺失';
  if (!progress.hasCheckboxes) return '无可统计任务';
  return `${progress.completed}/${progress.total}`;
}

function getArtifactTitle(artifact: OpenSpecArtifactStatus): string {
  if (artifact.state === 'missing') return `${ARTIFACT_LABELS[artifact.id]} 尚未创建`;
  if (artifact.id === 'specs') return `打开 specs，${artifact.count ?? 0} 个 spec`;
  return `打开 ${ARTIFACT_LABELS[artifact.id]}`;
}

function getArtifactFromChange(
  change: OpenSpecChangeSummary | undefined,
  artifactId: OpenSpecArtifactId | null,
): OpenSpecArtifactStatus | null {
  if (!change || !artifactId) return null;
  return change.artifacts[artifactId] ?? null;
}

function shouldConfirmBeforeExecution(intent: SddCommandIntent): boolean {
  return isHighRiskSddAction(intent.action)
    || intent.skippedActions.length > 0
    || intent.confidence === 'needs-confirmation';
}

const OpenSpecDashboard: React.FC<OpenSpecDashboardProps> = ({ rootPath, activeSessionId, onOpenFile }) => {
  const [summary, setSummary] = useState<OpenSpecWorkflowSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChangeKey, setCurrentChangeKey] = useState<string | null>(null);
  const [commandText, setCommandText] = useState('');
  const [pendingIntent, setPendingIntent] = useState<SddCommandIntent | null>(null);
  const [pendingPayload, setPendingPayload] = useState<SddCommandPayload | null>(null);
  const [payloadDraft, setPayloadDraft] = useState('');
  const [commandNotice, setCommandNotice] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const loadTokenRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    if (!rootPath) {
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    const loadToken = ++loadTokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await window.openspecWorkflowApi.read(rootPath);
      if (loadTokenRef.current !== loadToken) return;
      if (result.error) {
        setSummary(null);
        setError(result.error);
      } else {
        setSummary(result.summary ?? null);
      }
    } catch (err) {
      if (loadTokenRef.current !== loadToken) return;
      setSummary(null);
      setError((err as Error).message);
    } finally {
      if (loadTokenRef.current === loadToken) {
        setLoading(false);
      }
    }
  }, [rootPath]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setCurrentChangeKey(null);
    setPendingIntent(null);
    setPendingPayload(null);
    setPayloadDraft('');
    setCommandNotice(null);
    setCommandError(null);
  }, [rootPath]);

  const changes = summary?.changes ?? [];
  const hasChanges = changes.length > 0;
  const currentChange = useMemo(() => {
    if (!currentChangeKey) return null;
    return changes.find((change) => getChangeKey(change) === currentChangeKey) ?? null;
  }, [changes, currentChangeKey]);
  const currentSddChange: CurrentSddChange | null = currentChange && rootPath
    ? { workflow: currentChange.workflow, changeName: currentChange.name, rootPath }
    : null;
  const rootLabel = useMemo(() => {
    if (!rootPath) return '';
    const parts = rootPath.replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || rootPath;
  }, [rootPath]);

  useEffect(() => {
    if (!currentChangeKey) return;
    if (!changes.some((change) => getChangeKey(change) === currentChangeKey)) {
      setCurrentChangeKey(null);
      setCommandNotice(null);
      setCommandError('当前 change 已不存在，请重新选择。');
    }
  }, [changes, currentChangeKey]);

  const handleOpenArtifact = useCallback((artifact: OpenSpecArtifactStatus) => {
    const artifactPath = getArtifactPath(artifact);
    if (!artifactPath) return;
    onOpenFile(artifactPath);
  }, [onOpenFile]);

  const executePayload = useCallback((payloadText: string): boolean => {
    if (!activeSessionId) {
      setCommandNotice(null);
      setCommandError('当前没有可用的 terminal tab，无法执行。');
      return false;
    }
    window.terminalApi.input(activeSessionId, `${wrapBracketedPaste(payloadText)}\r`);
    setCommandNotice('已在当前 terminal tab 执行。');
    setCommandError(null);
    return true;
  }, [activeSessionId]);

  const prepareCommand = useCallback((text: string, nextActionChange: OpenSpecChangeSummary | null = null) => {
    const intent = parseSddCommand({
      text,
      rootPath,
      currentChange: nextActionChange
        ? { workflow: nextActionChange.workflow, changeName: nextActionChange.name, rootPath }
        : currentSddChange,
      changes,
      nextActionChange,
    });

    setPendingIntent(intent);
    setPendingPayload(null);
    setPayloadDraft('');
    setCommandNotice(null);

    if (intent.confidence === 'unsupported' || intent.confidence === 'ambiguous') {
      setCommandError(intent.message);
      return;
    }

    if (intent.action === 'set-current-change' && intent.changeName) {
      const workflow = intent.workflow === 'raven' ? 'raven' : 'openspec';
      setCurrentChangeKey(`${workflow}:${intent.changeName}`);
      setPendingIntent(null);
      setCommandNotice(`当前 change 已设置为 ${getWorkflowLabel(workflow)} · ${intent.changeName}。`);
      setCommandError(null);
      return;
    }

    if (intent.action === 'open-artifact') {
      const targetChange = changes.find((change) => (
        change.workflow === intent.workflow
        && change.name === intent.changeName
      ));
      const artifact = getArtifactFromChange(targetChange, intent.artifact);
      if (!artifact || artifact.state !== 'present' || !artifact.path) {
        setCommandError(`${getSddArtifactLabel(intent.artifact)} 尚未创建。`);
        return;
      }
      onOpenFile(artifact.path);
      setPendingIntent(null);
      setCommandError(null);
      setCommandNotice(`已打开 ${targetChange ? `${getWorkflowLabel(targetChange.workflow)} · ${targetChange.name}` : '当前 change'} 的 ${getSddArtifactLabel(intent.artifact)}。`);
      return;
    }

    try {
      const payload = buildSddCommandPayload(intent);
      setPendingPayload(payload);
      setPayloadDraft(payload.preview);
      if (shouldConfirmBeforeExecution(intent)) {
        setCommandError(null);
        return;
      }
      if (executePayload(payload.preview)) {
        setPendingIntent(null);
        setPendingPayload(null);
        setPayloadDraft('');
        return;
      }
      setCommandError(null);
    } catch (err) {
      setCommandError((err as Error).message);
    }
  }, [changes, currentSddChange, executePayload, onOpenFile, rootPath]);

  const handleCommandSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commandText.trim()) {
      setCommandError('请输入 SDD 命令。');
      return;
    }
    prepareCommand(commandText);
  }, [commandText, prepareCommand]);

  const handleSetCurrentChange = useCallback((change: OpenSpecChangeSummary) => {
    setCurrentChangeKey(getChangeKey(change));
    setCommandNotice(`当前 change 已设置为 ${getWorkflowLabel(change.workflow)} · ${change.name}。`);
    setCommandError(null);
  }, []);

  const handlePrepareNextAction = useCallback((change: OpenSpecChangeSummary) => {
    const text = createDashboardCommandText(change.nextAction);
    setCurrentChangeKey(getChangeKey(change));
    setCommandText(text);
    prepareCommand(text, change);
  }, [prepareCommand]);

  const handlePrepareUpdateChange = useCallback((change: OpenSpecChangeSummary) => {
    const text = '更新当前 change：';
    setCurrentChangeKey(getChangeKey(change));
    setCommandText(text);
    prepareCommand(text, change);
  }, [prepareCommand]);

  const handleCandidateSelect = useCallback((changeKey: string) => {
    const change = changes.find((item) => getChangeKey(item) === changeKey);
    if (!change) return;
    setCurrentChangeKey(getChangeKey(change));
    prepareCommand(commandText || '继续当前', change);
  }, [changes, commandText, prepareCommand]);

  const handleConfirmSend = useCallback(() => {
    if (!pendingPayload || !payloadDraft.trim()) return;
    if (!executePayload(payloadDraft)) return;
    setPendingIntent(null);
    setPendingPayload(null);
    setPayloadDraft('');
  }, [executePayload, payloadDraft, pendingPayload]);

  const handleCancelPending = useCallback(() => {
    setPendingIntent(null);
    setPendingPayload(null);
    setPayloadDraft('');
    setCommandError(null);
  }, []);

  return (
    <div className="openspec-dashboard">
      <div className="openspec-dashboard-header">
        <div className="openspec-dashboard-heading">
          <FolderGit2 size={15} />
          <span>SDD</span>
        </div>
        <button
          type="button"
          className="openspec-dashboard-icon-button"
          onClick={loadDashboard}
          disabled={loading || !rootPath}
          title="刷新 SDD Dashboard"
          aria-label="刷新 SDD Dashboard"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {rootLabel && (
        <div className="openspec-dashboard-root" title={rootPath}>
          {rootLabel}
        </div>
      )}

      <form className="openspec-command-panel" onSubmit={handleCommandSubmit}>
        <div className="openspec-command-meta">
          <span>{currentChange ? `当前：${getWorkflowLabel(currentChange.workflow)} · ${currentChange.name}` : '未设置当前 change'}</span>
        </div>
        <div className="openspec-command-row">
          <input
            value={commandText}
            onChange={(event) => setCommandText(event.target.value)}
            placeholder="继续当前 / 执行当前 / 验证当前 / 打开当前任务"
            className="openspec-command-input"
            disabled={!rootPath}
          />
          <button
            type="submit"
            className="openspec-command-send"
            title="执行或确认 SDD 命令"
            aria-label="执行或确认 SDD 命令"
            disabled={!rootPath || !commandText.trim()}
          >
            <Send size={13} />
          </button>
        </div>
        {commandNotice && (
          <div className="openspec-command-notice">{commandNotice}</div>
        )}
        {commandError && (
          <div className="openspec-command-error">{commandError}</div>
        )}
        {pendingIntent?.confidence === 'ambiguous' && pendingIntent.candidates.length > 0 && (
          <div className="openspec-command-candidates">
            {pendingIntent.candidates.map((candidate) => (
              <button
                key={`${candidate.workflow}:${candidate.name}`}
                type="button"
                className="openspec-command-candidate"
                onClick={() => handleCandidateSelect(`${candidate.workflow}:${candidate.name}`)}
                title={`${getWorkflowLabel(candidate.workflow)} · ${candidate.name}`}
              >
                {getWorkflowLabel(candidate.workflow)} · {candidate.name}
              </button>
            ))}
          </div>
        )}
        {pendingPayload && pendingIntent && (
          <div className="openspec-command-confirm">
            <div className="openspec-command-confirm-header">
              <span>{pendingPayload.title}</span>
              <button
                type="button"
                className="openspec-command-close"
                onClick={handleCancelPending}
                title="取消"
                aria-label="取消 SDD 命令"
              >
                <X size={12} />
              </button>
            </div>
            <div className="openspec-command-summary">
              {getSddIntentSummary(pendingIntent)}
            </div>
            {isHighRiskSddAction(pendingIntent.action) && (
              <div className="openspec-command-risk">高风险 action，需要确认后才会执行。</div>
            )}
            {pendingIntent.skippedActions.length > 0 && (
              <div className="openspec-command-skip">
                将跳过：{pendingIntent.skippedActions.join('、')}；确认后只执行当前目标 action。
              </div>
            )}
            <textarea
              className="openspec-command-payload"
              value={payloadDraft}
              onChange={(event) => setPayloadDraft(event.target.value)}
            />
            <div className="openspec-command-actions">
              <button
                type="button"
                className="openspec-command-action primary"
                onClick={handleConfirmSend}
                disabled={!payloadDraft.trim()}
              >
                执行
              </button>
              <button
                type="button"
                className="openspec-command-action"
                onClick={handleCancelPending}
              >
                取消
              </button>
            </div>
          </div>
        )}
      </form>

      {loading && (
        <div className="openspec-dashboard-state">Loading...</div>
      )}

      {!loading && error && (
        <div className="openspec-dashboard-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && !hasChanges && (
        <div className="openspec-dashboard-empty">
          <FileText size={18} />
          <span>无 active changes</span>
          <small>当前目录未发现可执行的 SDD change。</small>
        </div>
      )}

      {!loading && !error && hasChanges && (
        <div className="openspec-change-list">
          {changes.map((change) => (
            <section key={change.path} className="openspec-change-card">
              <div className="openspec-change-card-header">
                <div className="openspec-change-title" title={change.name}>
                  <span className="openspec-change-workflow">{getWorkflowLabel(change.workflow)}</span>
                  <span>{change.name}</span>
                </div>
                <div className="openspec-change-card-status">
                  {currentChangeKey === getChangeKey(change) && (
                    <span className="openspec-current-change">当前</span>
                  )}
                  <div className="openspec-next-action">
                    {ACTION_LABELS[change.nextAction]}
                  </div>
                </div>
              </div>

              <div className="openspec-artifact-grid">
                {change.artifactIds.map((artifactId) => {
                  const artifact = change.artifacts[artifactId];
                  if (!artifact) return null;
                  const present = artifact.state === 'present';
                  return (
                    <button
                      key={artifact.id}
                      type="button"
                      className={'openspec-artifact-pill' + (present ? ' present' : ' missing')}
                      onClick={() => handleOpenArtifact(artifact)}
                      disabled={!present}
                      title={getArtifactTitle(artifact)}
                    >
                      {present ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      <span>{ARTIFACT_LABELS[artifact.id]}</span>
                      {artifact.id === 'specs' && present && (
                        <span className="openspec-artifact-count">{artifact.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="openspec-task-row">
                <ListChecks size={14} />
                <span>{getTaskProgressLabel(change)}</span>
              </div>

              <div className="openspec-change-actions">
                <button
                  type="button"
                  className="openspec-change-action"
                  onClick={() => handleSetCurrentChange(change)}
                  title="设为当前 change，后续“继续当前 / 执行当前”等短口令默认使用它"
                >
                  <Star size={12} />
                  <span>设为当前</span>
                </button>
                <button
                  type="button"
                  className="openspec-change-action"
                  onClick={() => handlePrepareUpdateChange(change)}
                  title="执行 Update Change"
                >
                  <FileText size={12} />
                  <span>更新change</span>
                </button>
                <button
                  type="button"
                  className="openspec-change-action primary"
                  onClick={() => handlePrepareNextAction(change)}
                  title="执行推荐下一步"
                >
                  <Send size={12} />
                  <span>下一步</span>
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpenSpecDashboard;
