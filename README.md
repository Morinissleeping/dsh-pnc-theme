# @dsh-external/dsh-pnc-theme

《少女前线：云图计划》(PNC) 风格 DSH Web GUI 主题插件。

## 功能

- **背景视频**：全屏循环播放背景视频（深色战争画面），`?pnc-novid=1` 可禁用
- **等高线背景**：左栏/上栏黑色底 + marching squares 生成的连续等高线流动（三档密度随 LLM 活跃度切换）
- **康威生命棋盘**：中央聊天区背景的生命游戏棋盘，播种密度由 LLM 工作状态驱动（活跃时密集、空闲时稀疏）
- **LLM 活跃度评分接口**：`/pnc-activity.json` —— 监听 `session/event`（assistant/chunk、tool/call、tool/result 等）实时量化 LLM 工作状态（0-100，每秒衰减 6%）
- **配额条**：对话栏底部用量条——三条横条（5h/7d/1m）长度 = 已用% × 限额/$60，限额可在配置面板调整；倒计时标签显示各窗口重置时间
- **配置面板**：页面会话日志按钮左侧的 ⚙ 按钮（新对话页浮动右下角），可配置 Cookie / Workspace ID / 三个窗口金额限额

## 端点

| 路径 | 说明 |
|---|---|
| `/pnc-config` | GET/POST 读写配置（cookie/workspace_id/limits），POST 后立即清缓存刷新 |
| `/pnc-quota-data.json` | 配额数据（live-fetch，3 分钟缓存），附带 limits |
| `/pnc-activity.json` | LLM 工作状态评分（score/level/events） |
| `/pnc-bg.mp4` | 背景视频（Range 支持） |

## 运行时依赖（全部内嵌，开箱即用）

v0.1.1 起为**自包含可移植版**：视频、等高线素材、配额抓取脚本、注入 CSS/JS 全部打进 `lib/assets/`，不依赖任何外部路径。

凭据（cookie/workspace_id/limits）为私有数据**不打包**，默认读写 `~/.dsh/pnc_creds.json`（可通过配置面板 ⚙ 写入），可用环境变量覆盖：

| 环境变量 | 默认值 | 用途 |
|---|---|---|
| `PNC_CREDS_PATH` | `~/.dsh/pnc_creds.json` | 凭据文件路径 |
| `PNC_BG_VIDEO` | 包内 `lib/assets/bg.mp4` | 背景视频路径（可指向任意本地 mp4，避免打包大视频） |
| `PNC_PYTHON` | `python`（优先 `C:/Program Files/Python312/python.exe` 若存在） | 配额抓取脚本解释器 |
| `PNC_CWD` | 无 | 抓取脚本工作目录（一般无需设置） |

## 权限与隐私

- **凭据**：`~/.dsh/pnc_creds.json` 仅存于本机（默认路径，可用 `PNC_CREDS_PATH` 改），插件只在本机读写，不上传
- **网络请求**：配额抓取脚本仅访问 `https://opencode.ai/workspace/<id>/go`（携带你配置的 cookie，用于读取用量）
- **页面注入**：主题通过 tapIndex 注入 CSS/JS 到 Web GUI 页面；`/pnc-*` 端点仅本机 webServer 提供
- **可选禁用**：`?pnc-novid=1` 可关背景视频；不想用配额抓取可不填 cookie（主题其余功能不受影响）

## 构建

```bash
DSH_CHECKOUT=<checkout> bash scripts/build.sh
# 产物：dsh-external-dsh-pnc-theme-<version>.tgz（含 lib/ 与 lib/assets/）
```

## 在其他 DSH 上安装

1. 拷贝 `dsh-external-dsh-pnc-theme-<version>.tgz` 到目标机
2. 注入器环境内安装（热装配 + 重启后由 bundles 自动装配）：
   ```bash
   # 解包到插件目录后
   dev_install_package <插件目录>   # 或 dev_inject_plugin <插件目录> 仅运行时注入
   ```
3. 标准 Cordis 环境（无注入器）：
   ```bash
   npm install dsh-external-dsh-pnc-theme-<version>.tgz
   # 在 profile/host 配置的 plugins 列表中加入 @dsh-external/dsh-pnc-theme
   ```
4. 打开 Web GUI → 点击 ⚙ → 粘贴 OpenCode cookie + workspace_id → 保存（写入凭据文件）
5. 刷新页面查看主题

## 发布

```bash
# 需要 git 仓库 + gh CLI 认证
git init && git add -A && git commit -m "v0.1.1"
gh release create v0.1.1 dsh-external-dsh-pnc-theme-0.1.1.tgz
```
