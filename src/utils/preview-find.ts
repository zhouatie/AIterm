export const FIND_HIGHLIGHT_ATTRIBUTE = 'data-preview-find-highlight';
export const FIND_HIGHLIGHT_CURRENT_ATTRIBUTE = 'data-preview-find-current';

const SKIPPED_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'SCRIPT', 'STYLE']);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unwrapExistingHighlights(root: HTMLElement) {
  const highlights = root.querySelectorAll<HTMLElement>(`span[${FIND_HIGHLIGHT_ATTRIBUTE}]`);
  highlights.forEach((highlight) => {
    const parent = highlight.parentNode;
    if (!parent) return;

    while (highlight.firstChild) {
      parent.insertBefore(highlight.firstChild, highlight);
    }
    parent.removeChild(highlight);
    parent.normalize();
  });
}

export interface ApplyPreviewFindHighlightsOptions {
  root: HTMLElement;
  query: string;
  currentIndex: number;
}

export function applyPreviewFindHighlights({
  root,
  query,
  currentIndex,
}: ApplyPreviewFindHighlightsOptions): HTMLElement[] {
  unwrapExistingHighlights(root);

  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const pattern = new RegExp(escapeRegExp(normalizedQuery), 'gi');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIPPED_TAG_NAMES.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(`[${FIND_HIGHLIGHT_ATTRIBUTE}]`)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  const matches: HTMLElement[] = [];

  textNodes.forEach((textNode) => {
    const text = textNode.textContent ?? '';
    pattern.lastIndex = 0;
    const nodeMatches = Array.from(text.matchAll(pattern));
    if (nodeMatches.length === 0) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    nodeMatches.forEach((match) => {
      const startIndex = match.index ?? 0;
      const matchText = match[0];
      if (startIndex > lastIndex) {
        fragment.append(document.createTextNode(text.slice(lastIndex, startIndex)));
      }

      const highlight = document.createElement('span');
      highlight.setAttribute(FIND_HIGHLIGHT_ATTRIBUTE, 'true');
      highlight.textContent = matchText;
      fragment.append(highlight);
      matches.push(highlight);
      lastIndex = startIndex + matchText.length;
    });

    if (lastIndex < text.length) {
      fragment.append(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  if (matches.length > 0) {
    const safeIndex = Math.min(Math.max(currentIndex, 0), matches.length - 1);
    matches[safeIndex]?.setAttribute(FIND_HIGHLIGHT_CURRENT_ATTRIBUTE, 'true');
  }

  return matches;
}

export function clearPreviewFindHighlights(root: HTMLElement) {
  unwrapExistingHighlights(root);
}
