// dsh-pnc-theme client 端：把 OpenCode Go 配额配置挂到 DSH 原生设置页。
// 构建时由 scripts/build.sh 拷贝到 lib/client.js（UMD + window.__ModuleLoader__.load）。
// component 必须是 React 组件（slots 渲染器以 jsx(Comp) 调用；返回 {render()} 对象会渲染为空）。
window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-pnc-theme",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const inject = ["slots"];
		const styles = `
.pnc-page{font-family:"Source Han Sans SC","Source Han Sans CN","Noto Sans CJK SC","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.7;padding:14px 16px;max-width:720px;color:var(--dsw-alias-label-primary,#e8ecf1)}
.pnc-page h3{margin:0 0 4px;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,#fff)}
.pnc-page h4{margin:18px 0 8px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#fff);border-top:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));padding-top:12px}
.pnc-page h4:first-of-type{border-top:none;margin-top:10px;padding-top:0}
.pnc-sub{margin:10px 0 4px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#a8b0ba)}
.pnc-desc{margin:0 0 12px;font-size:12px;color:var(--dsw-alias-label-secondary,#a8b0ba)}
.pnc-tutorial{margin:0 0 16px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,#1c1c1e);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));border-radius:6px;font-size:12px;line-height:1.9;color:var(--dsw-alias-label-secondary,#a8b0ba)}
.pnc-tutorial summary{cursor:pointer;font-weight:600;color:var(--dsw-alias-label-primary,#fff);outline:none}
.pnc-tutorial b{color:var(--dsw-alias-label-primary,#fff);font-weight:600}
.pnc-tutorial code{font-family:Consolas,Monaco,monospace;color:#9ecbff;background:rgba(58,123,242,.12);padding:0 4px;border-radius:3px;font-size:11px}
.pnc-field{margin-bottom:12px}
.pnc-field label{display:block;font-size:12px;color:var(--dsw-alias-label-secondary,#a8b0ba);margin-bottom:4px}
.pnc-input{width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#1c1c1e);color:var(--dsw-alias-label-primary,#e8ecf1);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));border-radius:6px;padding:7px 9px;font-size:12px;font-family:Consolas,Monaco,monospace;outline:none}
.pnc-input:focus{border-color:var(--dsw-static-neutral-bluish-400,#4a8dff)}
textarea.pnc-input{resize:vertical;min-height:72px}
.pnc-row{display:flex;gap:10px;flex-wrap:wrap}
.pnc-row .pnc-field{flex:1;min-width:110px}
.pnc-theme-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.pnc-theme-row .pnc-lbl{flex:0 0 150px;font-size:12px;color:var(--dsw-alias-label-secondary,#a8b0ba)}
.pnc-color{width:44px;height:28px;padding:2px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-radius:6px;background:var(--dsw-alias-bg-layer-2,#1c1c1e);cursor:pointer}
.pnc-range{flex:1;-webkit-appearance:none;appearance:none;height:8px;border-radius:0 !important;cursor:pointer;outline:none;background:rgba(255,255,255,.15)}
.pnc-range::-webkit-slider-runnable-track{height:8px;border-radius:0;background:transparent}
.pnc-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:20px;margin-top:-6px;background:#fff;border:none;border-radius:0 !important;box-shadow:none !important}
.pnc-range::-moz-range-track{height:8px;border-radius:0;background:rgba(255,255,255,.15)}
.pnc-range::-moz-range-progress{height:8px;background:#fff;border-radius:0}
.pnc-range::-moz-range-thumb{width:14px;height:20px;background:#fff;border:none;border-radius:0 !important;box-shadow:none !important}
.pnc-val{flex:0 0 64px;font-size:12px;color:var(--dsw-alias-label-secondary,#a8b0ba);text-align:right;font-family:Consolas,Monaco,monospace}
.pnc-btns{display:flex;gap:8px;margin-top:14px;align-items:center}
.pnc-btn{background:var(--dsw-static-neutral-bluish-400,#3a7bf2);color:#fff;border:none;border-radius:6px;padding:7px 18px;cursor:pointer;font-size:13px;font-weight:500}
.pnc-btn:hover{opacity:.9}
.pnc-btn:disabled{opacity:.5;cursor:not-allowed}
.pnc-btn.ghost{background:transparent;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));color:var(--dsw-alias-label-primary,#e8ecf1)}
.pnc-file-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.pnc-file{flex:1}
.pnc-file input[type=file]{width:100%;font-size:12px;color:var(--dsw-alias-label-secondary,#a8b0ba)}
.pnc-status{font-size:12px;color:var(--dsw-alias-label-secondary,#a8b0ba);min-height:18px;margin-left:8px}
.pnc-status.ok{color:var(--dsw-alias-state-success-primary,#3fb950)}
.pnc-status.err{color:var(--dsw-alias-state-error-primary,#f85149)}
`;
		const PNC_THEME_DEFAULTS = { quotaMo: '#1550B5', quotaWk: '#3A7BF2', quotaRl: '#5E9CF5', panelAlpha: 0.9, contourAlpha: 0.3, conwayAlpha: 0.4, conwayDensity: 1, videoAlpha: 1, conwayRefreshMs: 260, conwayScrollMs: 260, conwayScrollBlocks: 0.135, contourFlowMs: 180000, contourRefreshMs: 0, glassAlpha: 0.65 };
		/** 设置页 React 组件：cookie/workspace_id/limits 表单 + 视觉主题参数，读写 /pnc-config。 */
		function PncQuotaSection() {
			const [cookie, setCookie] = React.useState("");
			const [wsid, setWsid] = React.useState("");
			const [rl, setRl] = React.useState(12);
			const [wk, setWk] = React.useState(30);
			const [mo, setMo] = React.useState(60);
			const [theme, setTheme] = React.useState({ ...PNC_THEME_DEFAULTS });
			const [bgInfo, setBgInfo] = React.useState(null);
			const [imgInfo, setImgInfo] = React.useState(null);
			const [bgUploading, setBgUploading] = React.useState(false);
			const [status, setStatus] = React.useState({ text: "", cls: "" });
			const [loading, setLoading] = React.useState(true);
			const fileRef = React.useRef(null);
			React.useEffect(() => {
				let alive = true;
				fetch("/pnc-config").then((r) => r.json()).then((cfg) => {
					if (!alive) return;
					if (cfg && typeof cfg.cookie === "string" && cfg.cookie.length > 0) {
						setCookie(cfg.cookie);
						setStatus({ text: "已加载当前配置（cookie 长度 " + cfg.cookie.length + "）", cls: "ok" });
					} else {
						setStatus({ text: "暂无配置，请粘贴 cookie 后保存", cls: "" });
					}
					setWsid((cfg && cfg.workspace_id) || "");
					const l = (cfg && cfg.limits) || {};
					setRl(l.rolling || 12);
					setWk(l.weekly || 30);
					setMo(l.monthly || 60);
					setTheme(Object.assign({}, PNC_THEME_DEFAULTS, (cfg && cfg.theme) || {}));
					setLoading(false);
				}).catch(() => {
					if (!alive) return;
					setStatus({ text: "读取配置失败", cls: "err" });
					setLoading(false);
				});
				// 背景视频当前状态
				fetch("/pnc-bg-info").then((r) => r.json()).then((info) => {
					if (alive) setBgInfo(info);
				}).catch(() => {});
				// 背景图片当前状态
				fetch("/pnc-bg-img-info").then((r) => r.json()).then((info) => {
					if (alive) setImgInfo(info);
				}).catch(() => {});
				return () => { alive = false; };
			}, []);
			const uploadBg = () => {
				const f = fileRef.current && fileRef.current.files && fileRef.current.files[0];
				if (!f) { setStatus({ text: "请先选择文件", cls: "err" }); return; }
				const isImg = /^image\//.test(f.type);
				const isVid = /^video\//.test(f.type);
				if (!isImg && !isVid) { setStatus({ text: "仅支持视频（mp4/webm）或图片（PNG/JPEG/GIF/WebP）", cls: "err" }); return; }
				const endpoint = isImg ? "/pnc-bg-img-upload" : "/pnc-bg-upload";
				const reader = new FileReader();
				setBgUploading(true);
				setStatus({ text: "上传中…", cls: "" });
				reader.onload = () => {
					const base64 = String(reader.result).split(",")[1] || "";
					fetch(endpoint, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ base64, name: f.name })
					}).then((r) => r.json()).then((res) => {
						setBgUploading(false);
						if (res && res.ok) {
							if (isImg) {
								setImgInfo({ custom: true, path: res.path, size: res.size, mime: res.mime });
								setStatus({ text: "背景图片已上传（" + Math.round(res.size / 1024) + " KB），页面即将刷新生效…", cls: "ok" });
							} else {
								setBgInfo({ custom: true, path: res.path, size: res.size });
								setStatus({ text: "背景视频已上传（" + Math.round(res.size / 1048576 * 10) / 10 + " MB），页面即将刷新生效…", cls: "ok" });
							}
							setTimeout(function () { window.location.reload(); }, 800);
						} else {
							setStatus({ text: "上传失败：" + ((res && res.error) || "未知错误"), cls: "err" });
						}
					}).catch(() => { setBgUploading(false); setStatus({ text: "上传失败：网络错误", cls: "err" }); });
				};
				reader.onerror = () => { setBgUploading(false); setStatus({ text: "读取文件失败", cls: "err" }); };
				reader.readAsDataURL(f);
			};
			const resetBg = () => {
				if ((!bgInfo || !bgInfo.custom) && (!imgInfo || !imgInfo.custom)) {
					setStatus({ text: "当前已是默认背景（包内视频）", cls: "" });
					return;
				}
				setBgUploading(true);
				setStatus({ text: "恢复默认中…", cls: "" });
				Promise.all([
					fetch("/pnc-bg-img-upload", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ base64: "" })
					}).then((r) => r.json()),
					fetch("/pnc-bg-upload", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ base64: "" })
					}).then((r) => r.json())
				]).then(([ri, rv]) => {
					setBgUploading(false);
					if (ri && ri.ok && rv && rv.ok) {
						setBgInfo({ custom: false, path: "package", size: 0 });
						setImgInfo({ custom: false, path: "none", size: 0, mime: null });
						setStatus({ text: "已重置为默认背景，页面即将刷新生效…", cls: "ok" });
						setTimeout(function () { window.location.reload(); }, 800);
					} else {
						setStatus({ text: "重置失败", cls: "err" });
					}
				}).catch(() => { setBgUploading(false); setStatus({ text: "重置失败：网络错误", cls: "err" }); });
			};
			const bgDesc = () => {
				if (imgInfo && imgInfo.custom) return "当前：自定义图片（" + Math.round(imgInfo.size / 1024) + " KB" + (imgInfo.mime ? "， " + imgInfo.mime : "") + "，优先于视频）";
				if (bgInfo && bgInfo.custom) return "当前：自定义视频（" + Math.round(bgInfo.size / 1048576 * 10) / 10 + " MB）";
				if (bgInfo) return "当前：包内默认视频";
				return "查询当前背景状态…";
			};
			const save = () => {
				const c = cookie.trim();
				if (!c) { setStatus({ text: "cookie 不能为空", cls: "err" }); return; }
				setStatus({ text: "保存中…", cls: "" });
				fetch("/pnc-config", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						cookie: c,
						workspace_id: wsid.trim(),
						limits: {
							rolling: Number(rl) || 12,
							weekly: Number(wk) || 30,
							monthly: Number(mo) || 60
						},
						theme: {
							quotaMo: theme.quotaMo,
							quotaWk: theme.quotaWk,
							quotaRl: theme.quotaRl,
							panelAlpha: Number(theme.panelAlpha),
							contourAlpha: Number(theme.contourAlpha),
							conwayAlpha: Number(theme.conwayAlpha),
							conwayDensity: Number(theme.conwayDensity),
							videoAlpha: Number(theme.videoAlpha),
							conwayRefreshMs: Number(theme.conwayRefreshMs),
							conwayScrollMs: Number(theme.conwayScrollMs),
							conwayScrollBlocks: Number(theme.conwayScrollBlocks),
							contourFlowMs: Number(theme.contourFlowMs),
							contourRefreshMs: Number(theme.contourRefreshMs),
							glassAlpha: Number(theme.glassAlpha)
						}
					})
				}).then((r) => r.json()).then((res) => {
					if (res && res.ok) {
						setStatus({ text: "已保存，配额数据将立即刷新", cls: "ok" });
						// 保存成功后立即应用视觉主题（无需刷新页面）
						if (typeof window.__pncApplyTheme === "function") window.__pncApplyTheme(theme);
					}
					else setStatus({ text: "保存失败：" + ((res && res.error) || "未知错误"), cls: "err" });
				}).catch(() => setStatus({ text: "保存失败：网络错误", cls: "err" }));
			};
			const setTh = (k) => (e) => setTheme(Object.assign({}, theme, { [k]: e.target.value }));
			const rangeRow = (label, key, min, max, step, fmt) => {
				const val = Number(theme[key]);
				const pct = Math.max(0, Math.min(100, (val - min) / (max - min) * 100));
				// onChange 时按 step 网格取整（消除 range 浮点噪音：0.051000000000000004 之类）
				const onRange = (e) => {
					const raw = Number(e.target.value);
					const snapped = Math.round((raw - min) / step) * step + min;
					const fixed = Math.round(snapped * 1e6) / 1e6;
					setTheme(Object.assign({}, theme, { [key]: String(fixed) }));
				};
				return React.createElement("div", { className: "pnc-theme-row" },
					React.createElement("span", { className: "pnc-lbl" }, label),
					React.createElement("input", { className: "pnc-range", type: "range", min: min, max: max, step: step, value: val,
						style: { background: "linear-gradient(to right, #fff 0%, #fff " + pct + "%, rgba(255,255,255,.15) " + pct + "%, rgba(255,255,255,.15) 100%)" },
						onChange: onRange }),
					React.createElement("span", { className: "pnc-val" }, fmt ? fmt(val) : String(theme[key])));
			};
			const colorRow = (label, key) => React.createElement("div", { className: "pnc-theme-row" },
				React.createElement("span", { className: "pnc-lbl" }, label),
				React.createElement("input", { className: "pnc-color", type: "color", value: theme[key], onChange: setTh(key) }),
				React.createElement("span", { className: "pnc-val", style: { flex: "1", textAlign: "left" } }, theme[key]));
			return React.createElement("div", { className: "pnc-page" },
				React.createElement("style", null, styles),
				React.createElement("h3", null, "OpenCode Go 配额"),
				React.createElement("details", { className: "pnc-tutorial" },
					React.createElement("summary", null, "配置教程（Workspace ID / Cookie 获取）"),
					React.createElement("div", { style: { marginTop: 6 } },
						React.createElement("div", null, React.createElement("b", null, "① Workspace ID 如此填写：")),
						React.createElement("div", null, "打开配额页面，地址形如 "),
						React.createElement("code", null, "https://opencode.ai/workspace/wrk_01…11451/go"),
						React.createElement("div", null, "取地址中间那一段填写，即 "),
						React.createElement("code", null, "wrk_01…11451"),
						React.createElement("div", { style: { marginTop: 6 } }, React.createElement("b", null, "② 获取 Cookie：")),
						React.createElement("div", null, "F12 开发者工具 → 应用程序(Application) → 存储(Storage) → Cookie → "),
						React.createElement("code", null, "opencode…"),
						React.createElement("div", null, "找到 "),
						React.createElement("code", null, "auth"),
						React.createElement("span", null, " 一项，复制 Value，形如 "),
						React.createElement("code", null, "Fe26.2…Ac"),
						React.createElement("div", { style: { marginTop: 6, color: "var(--dsw-alias-state-warn-primary,#f1c40f)" } }, "粘贴到下方 Cookie 输入框后点保存即可。"))),
				React.createElement("h4", null, "凭据与限额"),
				React.createElement("div", { className: "pnc-field" },
					React.createElement("label", null, "Cookie"),
					React.createElement("textarea", { className: "pnc-input", rows: 4, placeholder: "Fe26.2**...", value: cookie, onChange: (e) => setCookie(e.target.value) })),
				React.createElement("div", { className: "pnc-field" },
					React.createElement("label", null, "Workspace ID"),
					React.createElement("input", { className: "pnc-input", placeholder: "wrk_...", value: wsid, onChange: (e) => setWsid(e.target.value) })),
				React.createElement("div", { className: "pnc-sub" }, "金额限额（USD）"),
				React.createElement("div", { className: "pnc-row" },
					React.createElement("div", { className: "pnc-field" },
						React.createElement("label", null, "5h 限额"),
						React.createElement("input", { className: "pnc-input", type: "number", min: 1, step: 1, value: rl, onChange: (e) => setRl(e.target.value) })),
					React.createElement("div", { className: "pnc-field" },
						React.createElement("label", null, "7d 限额"),
						React.createElement("input", { className: "pnc-input", type: "number", min: 1, step: 1, value: wk, onChange: (e) => setWk(e.target.value) })),
					React.createElement("div", { className: "pnc-field" },
						React.createElement("label", null, "1m 限额"),
						React.createElement("input", { className: "pnc-input", type: "number", min: 1, step: 1, value: mo, onChange: (e) => setMo(e.target.value) }))),
				React.createElement("h4", null, "背景"),
				React.createElement("p", { className: "pnc-desc" }, "上传视频（mp4/webm）或图片（PNG/JPEG/GIF/WebP）作为页面背景；图片存在时优先于视频。上传后刷新页面生效。"),
				React.createElement("div", { className: "pnc-file-row" },
					React.createElement("div", { className: "pnc-file" },
						React.createElement("input", { type: "file", accept: "video/mp4,video/webm,image/png,image/jpeg,image/webp,image/gif", ref: fileRef, disabled: bgUploading })),
					React.createElement("button", { className: "pnc-btn", disabled: bgUploading, onClick: uploadBg }, "上传"),
					React.createElement("button", { className: "pnc-btn ghost", disabled: bgUploading, onClick: resetBg }, "重置")),
				React.createElement("p", { className: "pnc-desc" }, bgDesc()),
				rangeRow("背景不透明度", "videoAlpha", 0, 1, 0.05, (v) => Math.round(v * 100) + "%"),
				rangeRow("毛玻璃不透明度", "glassAlpha", 0, 1, 0.05, (v) => Math.round(v * 100) + "%"),
				React.createElement("p", { className: "pnc-desc" }, "毛玻璃作用于侧栏/上栏/中央面板：数值越低面板越透，背景视频越清晰可见。"),
				React.createElement("h4", null, "视觉主题"),
				React.createElement("div", { className: "pnc-sub" }, "用量条颜色"),
				colorRow("用量条 5h", "quotaMo"),
				colorRow("用量条 7d", "quotaWk"),
				colorRow("用量条 1m", "quotaRl"),
				React.createElement("div", { className: "pnc-sub" }, "不透明度"),
				rangeRow("等高线", "contourAlpha", 0, 1, 0.05, (v) => Math.round(v * 100) + "%"),
				rangeRow("康威方块", "conwayAlpha", 0, 1, 0.05, (v) => Math.round(v * 100) + "%"),
				React.createElement("div", { className: "pnc-sub" }, "速度与密度"),
				rangeRow("康威刷新间隔", "conwayRefreshMs", 30, 2000, 10, (v) => Math.round(v) + "ms"),
				rangeRow("康威镜头刷新间隔", "conwayScrollMs", 30, 2000, 10, (v) => Math.round(v) + "ms"),
				rangeRow("康威每次移动格数", "conwayScrollBlocks", 0.005, 5, 0.005, (v) => v.toFixed(3) + "格"),
				rangeRow("等高线流动周期", "contourFlowMs", 1000, 600000, 1000, (v) => (Math.round(v / 1000)) + "s"),
				rangeRow("等高线刷新间隔", "contourRefreshMs", 0, 600000, 1000, (v) => v > 0 ? (Math.round(v / 1000)) + "s" : "关"),
				rangeRow("康威播种密度", "conwayDensity", 0.1, 3, 0.1, (v) => v.toFixed(1) + "x"),
				React.createElement("div", { className: "pnc-btns" },
					React.createElement("button", { className: "pnc-btn", disabled: loading, onClick: save }, "保存"),
					React.createElement("span", { className: "pnc-status" + (status.cls ? " " + status.cls : "") }, status.text)));
		}
		function apply(ctx) {
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "pnc-opencode-quota",
				order: 55,
				label: () => "OpenCode Go 配额"
			}, PncQuotaSection)), "pnc-theme: settings page");
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
