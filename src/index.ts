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
import type { Context } from 'cordis'
import { fileURLToPath } from 'node:url'

export const name = '@dsh-external/dsh-pnc-theme'

const VIDEO_PATH = 'D:/gfl2mod/【钢铁雄心4KX填词】不堪重负的合众国 - Original.mp4'
const CONTOUR_PATH = 'D:/gfl2mod/e61c2cc0659862858de9cb3b5c5c617cfb81c92d706b2-KfnU0c_fw658.webp'
const CONTOUR_INV_PATH = 'D:/gfl2mod/contour_inv.png'
const CONTOUR_ALPHA_PATH = 'D:/gfl2mod/contour_inv_alpha.png'
const CREDS_PATH = 'D:/gfl2mod/pnc_creds.json'
const FETCH_SCRIPT = 'D:/gfl2mod/fetch_quota.py'
const FISH_FILE = fileURLToPath(new URL('./assets/pnc_fish_path.txt', import.meta.url))
const CSS_FILE = fileURLToPath(new URL('./assets/pnc_inject.css', import.meta.url))
const JS_FILE = fileURLToPath(new URL('./assets/pnc_inject.js', import.meta.url))

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
  let contourCached: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contourInvCached: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contourAlphaCached: any = null
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
    const target = await fs.resolve(VIDEO_PATH)
    const info = await fs.stat(target)
    const bytes = await fs.readBytes(target, undefined, 512 * 1024 * 1024)
    cached = { bytes, size: info ? Number(info.size) : bytes.byteLength }
    return cached
  }
  async function loadContour() {
    if (contourCached) return contourCached
    const target = await fs.resolve(CONTOUR_PATH)
    const bytes = await fs.readBytes(target, undefined, 8 * 1024 * 1024)
    contourCached = bytes
    return contourCached
  }
  async function loadContourInv() {
    if (contourInvCached) return contourInvCached
    const target = await fs.resolve(CONTOUR_INV_PATH)
    const bytes = await fs.readBytes(target, undefined, 8 * 1024 * 1024)
    contourInvCached = bytes
    return contourInvCached
  }
  async function loadContourAlpha() {
    if (contourAlphaCached) return contourAlphaCached
    const target = await fs.resolve(CONTOUR_ALPHA_PATH)
    const bytes = await fs.readBytes(target, undefined, 8 * 1024 * 1024)
    contourAlphaCached = bytes
    return contourAlphaCached
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
    try {
      if (subprocess === undefined) {
        quotaError = 'no subprocess service'
        return null
      }
      const proc = subprocess.spawn({
        argv: ['C:/Program Files/Python312/python.exe', FETCH_SCRIPT],
        cwd: 'D:/gfl2mod',
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
        quotaError = 'python empty exit=' + (outcome ? outcome.exitCode : '?') + ' err=' + err.slice(0, 160)
        return null
      }
      if (out.indexOf('OpenAuth') !== -1 && out.indexOf('usagePercent') === -1) {
        quotaError = 'cookie expired (OpenAuth page)'
        return null
      }
      const parsed = parseQuotaHtml(out)
      if (!parsed) {
        quotaError = 'quota fields not found in page (len=' + out.length + ')'
        return null
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
      quotaError = 'fetch failed: ' + String(e instanceof Error ? e.message : e)
    }
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
    path: '/pnc-contour.webp',
    handler: async (req: any, res: any) => {
      try {
        const bytes = await loadContour()
        res.writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': bytes.byteLength, 'Cache-Control': 'no-store' })
        res.end(bytes)
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('contour load failed: ' + String(err instanceof Error ? err.message : err))
      }
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-contour-inv.png',
    handler: async (req: any, res: any) => {
      try {
        const bytes = await loadContourInv()
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': bytes.byteLength, 'Cache-Control': 'no-store' })
        res.end(bytes)
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('contour inv load failed: ' + String(err instanceof Error ? err.message : err))
      }
    },
  }))
  disposers.push(webServer.register({
    kind: 'exact',
    path: '/pnc-contour-inv-alpha.png',
    handler: async (req: any, res: any) => {
      try {
        const bytes = await loadContourAlpha()
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': bytes.byteLength, 'Cache-Control': 'no-store' })
        res.end(bytes)
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('contour alpha load failed: ' + String(err instanceof Error ? err.message : err))
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
              const target = await fs.resolve(CREDS_PATH)
              await fs.writeText(target, JSON.stringify({
                workspace_id: typeof data.workspace_id === 'string' ? data.workspace_id : '',
                cookie: data.cookie,
                cookie_len: data.cookie.length,
                limits,
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
        let cfg: Record<string, any> = { cookie: '', workspace_id: '', cookie_len: 0, limits: { ...DEFAULT_LIMITS } }
        try {
          cfg = await readCreds()
          if (!cfg.limits) cfg.limits = { ...DEFAULT_LIMITS }
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
    if (out.indexOf('</body>') !== -1) return out.replace('</body>', injected + '</body>')
    return out + injected
  }))
  ctx.effect(() => () => {
    for (const d of disposers) {
      try { d() } catch (e) { /* ignore */ }
    }
  })
}
