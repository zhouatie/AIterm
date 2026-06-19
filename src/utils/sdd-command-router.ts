import type {
  OpenSpecArtifactId,
  OpenSpecChangeSummary,
  OpenSpecNextAction,
} from './openspec-workflow';
import { wrapBracketedPaste } from './bracketed-paste';

export type SddWorkflow = 'openspec' | 'raven' | 'unknown';

export type SddCommandAction =
  | 'explore'
  | 'propose'
  | 'continue'
  | 'apply'
  | 'verify'
  | 'review'
  | 'archive'
  | 'sync-specs'
  | 'update-change'
  | 'open-artifact'
  | 'update-artifact'
  | 'set-current-change'
  | 'unknown';

export type SddCommandConfidence = 'ready' | 'needs-confirmation' | 'ambiguous' | 'unsupported';

export type SddCommandRisk = 'low' | 'high';

export type SddSkippedAction = 'plan-review' | 'verify';

export interface CurrentSddChange {
  workflow: Exclude<SddWorkflow, 'unknown'>;
  changeName: string;
  rootPath: string;
}

export interface SddCommandCandidate {
  workflow: Exclude<SddWorkflow, 'unknown'>;
  name: string;
  path: string;
}

export interface SddCommandIntent {
  workflow: SddWorkflow;
  action: SddCommandAction;
  changeName: string | null;
  artifact: OpenSpecArtifactId | null;
  originalText: string;
  normalizedText: string;
  confidence: SddCommandConfidence;
  risk: SddCommandRisk;
  skippedActions: SddSkippedAction[];
  message: string | null;
  candidates: SddCommandCandidate[];
  source: 'manual' | 'dashboard-next-action';
}

export interface ParseSddCommandOptions {
  text: string;
  rootPath: string;
  currentChange: CurrentSddChange | null;
  changes: OpenSpecChangeSummary[];
  nextActionChange?: OpenSpecChangeSummary | null;
}

export interface SddCommandPayload {
  title: string;
  preview: string;
  terminalInput: string;
  risk: SddCommandRisk;
}

const ACTION_LABELS: Record<SddCommandAction, string> = {
  explore: '探索',
  propose: '提案',
  continue: '继续',
  apply: '执行',
  verify: '验证',
  review: '评审',
  archive: '归档',
  'sync-specs': '同步 specs',
  'update-change': '更新 change',
  'open-artifact': '打开产物',
  'update-artifact': '更新产物',
  'set-current-change': '设为当前',
  unknown: '未知',
};

const ARTIFACT_LABELS: Record<OpenSpecArtifactId, string> = {
  proposal: 'proposal',
  prd: 'PRD',
  design: 'design',
  specs: 'specs',
  tasks: 'tasks',
  task: 'TASK',
};

const HIGH_RISK_ACTIONS = new Set<SddCommandAction>(['apply', 'archive']);

function normalizeText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function includesAny(value: string, aliases: string[]): boolean {
  return aliases.some((alias) => value.includes(alias));
}

function getCommandSegment(normalizedText: string): string {
  const colonIndexes = [normalizedText.indexOf('：'), normalizedText.indexOf(':')]
    .filter((index) => index >= 0);
  const colonIndex = colonIndexes.length > 0 ? Math.min(...colonIndexes) : -1;
  return colonIndex >= 0 ? normalizedText.slice(0, colonIndex) : normalizedText;
}

function detectWorkflow(commandText: string): SddWorkflow | null {
  if (includesAny(commandText, ['raven', 'ravenspec', 'raven spec', 'ravensback', '瑞文'])) {
    return 'raven';
  }
  if (includesAny(commandText, ['openspec', 'open spec', 'open-spec'])) {
    return 'openspec';
  }
  return null;
}

function isSyncRequest(normalizedText: string): boolean {
  return /\bsync\b/.test(normalizedText)
    || includesAny(normalizedText, ['sync specs', 'sync-specs', '同步当前', '同步 change', '同步 specs', '同步 spec', '同步规格', '同步规范']);
}

function detectArtifact(normalizedText: string): OpenSpecArtifactId | null {
  if (includesAny(normalizedText, ['prd', '需求文档'])) return 'prd';
  if (includesAny(normalizedText, ['proposal', '提案'])) return 'proposal';
  if (includesAny(normalizedText, ['design', '设计'])) return 'design';
  if (includesAny(normalizedText, ['specs', 'spec ', '规格', '规范'])) return 'specs';
  if (includesAny(normalizedText, ['task.md', 'TASK.md'.toLowerCase()])) return 'task';
  if (includesAny(normalizedText, ['tasks', 'task', '任务'])) return 'tasks';
  return null;
}

function detectAction(normalizedText: string, artifact: OpenSpecArtifactId | null): SddCommandAction {
  if (includesAny(normalizedText, ['设为当前', '设置当前', 'set current'])) return 'set-current-change';
  if (includesAny(normalizedText, ['下一步', 'next step', 'next'])) return 'continue';
  if (isSyncRequest(normalizedText)) return 'sync-specs';
  if (
    includesAny(normalizedText, ['更新当前 change', '更新当前change', '更新 change', '收敛当前', '修正当前 change', '修正当前change', 'update change'])
    || (includesAny(normalizedText, ['update', '更新', '修正']) && includesAny(normalizedText, ['change', '当前']))
  ) {
    return 'update-change';
  }
  if (artifact && includesAny(normalizedText, ['打开', 'open'])) return 'open-artifact';
  if (artifact && includesAny(normalizedText, ['记到', '写到', '更新', 'update'])) return 'update-artifact';
  if (includesAny(normalizedText, ['探索', '想一下', 'explore', 'open spec explore', 'openspec explore'])) return 'explore';
  if (includesAny(normalizedText, ['提案', '生成提案', 'proposal', 'propose'])) return 'propose';
  if (includesAny(normalizedText, ['继续', '补齐', 'continue'])) return 'continue';
  if (includesAny(normalizedText, ['执行', '实现', 'apply', 'open spec apply', 'openspec apply'])) return 'apply';
  if (includesAny(normalizedText, ['验证', '验收', 'verify'])) return 'verify';
  if (includesAny(normalizedText, ['评审', 'review'])) return 'review';
  if (includesAny(normalizedText, ['归档', 'archive', 'achieve', 'achieve change'])) return 'archive';
  if (normalizedText.length > 0) return 'propose';
  return 'unknown';
}

function actionRequiresChange(action: SddCommandAction): boolean {
  return !['explore', 'propose', 'unknown'].includes(action);
}

function detectSkippedActions(normalizedText: string): SddSkippedAction[] {
  const hasSkipIntent = includesAny(normalizedText, ['跳过', '不用', '不需要', '无需', 'skip', 'without']);
  if (!hasSkipIntent) return [];

  const skipped = new Set<SddSkippedAction>();
  if (includesAny(normalizedText, ['plan review', 'plan-review', '计划评审', '方案评审'])) {
    skipped.add('plan-review');
  }
  if (includesAny(normalizedText, ['verify', '验证', '验收'])) {
    skipped.add('verify');
  }
  return [...skipped];
}

function applySkippedActionOverride(action: SddCommandAction, normalizedText: string, skippedActions: SddSkippedAction[]): SddCommandAction {
  if (skippedActions.includes('plan-review') && includesAny(normalizedText, ['apply', '执行', '实现'])) {
    return 'apply';
  }
  if (skippedActions.includes('verify') && includesAny(normalizedText, ['archive', '归档', 'achieve'])) {
    return 'archive';
  }
  return action;
}

function getWorkflowLabel(workflow: SddWorkflow): string {
  if (workflow === 'raven') return 'RavenSpec';
  if (workflow === 'openspec') return 'OpenSpec';
  return 'SDD';
}

function findExplicitChange(
  normalizedText: string,
  changes: OpenSpecChangeSummary[],
  workflow: SddWorkflow | null,
): OpenSpecChangeSummary | null {
  const candidates = workflow && workflow !== 'unknown'
    ? changes.filter((change) => change.workflow === workflow)
    : changes;
  return candidates.find((change) => normalizedText.includes(change.name.toLowerCase())) ?? null;
}

function getCurrentChangeSummary(
  currentChange: CurrentSddChange | null,
  changes: OpenSpecChangeSummary[],
): OpenSpecChangeSummary | null {
  if (!currentChange) return null;
  return changes.find((change) => (
    change.workflow === currentChange.workflow
    && change.name === currentChange.changeName
  )) ?? null;
}

export function mapNextActionToCommandAction(nextAction: OpenSpecNextAction): SddCommandAction {
  if (nextAction === 'apply') return 'apply';
  if (nextAction === 'verify-review-archive') return 'verify';
  if (nextAction === 'inspect') return 'open-artifact';
  return 'continue';
}

export function createDashboardCommandText(nextAction: OpenSpecNextAction): string {
  const action = mapNextActionToCommandAction(nextAction);
  if (action === 'apply') return '执行当前';
  if (action === 'verify') return '验证当前';
  if (action === 'open-artifact') return '打开当前任务';
  return '继续当前';
}

export function isHighRiskSddAction(action: SddCommandAction): boolean {
  return HIGH_RISK_ACTIONS.has(action);
}

export function getSddActionLabel(action: SddCommandAction): string {
  return ACTION_LABELS[action];
}

export function getSddArtifactLabel(artifact: OpenSpecArtifactId | null): string {
  return artifact ? ARTIFACT_LABELS[artifact] : '-';
}

export function parseSddCommand({
  text,
  rootPath,
  currentChange,
  changes,
  nextActionChange = null,
}: ParseSddCommandOptions): SddCommandIntent {
  const originalText = text.trim();
  const normalizedText = normalizeText(originalText);
  const commandText = getCommandSegment(normalizedText);
  const explicitWorkflow = detectWorkflow(commandText);
  const skippedActions = detectSkippedActions(commandText);
  const artifact = detectArtifact(normalizedText);
  let action = applySkippedActionOverride(detectAction(commandText, artifact), commandText, skippedActions);
  const source = includesAny(normalizedText, ['下一步', 'next step', 'next'])
    ? 'dashboard-next-action'
    : 'manual';

  if (explicitWorkflow === 'openspec' && action === 'sync-specs') {
    return {
      workflow: 'openspec',
      action: 'unknown',
      changeName: null,
      artifact,
      originalText,
      normalizedText,
      confidence: 'unsupported',
      risk: 'low',
      skippedActions,
      message: 'OpenSpec sync-specs 当前暂不支持。',
      candidates: [],
      source,
    };
  }

  const explicitChange = findExplicitChange(normalizedText, changes, explicitWorkflow);
  const currentChangeSummary = nextActionChange ?? getCurrentChangeSummary(currentChange, changes);
  let workflow: SddWorkflow = explicitWorkflow
    ?? explicitChange?.workflow
    ?? currentChangeSummary?.workflow
    ?? (changes.length === 1 ? changes[0].workflow : null)
    ?? 'openspec';

  if (source === 'dashboard-next-action' && currentChangeSummary) {
    action = mapNextActionToCommandAction(currentChangeSummary.nextAction);
    workflow = currentChangeSummary.workflow;
  }

  if (workflow === 'openspec' && action === 'sync-specs') {
    return {
      workflow: 'openspec',
      action: 'unknown',
      changeName: null,
      artifact,
      originalText,
      normalizedText,
      confidence: 'unsupported',
      risk: 'low',
      skippedActions,
      message: 'OpenSpec sync-specs 当前暂不支持。',
      candidates: [],
      source,
    };
  }

  const needsChange = actionRequiresChange(action);
  let changeName = explicitChange?.name ?? currentChangeSummary?.name ?? null;
  const workflowChanges = workflow === 'unknown'
    ? changes
    : changes.filter((change) => change.workflow === workflow);

  if (!changeName && needsChange && workflowChanges.length === 1) {
    changeName = workflowChanges[0].name;
    workflow = workflowChanges[0].workflow;
  }

  if (!changeName && needsChange) {
    return {
      workflow,
      action,
      changeName: null,
      artifact: action === 'open-artifact' && !artifact ? (workflow === 'raven' ? 'task' : 'tasks') : artifact,
      originalText,
      normalizedText,
      confidence: 'ambiguous',
      risk: isHighRiskSddAction(action) ? 'high' : 'low',
      skippedActions,
      message: workflowChanges.length > 1 ? '请选择目标 change。' : `当前没有可用的 ${getWorkflowLabel(workflow)} change。`,
      candidates: workflowChanges.map((change) => ({ workflow: change.workflow, name: change.name, path: change.path })),
      source,
    };
  }

  if (action === 'unknown') {
    return {
      workflow,
      action,
      changeName,
      artifact,
      originalText,
      normalizedText,
      confidence: 'ambiguous',
      risk: 'low',
      skippedActions,
      message: '无法识别 SDD action。',
      candidates: [],
      source,
    };
  }

  return {
    workflow,
    action,
    changeName,
    artifact: action === 'open-artifact' && !artifact ? (workflow === 'raven' ? 'task' : 'tasks') : artifact,
    originalText,
    normalizedText,
    confidence: action === 'propose' && !includesAny(normalizedText, ['提案', 'proposal', 'propose'])
      ? 'needs-confirmation'
      : 'ready',
    risk: isHighRiskSddAction(action) ? 'high' : 'low',
    skippedActions,
    message: null,
    candidates: [],
    source,
  };
}

function formatChangeSuffix(changeName: string | null): string {
  return changeName ? ` ${changeName}` : '';
}

function buildOpenSpecCommand(intent: SddCommandIntent): string {
  switch (intent.action) {
    case 'explore':
      return `$openspec-explore ${intent.originalText}`.trim();
    case 'propose':
      return `$openspec-propose ${intent.originalText}`.trim();
    case 'continue':
      return `$openspec-continue-change${formatChangeSuffix(intent.changeName)}`;
    case 'apply':
      return `$openspec-apply-change${formatChangeSuffix(intent.changeName)}`;
    case 'verify':
      return `$openspec-verify-change${formatChangeSuffix(intent.changeName)}`;
    case 'review':
      return `$openspec-review ${intent.changeName ?? ''}`.trim();
    case 'archive':
      return `$openspec-archive-change${formatChangeSuffix(intent.changeName)}`;
    case 'sync-specs':
      return intent.originalText;
    case 'update-change':
      return buildUpdateChangeCommand(intent);
    case 'update-artifact':
      return [
        `请更新 OpenSpec change ${intent.changeName ?? '当前 change'} 的 ${getSddArtifactLabel(intent.artifact)} artifact。`,
        '',
        `原始输入：${intent.originalText}`,
      ].join('\n');
    default:
      return intent.originalText;
  }
}

function buildUpdateChangeCommand(intent: SddCommandIntent): string {
  const command = intent.workflow === 'raven'
    ? `$ddd-update-change${formatChangeSuffix(intent.changeName)}`
    : `$openspec-update-change${formatChangeSuffix(intent.changeName)}`;
  const detail = extractUpdateChangeDetail(intent.originalText);
  return detail ? [command, '', detail].join('\n') : command;
}

function buildRavenSpecCommand(intent: SddCommandIntent): string {
  switch (intent.action) {
    case 'explore':
      return `$sdd-explore ${intent.originalText}`.trim();
    case 'propose':
      return `$sdd-new-change ${intent.originalText}`.trim();
    case 'continue':
      return `$sdd-continue-change${formatChangeSuffix(intent.changeName)}`;
    case 'apply':
      return `$sdd-apply-change${formatChangeSuffix(intent.changeName)}`;
    case 'verify':
      return `$sdd-verify-change${formatChangeSuffix(intent.changeName)}`;
    case 'review':
      return `$sdd-plan-review ${intent.changeName ?? ''} --artifact all`.trim();
    case 'archive':
      return `$sdd-archive-change${formatChangeSuffix(intent.changeName)}`;
    case 'sync-specs':
      return `$sdd-sync-specs${formatChangeSuffix(intent.changeName)}`;
    case 'update-change':
      return buildUpdateChangeCommand(intent);
    case 'update-artifact':
      return [
        `请更新 RavenSpec change ${intent.changeName ?? '当前 change'} 的 ${getSddArtifactLabel(intent.artifact)} artifact。`,
        '',
        `原始输入：${intent.originalText}`,
      ].join('\n');
    default:
      return intent.originalText;
  }
}

function extractUpdateChangeDetail(originalText: string): string {
  const trimmed = originalText.trim();
  const colonIndexes = [trimmed.indexOf('：'), trimmed.indexOf(':')]
    .filter((index) => index >= 0);
  const colonIndex = colonIndexes.length > 0 ? Math.min(...colonIndexes) : -1;
  if (colonIndex >= 0) {
    return trimmed.slice(colonIndex + 1).trim();
  }

  const detail = trimmed
    .replace(/更新当前\s*change/gi, '')
    .replace(/更新\s*change/gi, '')
    .replace(/更新当前/gi, '')
    .replace(/收敛当前/gi, '')
    .replace(/修正当前\s*change/gi, '')
    .replace(/update\s+change/gi, '')
    .replace(/^[:：]+/, '')
    .trim();

  return detail;
}

export function buildSddCommandPayload(intent: SddCommandIntent): SddCommandPayload {
  if (intent.workflow === 'unknown') {
    throw new Error('当前无法确定 SDD workflow。');
  }
  if (intent.confidence === 'unsupported') {
    throw new Error(intent.message ?? '当前 SDD 命令暂不支持。');
  }
  if (intent.action === 'open-artifact' || intent.action === 'set-current-change' || intent.action === 'unknown') {
    throw new Error('该 action 不需要发送到 terminal。');
  }

  const preview = intent.workflow === 'raven'
    ? buildRavenSpecCommand(intent)
    : buildOpenSpecCommand(intent);
  return {
    title: `${getWorkflowLabel(intent.workflow)} · ${getSddActionLabel(intent.action)}${intent.changeName ? ` · ${intent.changeName}` : ''}`,
    preview,
    terminalInput: wrapBracketedPaste(preview),
    risk: intent.risk,
  };
}

export function getSddIntentSummary(intent: SddCommandIntent): string {
  const parts = [
    `workflow=${intent.workflow}`,
    `action=${intent.action}`,
    `change=${intent.changeName ?? '-'}`,
    `artifact=${intent.artifact ?? '-'}`,
    `skip=${intent.skippedActions.length > 0 ? intent.skippedActions.join(',') : '-'}`,
  ];
  return parts.join(' ');
}
