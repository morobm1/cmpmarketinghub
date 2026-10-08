/**
 * BrandedLogoLoader – reusable full-screen branded loading overlay.
 * ------------------------------------------------------------------
 * The logo starts as a light-gray silhouette and fills bottom→top with its
 * ORIGINAL colors as progress advances. The fill is a second copy of the very
 * same image clipped with `clip-path: inset()`, so it follows the logo's real
 * shape and transparency (transparent pixels stay transparent) and the logo is
 * never redrawn, recolored or distorted. Optional `fillColors` instead paints a
 * gradient through a CSS mask of the logo (still shape-accurate).
 *
 * Usage:
 *   const loader = new BrandedLogoLoader({ logoUrl, logoAlt, background, message, onComplete });
 *   loader.setProgress(42);          // 0–99 (100 is reserved for complete())
 *   await loader.complete();         // animates to 100%, brief hold, fades out
 *   loader.error('Could not load', () => retry());
 *
 * ProgressTracker turns weighted initialization tasks into a single percentage.
 */

const STYLE_ID = 'bll-styles';
const CSS = `
.bll{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;
  background:var(--bll-bg);opacity:0;transition:opacity .45s ease;font-family:var(--bll-font)}
.bll.bll-visible{opacity:1}
.bll.bll-leaving{opacity:0;pointer-events:none}
.bll-inner{display:flex;flex-direction:column;align-items:center;gap:22px;padding:24px;text-align:center;max-width:92vw}
.bll-logo{position:relative;width:var(--bll-size);max-width:70vw;line-height:0}
.bll-logo img{display:block;width:100%;height:auto}
.bll-base{filter:grayscale(1) brightness(1.55) contrast(.55);opacity:.38}
.bll-fill{position:absolute;inset:0;will-change:clip-path;clip-path:inset(100% 0 0 0)}
.bll-fill.bll-mask{background:var(--bll-fill);-webkit-mask:var(--bll-mask) center/contain no-repeat;mask:var(--bll-mask) center/contain no-repeat}
.bll-word{position:relative;font-weight:700;font-size:clamp(24px,7vw,44px);line-height:1.15;letter-spacing:.02em;max-width:88vw;text-wrap:balance}
.bll-word .bll-base{color:#cbd5e1;filter:none;opacity:1}
.bll-word .bll-fill{color:var(--bll-accent)}
.bll-word small{display:block;font-size:.38em;letter-spacing:.32em;text-transform:uppercase;margin-top:.5em}
.bll-pct{font-variant-numeric:tabular-nums;font-size:clamp(22px,4.5vw,30px);font-weight:700;color:var(--bll-text);min-width:4ch}
.bll-msg{font-size:14px;color:var(--bll-sub);margin-top:-14px}
.bll.bll-done .bll-logo{animation:bll-glow 1s ease-out 1}
@keyframes bll-glow{0%{filter:drop-shadow(0 0 0 transparent)}45%{filter:drop-shadow(0 0 18px var(--bll-glow))}100%{filter:drop-shadow(0 0 0 transparent)}}
.bll-error{display:none;flex-direction:column;align-items:center;gap:12px;max-width:360px}
.bll.bll-has-error .bll-error{display:flex}
.bll.bll-has-error .bll-pct,.bll.bll-has-error .bll-msg{display:none}
.bll-error p{margin:0;color:var(--bll-text);font-size:15px;line-height:1.5}
.bll-retry{appearance:none;border:0;border-radius:10px;padding:12px 26px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;
  background:var(--bll-accent);color:#fff;min-height:44px}
.bll-retry:focus-visible{outline:3px solid var(--bll-glow);outline-offset:3px}
.bll-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion: reduce){
  .bll{transition:opacity .15s linear}
  .bll.bll-done .bll-logo{animation:none}
}`;

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class BrandedLogoLoader {
  /**
   * @param {object} o
   * @param {string}   [o.logoUrl]        Logo asset (SVG/PNG with transparency). If omitted, a text wordmark is used.
   * @param {string}   [o.logoAlt]        Accessible name of the logo / brand.
   * @param {string}   [o.wordmark]       Text used when no logo is available.
   * @param {string}   [o.wordmarkSub]    Small subtitle under the wordmark.
   * @param {string[]} [o.fillColors]     Optional gradient colors; default = the logo's own colors.
   * @param {string}   [o.accentColor]    Brand accent (wordmark fill, Retry button).
   * @param {string}   [o.background]     Overlay background (any CSS background).
   * @param {string}   [o.textColor]
   * @param {string}   [o.message]        e.g. "Preparing your survey..."
   * @param {string}   [o.fontFamily]
   * @param {number}   [o.logoSize]       CSS width in px (aspect ratio is always preserved).
   * @param {number}   [o.showDelay]      ms before the overlay becomes visible (avoids flashes on fast loads).
   * @param {number}   [o.completeHold]   ms to show the full-color logo at 100% before fading.
   * @param {Function} [o.onComplete]
   * @param {HTMLElement} [o.mount]       Parent element (default document.body).
   */
  constructor(o = {}) {
    this.o = { message: 'Loading…', logoSize: 220, showDelay: 180, completeHold: 550, accentColor: '#446472', background: '#f8fafc', textColor: '#1e293b', fontFamily: 'inherit', ...o };
    this.reduced = prefersReducedMotion();
    this.target = 0; this.shown = 0; this.visible = false; this.destroyed = false; this.lastAnnounced = -1;
    this._ensureStyles();
    this._build();
    this._showTimer = setTimeout(() => this._show(), this.o.showDelay);
    this._raf = null; this._last = 0;
  }

  _ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = CSS; document.head.appendChild(s);
  }

  _build() {
    const o = this.o;
    const root = document.createElement('div');
    root.className = 'bll';
    root.style.setProperty('--bll-bg', o.background);
    root.style.setProperty('--bll-accent', o.accentColor);
    root.style.setProperty('--bll-glow', o.glowColor || o.accentColor);
    root.style.setProperty('--bll-text', o.textColor);
    root.style.setProperty('--bll-sub', o.subTextColor || '#64748b');
    root.style.setProperty('--bll-font', o.fontFamily);
    root.style.setProperty('--bll-size', o.logoSize + 'px');

    const inner = document.createElement('div'); inner.className = 'bll-inner';
    const logo = document.createElement('div'); logo.className = 'bll-logo';
    if (o.logoUrl) {
      const base = new Image(); base.className = 'bll-base'; base.alt = ''; base.src = o.logoUrl; base.setAttribute('aria-hidden', 'true');
      logo.appendChild(base);
      let fill;
      if (o.fillColors && o.fillColors.length) {
        fill = document.createElement('div'); fill.className = 'bll-fill bll-mask';
        fill.style.setProperty('--bll-fill', o.fillColors.length > 1 ? `linear-gradient(0deg, ${o.fillColors.join(',')})` : o.fillColors[0]);
        fill.style.setProperty('--bll-mask', `url("${String(o.logoUrl).replace(/"/g, '%22')}")`);
      } else {
        fill = new Image(); fill.className = 'bll-fill'; fill.alt = ''; fill.src = o.logoUrl;
      }
      fill.setAttribute('aria-hidden', 'true');
      logo.appendChild(fill); this.fillEl = fill; this.logoImg = base;
      logo.setAttribute('role', 'img'); logo.setAttribute('aria-label', o.logoAlt || 'Logo');
    } else {
      logo.classList.add('bll-word');
      const mk = (cls) => { const d = document.createElement('div'); d.className = cls; d.textContent = o.wordmark || o.logoAlt || ''; if (o.wordmarkSub) { const sm = document.createElement('small'); sm.textContent = o.wordmarkSub; d.appendChild(sm); } return d; };
      const base = mk('bll-base'); const fill = mk('bll-fill'); fill.setAttribute('aria-hidden', 'true');
      logo.append(base, fill); this.fillEl = fill;
      logo.style.width = 'auto';
    }

    const pct = document.createElement('div'); pct.className = 'bll-pct'; pct.textContent = '0%';
    pct.setAttribute('role', 'progressbar'); pct.setAttribute('aria-valuemin', '0'); pct.setAttribute('aria-valuemax', '100'); pct.setAttribute('aria-valuenow', '0');
    pct.setAttribute('aria-label', o.message || 'Loading');
    const msg = document.createElement('div'); msg.className = 'bll-msg'; msg.textContent = o.message || '';
    const live = document.createElement('div'); live.className = 'bll-sr'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');

    const err = document.createElement('div'); err.className = 'bll-error'; err.setAttribute('role', 'alert');
    const errP = document.createElement('p'); const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'bll-retry'; retry.textContent = 'Retry';
    err.append(errP, retry);
    retry.addEventListener('click', () => { const cb = this._onRetry; this.reset(); if (cb) cb(); });

    inner.append(logo, pct, msg, err, live); root.appendChild(inner);
    (o.mount || document.body).appendChild(root);
    Object.assign(this, { root, pctEl: pct, msgEl: msg, liveEl: live, errEl: err, errP, retryBtn: retry });
    this.root.setAttribute('aria-busy', 'true');
    this._paint(0);
  }

  _show() { if (this.destroyed || this.visible) return; this.visible = true; this.root.classList.add('bll-visible'); }

  _paint(v) {
    const p = Math.max(0, Math.min(100, v));
    // inset(top) hides everything above the fill line → fill rises from the bottom.
    this.fillEl.style.clipPath = `inset(${(100 - p).toFixed(2)}% 0 0 0)`;
    const n = Math.round(p);
    if (this._lastN !== n) { this._lastN = n; this.pctEl.textContent = n + '%'; }
    const milestone = Math.floor(n / 25) * 25;
    if (milestone !== this.lastAnnounced && (milestone > 0 || this.lastAnnounced === -1)) {
      this.lastAnnounced = milestone;
      this.pctEl.setAttribute('aria-valuenow', String(milestone));
      if (milestone > 0) this.liveEl.textContent = milestone === 100 ? 'Ready.' : `Loading, ${milestone} percent.`;
    }
  }

  _tick = (t) => {
    if (this.destroyed) return;
    const dt = this._last ? Math.min(64, t - this._last) : 16; this._last = t;
    const gap = this.target - this.shown;
    if (Math.abs(gap) < 0.05) { this.shown = this.target; this._paint(this.shown); this._raf = null; this._last = 0; if (this._arrive) { const a = this._arrive; this._arrive = null; a(); } return; }
    // Ease toward target; minimum speed keeps the counter visibly moving.
    const step = Math.sign(gap) * Math.max(Math.abs(gap) * Math.min(1, dt / 220), Math.min(Math.abs(gap), dt * 0.06));
    this.shown += step; this._paint(this.shown);
    this._raf = requestAnimationFrame(this._tick);
  };
  _animate() {
    if (this.reduced) { this.shown = this.target; this._paint(this.shown); if (this._arrive) { const a = this._arrive; this._arrive = null; a(); } return; }
    if (!this._raf) this._raf = requestAnimationFrame(this._tick);
  }

  /** Set progress 0–99. 100% is only shown by complete(), i.e. when the app is truly ready. */
  setProgress(p) {
    if (this.destroyed || this.completing) return;
    const v = Math.max(this.target, Math.min(99, Number(p) || 0));
    this.target = v; this._animate();
  }
  setMessage(m) { this.msgEl.textContent = m || ''; this.pctEl.setAttribute('aria-label', m || 'Loading'); }

  /** Animate to 100%, briefly hold the full-color logo, then fade out. */
  complete() {
    if (this.destroyed) return Promise.resolve();
    this.completing = true;
    clearTimeout(this._showTimer);
    return new Promise((resolve) => {
      const finish = () => { this.destroy(); if (this.o.onComplete) this.o.onComplete(); resolve(); };
      if (!this.visible) { finish(); return; } // fast load: never flashed, just go
      this.target = 100;
      this._arrive = () => {
        this.root.classList.add('bll-done'); this.root.setAttribute('aria-busy', 'false');
        setTimeout(() => {
          this.root.classList.add('bll-leaving');
          setTimeout(finish, this.reduced ? 160 : 460);
        }, this.reduced ? 120 : this.o.completeHold);
      };
      this._animate();
    });
  }

  /** Branded error state with a working Retry button. */
  error(message, onRetry) {
    if (this.destroyed) return;
    this._show();
    this._onRetry = onRetry;
    this.errP.textContent = message || 'Something went wrong while loading.';
    this.root.classList.add('bll-has-error'); this.root.setAttribute('aria-busy', 'false');
    setTimeout(() => this.retryBtn.focus(), 50);
  }

  reset() {
    this.root.classList.remove('bll-has-error', 'bll-done');
    this.completing = false; this.target = 0; this.shown = 0; this.lastAnnounced = -1; this._paint(0);
    this.root.setAttribute('aria-busy', 'true');
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; clearTimeout(this._showTimer); if (this._raf) cancelAnimationFrame(this._raf);
    this.root.remove();
  }
}

/**
 * Weighted task tracker. Each task reports a fraction 0..1; the overall
 * percentage is the weight-averaged sum. Tasks with byte-level progress
 * (fetch streams) report real fractions; others jump at documented milestones.
 */
export class ProgressTracker {
  constructor(weights, onChange) { this.weights = weights; this.done = Object.fromEntries(Object.keys(weights).map((k) => [k, 0])); this.onChange = onChange; }
  update(task, fraction) {
    if (!(task in this.weights)) return;
    this.done[task] = Math.max(this.done[task], Math.min(1, Math.max(0, fraction)));
    this.onChange && this.onChange(this.percent());
  }
  percent() {
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    const got = Object.entries(this.weights).reduce((a, [k, w]) => a + w * this.done[k], 0);
    return total ? (got / total) * 100 : 0;
  }
  reset() { Object.keys(this.done).forEach((k) => { this.done[k] = 0; }); }
}

/** fetch() JSON with byte-level progress when the server sends Content-Length. */
export async function fetchJsonWithProgress(url, onFraction, init) {
  const res = await fetch(url, init);
  const len = Number(res.headers.get('content-length')) || 0;
  let text;
  if (res.body && res.body.getReader && len > 0) {
    const reader = res.body.getReader(); const chunks = []; let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; onFraction && onFraction(Math.min(0.95, got / len)); }
    const all = new Uint8Array(got); let o = 0; chunks.forEach((c) => { all.set(c, o); o += c.length; });
    text = new TextDecoder().decode(all);
  } else {
    onFraction && onFraction(0.5); // milestone: headers received
    text = await res.text();
  }
  let data = null; try { data = JSON.parse(text); } catch { /* non-JSON */ }
  onFraction && onFraction(1);
  return { res, data };
}
