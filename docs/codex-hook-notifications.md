# Codex Hook Notifications

这份文档给 AI 或维护者使用，用来把下载后的 AIterm 仓库接入 Codex hooks。完成后，在 AIterm 内置终端中运行 Codex 时，Codex 回合开始和结束会通过 AIterm 的本地通知入口更新 terminal tab 状态，并在完成时触发系统通知。

## AI 安装任务

当用户要求“帮我安装 AIterm Codex 推送通知”时，按下面步骤执行：

1. 找到 AIterm 仓库根目录，并确认存在 `scripts/aiterm-notify.mjs`。
2. 使用该脚本的绝对路径更新用户的 Codex 配置文件。
3. 保留用户现有的 Codex hooks，只追加 AIterm 通知 hooks。
4. 不要写入或复制 `[hooks.state]`，Codex 会在用户信任 hook 后自行维护。
5. 配置后提醒用户必须在 AIterm 的内置终端里启动 Codex；在系统终端里运行 Codex 时没有 AIterm 注入的通知环境变量，脚本会静默退出。

默认 Codex 配置文件是 `~/.codex/config.toml`。如果用户设置了 `CODEX_HOME`，则使用 `$CODEX_HOME/config.toml`。

## 配置片段

将下面片段合并进 Codex `config.toml`。把 `/absolute/path/to/AIterm` 替换为当前仓库根目录的绝对路径。

```toml
[features]
hooks = true

[[hooks.UserPromptSubmit]]

[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "/absolute/path/to/AIterm/scripts/aiterm-notify.mjs --preset codex-running || true"
timeout = 10

[[hooks.Stop]]

[[hooks.Stop.hooks]]
type = "command"
command = "/absolute/path/to/AIterm/scripts/aiterm-notify.mjs --preset codex-stop || true"
timeout = 10
```

如果 `config.toml` 已有 `[features]`，只需要在其中补充或更新 `hooks = true`。如果已有 `[[hooks.UserPromptSubmit]]` 或 `[[hooks.Stop]]`，不要删除原条目，只在对应事件下追加新的 `[[...hooks]]` 项。

追加前先检查是否已经存在下面两类命令，避免重复安装：

- `aiterm-notify.mjs --preset codex-running`
- `aiterm-notify.mjs --preset codex-stop`

## Docker / Dev Container 安装

在 Docker 容器中运行 Codex 时，除了配置 Codex hooks，还需要满足三个条件：

1. 容器启动命令必须透传 AIterm 注入的 `AITEM_*` 环境变量。
2. 容器网络必须能访问 `AITEM_NOTIFY_URL` 指向的宿主机本地 HTTP 入口。
3. hook 命令中的通知脚本路径必须是容器内可访问且稳定的路径。

对 `/Users/chenbolun/my/dev-env` 这类 OrbStack host-network 容器，推荐做法是把通知脚本安装到容器持久化的 Codex state 目录，然后让容器内 Codex hooks 调用这个副本。

### 1. 让 dev-env 透传 AIterm 环境变量

`docker-compose.yml` 的 `environment` 中应包含：

```yaml
      AITEM_TERMINAL_SESSION_ID: ${AITEM_TERMINAL_SESSION_ID:-}
      AITEM_NOTIFY_URL: ${AITEM_NOTIFY_URL:-}
      AITEM_NOTIFY_TOKEN: ${AITEM_NOTIFY_TOKEN:-}
```

如果使用 `scripts/host-atiedev` 包装 `docker run`，启动参数中应包含：

```sh
  -e AITEM_TERMINAL_SESSION_ID \
  -e AITEM_NOTIFY_URL \
  -e AITEM_NOTIFY_TOKEN \
```

这些变量只有从 AIterm 内置终端启动容器时才会有值。从系统终端启动容器时为空，通知脚本会静默退出。

### 2. 在容器内安装通知脚本副本

第一次安装时，从 AIterm 内置终端启动 dev-env，并把 AIterm 仓库挂载进容器。例如使用 compose：

```sh
cd /absolute/path/to/dev-env
WORKSPACE_DIR=/absolute/path/to/AIterm docker compose run --rm dev
```

在容器内执行：

```sh
codex_home="${CODEX_HOME:-$HOME/.codex}"
mkdir -p "$codex_home"
cp /workspace/scripts/aiterm-notify.mjs "$codex_home/aiterm-notify.mjs"
chmod +x "$codex_home/aiterm-notify.mjs"
```

`dev-env` 将 `/home/dev/.codex` 挂载为 Docker volume，所以这个脚本副本会随 Codex 登录状态一起持久化。之后即使容器切换到其它项目 workspace，hook 命令仍能找到它。

### 3. 配置容器内 Codex hooks

容器内的 Codex 配置文件通常是 `/home/dev/.codex/config.toml`。合并下面片段：

```toml
[features]
hooks = true

[[hooks.UserPromptSubmit]]

[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "/home/dev/.codex/aiterm-notify.mjs --preset codex-running || true"
timeout = 10

[[hooks.Stop]]

[[hooks.Stop.hooks]]
type = "command"
command = "/home/dev/.codex/aiterm-notify.mjs --preset codex-stop || true"
timeout = 10
```

如果容器内设置了非默认 `CODEX_HOME`，把命令路径改成对应目录下的 `aiterm-notify.mjs`。

### 4. 验证容器链路

从 AIterm 内置终端进入容器后执行：

```sh
env | rg '^AITEM_(TERMINAL_SESSION_ID|NOTIFY_URL|NOTIFY_TOKEN)='
"${CODEX_HOME:-$HOME/.codex}/aiterm-notify.mjs" --preset codex-stop
```

如果 `AITEM_*` 存在且 `dev-env` 使用 host networking，AIterm 应收到通知。若容器没有 host networking，需要确保 `AITEM_NOTIFY_URL` 对容器可达；仅把 `127.0.0.1` 传入普通 bridge 网络容器通常不够。

## 工作机制

AIterm 创建 PTY session 时会注入三个环境变量：

- `AITEM_TERMINAL_SESSION_ID`
- `AITEM_NOTIFY_URL`
- `AITEM_NOTIFY_TOKEN`

Codex hook 子进程会继承这些变量。`scripts/aiterm-notify.mjs` 读取这些变量后，把事件 POST 到 AIterm 主进程的本地通知入口。缺少环境变量或请求失败时，脚本会正常退出，不阻塞 Codex。

Codex 事件映射：

- `UserPromptSubmit` -> `codex-running` -> `running`
- `Stop` -> `codex-stop` -> `completed`

## 验证

在 AIterm 内置终端中执行：

```sh
env | rg '^AITEM_(TERMINAL_SESSION_ID|NOTIFY_URL|NOTIFY_TOKEN)='
```

应能看到三个环境变量。然后模拟完成事件：

```sh
/absolute/path/to/AIterm/scripts/aiterm-notify.mjs --preset codex-stop
```

预期结果：

- AIterm 收到事件。
- 对应 terminal tab 显示完成状态。
- 系统通知出现，点击通知能回到对应 terminal session。

第一次运行 Codex hook 时，Codex 可能要求信任新增 hook。确认命令路径属于当前 AIterm 仓库后，允许该 hook。

## 排查

- 没有通知：确认 Codex 是从 AIterm 内置终端启动的，而不是系统终端。
- 没有环境变量：重启 AIterm 后重新打开一个 terminal session。
- hook 没执行：确认 `config.toml` 中 `[features].hooks = true`，并确认 Codex 已信任该 hook。
- 重复通知：检查 `config.toml` 中是否重复追加了相同的 `aiterm-notify.mjs` hook。
