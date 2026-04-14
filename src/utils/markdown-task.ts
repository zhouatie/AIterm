export interface ToggleMarkdownTaskMarkerResult {
  content?: string;
  error?: string;
}

const TASK_MARKER_LINE_PATTERN = /^(\s*[-*+]\s+\[)( |x|X)(\])/;
const FENCED_CODE_BLOCK_PATTERN = /^\s*(```|~~~)/;

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
