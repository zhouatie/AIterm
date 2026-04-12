/**
 * File type detection utilities for the preview system.
 * Maps file extensions to highlight.js language names for react-syntax-highlighter.
 */

/** Extension-to-language mapping covering common frontend and development file types. */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  // JavaScript & variants
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // TypeScript & variants
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',

  // Styles
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',

  // Markup / HTML
  '.html': 'xml',
  '.htm': 'xml',
  '.xml': 'xml',
  '.svg': 'xml',

  // Data formats
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'ini', // hljs uses 'ini' for TOML

  // Shell
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',

  // Frontend frameworks
  '.vue': 'xml', // Vue SFC is closest to XML/HTML in hljs
  '.svelte': 'xml', // Svelte SFC is closest to XML/HTML in hljs

  // SQL & GraphQL
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',

  // Other languages
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',

  // Config / misc
  '.ini': 'ini',
  '.env': 'bash',
  '.dockerfile': 'dockerfile',
  '.makefile': 'makefile',
};

/**
 * Get the highlight.js language name for a file based on its extension.
 * @returns The language name, or null if the extension is not recognized.
 */
export function getLanguageByExtension(filePath: string): string | null {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const ext = filePath.slice(dotIndex).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? null;
}

/**
 * Check if a file is a Markdown file based on its extension.
 */
export function isMarkdownFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.md');
}
