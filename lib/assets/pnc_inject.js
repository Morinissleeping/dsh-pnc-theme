(function () {
  if (window.__pncSweepInstalled) return;
  window.__pncSweepInstalled = true;
  if (location.search.indexOf('pnc-novid') !== -1) {
    var v = document.getElementById('pnc-bg-video');
    if (v) { v.style.display = 'none'; v.preload = 'none'; v.removeAttribute('src'); try { v.load(); } catch (e) {} }
    var img = document.getElementById('pnc-bg-img');
    if (img) img.style.display = 'none';
    document.documentElement.style.background = '#0d1117';
    document.body.style.background = '#0d1117';
  }
  var CW = { GW: 404, GH: 19, CS: 6, VW: 148 }
  // v155：视觉主题参数（设置页可配置；默认值 = CSS/canvas 原硬编码值）
  // v158：速度类参数 ms 直显
  var PNC_THEME_DEFAULTS = {
    quotaMo: '#1550B5',
    quotaWk: '#3A7BF2',
    quotaRl: '#5E9CF5',
    panelAlpha: 0.55,
    contourAlpha: 0.3,
    conwayAlpha: 0.4,
    conwayDensity: 1,
    videoAlpha: 1,
    conwayRefreshMs: 260,
    conwayScrollMs: 260,
    conwayScrollBlocks: 0.135,
    contourFlowMs: 180000,
    contourRefreshMs: 0,
    glassAlpha: 0.9
  };
  window.__pncTheme = Object.assign({}, PNC_THEME_DEFAULTS);
  function hexToRgb(hex) {
    var m = /^#([0-9a-fA-F]{6})$/.exec(hex || '');
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // 把主题参数应用到 CSS 变量与 canvas 参数（供设置页保存后调用；页面加载时自动跑一次）
  function applyTheme(t) {
    var th = t || window.__pncTheme || PNC_THEME_DEFAULTS;
    window.__pncTheme = th;
    var root = document.documentElement;
    root.style.setProperty('--pnc-quota-mo', th.quotaMo);
    root.style.setProperty('--pnc-quota-wk', th.quotaWk);
    root.style.setProperty('--pnc-quota-rl', th.quotaRl);
    root.style.setProperty('--pnc-panel-alpha', String(clampNum(th.panelAlpha, 0.55, 0, 1)));
    window.__pncContourAlpha = clampNum(th.contourAlpha, 0.3, 0, 1);
    window.__pncConwayAlpha = clampNum(th.conwayAlpha, 0.4, 0, 1);
    window.__pncConwayDensity = clampNum(th.conwayDensity, 1, 0.1, 3);
    window.__pncVideoAlpha = clampNum(th.videoAlpha, 1, 0, 1);
    window.__pncConwayRefreshMs = clampNum(th.conwayRefreshMs, 260, 30, 2000);
    window.__pncConwayScrollMs = clampNum(th.conwayScrollMs, 260, 30, 2000);
    window.__pncConwayScrollBlocks = clampNum(th.conwayScrollBlocks, 0.135, 0.005, 5);
    window.__pncContourFlowMs = clampNum(th.contourFlowMs, 180000, 1000, 600000);
    window.__pncContourRefreshMs = clampNum(th.contourRefreshMs, 0, 0, 600000);
    root.style.setProperty('--pnc-video-alpha', String(window.__pncVideoAlpha));
    root.style.setProperty('--pnc-glass-alpha', String(clampNum(th.glassAlpha, 0.9, 0, 1)));
    root.style.setProperty('--pnc-contour-flow-ms', window.__pncContourFlowMs + 'ms');
    // 等高线定期重绘（contourRefreshMs>0 时按周期清缓存再生，产生缓慢演变）
    if (window.__pncContourRefreshTimer) {
      clearTimeout(window.__pncContourRefreshTimer);
      window.__pncContourRefreshTimer = null;
    }
    if (window.__pncContourRefreshMs > 0) {
      (function schedule() {
        window.__pncContourRefreshTimer = setTimeout(function () {
          window.__pncContourSet = null;
          applyContour();
          schedule();
        }, window.__pncContourRefreshMs);
      })();
    }
    // 等高线已生成则按新不透明度重绘（清缓存强制再生）
    if (window.__pncContourSet) {
      window.__pncContourSet = null;
      applyContour();
    }
  }
  window.__pncApplyTheme = applyTheme;
  function clampNum(v, fb, lo, hi) {
    var n = Number(v);
    return (isFinite(n) && n >= lo && n <= hi) ? n : fb;
  }
  // 页面加载时拉取 theme 配置（凭据文件里的 theme 字段），未配置用默认
  function loadTheme() {
    fetch('/pnc-config').then(function (r) { return r.json(); }).then(function (cfg) {
      if (cfg && cfg.theme) applyTheme(cfg.theme);
    }).catch(function () {});
  }
  // v160：浅色主题不适配提示——检测到浅色主题时在右下角提示一次（可关闭）
  function checkLightTheme() {
    function isLight() {
      // DSH 深色标记权威位置：body[data-ds-dark-theme]（html 上没有）
      return document.body.getAttribute('data-ds-dark-theme') === null &&
        document.documentElement.getAttribute('data-ds-dark-theme') === null;
    }
    function showNotice() {
      if (document.getElementById('pnc-light-notice') || !isLight()) return;
      var n = document.createElement('div');
      n.id = 'pnc-light-notice';
      n.setAttribute('role', 'status');
      n.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;background:#2C2C2E;color:#e8ecf1;border:1px solid rgba(255,255,255,.16);padding:10px 14px;font-size:12px;line-height:1.6;font-family:"Source Han Sans SC","Source Han Sans CN","Noto Sans CJK SC","Microsoft YaHei",sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.5);max-width:300px';
      n.innerHTML = '<div style="font-weight:600;margin-bottom:4px">⚠ PNC 主题不适配浅色主题</div>' +
        '<div>当前为浅色模式，背景视频/等高线/信息流暗色效果将异常。请在 设置 → 外观 中切换到深色主题。</div>' +
        '<button id="pnc-light-close" style="margin-top:8px;background:#3A3F45;color:#fff;border:none;padding:4px 12px;font-size:12px;cursor:pointer">知道了</button>';
      document.body.appendChild(n);
      document.getElementById('pnc-light-close').addEventListener('click', function () {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
    }
    setTimeout(showNotice, 800);
    // 监听主题切换：切到深色自动移除，切回浅色重新提示
    if (window.MutationObserver) {
      var mo2 = new MutationObserver(function () {
        var el = document.getElementById('pnc-light-notice');
        if (isLight()) {
          showNotice();
        } else if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      mo2.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] });
      mo2.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ds-dark-theme'] });
    }
  }
  function conwayEvolve() {
    var s = window.__pncConway;
    if (!s) return;
    // v146：活动度由 LLM 工作状态接口驱动（pollActivity 每 2s 更新）
    s.activity *= 0.985;
    var col0 = Math.floor((s.scroll || 0) / CW.CS);
    var front = (col0 + CW.VW) % CW.GW;
    // v155：播种密度 = 活跃度基础密度 × 配置系数
    var densityMul = window.__pncConwayDensity || 1;
    var p = Math.min(0.9, (s.activity / 80) * densityMul);
    if (Math.random() < p) {
      var by = Math.floor(Math.random() * (CW.GH - 2));
      var len2 = 2 + (Math.random() < 0.4 ? 1 : 0);
      for (var i = 0; i < len2; i++) s.g[front + (by + i) * CW.GW] = 1;
    }
    if (Math.random() < p * 0.6) {
      var by2 = Math.floor(Math.random() * CW.GH);
      s.g[((front + 1) % CW.GW) + by2 * CW.GW] = 1;
    }
    var g = s.g, g2 = s.g2;
    for (var y = 0; y < CW.GH; y++) {
      for (var x = 0; x < CW.GW; x++) {
        var n = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            n += g[((x + dx + CW.GW) % CW.GW) + ((y + dy + CW.GH) % CW.GH) * CW.GW];
          }
        }
        var idx = x + y * CW.GW;
        g2[idx] = (g[idx] === 1) ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
      }
    }
    var t = g; s.g = g2; s.g2 = t;
    s.timer = setTimeout(conwayEvolve, (window.__pncConwayRefreshMs || 260));
  }
  function conwayCamera() {
    var s = window.__pncConway;
    if (!s) return;
    // v161：镜头（滚动）速度 = 每次移动 N 个 block（1 block = CW.CS px）
    var blocks = window.__pncConwayScrollBlocks != null ? window.__pncConwayScrollBlocks : 0.135;
    s.scroll = (s.scroll || 0) + blocks * CW.CS;
    var cv = document.querySelector('.pnc-conway');
    if (cv && cv.width > 0) {
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var off = s.scroll % (CW.GW * CW.CS);
      var sub = off - Math.floor(off / CW.CS) * CW.CS;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 0; gx <= cv.width + CW.CS; gx += CW.CS) {
        var px = gx - sub + 0.5;
        ctx.moveTo(px, 0); ctx.lineTo(px, cv.height);
      }
      for (var gy = 0; gy <= CW.GH; gy++) {
        var py = gy * CW.CS + 0.5;
        ctx.moveTo(0, py); ctx.lineTo(cv.width, py);
      }
      ctx.stroke();
      // v155：康威方块不透明度可配置
      var cwa = window.__pncConwayAlpha || 0.4;
      ctx.fillStyle = 'rgba(122,124,128,' + cwa + ')';
      var col0b = Math.floor(off / CW.CS);
      for (var vx = 0; vx <= CW.VW; vx++) {
        var wx = (col0b + vx) % CW.GW;
        for (var yy = 0; yy < CW.GH; yy++) {
          if (s.g[wx + yy * CW.GW]) {
            ctx.fillRect(vx * CW.CS - sub, yy * CW.CS, CW.CS - 1, CW.CS - 1);
          }
        }
      }
    }
    s.camTimer = setTimeout(conwayCamera, (window.__pncConwayScrollMs != null ? window.__pncConwayScrollMs : 260));
  }
  function ensureConway() {
    var host = document.querySelector('.pI_x6G_centerCol');
    if (!host) return;
    var cv = host.querySelector('.pnc-conway');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.className = 'pnc-conway';
      host.insertBefore(cv, host.firstChild);
      cv.width = 890;
      cv.height = Math.max(100, host.clientHeight || 600);
      CW.VW = Math.floor(cv.width / CW.CS);
      CW.GH = Math.floor(cv.height / CW.CS);
      if (!window.__pncConway || !window.__pncConway.g) {
        var s = { g: new Uint8Array(CW.GW * CW.GH), g2: new Uint8Array(CW.GW * CW.GH), scroll: 0, activity: 0, lastLen: 0, timer: null, camTimer: null };
        window.__pncConway = s;
      }
      var st = window.__pncConway;
      if (!st.timer) st.timer = setTimeout(conwayEvolve, (window.__pncConwayRefreshMs || 260));
      if (!st.camTimer) st.camTimer = setTimeout(conwayCamera, (window.__pncConwayScrollMs != null ? window.__pncConwayScrollMs : 260));
    } else {
      var h2 = host.clientHeight || 600;
      var want = Math.max(16, Math.floor(h2 / CW.CS));
      if (want !== CW.GH) {
        cv.height = want * CW.CS;
        var s2 = window.__pncConway;
        if (s2) {
          var g3 = new Uint8Array(CW.GW * want);
          var g4 = new Uint8Array(CW.GW * want);
          var mn = Math.min(want, CW.GH);
          for (var yy2 = 0; yy2 < mn; yy2++) {
            for (var xx = 0; xx < CW.GW; xx++) {
              g3[xx + yy2 * CW.GW] = s2.g[xx + yy2 * CW.GW];
            }
          }
          s2.g = g3; s2.g2 = g4;
        }
        CW.GH = want;
      }
    }
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeValueNoise(seed, grid) {
    var rng = mulberry32(seed);
    var vals = new Float32Array(grid * grid);
    for (var i = 0; i < vals.length; i++) vals[i] = rng();
    function at(x, y) {
      x = ((x % grid) + grid) % grid;
      y = ((y % grid) + grid) % grid;
      return vals[y * grid + x];
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = smooth(xf), v = smooth(yf);
      var a = at(xi, yi), b = at(xi + 1, yi);
      var c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
  }
  function genContour(seed, W, H, levels) {
    // v145/v146：marching squares 连续等值线；levels 决定密度（LLM 活跃时更密）
    var grid = 7;
    var n1 = makeValueNoise(seed, grid);
    var n2 = makeValueNoise(seed + 999, grid);
    var warp = 16;
    var z = new Float32Array(W * H);
    for (var y = 0; y < H; y++) {
      var ny = y / H * grid;
      for (var x = 0; x < W; x++) {
        var nx = x / W * grid;
        var wx = warp * (n2(nx + 3.7, ny + 1.2) - 0.5) * grid / W * 2;
        var wy = warp * (n2(nx + 8.1, ny + 5.3) - 0.5) * grid / H * 2;
        var v = 0, amp = 1, freq = 1, sum = 0;
        for (var o = 0; o < 2; o++) {
          v += amp * n1((nx + wx) * freq, (ny + wy) * freq);
          sum += amp; amp *= 0.5; freq *= 2;
        }
        z[y * W + x] = v / sum;
      }
    }
    var min = 1e9, max = -1e9;
    for (var i = 0; i < z.length; i++) { if (z[i] < min) min = z[i]; if (z[i] > max) max = z[i]; }
    levels = levels || 5;
    var ls = [];
    for (var li = 0; li < levels; li++) ls.push(min + (li + 1) * (max - min) / (levels + 1));
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    // v155：等高线不透明度可配置
    var ca = window.__pncContourAlpha != null ? window.__pncContourAlpha : 0.3;
    ctx.strokeStyle = 'rgba(88,88,90,' + ca + ')';
    ctx.lineWidth = 1;
    for (var y = 0; y < H - 1; y++) {
      for (var x = 0; x < W - 1; x++) {
        var i00 = y * W + x, i10 = y * W + x + 1, i01 = (y + 1) * W + x, i11 = (y + 1) * W + x + 1;
        var z00 = z[i00], z10 = z[i10], z01 = z[i01], z11 = z[i11];
        for (var li = 0; li < levels; li++) {
          var L = ls[li];
          function interp(a, za, b, zb) {
            if (Math.abs(zb - za) < 1e-9) return (a + b) / 2;
            var t = (L - za) / (zb - za);
            return a + (b - a) * t;
          }
          var pts = [];
          if ((z00 < L) !== (z10 < L)) pts.push([interp(x, z00, x + 1, z10), y]);
          if ((z10 < L) !== (z11 < L)) pts.push([x + 1, interp(y, z10, y + 1, z11)]);
          if ((z11 < L) !== (z01 < L)) pts.push([interp(x, z01, x + 1, z11), y + 1]);
          if ((z01 < L) !== (z00 < L)) pts.push([x, interp(y, z01, y + 1, z00)]);
          if (pts.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            ctx.lineTo(pts[1][0], pts[1][1]);
            ctx.stroke();
          }
        }
      }
    }
    return cv.toDataURL('image/png');
  }
  function applyContour() {
    var set = window.__pncContourSet;
    if (!set) {
      var seed = (Date.now() & 0x7fffffff) ^ ((Math.random() * 0x7fffffff) | 0);
      // v146：三档密度（稀疏/中/密），随 LLM 活跃度切换
      set = [
        genContour(seed, 320, 320, 2),
        genContour(seed, 320, 320, 4),
        genContour(seed, 320, 320, 6)
      ];
      window.__pncContourSet = set;
    }
    var hd = document.querySelector('.wSkVaW_header');
    var hh = hd ? hd.getBoundingClientRect().height : 120;
    var sb = document.querySelector('.pI_x6G_sidebarCol');
    var url = set[window.__pncContourLevel || 1] || set[1];
    var els = document.querySelectorAll('.pI_x6G_sidebarCol, .wSkVaW_header');
    for (var i = 0; i < els.length; i++) {
      els[i].style.backgroundImage = 'url(' + url + ')';
    }
    if (sb) sb.style.setProperty('--pnc-offset-y', (-hh) + 'px');
    if (hd) hd.style.setProperty('--pnc-offset-y', '0px');
  }
  function fmtResetHtml(sec) {
    if (!(sec > 0)) return '--';
    var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d > 0) return d + '<span class="pnc-unit">d</span>' + h + '<span class="pnc-unit">h</span>';
    if (h > 0) return h + '<span class="pnc-unit">h</span>' + m + '<span class="pnc-unit">m</span>';
    return m + '<span class="pnc-unit">m</span>';
  }
  function applyQuota(q, instant) {
    if (!q || !q.monthly) return;
    // v143：横条长度 = 已用% × 限额/$60；金额限额来自配置（q.limits），不再代码死绑
    var used = document.querySelectorAll('.pnc-quota-used');
    if (used.length === 3) {
      var mo = q.monthly.usedPercent != null ? q.monthly.usedPercent : 0;
      var wk = q.weekly && q.weekly.usedPercent != null ? q.weekly.usedPercent : 0;
      var rl = q.rolling && q.rolling.usedPercent != null ? q.rolling.usedPercent : 0;
      var limits = q.limits || {};
      var moL = (Number(limits.monthly) > 0) ? Number(limits.monthly) : 60;
      var wkL = (Number(limits.weekly) > 0) ? Number(limits.weekly) : 30;
      var rlL = (Number(limits.rolling) > 0) ? Number(limits.rolling) : 12;
      var maxL = Math.max(moL, wkL, rlL);
      used[0].style.width = Math.min(100, mo * moL / maxL) + '%';
      used[1].style.width = Math.min(100, wk * wkL / maxL) + '%';
      used[2].style.width = Math.min(100, rl * rlL / maxL) + '%';
    }
    var tags = document.querySelectorAll('.pnc-quota-refresh');
    if (tags.length === 3) {
      tags[0].innerHTML = fmtResetHtml(q.rolling && q.rolling.resetInSec);
      tags[1].innerHTML = fmtResetHtml(q.weekly && q.weekly.resetInSec);
      tags[2].innerHTML = fmtResetHtml(q.monthly.resetInSec);
    }
  }
  function updateQuota(instant) {
    try {
      var now = Date.now();
      var cache = window.__pncQuotaCache;
      if (cache && now - cache.t < 180000) { applyQuota(cache.q, instant); return; }
      fetch('/pnc-quota-data.json').then(function (r) { return r.json(); }).then(function (q) {
        window.__pncQuotaCache = { t: Date.now(), q: q };
        applyQuota(q, instant);
      }).catch(function () {});
    } catch (e) {}
  }
  function buildQuota() {
    var q = document.createElement('div');
    q.className = 'pnc-quota';
    var bar = document.createElement('div');
    bar.className = 'pnc-quota-bar';
    var usedMo = document.createElement('div');
    usedMo.className = 'pnc-quota-used pnc-quota-used-mo';
    bar.appendChild(usedMo);
    var usedWk = document.createElement('div');
    usedWk.className = 'pnc-quota-used pnc-quota-used-wk';
    bar.appendChild(usedWk);
    var usedRl = document.createElement('div');
    usedRl.className = 'pnc-quota-used pnc-quota-used-rl';
    bar.appendChild(usedRl);
    var marks = ['20%', '50%', '100%'];
    for (var j = 0; j < marks.length; j++) {
      var ln = document.createElement('div');
      ln.className = 'pnc-quota-line';
      ln.style.left = marks[j];
      bar.appendChild(ln);
    }
    var tags = [
      { pos: 'calc(0% + 4px)', txt: '--' },
      { pos: 'calc(20% + 4px)', txt: '--' },
      { pos: 'calc(50% + 4px)', txt: '--' }
    ];
    for (var k = 0; k < tags.length; k++) {
      var tg = document.createElement('span');
      tg.className = 'pnc-quota-refresh';
      tg.style.left = tags[k].pos;
      tg.textContent = tags[k].txt;
      bar.appendChild(tg);
    }
    q.appendChild(bar);
    return q;
  }
  function ensureQuota() {
    var stacks = document.querySelectorAll('.wSkVaW_composerStack');
    var made = false;
    for (var i = 0; i < stacks.length; i++) {
      var st = stacks[i];
      var card = st.querySelector('.uV2eYG_card');
      if (!card) continue;
      var row = card.querySelector('.uV2eYG_row');
      var q = card.querySelector('.pnc-quota');
      if (!q) {
        // v145：复用缓存的配额条元素（切换对话时不重建、不重新 fetch、不重放动画）
        if (window.__pncQuotaEl && window.__pncQuotaEl !== card) {
          q = window.__pncQuotaEl;
          if (row && row.nextSibling) card.insertBefore(q, row.nextSibling);
          else card.appendChild(q);
        } else {
          q = buildQuota();
          if (row && row.nextSibling) card.insertBefore(q, row.nextSibling);
          else card.appendChild(q);
          made = true;
        }
        window.__pncQuotaEl = q;
      }
      if (row) q.style.width = row.offsetWidth + 'px';
    }
    var all = document.querySelectorAll('.pnc-quota');
    for (var m = 0; m < all.length; m++) {
      var el = all[m];
      if (!el.closest('.uV2eYG_card')) {
        if (el === window.__pncQuotaEl) continue;
        var p = el.parentNode;
        if (p) p.removeChild(el);
      }
    }
    if (made) updateQuota(true);
  }
  var _alignT = null;
  function ensureAlign() {
    if (_alignT) clearTimeout(_alignT);
    _alignT = setTimeout(function () {
      var card = document.querySelector('.uV2eYG_card');
      if (!card) return;
      var w = card.offsetWidth;
      var docks = document.querySelectorAll('._7yHdaG_dock');
      for (var i = 0; i < docks.length; i++) {
        docks[i].style.setProperty('width', w + 'px', 'important');
      }
    }, 150);
  }
  // v156：配置面板已迁入 DSH 原生设置页（设置 → OpenCode Go 配额），移除 ⚙ 浮动按钮/锚定逻辑
  // v172：deepseek logo（::after）被裁切是设计意图——card 始终 overflow:visible，
  // 模型选择器弹层（_7KE1Ra_menu）/命令块/用量条永不被裁（删除 v170 的临时切 overflow：
  // 那会让弹层打开瞬间 logo 解除裁切）；logo 裁切由动态 clip-path 实现：按 ::after
  // 相对卡片几何计算 inset（--pnc-logo-clip），视觉与 overflow:hidden 一致。
  // 卡片尺寸/用量条高度变化时由调用方重算（MutationObserver/resize）。
  function clipLogo() {
    var cards = document.querySelectorAll('.uV2eYG_card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var cs = window.getComputedStyle(card, '::after');
      if (!cs) continue;
      var w = parseFloat(cs.width), h = parseFloat(cs.height);
      var right = parseFloat(cs.right), bottom = parseFloat(cs.bottom);
      if (!(w > 0) || !(h > 0)) continue;
      var cw = card.clientWidth, ch = card.clientHeight;
      var lx = cw - w - right;  // logo 左缘相对卡片左
      var ty = ch - h - bottom; // logo 上缘相对卡片顶
      var clipT = Math.max(0, -ty);
      var clipR = Math.max(0, lx + w - cw);
      var clipB = Math.max(0, ty + h - ch);
      var clipL = Math.max(0, -lx);
      card.style.setProperty('--pnc-logo-clip', 'inset(' + clipT + 'px ' + clipR + 'px ' + clipB + 'px ' + clipL + 'px)');
    }
  }
  // v146：轮询 LLM 工作状态评分 → 驱动康威活动度与等高线密度
  function pollActivity() {
    fetch('/pnc-activity.json').then(function (r) { return r.json(); }).then(function (a) {
      var s = a && a.score ? a.score : 0;
      window.__pncActivity = a;
      if (window.__pncConway) {
        // score 0-100 → activity 0-200（播种概率 p = activity/80，上限 0.9）
        window.__pncConway.activity = Math.min(200, s * 2);
      }
      var level = s >= 60 ? 2 : (s >= 25 ? 1 : 0);
      if (level !== window.__pncContourLevel) {
        window.__pncContourLevel = level;
        applyContour();
      }
    }).catch(function () {});
    setTimeout(pollActivity, 2000);
  }
  applyContour();
  ensureConway();
  ensureQuota();
  ensureAlign();
  pollActivity();
  loadTheme();
  checkLightTheme();
  clipLogo();
  updateQuota(false);
  setInterval(function () { updateQuota(false); }, 180000);
  if (window.MutationObserver) {
    var mo = new MutationObserver(function () {
      var sb = document.querySelector('.pI_x6G_sidebarCol');
      var hd = document.querySelector('.wSkVaW_header');
      var need = (sb && sb.style.backgroundImage.indexOf('data:') === -1) || (hd && hd.style.backgroundImage.indexOf('data:') === -1);
      if (need) applyContour();
      ensureConway();
      ensureQuota();
      ensureAlign();
      clipLogo();
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  window.addEventListener('resize', function () { ensureQuota(); ensureAlign(); ensureConway(); clipLogo(); });
  var SELECTOR = '.hHd-Xa_newSession,.uV2eYG_primary,.nL4_yW_sessionLogButton,.uV2eYG_add,.qDHVXG_searchButton,.pXSMma_workspace,.qDHVXG_iconButton,.VOzbGW_trigger,.hHd-Xa_iconButton,.Nqubda_badge';
  document.addEventListener('pointerdown', function (e) {
    var el = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!el || el.disabled) return;
    var glow = document.createElement('span');
    glow.className = 'pnc-sweep-glow';
    glow.setAttribute('aria-hidden', 'true');
    var w = el.getBoundingClientRect ? el.getBoundingClientRect().width : 100;
    glow.style.animationDuration = Math.max(0.04, (2.3 * w / 1400)) + 's';
    glow.addEventListener('animationend', function () {
      if (glow.parentNode) glow.parentNode.removeChild(glow);
    });
    el.appendChild(glow);
  }, true);
})();