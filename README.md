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

## 运行时依赖（外部路径，按需修改 src/index.ts）

| 路径 | 用途 |
|---|---|
| `D:/gfl2mod/pnc_creds.json` | 凭据（cookie/workspace_id/limits） |
| `D:/gfl2mod/fetch_quota.py` | 配额抓取脚本（requests + 浏览器头） |
| `D:/gfl2mod/*.mp4 / *.webp / *.png` | 背景视频与等高线素材 |

> 素材（CSS/JS/鱼路径）已打包进 `lib/assets/`；媒体与凭据为外部路径。

## 构建

```bash
DSH_CHECKOUT=<checkout> bash scripts/build.sh
# 产物：dsh-external-dsh-pnc-theme-<version>.tgz（含 lib/ 与 lib/assets/）
```

## 注入

注入器环境内：`dev_inject_plugin <本目录>` 或安装 tgz 后装配。

## 发布

```bash
# 需要 git 仓库 + gh CLI 认证
git init && git add -A && git commit -m "v0.1.0"
gh release create v0.1.0 dsh-external-dsh-pnc-theme-0.1.0.tgz
```
