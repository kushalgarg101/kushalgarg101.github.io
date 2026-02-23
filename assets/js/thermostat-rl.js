(function () {
  /* ── helpers ──────────────────────────────────────────── */
  const qs = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const clamp01 = (v) => clamp(v, 0, 1);

  /* ── DOM refs ─────────────────────────────────────────── */
  const ui = {
    targetTemp: qs('targetTemp'),
    initialTemp: qs('initialTemp'),
    noise: qs('noise'),
    alpha: qs('alpha'),
    gamma: qs('gamma'),
    epsilon: qs('epsilon'),
    epsilonDecay: qs('epsilonDecay'),
    episodeLen: qs('episodeLen'),
    heatRate: qs('heatRate'),
    coolRate: qs('coolRate'),
    rewardBand: qs('rewardBand'),
    actionCost: qs('actionCost'),
    minTemp: qs('minTemp'),
    maxTemp: qs('maxTemp'),
    binSize: qs('binSize'),
    startBtn: qs('startBtn'),
    stepBtn: qs('stepBtn'),
    resetBtn: qs('resetBtn'),
    speed: qs('speed'),
    speedVal: qs('speedVal'),
    episodeOut: qs('episodeOut'),
    stepOut: qs('stepOut'),
    actionOut: qs('actionOut'),
    rewardOut: qs('rewardOut'),
    epsilonOut: qs('epsilonOut'),
    dial: qs('thermostatDial'),
    heatmap: qs('qTableHeatmap'),
    chart: qs('tempChart')
  };

  // Bail out if essential canvases are missing
  if (!ui.dial || !ui.heatmap || !ui.chart) return;

  /* ── state ────────────────────────────────────────────── */
  const ACTIONS = ['off', 'on'];
  let running = false, intervalId = null;

  const S = {
    cfg: null, episode: 1, step: 0, temp: 0,
    qTable: [],
    hist: [], actHist: [], rewHist: [], bandHist: []
  };

  /* ── config ───────────────────────────────────────────── */
  function num(el, fb) { const v = parseFloat(el && el.value); return Number.isFinite(v) ? v : fb; }
  function int(el, fb) { const v = parseInt(el && el.value, 10); return Number.isFinite(v) ? v : fb; }

  function readCfg() {
    const c = {
      target: num(ui.targetTemp, 72),
      init: num(ui.initialTemp, 60),
      noise: num(ui.noise, 0.4),
      alpha: clamp01(num(ui.alpha, 0.15)),
      gamma: clamp01(num(ui.gamma, 0.95)),
      eps: clamp01(num(ui.epsilon, 0.2)),
      decay: clamp01(num(ui.epsilonDecay, 0.985)),
      epLen: Math.max(10, int(ui.episodeLen, 200)),
      heat: num(ui.heatRate, 1),
      cool: num(ui.coolRate, 0.6),
      band: Math.max(0, num(ui.rewardBand, 2)),
      cost: Math.max(0, num(ui.actionCost, 0)),
      lo: num(ui.minTemp, 50),
      hi: num(ui.maxTemp, 90),
      bin: Math.max(0.5, num(ui.binSize, 1)),
      speed: Math.max(1, int(ui.speed, 10))
    };
    if (c.hi <= c.lo) c.hi = c.lo + 1;
    c.init = clamp(c.init, c.lo, c.hi);
    return c;
  }

  /* ── Q-learning core ──────────────────────────────────── */
  function mkQ(c) {
    const n = Math.floor((c.hi - c.lo) / c.bin) + 1;
    return Array.from({ length: n }, () => [0, 0]);
  }
  function sIdx(c, t) {
    return clamp(Math.floor((t - c.lo) / c.bin), 0, S.qTable.length - 1);
  }
  function pickAction(c, si) {
    if (Math.random() < c.eps) return Math.random() < 0.5 ? 0 : 1;
    const [a, b] = S.qTable[si];
    return a === b ? (Math.random() < 0.5 ? 0 : 1) : (b > a ? 1 : 0);
  }
  function getReward(c, t, ai) {
    const inBand = Math.abs(t - c.target) <= c.band;
    return { val: (inBand ? 1 : 0) - (ai === 1 ? c.cost : 0), inBand };
  }
  function transition(c, t, ai) {
    const d = ai === 1 ? c.heat : -c.cool;
    return clamp(t + d + (Math.random() * 2 - 1) * c.noise, c.lo, c.hi);
  }

  /* ── step / episode ───────────────────────────────────── */
  const MAX_PTS = 300;
  function push(t, ai, r, ib) {
    S.hist.push(t); S.actHist.push(ai); S.rewHist.push(r); S.bandHist.push(ib);
    if (S.hist.length > MAX_PTS) { S.hist.shift(); S.actHist.shift(); S.rewHist.shift(); S.bandHist.shift(); }
  }

  function step() {
    const c = S.cfg;
    const si = sIdx(c, S.temp);
    const ai = pickAction(c, si);
    const nt = transition(c, S.temp, ai);
    const rw = getReward(c, nt, ai);
    const ns = sIdx(c, nt);
    // Q-update
    const best = Math.max(S.qTable[ns][0], S.qTable[ns][1]);
    S.qTable[si][ai] += c.alpha * (rw.val + c.gamma * best - S.qTable[si][ai]);

    S.temp = nt; S.step++;
    push(nt, ai, rw.val, rw.inBand);

    // readouts
    ui.stepOut.textContent = S.step;
    ui.actionOut.textContent = ACTIONS[ai];
    ui.rewardOut.textContent = rw.val.toFixed(2);
    ui.epsilonOut.textContent = c.eps.toFixed(3);
    ui.episodeOut.textContent = S.episode;

    if (S.step >= c.epLen) {
      S.episode++; S.step = 0; S.temp = c.init;
      c.eps = Math.max(0.01, c.eps * c.decay);
    }
    render();
  }

  /* ── render orchestrator ──────────────────────────────── */
  function render() {
    drawDial();
    drawHeatmap();
    drawHistory();
  }

  function canvasSize(cv) {
    const r = cv.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    const w = Math.floor((r.width || cv.width) * dpr);
    const h = Math.floor((r.height || cv.height) * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return { w, h, dpr };
  }

  /* ── Thermostat Dial ──────────────────────────────────── */
  function drawDial() {
    const cv = ui.dial, ctx = cv.getContext('2d');
    if (!ctx) return;
    const { w, h } = canvasSize(cv);
    ctx.clearRect(0, 0, w, h);

    const c = S.cfg;
    const cx = w / 2, cy = h / 2;
    const R = Math.max(20, Math.min(cx, cy) - 16);
    const tr = R * 0.78;                // track radius
    const nr = R * 0.72;                // needle length

    // helpers
    const pct = (t) => clamp01((t - c.lo) / (c.hi - c.lo));
    const ANG_START = Math.PI * 0.75;    // 135°
    const ANG_SWEEP = Math.PI * 1.5;     // 270°
    const ang = (t) => ANG_START + pct(t) * ANG_SWEEP;

    const lastAct = S.actHist.length ? S.actHist[S.actHist.length - 1] : 0;
    const lastBand = S.bandHist.length ? S.bandHist[S.bandHist.length - 1] : false;

    const cs = getComputedStyle(document.documentElement);
    const col = (n) => cs.getPropertyValue(n).trim();

    // ── outer circle bg
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = col('--card'); ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = lastAct === 1 ? col('--action-on')
      : lastBand ? col('--reward-good')
        : col('--border');
    ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1;

    // ── track (270° arc)
    ctx.beginPath(); ctx.arc(cx, cy, tr, ANG_START, ANG_START + ANG_SWEEP);
    ctx.strokeStyle = col('--border'); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();

    // ── reward band highlight
    ctx.beginPath();
    ctx.arc(cx, cy, tr, ang(c.target - c.band), ang(c.target + c.band));
    ctx.strokeStyle = col('--accent'); ctx.lineWidth = 6; ctx.globalAlpha = 0.45; ctx.stroke();
    ctx.globalAlpha = 1;

    // ── target tick
    const ta = ang(c.target);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ta) * (tr - 12), cy + Math.sin(ta) * (tr - 12));
    ctx.lineTo(cx + Math.cos(ta) * (tr + 12), cy + Math.sin(ta) * (tr + 12));
    ctx.strokeStyle = col('--accent'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();

    // ── needle
    const ca = ang(S.temp);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ca) * nr, cy + Math.sin(ca) * nr);
    ctx.strokeStyle = lastAct === 1 ? col('--action-on') : col('--text');
    ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();

    // ── pivot dot
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
    ctx.fillStyle = col('--text'); ctx.fill();

    // ── temp label
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col('--text');
    ctx.font = `700 ${Math.round(R * 0.28)}px "Work Sans", sans-serif`;
    ctx.fillText(S.temp.toFixed(1) + '°', cx, cy - R * 0.14);

    // ── status text
    ctx.fillStyle = lastAct === 1 ? col('--action-on') : col('--muted');
    ctx.font = `600 ${Math.round(R * 0.11)}px "Work Sans", sans-serif`;
    ctx.fillText(lastAct === 1 ? '🔥 HEATING' : 'IDLE', cx, cy + R * 0.14);

    // ── min / max labels
    ctx.fillStyle = col('--muted');
    ctx.font = `500 ${Math.round(R * 0.09)}px "Work Sans", sans-serif`;
    const lx = cx + Math.cos(ANG_START) * (R + 14);
    const ly = cy + Math.sin(ANG_START) * (R + 14);
    ctx.textAlign = 'right';
    ctx.fillText(c.lo + '°', lx, ly);
    const rx = cx + Math.cos(ANG_START + ANG_SWEEP) * (R + 14);
    const ry = cy + Math.sin(ANG_START + ANG_SWEEP) * (R + 14);
    ctx.textAlign = 'left';
    ctx.fillText(c.hi + '°', rx, ry);
  }

  /* ── Q-Table Heatmap ──────────────────────────────────── */
  function drawHeatmap() {
    const cv = ui.heatmap, ctx = cv.getContext('2d');
    if (!ctx) return;
    const { w, h } = canvasSize(cv);
    ctx.clearRect(0, 0, w, h);

    const q = S.qTable;
    if (!q.length) return;

    const cs = getComputedStyle(document.documentElement);
    const txt = cs.getPropertyValue('--text').trim();
    const mut = cs.getPropertyValue('--muted').trim();

    const LEFT = 32, TOP = 18, BOT = 22;
    const bins = q.length;
    const cw = (w - LEFT * 2) / bins;
    const ch = (h - TOP - BOT) / 2;

    let lo = 0, hi = 0;
    q.forEach(([a, b]) => { lo = Math.min(lo, a, b); hi = Math.max(hi, a, b); });
    if (hi - lo < 0.001) hi += 0.001;

    const hue = (v) => {
      const p = (v - lo) / (hi - lo);          // 0 → 1
      return `hsl(${240 - 240 * p}, 75%, 55%)`;   // blue → red
    };

    // row labels
    ctx.font = '11px "Work Sans", sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = txt;
    ctx.fillText('Off', LEFT - 5, TOP + ch / 2);
    ctx.fillText('On', LEFT - 5, TOP + ch * 1.5);

    // cells
    for (let i = 0; i < bins; i++) {
      const x = LEFT + i * cw;
      ctx.fillStyle = hue(q[i][0]); ctx.fillRect(x, TOP, cw, ch);
      ctx.fillStyle = hue(q[i][1]); ctx.fillRect(x, TOP + ch, cw, ch);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.strokeRect(x, TOP, cw, ch);
      ctx.strokeRect(x, TOP + ch, cw, ch);
    }

    // x-axis ticks
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = mut;
    const c = S.cfg;
    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      const tx = LEFT + (w - LEFT * 2) * frac;
      ctx.fillText((c.lo + (c.hi - c.lo) * frac).toFixed(0) + '°', tx, h - BOT + 4);
    }
  }

  /* ── Temperature History ──────────────────────────────── */
  function drawHistory() {
    const cv = ui.chart, ctx = cv.getContext('2d');
    if (!ctx) return;
    const { w, h } = canvasSize(cv);
    ctx.clearRect(0, 0, w, h);

    const c = S.cfg;
    const cs = getComputedStyle(document.documentElement);
    const col = (n) => cs.getPropertyValue(n).trim();

    const PAD = 42;
    const yFor = (t) => {
      const r = (t - c.lo) / (c.hi - c.lo);
      return h - PAD - r * (h - PAD * 2);
    };

    // bg grid
    ctx.strokeStyle = col('--grid-line'); ctx.lineWidth = 1;
    for (let g = c.lo; g <= c.hi; g += 5) {
      const gy = yFor(g);
      ctx.beginPath(); ctx.moveTo(PAD, gy); ctx.lineTo(w - PAD, gy); ctx.stroke();
    }

    // reward band
    ctx.fillStyle = col('--accent-soft');
    const bt = yFor(c.target + c.band), bb = yFor(c.target - c.band);
    ctx.fillRect(PAD, bt, w - PAD * 2, bb - bt);

    // target line
    const ty = yFor(c.target);
    ctx.strokeStyle = col('--accent'); ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(PAD, ty); ctx.lineTo(w - PAD, ty); ctx.stroke();
    ctx.setLineDash([]);

    // temperature trace
    const pts = S.hist;
    if (pts.length < 2) { drawAxisLabels(); return; }
    const sx = (w - PAD * 2) / (pts.length - 1);

    // colored segments (orange when heating, grey otherwise)
    for (let i = 1; i < pts.length; i++) {
      const x0 = PAD + sx * (i - 1), x1 = PAD + sx * i;
      const y0 = yFor(pts[i - 1]), y1 = yFor(pts[i]);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      ctx.strokeStyle = S.actHist[i] === 1 ? col('--action-on') : col('--chart-line');
      ctx.lineWidth = 2; ctx.stroke();
    }

    drawAxisLabels();

    function drawAxisLabels() {
      ctx.fillStyle = col('--text');
      ctx.font = '11px "Work Sans", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(c.lo + '°F', 4, h - PAD + 6);
      ctx.textBaseline = 'bottom';
      ctx.fillText(c.hi + '°F', 4, PAD - 4);
    }
  }

  /* ── simulation control ───────────────────────────────── */
  function reset() {
    S.cfg = readCfg();
    S.qTable = mkQ(S.cfg);
    S.episode = 1; S.step = 0; S.temp = S.cfg.init;
    S.hist = []; S.actHist = []; S.rewHist = []; S.bandHist = [];
    ui.speedVal.textContent = S.cfg.speed;
    ui.episodeOut.textContent = 1;
    ui.stepOut.textContent = 0;
    ui.actionOut.textContent = '—';
    ui.rewardOut.textContent = '—';
    ui.epsilonOut.textContent = S.cfg.eps.toFixed(3);
    render();
  }

  function start() {
    if (running) return;
    S.cfg = readCfg();
    running = true;
    ui.startBtn.textContent = '⏸ Pause';
    intervalId = setInterval(step, 1000 / S.cfg.speed);
  }
  function pause() {
    running = false;
    ui.startBtn.textContent = '▶ Start';
    clearInterval(intervalId); intervalId = null;
  }

  /* ── event wiring ─────────────────────────────────────── */
  ui.startBtn.addEventListener('click', () => running ? pause() : start());
  ui.stepBtn.addEventListener('click', () => { if (!running) { S.cfg = S.cfg || readCfg(); step(); } });
  ui.resetBtn.addEventListener('click', () => { pause(); reset(); });

  ui.speed.addEventListener('input', () => {
    S.cfg.speed = Math.max(1, +ui.speed.value || 10);
    ui.speedVal.textContent = S.cfg.speed;
    if (running) { pause(); start(); }
  });

  // Any visible control change → full reset
  [ui.targetTemp, ui.initialTemp, ui.alpha, ui.gamma, ui.epsilon, ui.episodeLen].forEach((el) => {
    if (el) el.addEventListener('change', () => { pause(); reset(); });
  });

  window.addEventListener('resize', render);
  window.addEventListener('beforeunload', () => { clearInterval(intervalId); });

  /* ── boot ─────────────────────────────────────────────── */
  reset();
})();
