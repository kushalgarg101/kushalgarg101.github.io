(function () {
  /* ── Utilities ────────────────────────────────────────── */
  const qs = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const clamp01 = (v) => clamp(v, 0, 1);

  /* ── DOM References ───────────────────────────────────── */
  const ui = {
    // Visible Inputs
    targetTemp: qs('targetTemp'),
    initialTemp: qs('initialTemp'),
    alpha: qs('alpha'),
    gamma: qs('gamma'),
    epsilon: qs('epsilon'),
    episodeLen: qs('episodeLen'),
    speed: qs('speed'),
    speedVal: qs('speedVal'),

    // Hidden Advanced Inputs
    noise: qs('noise'),
    epsilonDecay: qs('epsilonDecay'),
    heatRate: qs('heatRate'),
    coolRate: qs('coolRate'),
    rewardBand: qs('rewardBand'),
    actionCost: qs('actionCost'),
    minTemp: qs('minTemp'),
    maxTemp: qs('maxTemp'),
    binSize: qs('binSize'),

    // Buttons
    startBtn: qs('startBtn'),
    stepBtn: qs('stepBtn'),
    resetBtn: qs('resetBtn'),

    // Outputs
    episodeOut: qs('episodeOut'),
    stepOut: qs('stepOut'),
    actionOut: qs('actionOut'),
    rewardOut: qs('rewardOut'),
    epsilonOut: qs('epsilonOut'),

    // Canvases
    dial: qs('thermostatDial'),
    heatmap: qs('qTableHeatmap'),
    chart: qs('tempChart')
  };

  if (!ui.dial || !ui.heatmap || !ui.chart) return;

  /* ── State & Config ───────────────────────────────────── */
  const ACTIONS = ['OFF', 'ON'];
  let running = false;
  let intervalId = null;

  const State = {
    cfg: null,
    episode: 1,
    step: 0,
    temp: 0,
    qTable: [],
    history: [],      // Temperatures
    actionHist: [],   // Actions taken
    rewardHist: [],   // Rewards received
    bandHist: []      // Was it in the target band?
  };

  function val(el, fallback) {
    const v = parseFloat(el && el.value);
    return Number.isFinite(v) ? v : fallback;
  }

  function readConfig() {
    const c = {
      target: val(ui.targetTemp, 72),
      init: val(ui.initialTemp, 60),
      alpha: clamp01(val(ui.alpha, 0.15)),
      gamma: clamp01(val(ui.gamma, 0.95)),
      eps: clamp01(val(ui.epsilon, 0.2)),
      epLen: Math.max(10, val(ui.episodeLen, 200)),
      speed: Math.max(1, parseInt(ui.speed.value, 10) || 10),

      noise: val(ui.noise, 0.4),
      decay: clamp01(val(ui.epsilonDecay, 0.985)),
      heat: val(ui.heatRate, 1.0),
      cool: val(ui.coolRate, 0.6),
      band: Math.max(0, val(ui.rewardBand, 2)),
      cost: Math.max(0, val(ui.actionCost, 0)),
      minT: val(ui.minTemp, 40),
      maxT: val(ui.maxTemp, 100),
      bin: Math.max(0.5, val(ui.binSize, 1))
    };

    if (c.maxT <= c.minT) c.maxT = c.minT + 1;
    c.init = clamp(c.init, c.minT, c.maxT);
    return c;
  }

  /* ── Q-Learning Logic ─────────────────────────────────── */
  function buildQTable(cfg) {
    const bins = Math.floor((cfg.maxT - cfg.minT) / cfg.bin) + 1;
    return Array.from({ length: bins }, () => [0, 0]);
  }

  function getStateIndex(cfg, t) {
    return clamp(Math.floor((t - cfg.minT) / cfg.bin), 0, State.qTable.length - 1);
  }

  function selectAction(cfg, sIdx) {
    // Epsilon-greedy
    if (Math.random() < cfg.eps) return Math.random() < 0.5 ? 0 : 1;

    // Greedy
    const [qOff, qOn] = State.qTable[sIdx];
    if (qOn === qOff) return Math.random() < 0.5 ? 0 : 1;
    return qOn > qOff ? 1 : 0;
  }

  function calcReward(cfg, t, aIdx) {
    const inBand = Math.abs(t - cfg.target) <= cfg.band;
    const base = inBand ? 1 : 0;
    const cost = aIdx === 1 ? cfg.cost : 0;
    return { val: base - cost, inBand };
  }

  function stepEnvironment() {
    const cfg = State.cfg;
    const sIdx = getStateIndex(cfg, State.temp);

    // Choose Action
    const aIdx = selectAction(cfg, sIdx);

    // Transition
    const drift = aIdx === 1 ? cfg.heat : -cfg.cool;
    const noise = (Math.random() * 2 - 1) * cfg.noise;
    const nextTemp = clamp(State.temp + drift + noise, cfg.minT, cfg.maxT);

    // Reward
    const rw = calcReward(cfg, nextTemp, aIdx);

    // Update Q-Table
    const nextSIdx = getStateIndex(cfg, nextTemp);
    const bestNextQ = Math.max(State.qTable[nextSIdx][0], State.qTable[nextSIdx][1]);
    const oldQ = State.qTable[sIdx][aIdx];
    State.qTable[sIdx][aIdx] = oldQ + cfg.alpha * (rw.val + cfg.gamma * bestNextQ - oldQ);

    // Commit State
    State.temp = nextTemp;
    State.step++;

    // Rolling History (Max 300 points for chart)
    State.history.push(nextTemp);
    State.actionHist.push(aIdx);
    State.rewardHist.push(rw.val);
    State.bandHist.push(rw.inBand);
    if (State.history.length > 300) {
      State.history.shift();
      State.actionHist.shift();
      State.rewardHist.shift();
      State.bandHist.shift();
    }

    // Episode End
    if (State.step >= cfg.epLen) {
      State.episode++;
      State.step = 0;
      State.temp = cfg.init;
      cfg.eps = Math.max(0.01, cfg.eps * cfg.decay); // Decay exploration
    }

    updateUI(aIdx, rw.val, cfg.eps);
    renderCanvases();
  }

  /* ── UI & Rendering ───────────────────────────────────── */
  function updateUI(aIdx, rwVal, eps) {
    ui.stepOut.textContent = State.step;
    ui.episodeOut.textContent = State.episode;
    ui.actionOut.textContent = ACTIONS[aIdx];
    ui.actionOut.className = 'stat-val ' + (aIdx === 1 ? 'col-action-on' : 'col-text');
    ui.rewardOut.textContent = rwVal.toFixed(2);
    ui.rewardOut.className = 'stat-val ' + (rwVal > 0 ? 'col-accent' : 'col-text');
    ui.epsilonOut.textContent = eps.toFixed(3);
  }

  // Robust Canvas Sizing based on explicit CSS wrapper dimensions
  function sizeCanvas(cv) {
    const wrapper = cv.parentElement;
    const dpr = window.devicePixelRatio || 1;
    // ClientWidth is 0 if display:none, so we fallback nicely
    const cssW = wrapper.clientWidth || 300;
    const cssH = wrapper.clientHeight || 150;

    const w = Math.floor(cssW * dpr);
    const h = Math.floor(cssH * dpr);

    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    return { w, h, dpr, ctx: cv.getContext('2d') };
  }

  function renderCanvases() {
    drawDial();
    drawHeatmap();
    drawChart();
  }

  /* ── 1. The Dial ──────────────────────────────────────── */
  function drawDial() {
    const { w, h, ctx } = sizeCanvas(ui.dial);
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    // Leave room for stroke and glow
    const R = Math.max(10, Math.min(cx, cy) - 20);

    const cfg = State.cfg;
    const cs = getComputedStyle(document.documentElement);
    const col = (name) => cs.getPropertyValue(name).trim();

    // The angle math: Maps MinT to MaxT from 135deg to 45deg (270deg sweep)
    const ang = (t) => {
      let pct = clamp01((t - cfg.minT) / (cfg.maxT - cfg.minT));
      return (Number.isNaN(pct) ? 0 : pct) * 1.5 * Math.PI + 0.75 * Math.PI;
    };

    const isHeating = State.actionHist[State.actionHist.length - 1] === 1;
    const inBand = State.bandHist[State.bandHist.length - 1];

    // Glow Ring
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = col('--card');
    ctx.fill();

    ctx.lineWidth = 14;
    ctx.strokeStyle = isHeating ? col('--action-on') : (inBand ? col('--reward-good') : col('--border'));
    ctx.globalAlpha = 0.25;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Track Background
    const trackR = R - 20;
    ctx.beginPath();
    ctx.arc(cx, cy, trackR, ang(cfg.minT), ang(cfg.maxT));
    ctx.strokeStyle = col('--border');
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw Ticks
    const numTicks = 20;
    ctx.lineWidth = 2;
    ctx.strokeStyle = col('--border');
    for (let i = 0; i <= numTicks; i++) {
      const t = cfg.minT + (i / numTicks) * (cfg.maxT - cfg.minT);
      const a = ang(t);
      const inner = trackR + 8;
      const outer = trackR + 15;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.stroke();
    }

    // Target Band Highlight
    ctx.beginPath();
    ctx.arc(cx, cy, trackR, ang(cfg.target - cfg.band), ang(cfg.target + cfg.band));
    ctx.strokeStyle = col('--accent');
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Target Tick (Visual indicator for target)
    const targetA = ang(cfg.target);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(targetA) * (trackR - 12), cy + Math.sin(targetA) * (trackR - 12));
    ctx.lineTo(cx + Math.cos(targetA) * (trackR + 12), cy + Math.sin(targetA) * (trackR + 12));
    ctx.strokeStyle = col('--accent');
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Current Temp Needle
    const currentA = ang(State.temp);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(currentA) * (trackR - 5), cy + Math.sin(currentA) * (trackR - 5));
    ctx.strokeStyle = isHeating ? col('--action-on') : col('--text');
    ctx.lineWidth = 6;
    ctx.stroke();

    // Pivot Dot
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fillStyle = col('--text');
    ctx.fill();

    // Center Readout
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = col('--text');
    ctx.font = `700 ${Math.floor(R * 0.35)}px "Work Sans", sans-serif`;
    ctx.fillText(`${State.temp.toFixed(1)}°`, cx, cy - 20);

    ctx.fillStyle = isHeating ? col('--action-on') : col('--muted');
    ctx.font = `600 ${Math.floor(R * 0.12)}px "Work Sans", sans-serif`;
    ctx.fillText(isHeating ? '🔥 HEATING' : 'IDLE', cx, cy + 30);

    // Min/Max Labels at the arc ends
    ctx.fillStyle = col('--muted');
    ctx.font = `500 ${Math.floor(R * 0.1)}px "Work Sans", sans-serif`;

    // Label for Min
    const minA = ang(cfg.minT);
    ctx.textAlign = 'right';
    ctx.fillText(`${cfg.minT}°`, cx + Math.cos(minA) * (trackR + 25), cy + Math.sin(minA) * (trackR + 25));

    // Label for Max
    const maxA = ang(cfg.maxT);
    ctx.textAlign = 'left';
    ctx.fillText(`${cfg.maxT}°`, cx + Math.cos(maxA) * (trackR + 25), cy + Math.sin(maxA) * (trackR + 25));
  }

  /* ── 2. The Q-Table Heatmap ───────────────────────────── */
  function drawHeatmap() {
    const { w, h, ctx } = sizeCanvas(ui.heatmap);
    if (!ctx || !State.qTable.length) return;
    ctx.clearRect(0, 0, w, h);

    const padL = 40, padR = 20, padT = 20, padB = 25;
    const bins = State.qTable.length;
    const cellW = (w - padL - padR) / bins;
    const cellH = (h - padT - padB) / 2;

    // Determine scale for coloring
    let minQ = 0, maxQ = 0;
    State.qTable.forEach(([q0, q1]) => {
      minQ = Math.min(minQ, q0, q1);
      maxQ = Math.max(maxQ, q0, q1);
    });
    if (maxQ - minQ === 0) maxQ += 0.001; // Avoid divide by zero

    const getHsl = (val) => {
      const pct = (val - minQ) / (maxQ - minQ); // 0 to 1
      // 240=Blue (Low), 0=Red (High)
      const hue = 240 - Number(pct * 240);
      return `hsl(${hue}, 80%, 55%)`;
    };

    const cs = getComputedStyle(document.documentElement);
    const textCol = cs.getPropertyValue('--text').trim();
    const mutedCol = cs.getPropertyValue('--muted').trim();

    // Row Labels
    ctx.font = '12px "Work Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textCol;
    ctx.fillText('OFF', padL - 8, padT + cellH / 2);
    ctx.fillText('ON', padL - 8, padT + cellH * 1.5);

    // Draw Grid
    for (let i = 0; i < bins; i++) {
      const [q0, q1] = State.qTable[i];
      const x = padL + (i * cellW);

      // Off Row
      ctx.fillStyle = getHsl(q0);
      ctx.fillRect(x, padT, cellW, cellH);

      // On Row
      ctx.fillStyle = getHsl(q1);
      ctx.fillRect(x, padT + cellH, cellW, cellH);

      // Borders
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, padT, cellW, cellH);
      ctx.strokeRect(x, padT + cellH, cellW, cellH);
    }

    // X-Axis Labels
    const cfg = State.cfg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = mutedCol;
    const ticks = 4; // Display 5 ticks total
    for (let i = 0; i <= ticks; i++) {
      const pct = i / ticks;
      const x = padL + (w - padL - padR) * pct;
      const t = cfg.minT + (cfg.maxT - cfg.minT) * pct;
      ctx.fillText(`${t.toFixed(0)}°`, x, h - padB + 6);
    }
  }

  /* ── 3. The History Chart ─────────────────────────────── */
  function drawChart() {
    const { w, h, ctx } = sizeCanvas(ui.chart);
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const cfg = State.cfg;
    const cs = getComputedStyle(document.documentElement);
    const mutedCol = cs.getPropertyValue('--muted').trim();
    const actionCol = cs.getPropertyValue('--action-on').trim();
    const chartLine = cs.getPropertyValue('--chart-line').trim();
    const accentCol = cs.getPropertyValue('--accent').trim();
    const accentSoft = cs.getPropertyValue('--accent-soft').trim();
    const gridCol = cs.getPropertyValue('--grid-line').trim();

    const padL = 40, padR = 20, padY = 20;

    // Y-mapping mapping temp between minT and maxT
    const mapY = (t) => {
      const clampT = clamp(t, cfg.minT, cfg.maxT);
      const pct = (clampT - cfg.minT) / (cfg.maxT - cfg.minT);
      return h - padY - pct * (h - padY * 2);
    };

    // Draw background grid lines (horizontal)
    ctx.strokeStyle = gridCol;
    ctx.lineWidth = 1;
    for (let t = cfg.minT; t <= cfg.maxT; t += 10) {
      const y = mapY(t);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    // Target Reward Band Box
    const topY = mapY(cfg.target + cfg.band);
    const botY = mapY(cfg.target - cfg.band);
    ctx.fillStyle = accentSoft;
    ctx.fillRect(padL, topY, w - padL - padR, Math.max(1, botY - topY));

    // Target Line Dash
    const targetY = mapY(cfg.target);
    ctx.beginPath();
    ctx.moveTo(padL, targetY);
    ctx.lineTo(w - padR, targetY);
    ctx.strokeStyle = accentCol;
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Line Chart
    const pts = State.history;
    if (pts.length < 2) {
      drawAxis(ctx, cfg.minT, cfg.maxT, padL, padY, h, mutedCol);
      return;
    }

    const stepX = (w - padL - padR) / (pts.length - 1);

    // Draw thick segmented lines mapping action state to color
    for (let i = 1; i < pts.length; i++) {
      const x0 = padL + (i - 1) * stepX;
      const x1 = padL + i * stepX;
      const y0 = mapY(pts[i - 1]);
      const y1 = mapY(pts[i]);

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);

      // If we *just took* action 1 to reach this state, color it orange
      ctx.strokeStyle = State.actionHist[i] === 1 ? actionCol : chartLine;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Draw Y-axis labels
    function drawAxis(ctx, minT, maxT, padL, padY, h, color) {
      ctx.fillStyle = color;
      ctx.font = '11px "Work Sans", sans-serif';
      ctx.textAlign = 'right';

      ctx.textBaseline = 'top';
      ctx.fillText(`${maxT}°`, padL - 6, padY - 6);

      ctx.textBaseline = 'bottom';
      ctx.fillText(`${minT}°`, padL - 6, h - padY + 6);
    }
    drawAxis(ctx, cfg.minT, cfg.maxT, padL, padY, h, mutedCol);
  }

  /* ── Simulation Control ───────────────────────────────── */
  function initialize() {
    State.cfg = readConfig();
    State.qTable = buildQTable(State.cfg);
    State.episode = 1;
    State.step = 0;
    State.temp = State.cfg.init;
    State.history = [];
    State.actionHist = [];
    State.rewardHist = [];
    State.bandHist = [];

    ui.speedVal.textContent = State.cfg.speed;
    ui.epsilonOut.textContent = State.cfg.eps.toFixed(3);

    updateUI(0, 0, State.cfg.eps);
    ui.actionOut.textContent = "—";
    ui.rewardOut.textContent = "—";

    renderCanvases();
  }

  function toggleRun() {
    if (running) {
      running = false;
      clearInterval(intervalId);
      ui.startBtn.textContent = '▶ Start Training';
      ui.startBtn.className = 'primary';
    } else {
      running = true;
      State.cfg = readConfig(); // Re-read in case inputs changed while paused
      intervalId = setInterval(stepEnvironment, 1000 / State.cfg.speed);
      ui.startBtn.textContent = '⏸ Pause';
      ui.startBtn.className = 'secondary';
    }
  }

  /* ── Event Listeners ──────────────────────────────────── */
  ui.startBtn.addEventListener('click', toggleRun);
  ui.stepBtn.addEventListener('click', () => {
    if (!running) {
      State.cfg = readConfig();
      stepEnvironment();
    }
  });
  ui.resetBtn.addEventListener('click', () => {
    if (running) toggleRun();
    initialize();
  });

  ui.speed.addEventListener('input', () => {
    if (State.cfg) {
      State.cfg.speed = Math.max(1, parseInt(ui.speed.value, 10) || 10);
      ui.speedVal.textContent = State.cfg.speed;
      if (running) {
        clearInterval(intervalId);
        intervalId = setInterval(stepEnvironment, 1000 / State.cfg.speed);
      }
    }
  });

  // Re-initialize if structure-changing inputs are modified while paused
  const structuralInputs = [ui.minTemp, ui.maxTemp, ui.binSize, ui.initialTemp, ui.targetTemp];
  structuralInputs.forEach(el => {
    if (el) {
      el.addEventListener('change', () => {
        if (running) toggleRun();
        initialize();
      });
      // Add input listener for immediate dial feedback when changing temps
      if (el === ui.targetTemp || el === ui.initialTemp) {
        el.addEventListener('input', () => {
          if (!running) {
            State.cfg = readConfig();
            State.temp = State.cfg.init;
            renderCanvases();
          }
        });
      }
    }
  });

  // Simple render tick for responsive resizing
  window.addEventListener('resize', () => {
    requestAnimationFrame(renderCanvases);
  });

  /* ── Boot ─────────────────────────────────────────────── */
  initialize();
})();
