import type { MarkdownPreviewComment } from './markdown-comment-types';

export interface MarkdownCommentAgentPayloadOptions {
  rootPath: string;
  filePath?: string | null;
  comments: MarkdownPreviewComment[];
}

interface CommentWorkflowInfo {
  workflow: 'openspec' | 'raven' | 'unknown';
  changeName?: string;
}

const BRACKETED_PASTE_START = '\x1b[200~';
const BRACKETED_PASTE_END = '\x1b[201~';

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

function inferWorkflowInfo(relativeFilePath: string): CommentWorkflowInfo {
  const parts = relativeFilePath.split('/').filter(Boolean);
  if (parts[0] === 'openspec' && parts[1] === 'changes' && parts[2]) {
    return { workflow: 'openspec', changeName: parts[2] };
  }
  if (parts[0] === 'ravenspec' && parts[1] === 'changes' && parts[2]) {
    return { workflow: 'raven', changeName: parts[2] };
  }
  return { workflow: 'unknown' };
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeBlockText(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
}

function createFenceFor(value: string): string {
  const matches = value.match(/`+/g);
  let longestRun = 0;
  for (const match of matches ?? []) {
    longestRun = Math.max(longestRun, match.length);
  }
  return '`'.repeat(Math.max(3, longestRun + 1));
}

function formatFencedField(label: string, value: string, info = ''): string {
  const normalizedValue = normalizeBlockText(value);
  const fence = createFenceFor(normalizedValue);
  const fenceLine = info ? fence + info : fence;
  return `${label}:\n${fenceLine}\n${normalizedValue}\n${fence}`;
}

function formatCommentBlock(
  rootPath: string,
  fallbackFilePath: string | null | undefined,
  comment: MarkdownPreviewComment,
): string {
  const relativeFilePath = toProjectRelativePath(rootPath, comment.filePath || fallbackFilePath || '');
  const workflowInfo = inferWorkflowInfo(relativeFilePath);
  const changeAttribute = workflowInfo.changeName
    ? ` change="${escapeAttribute(workflowInfo.changeName)}"`
    : '';

  return [
    `<aiterm-comment id="${escapeAttribute(comment.id)}" workflow="${workflowInfo.workflow}"${changeAttribute}>`,
    `@${relativeFilePath}`,
    '',
    formatFencedField('selected_text', comment.anchor.quote, 'md'),
    '',
    formatFencedField('comment', comment.body, 'text'),
    '</aiterm-comment>',
  ].join('\n');
}

export function buildMarkdownCommentAgentPayload({
  rootPath,
  filePath,
  comments,
}: MarkdownCommentAgentPayloadOptions): string {
  if (comments.length === 0) return '';

  const blocks = comments.map((comment) => formatCommentBlock(rootPath, filePath, comment));
  const payload = comments.length === 1
    ? [
        '请处理这条 AIterm Markdown 评论：按 comment 修改 @ 文件；若 workflow 是 openspec 或 raven，先更新对应 spec/change artifacts，必要时再改代码；不明确先问我。',
        '',
        blocks[0],
      ].join('\n')
    : [
        '请处理以下 AIterm Markdown 评论。规则：',
        '1. 每个 <aiterm-comment> 是一条独立评论。',
        '2. @ 后面的文件是评论所在文件。',
        '3. selected_text 是用户评论锚定的原文。',
        '4. comment 是用户希望你处理的意见。',
        '5. 如果文件属于 openspec/changes 或 ravenspec/changes，优先更新对应 spec/change artifacts；需要代码修改时再继续实现。',
        '6. 如果评论意图不明确，先问我。',
        '',
        blocks.join('\n\n'),
        '',
      ].join('\n');

  return BRACKETED_PASTE_START + payload + BRACKETED_PASTE_END;
}
