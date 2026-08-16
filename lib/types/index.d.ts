/**
 * @dsh-external/dsh-pnc-theme — PNC 云图风格主题插件。
 *
 * 功能：
 *  - 背景视频 + 等高线流动背景（左栏/上栏）+ 康威生命棋盘（LLM 活跃度驱动密度）
 *  - 用量条（美元配额换算，限额可配置）+ 倒计时标签
 *  - /pnc-config 配置面板端点（cookie/workspace_id/limits）
 *  - /pnc-activity.json LLM 工作状态评分接口（session/event 驱动）
 *
 * 资源：lib/assets/ 内素材（构建时由 scripts/build.sh 拷贝）。
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "@dsh-external/dsh-pnc-theme";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
