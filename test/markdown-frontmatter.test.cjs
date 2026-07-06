const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { parseMarkdownFrontmatter } = require('../src/utils/markdown-frontmatter.ts');

test('parseMarkdownFrontmatter separates top YAML front matter and body', () => {
  const parsed = parseMarkdownFrontmatter([
    '---',
    'name: team-requirement-split',
    'description: 将大型父需求拆分为可 review 的子任务',
    'metadata:',
    '  author: atie',
    '  version: "1.0"',
    '---',
    '',
    '# 团队需求拆分',
  ].join('\n'));

  assert.equal(parsed.body, '\n# 团队需求拆分');
  assert.equal(parsed.frontmatter?.raw.includes('name: team-requirement-split'), true);
  assert.deepEqual(
    parsed.frontmatter?.entries.map((entry) => ({
      kind: entry.kind,
      indent: entry.indent,
      key: entry.kind === 'property' ? entry.key : undefined,
      value: entry.kind === 'property' ? entry.value : undefined,
    })),
    [
      { kind: 'property', indent: 0, key: 'name', value: 'team-requirement-split' },
      { kind: 'property', indent: 0, key: 'description', value: '将大型父需求拆分为可 review 的子任务' },
      { kind: 'property', indent: 0, key: 'metadata', value: '' },
      { kind: 'property', indent: 2, key: 'author', value: 'atie' },
      { kind: 'property', indent: 2, key: 'version', value: '"1.0"' },
    ],
  );
});

test('parseMarkdownFrontmatter preserves complex YAML lines as raw entries', () => {
  const parsed = parseMarkdownFrontmatter([
    '---',
    'name: demo',
    'tags:',
    '  - alpha',
    '  - beta',
    '---',
    '# Demo',
  ].join('\n'));

  assert.deepEqual(
    parsed.frontmatter?.entries.map((entry) => (
      entry.kind === 'property'
        ? { kind: entry.kind, key: entry.key, value: entry.value, indent: entry.indent }
        : { kind: entry.kind, text: entry.text, indent: entry.indent }
    )),
    [
      { kind: 'property', key: 'name', value: 'demo', indent: 0 },
      { kind: 'property', key: 'tags', value: '', indent: 0 },
      { kind: 'raw', text: '- alpha', indent: 2 },
      { kind: 'raw', text: '- beta', indent: 2 },
    ],
  );
});

test('parseMarkdownFrontmatter ignores unclosed and non-top delimiters', () => {
  const unclosed = '---\nname: demo\n# Demo';
  const nonTop = '# Demo\n\n---\nname: demo\n---';

  assert.deepEqual(parseMarkdownFrontmatter(unclosed), {
    frontmatter: null,
    body: unclosed,
  });
  assert.deepEqual(parseMarkdownFrontmatter(nonTop), {
    frontmatter: null,
    body: nonTop,
  });
});

test('parseMarkdownFrontmatter handles empty front matter and UTF-8 BOM', () => {
  assert.deepEqual(parseMarkdownFrontmatter('---\n---\n# Demo'), {
    frontmatter: {
      raw: '',
      entries: [],
    },
    body: '# Demo',
  });

  const parsed = parseMarkdownFrontmatter('\uFEFF---\nname: demo\n---\n# Demo');
  assert.equal(parsed.frontmatter?.entries[0]?.kind, 'property');
  assert.equal(parsed.body, '# Demo');
});
