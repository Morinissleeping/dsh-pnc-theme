# @dsh-external/dsh-pnc-theme

《少女前线：云图计划》(Girls' Frontline: Neural Cloud, PNC) 风格的 DSH Web GUI 主题插件。

自包含可移植版：背景视频、等高线、康威棋盘、配额条、LLM 活跃度指示全部内嵌，开箱即用，凭据不入包。

## 功能

- **背景视频**：全屏循环播放背景视频（深色战争画面），`?pnc-novid=1` 可禁用；可上传自定义 mp4 替代包内默认
- **背景图片**：上传 PNG/JPEG/GIF/WebP 作为页面背景（存在时优先于视频），可随时恢复默认；设置页中视频/图片合并为「背景」一个入口
- **等高线背景**：左栏/上栏深色底 + marching squares 生成的连续等高线流动（三档密度随 LLM 活跃度切换，密度/流动周期/刷新间隔可配置）
- **康威生命棋盘**：中央聊天区背景的生命游戏棋盘，播种密度由 LLM 工作状态驱动（活跃时密集、空闲时稀疏）
- **LLM 活跃度评分接口**：`/pnc-activity.json` —— 监听 `session/event`（assistant/chunk、tool/call、tool/result 等）实时量化 LLM 工作状态（0-100，每秒衰减 6%）
- **配额条**：对话栏底部用量条——三条横条（5h/7d/1m）长度 = 已用% × 限额/$60，限额与三色可在设置页调整；倒计时标签显示各窗口重置时间；左侧 5px 外 matrix 指示灯在获取数据时显示、进度条刷新完成后隐藏（不挤压条宽），动画与命令块运行中（`_matrix_10orb_4`）完全一致
- **状态指示灯**：命令块运行中显示白色 matrix 矩阵；询问=黄色方块屏闪、报错=红色方块常亮、完成=蓝色方块呼吸
- **设置页**：DSH 原生设置 → 「OpenCode Go 配额」——凭据/限额/背景视频上传/视觉主题全套配置
- **浅色主题提示**：检测到浅色主题时提示不适配（建议切换深色）

## 端点

| 路径 | 说明 |
|---|---|
| `/pnc-config` | GET/POST 读写配置（cookie/workspace_id/limits/theme），POST 后立即清缓存刷新 |
| `/pnc-quota-data.json` | 配额数据（live-fetch，缓存时长 = 设置页「配额自动刷新间隔」，失败 30 秒快速重试），附带 limits |
| `/pnc-activity.json` | LLM 工作状态评分（score/level/events） |
| `/pnc-bg.mp4` | 背景视频（Range 支持） |
| `/pnc-bg-info` | 背景视频当前状态（自定义/包内默认/大小） |
| `/pnc-bg-upload` | POST base64 上传自定义背景视频（空 base64 = 恢复默认） |
| `/pnc-bg-img` | 自定义背景图片（Content-Type 自动识别） |
| `/pnc-bg-img-info` | 背景图片当前状态（自定义/大小/类型） |
| `/pnc-bg-img-upload` | POST base64 上传自定义背景图片（空 base64 = 恢复默认） |

## 运行时依赖（全部内嵌，开箱即用）

v0.1.1 起为**自包含可移植版**：视频、等高线素材、配额抓取脚本、注入 CSS/JS 全部打进 `lib/assets/`，不依赖任何外部路径。

凭据（cookie/workspace_id/limits）为私有数据**不打包**，默认读写 `~/.dsh/pnc_creds.json`（可通过设置页写入），可用环境变量覆盖：

| 环境变量 | 默认值 | 用途 |
|---|---|---|
| `PNC_CREDS_PATH` | `~/.dsh/pnc_creds.json` | 凭据文件路径 |
| `PNC_BG_VIDEO` | 包内 `lib/assets/bg.mp4` | 背景视频路径（可指向任意本地 mp4，避免打包大视频） |
| `PNC_PYTHON` | `python`（优先 `C:/Program Files/Python312/python.exe` 若存在） | 配额抓取脚本解释器 |
| `PNC_CWD` | 无 | 抓取脚本工作目录（一般无需设置） |

## 设置页配置项

打开 Web GUI → 侧栏底部 设置 → 「OpenCode Go 配额」：

- **凭据与限额**：Cookie / Workspace ID / 5h·7d·1m 金额限额（含配置教程）、配额自动刷新间隔（10–600 秒）
- **毛玻璃层**：独立模糊层 `#pnc-bg-glass`——层序：视频/图片(z:-3) < 毛玻璃层(z:-2) < 所有其他元素；全屏覆盖，backdrop-filter blur(20px) + saturate(150%)；「毛玻璃不透明度」滑条控制层浓度（默认 90%），「面板透度」滑条控制面板底色透明度（默认 55%）
- **背景**（视频/图片合并入口）：上传 mp4/webm 或 PNG/JPEG/GIF/WebP（图片存在时优先于视频）、一键重置回包内默认视频、背景不透明度（视频与图片通用）、毛玻璃不透明度（独立层浓度）、面板透度；上传/重置后页面自动刷新生效
- **视觉主题**：
  - 用量条三色（5h/7d/1m 颜色选择器）
  - 不透明度：侧栏+上栏 / 等高线 / 康威方块
  - 速度与密度：康威刷新间隔(ms) / 康威镜头刷新间隔(ms) / 康威每次移动格数(0.005 精度) / 等高线流动周期(s) / 等高线刷新间隔(s) / 康威播种密度

## 权限与隐私

- **凭据**：`~/.dsh/pnc_creds.json` 仅存于本机（默认路径，可用 `PNC_CREDS_PATH` 改），插件只在本机读写，不上传
- **网络请求**：配额抓取脚本仅访问 `https://opencode.ai/workspace/<id>/go`（携带你配置的 cookie，用于读取用量）
- **页面注入**：主题通过 tapIndex 注入 CSS/JS 到 Web GUI 页面；`/pnc-*` 端点仅本机 webServer 提供
- **可选禁用**：`?pnc-novid=1` 可关背景视频；不想用配额抓取可不填 cookie（主题其余功能不受影响）

## 构建

```bash
DSH_CHECKOUT=<checkout> bash scripts/build.sh
# 产物：dsh-external-dsh-pnc-theme-<version>.tgz（含 lib/ 与 lib/assets/ 与 lib/client.js）
```

## 在其他 DSH 上安装

官方标准方式（任一）：

```bash
# 方式一：GitHub Release tarball（推荐）
dsh plugin --profile web add https://github.com/Morinissleeping/dsh-pnc-theme/releases/download/v0.2.17/dsh-external-dsh-pnc-theme-0.2.17.tgz

# 方式二：源码目录（lib/ 已提交，clone 后无需构建）
git clone https://github.com/Morinissleeping/dsh-pnc-theme
dsh plugin --profile web add ./dsh-pnc-theme
```

注入器环境（可选，仅运行时热装配 + 重启后由 bundles 自动装配）：

```bash
dev_install_package <插件目录>   # 或 dev_inject_plugin <插件目录> 仅运行时注入
```

安装后：

1. 重启 `dsh web`
2. 打开 Web GUI → 设置 → OpenCode Go 配额 → 按教程填写 cookie + workspace_id → 保存
3. 刷新页面查看主题（建议使用深色主题）

## 发布

插件以 Bundle 分发（`package.json` 的 `dsh.bundle` 指向 `cordis.patch.yml`）。发布到公开 GitHub 仓库后，给仓库打上 `dsh-plugin` Topic——官方「社区插件」聚合页由 GitHub Topic 自动索引，无需向 DeepSeek 主仓库提交 PR：

```bash
# 需要 git 仓库 + gh CLI 认证
git add -A && git commit -m "v<version>"
git tag v<version>
gh release create v<version> dsh-external-dsh-pnc-theme-<version>.tgz
gh repo edit <owner>/dsh-pnc-theme --add-topic dsh-plugin
```

## License

MIT
