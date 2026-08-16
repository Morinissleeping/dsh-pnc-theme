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
import type { Context } from '@deepseek-ai/cordis'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

export const name = '@dsh-external/dsh-pnc-theme'

// 资源默认内嵌在插件包 lib/assets/（构建时由 scripts/build.sh 拷贝），开箱即用；
// 背景视频可用环境变量 PNC_BG_VIDEO 覆盖为任意本地文件路径（如不想打包大视频）；
// v156：设置页可上传自定义背景视频 → 存 ~/.dsh/pnc-bg.mp4，优先于环境变量与包内默认。
const PACKAGE_VIDEO_PATH = fileURLToPath(new URL('./assets/bg.mp4', import.meta.url))
const UPLOADED_VIDEO_PATH = join(homedir(), '.dsh', 'pnc-bg.mp4')
// v0.2.0：背景图片上传（~/.dsh/pnc-bg.<ext>，magic bytes 识别类型，与背景视频对称；存在时替代视频）
const IMG_MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }
const IMG_EXTS = ['png', 'jpg', 'gif', 'webp']
function findUploadedImage(): { path: string; mime: string } | null {
  try {
    for (const ext of IMG_EXTS) {
      const p = join(homedir(), '.dsh', `pnc-bg.${ext}`)
      if (existsSync(p)) return { path: p, mime: IMG_MIME[ext] }
    }
  } catch (e) { /* ignore */ }
  return null
}
function detectImageType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'gif'
  if (buf.length >= 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp'
  return null
}
async function removeUploadedImages(): Promise<void> {
  for (const ext of IMG_EXTS) {
    try { await import('node:fs/promises').then((fsp) => fsp.rm(join(homedir(), '.dsh', `pnc-bg.${ext}`), { force: true })) } catch (e) { /* ignore */ }
  }
}
function resolveVideoPath(): string {
  try {
    if (existsSync(UPLOADED_VIDEO_PATH)) return UPLOADED_VIDEO_PATH
  } catch (e) { /* ignore */ }
  return process.env.PNC_BG_VIDEO || PACKAGE_VIDEO_PATH
}
const CREDS_PATH = process.env.PNC_CREDS_PATH || join(homedir(), '.dsh', 'pnc_creds.json')
const FETCH_SCRIPT = fileURLToPath(new URL('./assets/fetch_quota.py', import.meta.url))
// v162：python 探测跨平台——env → Windows 常见路径 → python3 → python
function detectPython(): string {
  if (process.env.PNC_PYTHON) return process.env.PNC_PYTHON
  if (process.platform === 'win32' && existsSync('C:/Program Files/Python312/python.exe')) return 'C:/Program Files/Python312/python.exe'
  return 'python3'
}
const FISH_FILE = fileURLToPath(new URL('./assets/pnc_fish_path.txt', import.meta.url))
const CSS_FILE = fileURLToPath(new URL('./assets/pnc_inject.css', import.meta.url))
const JS_FILE = fileURLToPath(new URL('./assets/pnc_inject.js', import.meta.url))

// 硬依赖：等 webServer/fs 服务就绪后再 apply（修复启动早期恢复时服务未就绪导致 apply 提前 return）
export const inject = ['webServer', 'fs']

export function apply(ctx: Context): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webServer = ctx.get('webServer') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fs = ctx.get('fs') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subprocess = ctx.get('subprocess') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timer = ctx.get('timer') as any
  if (webServer === undefined || fs === undefined) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cached: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let probeData: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let quotaCache: any = null
  let quotaCacheTime = 0
  let quotaError: string | null = null
  let fishPath = ''
  let cssText = ''
  let jsText = ''
  const activity: { score: number; events: number; lastEventAt: number; lastType: string } = { score: 0, events: 0, lastEventAt: 0, lastType: '' }

  fs.resolve(FISH_FILE).then((t: unknown) => fs.readText(t)).then((t: unknown) => { fishPath = String(t).trim() }).catch(() => {})
  fs.resolve(CSS_FILE).then((t: unknown) => fs.readText(t)).then((t: unknown) => { cssText = String(t) }).catch(() => {})
  fs.resolve(JS_FILE).then((t: unknown) => fs.readText(t)).then((t: unknown) => { jsText = String(t) }).catch(() => {})

  async function readCreds(): Promise<Record<string, any>> {
    const target = await fs.resolve(CREDS_PATH)
    const text = await fs.readText(target)
    return JSON.parse(text)
  }
  const DEFAULT_LIMITS = { rolling: 12, weekly: 30, monthly: 60 }
  // v155：视觉主题参数（用量条三色/面板不透明度/等高线与康威不透明度/康威密度），可配置
  // v158：速度类参数改为 ms 直显——康威刷新间隔、康威镜头移动间隔、等高线流动周期、等高线刷新间隔
  const DEFAULT_THEME = {
    quotaMo: '#1550B5',
    quotaWk: '#3A7BF2',
    quotaRl: '#5E9CF5',
    panelAlpha: 0.9,
    contourAlpha: 0.3,
    conwayAlpha: 0.4,
    conwayDensity: 1,
    videoAlpha: 1,
    conwayRefreshMs: 260,
    conwayScrollMs: 260,
    conwayScrollBlocks: 0.135,
    contourFlowMs: 180000,
    contourRefreshMs: 0,
    glassAlpha: 0.65,
  }
  function clampNum(v: unknown, fallback: number, min: number, max: number): number {
    const n = Number(v)
    return (isFinite(n) && n >= min && n <= max) ? n : fallback
  }
  function clampHex(v: unknown, fallback: string): string {
    return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : fallback
  }
  async function readTheme(): Promise<typeof DEFAULT_THEME> {
    try {
      const cfg = await readCreds()
      const t = (cfg && typeof cfg === 'object' && cfg.theme) || {}
      return {
        quotaMo: clampHex(t.quotaMo, DEFAULT_THEME.quotaMo),
        quotaWk: clampHex(t.quotaWk, DEFAULT_THEME.quotaWk),
        quotaRl: clampHex(t.quotaRl, DEFAULT_THEME.quotaRl),
        panelAlpha: clampNum(t.panelAlpha, DEFAULT_THEME.panelAlpha, 0, 1),
        contourAlpha: clampNum(t.contourAlpha, DEFAULT_THEME.contourAlpha, 0, 1),
        conwayAlpha: clampNum(t.conwayAlpha, DEFAULT_THEME.conwayAlpha, 0, 1),
        conwayDensity: clampNum(t.conwayDensity, DEFAULT_THEME.conwayDensity, 0.1, 3),
        videoAlpha: clampNum(t.videoAlpha, DEFAULT_THEME.videoAlpha, 0, 1),
        conwayRefreshMs: clampNum(t.conwayRefreshMs, DEFAULT_THEME.conwayRefreshMs, 30, 2000),
        conwayScrollMs: clampNum(t.conwayScrollMs, DEFAULT_THEME.conwayScrollMs, 30, 2000),
        conwayScrollBlocks: clampNum(t.conwayScrollBlocks, DEFAULT_THEME.conwayScrollBlocks, 0.005, 5),
        contourFlowMs: clampNum(t.contourFlowMs, DEFAULT_THEME.contourFlowMs, 1000, 600000),
        contourRefreshMs: clampNum(t.contourRefreshMs, DEFAULT_THEME.contourRefreshMs, 0, 600000),
        glassAlpha: clampNum(t.glassAlpha, DEFAULT_THEME.glassAlpha, 0, 1),
      }
    } catch (e) {
      return { ...DEFAULT_THEME }
    }
  }
  async function readLimits(): Promise<{ rolling: number; weekly: number; monthly: number }> {
    try {
      const cfg = await readCreds()
      const l = cfg.limits || {}
      return {
        rolling: (Number(l.rolling) > 0) ? Number(l.rolling) : 12,
        weekly: (Number(l.weekly) > 0) ? Number(l.weekly) : 30,
        monthly: (Number(l.monthly) > 0) ? Number(l.monthly) : 60,
      }
    } catch (e) {
      return { ...DEFAULT_LIMITS }
    }
  }

  async function loadVideo() {
    if (cached) return cached
    const target = await fs.resolve(resolveVideoPath())
    const info = await fs.stat(target)
    const bytes = await fs.readBytes(target, undefined, 512 * 1024 * 1024)
    cached = { bytes, size: info ? Number(info.size) : bytes.byteLength }
    return cached
  }

  function parseWindowBlock(block: string): Record<string, number | null> {
    function num(k: string): number | null {
      const m = new RegExp(k + '["\']?\\s*:\\s*([0-9.]+)').exec(block)
      return m ? parseFloat(m[1]) : null
    }
    const usedPercent = num('usagePercent')
    return {
      usedPercent,
      remainingPercent: usedPercent === null ? null : Math.max(0, 100 - usedPercent),
      resetInSec: num('resetInSec'),
      used: num('used'),
      limit: num('limit'),
    }
  }
  function emptyWindow(): Record<string, number | null> { return { usedPercent: null, remainingPercent: null, resetInSec: null, used: null, limit: null } }
  function parseFallbackRows(html: string): Array<Record<string, number | null>> {
    function parseLabel(label: string): Record<string, number | null> {
      const lower = html.toLowerCase()
      const idx = lower.indexOf(label)
      if (idx < 0) return emptyWindow()
      const block = html.slice(idx, Math.min(idx + 800, html.length))
      const um = /([0-9.]+)%/.exec(block)
      const rm = /reset[^0-9]*([0-9]+)/.exec(block)
      const usedPercent = um ? parseFloat(um[1]) : null
      return { usedPercent, remainingPercent: usedPercent === null ? null : Math.max(0, 100 - usedPercent), resetInSec: rm ? parseFloat(rm[1]) : null, used: null, limit: null }
    }
    return [parseLabel('5-hour'), parseLabel('weekly'), parseLabel('monthly')]
  }
  function parseQuotaHtml(html: string): { rolling: Record<string, number | null>; weekly: Record<string, number | null>; monthly: Record<string, number | null> } | null {
    function win(field: string): Record<string, number | null> {
      const re = new RegExp(field + '\\s*:\\s*(?:\\$R\\[\\d+\\]\\s*=\\s*)?\\{[^}]*\\}')
      const m = re.exec(html)
      return m ? parseWindowBlock(m[0]) : emptyWindow()
    }
    const rolling = win('rollingUsage')
    const weekly = win('weeklyUsage')
    const monthly = win('monthlyUsage')
    if (rolling.usedPercent === null && weekly.usedPercent === null && monthly.usedPercent === null) {
      const fb = parseFallbackRows(html)
      if (fb[0].usedPercent !== null || fb[0].resetInSec !== null || fb[1].usedPercent !== null || fb[2].usedPercent !== null) {
        return { rolling: fb[0], weekly: fb[1], monthly: fb[2] }
      }
      return null
    }
    return { rolling, weekly, monthly }
  }
  async function fetchQuotaLive(): Promise<Record<string, any> | null> {
    // v162：python 候选列表——detectPython 优先，非 Windows 再兜底 python
    const candidates = detectPython() === 'python3' ? ['python3', 'python'] : [detectPython()]
    let lastErr = ''
    for (const py of candidates) {
      try {
        if (subprocess === undefined) {
          quotaError = 'no subprocess service'
          return null
        }
        const proc = subprocess.spawn({
          argv: [py, FETCH_SCRIPT, CREDS_PATH],
          cwd: process.env.PNC_CWD || undefined,
          stdio: { stdin: 'ignore', stdout: { maxBytes: 2 * 1024 * 1024 }, stderr: { maxBytes: 65536 } },
          graceMs: 40000,
        })
        const outcome = await proc.done
        let out = ''
        let err = ''
        try {
          const rd = proc.collected && proc.collected.stdout ? proc.collected.stdout.readFrom(0) : null
          out = rd && rd.text ? rd.text : ''
          const re = proc.collected && proc.collected.stderr ? proc.collected.stderr.readFrom(0) : null
          err = re && re.text ? re.text : ''
        } catch (e) { /* ignore */ }
        if (!out) {
          lastErr = 'python empty exit=' + (outcome ? outcome.exitCode : '?') + ' err=' + err.slice(0, 160)
          continue
        }
        if (out.indexOf('OpenAuth') !== -1 && out.indexOf('usagePercent') === -1) {
          quotaError = 'cookie expired (OpenAuth page)'
          return null
        }
        const parsed = parseQuotaHtml(out)
        if (!parsed) {
          lastErr = 'quota fields not found in page (len=' + out.length + ')'
          continue
        }
        quotaError = null
        return {
          rolling: parsed.rolling,
          weekly: parsed.weekly,
          monthly: parsed.monthly,
          fetchedAt: new Date().toISOString(),
          source: 'live-fetch',
          errorMessage: null,
        }
      } catch (e) {
        lastErr = 'fetch failed: ' + String(e instanceof Error ? e.message : e)
      }
    }
    quotaError = lastErr || 'fetch failed'
    return null
  }
  async function getQuota(): Promise<Record<string, any> | null> {
    const now = Date.now()
    if (quotaCache && now - quotaCacheTime < 180000) return quotaCache
    const q = await fetchQuotaLive()
    quotaCache = q
    quotaCacheTime = now
    return q
  }
  function scoreEvent(type: string | undefined): void {
    let add = 0
    if (type === 'assistant/chunk') add = 2
    else if (type === 'tool/call') add = 12
    else if (type === 'tool/result') add = 8
    else if (type === 'tool/code-dispatch' || type === 'tool/code-dispatch-start') add = 10
    else if (type === 'step/start') add = 5
    else if (type === 'turn/start') add = 6
    else if (type === 'user/message') add = 4
    if (add > 0) {
      activity.score = Math.min(100, activity.score + add)
      activity.events += 1
      activity.lastEventAt = Date.now()
      activity.lastType = type || ''
    }
  }

  const disposers: Array<() => void> = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyCtx = ctx as any
    anyCtx.on('session/event', (session: unknown, event: { type?: string }) => {
      try { scoreEvent(event && event.type) } catch (e) { /* ignore */ }
    })
    anyCtx.on('session/created', (session: any) => {
      try {
        if (session && session.events) {
          for (const ev of session.events) scoreEvent(ev && ev.type)
        }
      } catch (e) { /* ignore */ }
    })
  } catch (e) { /* ignore */ }
  if (timer) {
    disposers.push(timer.interval(() => {
      activity.score = Math.max(0, activity.score * 0.94)
    }, 1000))
  }

  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-bg.mp4',
    handler: async (req: any, res: any) => {
      try {
        const { bytes, size } = await loadVideo()
        const total = bytes.byteLength
        const range = req.headers.range
        const match = typeof range === 'string' ? /^bytes=(\d*)-(\d*)$/.exec(range) : null
        if (match && (match[1] !== '' || match[2] !== '')) {
          let start: number, end: number
          if (match[1] !== '') {
            start = parseInt(match[1], 10)
            end = match[2] !== '' ? Math.min(parseInt(match[2], 10), total - 1) : total - 1
          } else {
            const suffix = parseInt(match[2], 10)
            start = Math.max(total - suffix, 0)
            end = total - 1
          }
          if (start < total && start <= end) {
            res.writeHead(206, {
              'Content-Type': 'video/mp4',
              'Accept-Ranges': 'bytes',
              'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
              'Content-Length': end - start + 1,
              'Cache-Control': 'no-store',
            })
            res.end(bytes.subarray(start, end + 1))
            return
          }
          res.writeHead(416, { 'Content-Range': 'bytes */' + total })
          res.end()
          return
        }
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Content-Length': total,
          'Cache-Control': 'no-store',
        })
        res.end(bytes)
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('video load failed: ' + String(err instanceof Error ? err.message : err))
      }
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-activity.json',
    handler: (req: any, res: any) => {
      const s = activity.score
      let level = 'idle'
      if (s >= 60) level = 'high'
      else if (s >= 25) level = 'medium'
      else if (s > 0) level = 'low'
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({
        score: Math.round(s * 10) / 10,
        level,
        events: activity.events,
        lastType: activity.lastType,
        lastEventAt: activity.lastEventAt,
        updatedAt: new Date().toISOString(),
      }))
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-quota-data.json',
    handler: async (req: any, res: any) => {
      try {
        const q = await getQuota()
        const limits = await readLimits()
        const payload = q ? Object.assign({}, q, { limits }) : { error: quotaError || 'no data', source: 'error', limits }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify(payload))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('quota read failed: ' + String(err instanceof Error ? err.message : err))
      }
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-config',
    handler: async (req: any, res: any) => {
      try {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (c: unknown) => { body += c; if (body.length > 1e6) req.destroy() })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body)
              if (typeof data.cookie !== 'string' || data.cookie.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
                res.end(JSON.stringify({ ok: false, error: 'cookie 不能为空' }))
                return
              }
              const l = data.limits || {}
              const limits = {
                rolling: (Number(l.rolling) > 0) ? Number(l.rolling) : 12,
                weekly: (Number(l.weekly) > 0) ? Number(l.weekly) : 30,
                monthly: (Number(l.monthly) > 0) ? Number(l.monthly) : 60,
              }
              const t = data.theme || {}
              const theme = {
                quotaMo: clampHex(t.quotaMo, DEFAULT_THEME.quotaMo),
                quotaWk: clampHex(t.quotaWk, DEFAULT_THEME.quotaWk),
                quotaRl: clampHex(t.quotaRl, DEFAULT_THEME.quotaRl),
                panelAlpha: clampNum(t.panelAlpha, DEFAULT_THEME.panelAlpha, 0, 1),
                contourAlpha: clampNum(t.contourAlpha, DEFAULT_THEME.contourAlpha, 0, 1),
                conwayAlpha: clampNum(t.conwayAlpha, DEFAULT_THEME.conwayAlpha, 0, 1),
                conwayDensity: clampNum(t.conwayDensity, DEFAULT_THEME.conwayDensity, 0.1, 3),
                videoAlpha: clampNum(t.videoAlpha, DEFAULT_THEME.videoAlpha, 0, 1),
                conwayRefreshMs: clampNum(t.conwayRefreshMs, DEFAULT_THEME.conwayRefreshMs, 30, 2000),
                conwayScrollMs: clampNum(t.conwayScrollMs, DEFAULT_THEME.conwayScrollMs, 30, 2000),
                conwayScrollBlocks: clampNum(t.conwayScrollBlocks, DEFAULT_THEME.conwayScrollBlocks, 0.005, 5),
                contourFlowMs: clampNum(t.contourFlowMs, DEFAULT_THEME.contourFlowMs, 1000, 600000),
                contourRefreshMs: clampNum(t.contourRefreshMs, DEFAULT_THEME.contourRefreshMs, 0, 600000),
                glassAlpha: clampNum(t.glassAlpha, DEFAULT_THEME.glassAlpha, 0, 1),
              }
              const target = await fs.resolve(CREDS_PATH)
              await fs.writeText(target, JSON.stringify({
                workspace_id: typeof data.workspace_id === 'string' ? data.workspace_id : '',
                cookie: data.cookie,
                cookie_len: data.cookie.length,
                limits,
                theme,
              }, null, 2), undefined, undefined, { mode: 'danger-full-access' })
              quotaCache = null
              quotaCacheTime = 0
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
              res.end(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }))
            }
          })
          return
        }
        let cfg: Record<string, any> = { cookie: '', workspace_id: '', cookie_len: 0, limits: { ...DEFAULT_LIMITS }, theme: { ...DEFAULT_THEME } }
        try {
          cfg = await readCreds()
          if (!cfg.limits) cfg.limits = { ...DEFAULT_LIMITS }
          if (!cfg.theme) cfg.theme = { ...DEFAULT_THEME }
          else cfg.theme = await readTheme()
        } catch (e) { /* ignore */ }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify(cfg))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('config failed: ' + String(err instanceof Error ? err.message : err))
      }
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-bg-info',
    handler: async (req: any, res: any) => {
      try {
        const custom = existsSync(UPLOADED_VIDEO_PATH)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify({
          custom,
          path: custom ? UPLOADED_VIDEO_PATH : (process.env.PNC_BG_VIDEO || 'package'),
          size: custom ? Number((await fs.stat(UPLOADED_VIDEO_PATH))?.size ?? 0) : 0,
        }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('bg info failed: ' + String(err instanceof Error ? err.message : err))
      }
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-bg-upload',
    handler: (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.writeHead(405)
        res.end()
        return
      }
      let body = ''
      req.on('data', (c: unknown) => { body += c; if (body.length > 4 * 1024 * 1024 * 1024) req.destroy() })
      req.on('end', async () => {
        try {
          const data = JSON.parse(body)
          // 空 base64 = 恢复默认（删除自定义视频）
          if (data.base64 === '') {
            try { await import('node:fs/promises').then((fsp) => fsp.rm(UPLOADED_VIDEO_PATH, { force: true })) } catch (e) { /* ignore */ }
            cached = null
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: true, reset: true }))
            return
          }
          if (typeof data.base64 !== 'string' || data.base64.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: false, error: '缺少视频数据' }))
            return
          }
          const buf = Buffer.from(data.base64, 'base64')
          if (buf.length < 1024) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: false, error: '视频文件过小（<1KB）' }))
            return
          }
          try { mkdirSync(join(homedir(), '.dsh'), { recursive: true }) } catch (e) { /* ignore */ }
          await writeFile(UPLOADED_VIDEO_PATH, buf)
          cached = null // 清视频缓存，下次请求用新文件
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: true, size: buf.length, path: UPLOADED_VIDEO_PATH }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }))
        }
      })
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-bg-img',
    handler: async (req: any, res: any) => {
      try {
        const img = findUploadedImage()
        if (!img) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('no custom bg image')
          return
        }
        const target = await fs.resolve(img.path)
        const bytes = await fs.readBytes(target, undefined, 256 * 1024 * 1024)
        res.writeHead(200, { 'Content-Type': img.mime, 'Cache-Control': 'no-store' })
        res.end(bytes)
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('bg image load failed: ' + String(err instanceof Error ? err.message : err))
      }
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-bg-img-info',
    handler: async (req: any, res: any) => {
      try {
        const img = findUploadedImage()
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        if (!img) {
          res.end(JSON.stringify({ custom: false, path: 'none', size: 0, mime: null }))
          return
        }
        const target = await fs.resolve(img.path)
        const st = await fs.stat(target)
        res.end(JSON.stringify({ custom: true, path: img.path, size: st ? Number(st.size) : 0, mime: img.mime }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('bg image info failed: ' + String(err instanceof Error ? err.message : err))
      }
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-bg-img-upload',
    handler: (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.writeHead(405)
        res.end()
        return
      }
      let body = ''
      req.on('data', (c: unknown) => { body += c; if (body.length > 512 * 1024 * 1024) req.destroy() })
      req.on('end', async () => {
        try {
          const data = JSON.parse(body)
          // 空 base64 = 恢复默认（删除自定义图片）
          if (data.base64 === '') {
            await removeUploadedImages()
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: true, reset: true }))
            return
          }
          if (typeof data.base64 !== 'string' || data.base64.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: false, error: '缺少图片数据' }))
            return
          }
          const buf = Buffer.from(data.base64, 'base64')
          if (buf.length < 64) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: false, error: '图片文件过小（<64B）' }))
            return
          }
          const type = detectImageType(buf)
          if (!type) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: false, error: '仅支持 PNG/JPEG/GIF/WebP 图片' }))
            return
          }
          try { mkdirSync(join(homedir(), '.dsh'), { recursive: true }) } catch (e) { /* ignore */ }
          await removeUploadedImages()
          await writeFile(join(homedir(), '.dsh', `pnc-bg.${type}`), buf)
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: true, size: buf.length, mime: IMG_MIME[type], path: join(homedir(), '.dsh', `pnc-bg.${type}`) }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }))
        }
      })
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-probe',
    handler: (req: any, res: any) => {
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (c: unknown) => { body += c; if (body.length > 1e6) req.destroy() })
        req.on('end', () => {
          try { probeData = JSON.parse(body) } catch (e) { probeData = { raw: String(body).slice(0, 500) } }
          res.writeHead(204)
          res.end()
        })
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(probeData))
    },
  }))
  if (timer) {
    disposers.push(timer.interval(() => { getQuota().catch(() => {}) }, 180000))
  }
  disposers.push(webServer.tapIndex((html: string) => {
    const svgData = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23.16 17.04"><path fill="#8a94a3" d="' + fishPath + '"/></svg>')
    const css = String(cssText).replace(/__PNC_FISH_SVG__/g, svgData)
    const metaTags = '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n' +
      '<meta http-equiv="Pragma" content="no-cache">\n' +
      '<meta http-equiv="Expires" content="0">\n'
    let out = html
    if (out.indexOf('</head>') !== -1) out = out.replace('</head>', metaTags + '</head>')
    const injected = '<style id="pnc-theme">\n' + css + '\n</style>\n' +
      '<style id="pnc-bg">\n' +
      '#pnc-bg-video{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-3;pointer-events:none;background:#0d1117}\n' +
      '</style>\n' +
      '<video id="pnc-bg-video" src="/pnc-bg.mp4" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>' +
      '<script>\n' + String(jsText) + '\n</script>'
    // v0.2.0：自定义背景图片存在时注入 img（替代视频）
    let bgImgHtml = ''
    try {
      const img = findUploadedImage()
      if (img) {
        bgImgHtml = '<img id="pnc-bg-img" src="/pnc-bg-img" alt="" aria-hidden="true">\n' +
          '<style id="pnc-bg-img-style">#pnc-bg-img{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-3;pointer-events:none;background:#0d1117;opacity:var(--pnc-video-alpha,1)}#pnc-bg-video{display:none !important}</style>\n'
      }
    } catch (e) { /* ignore */ }
    const finalInject = bgImgHtml + injected
    if (out.indexOf('</body>') !== -1) return out.replace('</body>', finalInject + '</body>')
    return out + finalInject
  }))
  ctx.effect(() => () => {
    for (const d of disposers) {
      try { d() } catch (e) { /* ignore */ }
    }
  })
}
