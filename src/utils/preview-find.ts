export const PREVIEW_FIND_HIGHLIGHT_NAME = 'preview-find-highlight';
export const PREVIEW_FIND_CURRENT_NAME = 'preview-find-current';

const SKIPPED_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'SCRIPT', 'STYLE']);

type PreviewHighlightInstance = object;

interface CSSHighlightsRegistry {
  set(name: string, highlight: PreviewHighlightInstance): void;
  delete(name: string): void;
}

interface HighlightConstructor {
  new (...ranges: Range[]): PreviewHighlightInstance;
}

type HighlightWindow = Window & {
  Highlight: HighlightConstructor;
};

type HighlightCSS = typeof CSS & {
  highlights: CSSHighlightsRegistry;
};

export interface PreviewFindMatch {
  range: Range;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getHighlightConstructor(): HighlightConstructor {
  return (window as HighlightWindow).Highlight;
}

function getHighlightRegistry(): CSSHighlightsRegistry {
  return (CSS as HighlightCSS).highlights;
}

export interface CollectPreviewFindMatchesOptions {
  root: HTMLElement;
  query: string;
}

export interface ApplyPreviewFindHighlightsOptions {
  matches: PreviewFindMatch[];
  currentIndex: number;
}

export function collectPreviewFindMatches({
  root,
  query,
}: CollectPreviewFindMatchesOptions): PreviewFindMatch[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const pattern = new RegExp(escapeRegExp(normalizedQuery), 'gi');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIPPED_TAG_NAMES.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const matches: PreviewFindMatch[] = [];

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const text = textNode.textContent ?? '';
    pattern.lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const startOffset = match.index ?? 0;
      const endOffset = startOffset + match[0].length;
      const range = document.createRange();
      range.setStart(textNode, startOffset);
      range.setEnd(textNode, endOffset);
      matches.push({ range });
    }
  }

  return matches;
}

export function clearPreviewFindHighlights() {
  const registry = getHighlightRegistry();
  registry.delete(PREVIEW_FIND_HIGHLIGHT_NAME);
  registry.delete(PREVIEW_FIND_CURRENT_NAME);
}

export function applyPreviewFindHighlights({
  matches,
  currentIndex,
}: ApplyPreviewFindHighlightsOptions): PreviewFindMatch[] {
  clearPreviewFindHighlights();
  if (matches.length === 0) return matches;

  const Highlight = getHighlightConstructor();
  const registry = getHighlightRegistry();
  registry.set(
    PREVIEW_FIND_HIGHLIGHT_NAME,
    new Highlight(...matches.map((match) => match.range)),
  );

  const safeIndex = Math.min(Math.max(currentIndex, 0), matches.length - 1);
  const currentMatch = matches[safeIndex];
  if (currentMatch) {
    registry.set(PREVIEW_FIND_CURRENT_NAME, new Highlight(currentMatch.range));
  }

  return matches;
}

export function scrollPreviewFindMatchIntoView(
  container: HTMLElement,
  match: PreviewFindMatch | undefined,
) {
  if (!match) return;

  const rangeRect = match.range.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (rangeRect.height > 0) {
    const nextScrollTop = container.scrollTop
      + (rangeRect.top - containerRect.top)
      - ((container.clientHeight - rangeRect.height) / 2);
    container.scrollTo({ top: Math.max(nextScrollTop, 0) });
    return;
  }

  const anchorNode = match.range.startContainer;
  const anchorElement = anchorNode instanceof Text ? anchorNode.parentElement : null;
  anchorElement?.scrollIntoView({
    block: 'center',
    inline: 'nearest',
  });
}
