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
  CURRENT_TAB_STATE_VERSION,
  createPersistedTabState,
  loadTabState,
} = require('../src/utils/tab-persistence.ts');

function createSnapshot() {
  return {
    workspaces: [
      {
        id: 'workspace-1',
        name: 'workspace_1',
        currentPath: '/tmp/project',
        isExpanded: true,
        sessions: [
          {
            id: 'session-1',
            cwd: '/tmp/project',
            transcriptId: 'transcript-1',
          },
        ],
      },
    ],
    activeSessionId: 'session-1',
    sessionNameOverrides: {
      'session-1': 'main',
    },
    sidebarCollapsed: false,
  };
}

async function loadRawState(state) {
  const previousWindow = global.window;
  global.window = {
    tabStateApi: {
      load: async () => JSON.stringify(state),
    },
  };

  try {
    return await loadTabState();
  } finally {
    if (previousWindow === undefined) {
      delete global.window;
    } else {
      global.window = previousWindow;
    }
  }
}

test('createPersistedTabState injects the current schema version', () => {
  const state = createPersistedTabState(createSnapshot());

  assert.equal(state.version, CURRENT_TAB_STATE_VERSION);
  assert.deepEqual(
    {
      ...state,
      version: undefined,
    },
    {
      ...createSnapshot(),
      version: undefined,
    },
  );
});

test('loadTabState accepts a complete state with the current schema version', async () => {
  const state = createPersistedTabState(createSnapshot());

  assert.deepEqual(await loadRawState(state), state);
});

test('loadTabState rejects a state with a mismatched schema version', async () => {
  const state = {
    ...createPersistedTabState(createSnapshot()),
    version: CURRENT_TAB_STATE_VERSION - 1,
  };

  assert.equal(await loadRawState(state), null);
});
