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

const {
  parseMarkdownTaskDocument,
  resolveSddTaskDocumentContext,
} = require('../src/utils/markdown-task.ts');
const {
  buildScopedSddApplyPayload,
  createDashboardCommandText,
  parseSddCommand,
} = require('../src/utils/sdd-command-router.ts');

test('parseMarkdownTaskDocument tracks task items, completion, lines, and heading groups', () => {
  const parsed = parseMarkdownTaskDocument([
    '# Group A',
    '',
    '- [ ] task one',
    '- [x] done task',
    '',
    '## Nested',
    '- [ ] nested task',
    '',
    '```md',
    '- [ ] ignored task',
    '```',
  ].join('\n'));

  assert.equal(parsed.items.length, 3);
  assert.deepEqual(
    parsed.items.map((item) => ({
      index: item.index,
      lineNumber: item.lineNumber,
      text: item.text,
      completed: item.completed,
      groupTitle: item.groupTitle,
    })),
    [
      { index: 0, lineNumber: 3, text: 'task one', completed: false, groupTitle: 'Group A' },
      { index: 1, lineNumber: 4, text: 'done task', completed: true, groupTitle: 'Group A' },
      { index: 2, lineNumber: 7, text: 'nested task', completed: false, groupTitle: 'Nested' },
    ],
  );

  assert.equal(parsed.groups.length, 2);
  assert.equal(parsed.groups[0].title, 'Group A');
  assert.equal(parsed.groups[0].incompleteTasks.length, 2);
  assert.equal(parsed.groups[1].title, 'Nested');
  assert.equal(parsed.groups[1].incompleteTasks.length, 1);
});

test('resolveSddTaskDocumentContext recognizes only supported task artifact paths', () => {
  assert.deepEqual(
    resolveSddTaskDocumentContext('/repo', '/repo/openspec/changes/add-login/tasks.md'),
    {
      workflow: 'openspec',
      changeName: 'add-login',
      taskFilePath: 'openspec/changes/add-login/tasks.md',
    },
  );
  assert.deepEqual(
    resolveSddTaskDocumentContext('/repo', 'ravenspec/changes/add-login/TASK.md'),
    {
      workflow: 'raven',
      changeName: 'add-login',
      taskFilePath: 'ravenspec/changes/add-login/TASK.md',
    },
  );
  assert.equal(resolveSddTaskDocumentContext('/repo', '/repo/docs/tasks.md'), null);
  assert.equal(resolveSddTaskDocumentContext('/repo', '/repo/openspec/changes/archive/old/tasks.md'), null);
});

test('buildScopedSddApplyPayload scopes OpenSpec item apply', () => {
  const parsed = parseMarkdownTaskDocument('# Work\n\n- [ ] wire button');
  const payload = buildScopedSddApplyPayload({
    context: {
      workflow: 'openspec',
      changeName: 'add-task-apply-button',
      taskFilePath: 'openspec/changes/add-task-apply-button/tasks.md',
    },
    target: {
      kind: 'item',
      item: parsed.items[0],
    },
  });

  assert.equal(payload.risk, 'high');
  assert.match(payload.preview, /\$openspec-apply-change add-task-apply-button/);
  assert.match(payload.preview, /只执行以下选中的 task item/);
  assert.match(payload.preview, /@openspec\/changes\/add-task-apply-button\/tasks\.md/);
  assert.match(payload.terminalInput, /\$openspec-apply-change add-task-apply-button/);
});

test('buildScopedSddApplyPayload scopes RavenSpec group apply', () => {
  const parsed = parseMarkdownTaskDocument('# Work\n\n- [ ] one\n- [x] done\n- [ ] two');
  const payload = buildScopedSddApplyPayload({
    context: {
      workflow: 'raven',
      changeName: 'add-login',
      taskFilePath: 'ravenspec/changes/add-login/TASK.md',
    },
    target: {
      kind: 'group',
      group: parsed.groups[0],
    },
  });

  assert.match(payload.preview, /\$sdd-apply-change add-login/);
  assert.match(payload.preview, /只执行 task group「Work」内所有未完成 task item/);
  assert.match(payload.preview, /L3: one/);
  assert.match(payload.preview, /L5: two/);
  assert.doesNotMatch(payload.preview, /done/);
});

test('parseSddCommand opens RavenSpec fast-change CHANGE artifact from dashboard inspect action', () => {
  const change = {
    workflow: 'raven',
    mode: 'fast-change',
    name: 'skip-polaroid-paid-task-fetch',
    path: '/repo/ravenspec/changes/skip-polaroid-paid-task-fetch',
    artifacts: {
      change: {
        id: 'change',
        state: 'present',
        path: '/repo/ravenspec/changes/skip-polaroid-paid-task-fetch/CHANGE.md',
      },
    },
    artifactIds: ['change'],
    specsCount: 0,
    taskProgress: {
      kind: 'verification',
      total: 2,
      completed: 1,
      hasProgressFile: true,
      hasCheckboxes: true,
    },
    nextAction: 'inspect',
    mtime: 1,
  };

  const text = createDashboardCommandText(change.nextAction, change);
  const intent = parseSddCommand({
    text,
    rootPath: '/repo',
    currentChange: {
      workflow: 'raven',
      changeName: change.name,
      rootPath: '/repo',
    },
    changes: [change],
    nextActionChange: change,
  });

  assert.equal(text, '打开当前CHANGE');
  assert.equal(intent.action, 'open-artifact');
  assert.equal(intent.workflow, 'raven');
  assert.equal(intent.changeName, change.name);
  assert.equal(intent.artifact, 'change');
});
