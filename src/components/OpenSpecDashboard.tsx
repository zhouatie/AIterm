import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderGit2,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import type {
  OpenSpecArtifactId,
  OpenSpecArtifactStatus,
  OpenSpecChangeSummary,
  OpenSpecNextAction,
  OpenSpecWorkflowSummary,
} from '../utils/openspec-workflow';

interface OpenSpecDashboardProps {
  rootPath: string;
  onOpenFile: (filePath: string) => void;
}

const ACTION_LABELS: Record<OpenSpecNextAction, string> = {
  'create-proposal': '补 proposal',
  'continue-design-specs': '补 design/specs',
  'create-tasks': '补 tasks',
  apply: 'Apply',
  'verify-review-archive': 'Verify / Review / Archive',
  inspect: '检查 tasks',
};

const ARTIFACT_LABELS: Record<OpenSpecArtifactId, string> = {
  proposal: 'proposal',
  design: 'design',
  specs: 'specs',
  tasks: 'tasks',
};

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

const OpenSpecDashboard: React.FC<OpenSpecDashboardProps> = ({ rootPath, onOpenFile }) => {
  const [summary, setSummary] = useState<OpenSpecWorkflowSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const changes = summary?.changes ?? [];
  const hasChanges = changes.length > 0;
  const rootLabel = useMemo(() => {
    if (!rootPath) return '';
    const parts = rootPath.replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || rootPath;
  }, [rootPath]);

  const handleOpenArtifact = useCallback((artifact: OpenSpecArtifactStatus) => {
    const artifactPath = getArtifactPath(artifact);
    if (!artifactPath) return;
    onOpenFile(artifactPath);
  }, [onOpenFile]);

  return (
    <div className="openspec-dashboard">
      <div className="openspec-dashboard-header">
        <div className="openspec-dashboard-heading">
          <FolderGit2 size={15} />
          <span>OpenSpec</span>
        </div>
        <button
          type="button"
          className="openspec-dashboard-icon-button"
          onClick={loadDashboard}
          disabled={loading || !rootPath}
          title="刷新 OpenSpec Dashboard"
          aria-label="刷新 OpenSpec Dashboard"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {rootLabel && (
        <div className="openspec-dashboard-root" title={rootPath}>
          {rootLabel}
        </div>
      )}

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
          <small>当前目录未发现可执行的 OpenSpec change。</small>
        </div>
      )}

      {!loading && !error && hasChanges && (
        <div className="openspec-change-list">
          {changes.map((change) => (
            <section key={change.path} className="openspec-change-card">
              <div className="openspec-change-card-header">
                <div className="openspec-change-title" title={change.name}>
                  {change.name}
                </div>
                <div className="openspec-next-action">
                  {ACTION_LABELS[change.nextAction]}
                </div>
              </div>

              <div className="openspec-artifact-grid">
                {(Object.keys(ARTIFACT_LABELS) as OpenSpecArtifactId[]).map((artifactId) => {
                  const artifact = change.artifacts[artifactId];
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpenSpecDashboard;
