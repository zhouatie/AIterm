export interface MarkdownFrontmatterProperty {
  kind: 'property';
  key: string;
  value: string;
  indent: number;
  raw: string;
}

export interface MarkdownFrontmatterRawLine {
  kind: 'raw';
  text: string;
  indent: number;
  raw: string;
}

export type MarkdownFrontmatterEntry = MarkdownFrontmatterProperty | MarkdownFrontmatterRawLine;

export interface MarkdownFrontmatterBlock {
  raw: string;
  entries: MarkdownFrontmatterEntry[];
}

export interface MarkdownFrontmatterParseResult {
  frontmatter: MarkdownFrontmatterBlock | null;
  body: string;
}

const FRONTMATTER_DELIMITER = '---';
const UTF8_BOM = '\uFEFF';
const KEY_VALUE_PATTERN = /^(\s*)([A-Za-z0-9_-]+):(?:\s*(.*))?$/;

function normalizeMarkdownLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseFrontmatterEntries(raw: string): MarkdownFrontmatterEntry[] {
  return raw.split('\n').reduce<MarkdownFrontmatterEntry[]>((entries, line) => {
    if (line.trim() === '') return entries;

    const indent = line.length - line.trimStart().length;
    const keyValueMatch = KEY_VALUE_PATTERN.exec(line);
    if (keyValueMatch) {
      entries.push({
        kind: 'property',
        key: keyValueMatch[2],
        value: keyValueMatch[3] ?? '',
        indent,
        raw: line,
      });
      return entries;
    }

    entries.push({
      kind: 'raw',
      text: line.trim(),
      indent,
      raw: line,
    });
    return entries;
  }, []);
}

export function parseMarkdownFrontmatter(content: string): MarkdownFrontmatterParseResult {
  const normalizedContent = normalizeMarkdownLineEndings(
    content.startsWith(UTF8_BOM) ? content.slice(UTF8_BOM.length) : content,
  );
  const lines = normalizedContent.split('\n');

  if (lines[0] !== FRONTMATTER_DELIMITER) {
    return { frontmatter: null, body: content };
  }

  const closingDelimiterIndex = lines.findIndex((line, index) => (
    index > 0 && line === FRONTMATTER_DELIMITER
  ));
  if (closingDelimiterIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const frontmatterLines = lines.slice(1, closingDelimiterIndex);
  const body = lines.slice(closingDelimiterIndex + 1).join('\n');
  const raw = frontmatterLines.join('\n');

  return {
    frontmatter: {
      raw,
      entries: parseFrontmatterEntries(raw),
    },
    body,
  };
}
