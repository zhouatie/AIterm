export interface ToggleMarkdownTaskMarkerResult {
  content?: string;
  error?: string;
}

export type SddTaskWorkflow = 'openspec' | 'raven';

export interface SddTaskDocumentContext {
  workflow: SddTaskWorkflow;
  changeName: string;
  taskFilePath: string;
}

export interface MarkdownTaskItem {
  index: number;
  lineNumber: number;
  text: string;
  completed: boolean;
  indent: number;
  groupId: string | null;
  groupTitle: string | null;
}

export interface MarkdownTaskGroup {
  id: string;
  index: number;
  title: string;
  level: number;
  lineNumber: number;
  startLine: number;
  endLine: number;
  tasks: MarkdownTaskItem[];
  incompleteTasks: MarkdownTaskItem[];
}

export interface MarkdownTaskDocument {
  items: MarkdownTaskItem[];
  groups: MarkdownTaskGroup[];
}

export interface MarkdownTaskApplyItemTarget {
  kind: 'item';
  item: MarkdownTaskItem;
}

export interface MarkdownTaskApplyGroupTarget {
  kind: 'group';
  group: MarkdownTaskGroup;
}

export type MarkdownTaskApplyTarget = MarkdownTaskApplyItemTarget | MarkdownTaskApplyGroupTarget;

const TASK_MARKER_LINE_PATTERN = /^(\s*[-*+]\s+\[)( |x|X)(\])/;
const TASK_ITEM_LINE_PATTERN = /^(\s*)[-*+]\s+\[( |x|X)\]\s*(.*)$/;
const HEADING_LINE_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCED_CODE_BLOCK_PATTERN = /^\s*(```|~~~)/;

function normalizePathSeparators(value: string): string {
  return value.replace(/\\/g, '/');
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function stripLeadingDotSlash(value: string): string {
  return value.replace(/^\.\/+/, '');
}

function toProjectRelativePath(rootPath: string, filePath: string): string {
  const normalizedFilePath = stripLeadingDotSlash(normalizePathSeparators(filePath).trim());
  const normalizedRootPath = trimTrailingSlash(normalizePathSeparators(rootPath).trim());

  if (!normalizedFilePath) return normalizedFilePath;
  if (!normalizedRootPath) return normalizedFilePath;
  if (normalizedFilePath === normalizedRootPath) return '';
  if (normalizedFilePath.startsWith(normalizedRootPath + '/')) {
    return normalizedFilePath.slice(normalizedRootPath.length + 1);
  }

  return normalizedFilePath;
}

function normalizeHeadingText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeTaskText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function createTaskGroup(index: number, level: number, title: string, lineNumber: number): MarkdownTaskGroup {
  return {
    id: `heading-${index}`,
    index,
    title,
    level,
    lineNumber,
    startLine: lineNumber,
    endLine: lineNumber,
    tasks: [],
    incompleteTasks: [],
  };
}

function addTaskToGroup(group: MarkdownTaskGroup, task: MarkdownTaskItem) {
  group.tasks.push(task);
  if (!task.completed) {
    group.incompleteTasks.push(task);
  }
}

export function resolveSddTaskDocumentContext(
  rootPath: string,
  filePath: string | null,
): SddTaskDocumentContext | null {
  if (!filePath) return null;

  const relativeFilePath = toProjectRelativePath(rootPath, filePath);
  const parts = relativeFilePath.split('/').filter(Boolean);
  if (
    parts.length === 4
    && parts[0] === 'openspec'
    && parts[1] === 'changes'
    && parts[2]
    && parts[3] === 'tasks.md'
  ) {
    return {
      workflow: 'openspec',
      changeName: parts[2],
      taskFilePath: relativeFilePath,
    };
  }

  if (
    parts.length === 4
    && parts[0] === 'ravenspec'
    && parts[1] === 'changes'
    && parts[2]
    && parts[3] === 'TASK.md'
  ) {
    return {
      workflow: 'raven',
      changeName: parts[2],
      taskFilePath: relativeFilePath,
    };
  }

  return null;
}

export function parseMarkdownTaskDocument(content: string): MarkdownTaskDocument {
  const lines = content.split(/\r?\n/);
  const items: MarkdownTaskItem[] = [];
  const groups: MarkdownTaskGroup[] = [];
  const activeGroupIndexes: number[] = [];
  let inFencedCodeBlock = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (FENCED_CODE_BLOCK_PATTERN.test(line)) {
      inFencedCodeBlock = !inFencedCodeBlock;
      return;
    }

    if (inFencedCodeBlock) return;

    const headingMatch = HEADING_LINE_PATTERN.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      while (activeGroupIndexes.length > 0) {
        const activeGroup = groups[activeGroupIndexes[activeGroupIndexes.length - 1]];
        if (activeGroup.level < level) break;
        activeGroup.endLine = lineNumber - 1;
        activeGroupIndexes.pop();
      }

      const title = normalizeHeadingText(headingMatch[2]);
      const group = createTaskGroup(groups.length, level, title, lineNumber);
      groups.push(group);
      activeGroupIndexes.push(group.index);
      return;
    }

    const taskMatch = TASK_ITEM_LINE_PATTERN.exec(line);
    if (!taskMatch) return;

    const closestGroup = activeGroupIndexes.length > 0
      ? groups[activeGroupIndexes[activeGroupIndexes.length - 1]]
      : null;
    const marker = taskMatch[2];
    const task: MarkdownTaskItem = {
      index: items.length,
      lineNumber,
      text: normalizeTaskText(taskMatch[3]),
      completed: marker === 'x' || marker === 'X',
      indent: taskMatch[1].length,
      groupId: closestGroup?.id ?? null,
      groupTitle: closestGroup?.title ?? null,
    };

    items.push(task);
    for (const groupIndex of activeGroupIndexes) {
      addTaskToGroup(groups[groupIndex], task);
    }
  });

  for (const groupIndex of activeGroupIndexes) {
    groups[groupIndex].endLine = lines.length;
  }

  return { items, groups };
}

export function toggleMarkdownTaskMarker(
  content: string,
  taskIndex: number,
): ToggleMarkdownTaskMarkerResult {
  if (!Number.isInteger(taskIndex) || taskIndex < 0) {
    return { error: 'Invalid task index.' };
  }

  let inFencedCodeBlock = false;
  let currentIndex = 0;
  const lines = content.split(/(\r?\n)/);

  for (let index = 0; index < lines.length; index += 2) {
    const line = lines[index];
    if (FENCED_CODE_BLOCK_PATTERN.test(line)) {
      inFencedCodeBlock = !inFencedCodeBlock;
      continue;
    }

    if (inFencedCodeBlock) continue;

    const match = TASK_MARKER_LINE_PATTERN.exec(line);
    if (!match) continue;

    if (currentIndex === taskIndex) {
      const [, prefix, marker, suffix] = match;
      lines[index] = line.replace(
        TASK_MARKER_LINE_PATTERN,
        `${prefix}${marker === ' ' ? 'x' : ' '}${suffix}`,
      );
      return { content: lines.join('') };
    }

    currentIndex += 1;
  }

  return { error: 'Task marker not found.' };
}
