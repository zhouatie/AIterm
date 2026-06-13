import type {
  MarkdownCommentAnchor,
  MarkdownPreviewComment,
} from './markdown-comment-types';

const COMMENT_CONTEXT_LENGTH = 48;
const COMMENT_EDGE_PADDING = 8;
const COMMENT_GUTTER_WIDTH = 40;
const COMMENT_MARKER_SIZE = 24;
const COMMENT_SELECTION_TOOLBAR_GAP = 8;
const COMMENT_SELECTION_TOOLBAR_HEIGHT = 34;
const COMMENT_SELECTION_TOOLBAR_WIDTH = 34;
const SKIPPED_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'SCRIPT', 'STYLE']);

export interface MarkdownCommentRangeResolution {
  comment: MarkdownPreviewComment;
  range: Range | null;
  located: boolean;
}

export interface MarkdownCommentMarkerPosition {
  top: number;
  left: number;
}

export interface MarkdownCommentSelectionToolbarPosition {
  top: number;
  left: number;
  placement: 'above' | 'below';
}

interface TextSegment {
  node: Text;
  start: number;
  end: number;
}

interface TextIndex {
  text: string;
  segments: TextSegment[];
}

function isSkippedTextNode(node: Text): boolean {
  let element = node.parentElement;
  while (element) {
    if (SKIPPED_TAG_NAMES.has(element.tagName)) return true;
    element = element.parentElement;
  }
  return false;
}

function buildTextIndex(root: HTMLElement): TextIndex {
  const segments: TextSegment[] = [];
  let text = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (isSkippedTextNode(node)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const value = node.textContent ?? '';
    const start = text.length;
    text += value;
    segments.push({ node, start, end: text.length });
  }

  return { text, segments };
}

function nodeBelongsTo(root: HTMLElement, node: Node): boolean {
  return node === root || root.contains(node);
}

function getTextOffsetForBoundary(
  root: HTMLElement,
  index: TextIndex,
  node: Node,
  offset: number,
): number | null {
  if (!nodeBelongsTo(root, node)) return null;

  if (node instanceof Text) {
    const segment = index.segments.find((item) => item.node === node);
    if (!segment) return null;
    const safeOffset = Math.min(Math.max(offset, 0), node.textContent?.length ?? 0);
    return segment.start + safeOffset;
  }

  const range = document.createRange();
  try {
    range.setStart(root, 0);
    range.setEnd(node, offset);
  } catch {
    return null;
  }

  return Math.min(range.toString().length, index.text.length);
}

function getTextPosition(
  index: TextIndex,
  offset: number,
  bias: 'start' | 'end',
): { node: Text; offset: number } | null {
  for (const segment of index.segments) {
    if (bias === 'start' && offset >= segment.start && offset <= segment.end) {
      return { node: segment.node, offset: offset - segment.start };
    }
    if (bias === 'end' && offset > segment.start && offset <= segment.end) {
      return { node: segment.node, offset: offset - segment.start };
    }
  }

  const last = index.segments[index.segments.length - 1];
  if (last && offset === index.text.length) {
    return { node: last.node, offset: last.end - last.start };
  }

  return null;
}

function createRangeFromOffsets(root: HTMLElement, start: number, end: number): Range | null {
  if (start < 0 || end <= start) return null;

  const index = buildTextIndex(root);
  const rangeStart = getTextPosition(index, start, 'start');
  const rangeEnd = getTextPosition(index, end, 'end');
  if (!rangeStart || !rangeEnd) return null;

  const range = document.createRange();
  range.setStart(rangeStart.node, rangeStart.offset);
  range.setEnd(rangeEnd.node, rangeEnd.offset);
  return range;
}

function contextMatches(text: string, anchor: MarkdownCommentAnchor, start: number, end: number): number {
  let score = 0;
  if (!anchor.prefix || text.slice(Math.max(0, start - anchor.prefix.length), start) === anchor.prefix) {
    score += 2;
  }
  if (!anchor.suffix || text.slice(end, end + anchor.suffix.length) === anchor.suffix) {
    score += 2;
  }

  const distance = Math.abs(start - anchor.startTextOffset);
  if (distance === 0) score += 2;
  else if (distance < COMMENT_CONTEXT_LENGTH * 4) score += 1;

  return score;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getFirstRangeRect(range: Range): DOMRect | null {
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0);
  const rect = rects[0] ?? range.getBoundingClientRect();
  if (rect.height <= 0 && rect.width <= 0) return null;
  return rect;
}

export function createMarkdownCommentAnchorFromSelection(
  root: HTMLElement,
  selection: Selection | null,
): MarkdownCommentAnchor | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const sourceRange = selection.getRangeAt(0);
  if (!nodeBelongsTo(root, sourceRange.startContainer)
    || !nodeBelongsTo(root, sourceRange.endContainer)) {
    return null;
  }

  const index = buildTextIndex(root);
  const startOffset = getTextOffsetForBoundary(
    root,
    index,
    sourceRange.startContainer,
    sourceRange.startOffset,
  );
  const endOffset = getTextOffsetForBoundary(
    root,
    index,
    sourceRange.endContainer,
    sourceRange.endOffset,
  );

  if (startOffset === null || endOffset === null || endOffset <= startOffset) return null;

  const quote = index.text.slice(startOffset, endOffset);
  if (!quote.trim()) return null;

  return {
    quote,
    prefix: index.text.slice(Math.max(0, startOffset - COMMENT_CONTEXT_LENGTH), startOffset),
    suffix: index.text.slice(endOffset, endOffset + COMMENT_CONTEXT_LENGTH),
    startTextOffset: startOffset,
    endTextOffset: endOffset,
  };
}

export function resolveMarkdownCommentRange(
  root: HTMLElement,
  comment: MarkdownPreviewComment,
): MarkdownCommentRangeResolution {
  const index = buildTextIndex(root);
  const { anchor } = comment;
  const directStart = anchor.startTextOffset;
  const directEnd = anchor.endTextOffset;

  if (
    directStart >= 0
    && directEnd > directStart
    && directEnd <= index.text.length
    && index.text.slice(directStart, directEnd) === anchor.quote
  ) {
    const range = createRangeFromOffsets(root, directStart, directEnd);
    return { comment, range, located: range !== null };
  }

  let bestStart = -1;
  let bestScore = -1;
  let searchFrom = 0;
  while (searchFrom <= index.text.length) {
    const foundAt = index.text.indexOf(anchor.quote, searchFrom);
    if (foundAt === -1) break;

    const foundEnd = foundAt + anchor.quote.length;
    const score = contextMatches(index.text, anchor, foundAt, foundEnd);
    if (score > bestScore) {
      bestScore = score;
      bestStart = foundAt;
    }
    searchFrom = foundAt + Math.max(anchor.quote.length, 1);
  }

  if (bestStart === -1) {
    return { comment, range: null, located: false };
  }

  const range = createRangeFromOffsets(root, bestStart, bestStart + anchor.quote.length);
  return { comment, range, located: range !== null };
}

export function getMarkdownCommentGutterMarkerPosition(
  container: HTMLElement,
  range: Range,
): MarkdownCommentMarkerPosition | null {
  const rect = getFirstRangeRect(range);
  if (!rect) return null;

  const containerRect = container.getBoundingClientRect();
  const top = container.scrollTop
    + (rect.top - containerRect.top)
    + ((rect.height - COMMENT_MARKER_SIZE) / 2);
  const left = container.scrollLeft
    + container.clientWidth
    - COMMENT_GUTTER_WIDTH
    + ((COMMENT_GUTTER_WIDTH - COMMENT_MARKER_SIZE) / 2);

  return {
    top: Math.max(top, 0),
    left: Math.max(left, container.scrollLeft + COMMENT_EDGE_PADDING),
  };
}

export function getMarkdownCommentSelectionToolbarPosition(
  container: HTMLElement,
  range: Range,
): MarkdownCommentSelectionToolbarPosition | null {
  const rect = getFirstRangeRect(range);
  if (!rect) return null;

  const containerRect = container.getBoundingClientRect();
  const selectionTop = container.scrollTop + (rect.top - containerRect.top);
  const selectionBottom = selectionTop + rect.height;
  const selectionCenter = container.scrollLeft
    + (rect.left - containerRect.left)
    + (rect.width / 2);
  const visibleLeft = container.scrollLeft + COMMENT_EDGE_PADDING;
  const visibleRight = container.scrollLeft
    + container.clientWidth
    - COMMENT_SELECTION_TOOLBAR_WIDTH
    - COMMENT_EDGE_PADDING;
  const visibleTop = container.scrollTop + COMMENT_EDGE_PADDING;
  const visibleBottom = container.scrollTop
    + container.clientHeight
    - COMMENT_SELECTION_TOOLBAR_HEIGHT
    - COMMENT_EDGE_PADDING;
  const preferredTop = selectionTop - COMMENT_SELECTION_TOOLBAR_HEIGHT - COMMENT_SELECTION_TOOLBAR_GAP;
  const placement = preferredTop >= visibleTop ? 'above' : 'below';
  const fallbackTop = selectionBottom + COMMENT_SELECTION_TOOLBAR_GAP;

  return {
    top: clamp(placement === 'above' ? preferredTop : fallbackTop, visibleTop, visibleBottom),
    left: clamp(selectionCenter - (COMMENT_SELECTION_TOOLBAR_WIDTH / 2), visibleLeft, visibleRight),
    placement,
  };
}
