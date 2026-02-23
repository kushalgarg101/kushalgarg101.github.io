(function () {
  const qs = (id) => document.getElementById(id);

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
    tempOut: qs('tempOut'),
    actionOut: qs('actionOut'),
    rewardOut: qs('rewardOut'),
    epsilonOut: qs('epsilonOut'),
    tempChart: qs('tempChart'),
    thermostatDial: qs('thermostatDial'),
    qTableHeatmap: qs('qTableHeatmap')
  };

  if (!ui.tempChart || !ui.thermostatDial || !ui.qTableHeatmap) return;

  const ACTIONS = ['off', 'on'];

  let running = false;
  let intervalId = null;

  const state = {
    config: null,
    episode: 1,
    step: 0,
    temp: 0,
    qTable: [],
    history: [],
    actionHistory: [],
    rewardHistory: [],
    bandHistory: []
  };

  const DEFAULTS = {
    targetTemp: 70,
    initialTemp: 65,
    noise: 0.4,
    alpha: 0.15,
    gamma: 0.95,
    epsilon: 0.2,
    epsilonDecay: 0.98,
    episodeLen: 160,
    heatRate: 1.0,
    coolRate: 0.6,
    rewardBand: 2,
    actionCost: 0,
    minTemp: 50,
    maxTemp: 85,
    binSize: 1,
    speed: 10
  };

  function readConfig() {
    const fallback = state.config || DEFAULTS;
    const num = (value, fallbackValue) => {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallbackValue;
    };
    const intVal = (value, fallbackValue) => {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : fallbackValue;
    };
    const cfg = {
      targetTemp: num(ui.targetTemp.value, fallback.targetTemp),
      initialTemp: num(ui.initialTemp.value, fallback.initialTemp),
      noise: num(ui.noise.value, fallback.noise),
      alpha: clamp01(num(ui.alpha.value, fallback.alpha)),
      gamma: clamp01(num(ui.gamma.value, fallback.gamma)),
      epsilon: clamp01(num(ui.epsilon.value, fallback.epsilon)),
      epsilonDecay: clamp01(num(ui.epsilonDecay.value, fallback.epsilonDecay)),
      episodeLen: Math.max(10, intVal(ui.episodeLen.value, fallback.episodeLen)),
      heatRate: num(ui.heatRate.value, fallback.heatRate),
      coolRate: num(ui.coolRate.value, fallback.coolRate),
      rewardBand: Math.max(0, num(ui.rewardBand.value, fallback.rewardBand)),
      actionCost: Math.max(0, num(ui.actionCost.value, fallback.actionCost)),
      minTemp: num(ui.minTemp.value, fallback.minTemp),
      maxTemp: num(ui.maxTemp.value, fallback.maxTemp),
      binSize: Math.max(0.5, num(ui.binSize.value, fallback.binSize)),
      speed: Math.max(1, intVal(ui.speed.value, fallback.speed))
    };

    if (cfg.maxTemp <= cfg.minTemp) {
      cfg.maxTemp = cfg.minTemp + 1;
      ui.maxTemp.value = cfg.maxTemp;
    }

    if (cfg.initialTemp < cfg.minTemp || cfg.initialTemp > cfg.maxTemp) {
      cfg.initialTemp = clamp(cfg.initialTemp, cfg.minTemp, cfg.maxTemp);
      ui.initialTemp.value = cfg.initialTemp;
    }

    return cfg;
  }

  function clamp01(val) {
    if (Number.isNaN(val)) return 0;
    return Math.min(1, Math.max(0, val));
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function initQTable(cfg) {
    const bins = Math.floor((cfg.maxTemp - cfg.minTemp) / cfg.binSize) + 1;
    const table = new Array(bins).fill(null).map(() => [0, 0]);
    return table;
  }

  function stateIndex(cfg, temp) {
    const idx = Math.floor((temp - cfg.minTemp) / cfg.binSize);
    return clamp(idx, 0, state.qTable.length - 1);
  }

  function chooseAction(cfg, sIdx) {
    if (Math.random() < cfg.epsilon) {
      return Math.random() < 0.5 ? 0 : 1;
    }
    const [qOff, qOn] = state.qTable[sIdx];
    if (qOn === qOff) {
      return Math.random() < 0.5 ? 0 : 1;
    }
    return qOn > qOff ? 1 : 0;
  }

  function reward(cfg, temp, actionIdx) {
    const inBand = Math.abs(temp - cfg.targetTemp) <= cfg.rewardBand;
    const base = inBand ? 1 : 0;
    const cost = actionIdx === 1 ? cfg.actionCost : 0;
    return { value: base - cost, inBand };
  }

  function transition(cfg, temp, actionIdx) {
    const drift = actionIdx === 1 ? cfg.heatRate : -cfg.coolRate;
    const noise = (Math.random() * 2 - 1) * cfg.noise;
    return clamp(temp + drift + noise, cfg.minTemp, cfg.maxTemp);
  }

  function stepOnce() {
    const cfg = state.config;
    const sIdx = stateIndex(cfg, state.temp);
    const actionIdx = chooseAction(cfg, sIdx);
    const nextTemp = transition(cfg, state.temp, actionIdx);
    const rewardResult = reward(cfg, nextTemp, actionIdx);
    const r = rewardResult.value;
    const sNextIdx = stateIndex(cfg, nextTemp);

    const bestNext = Math.max(state.qTable[sNextIdx][0], state.qTable[sNextIdx][1]);
    const qOld = state.qTable[sIdx][actionIdx];
    const qNew = qOld + cfg.alpha * (r + cfg.gamma * bestNext - qOld);
    state.qTable[sIdx][actionIdx] = qNew;

    state.temp = nextTemp;
    state.step += 1;

    pushHistory(nextTemp, actionIdx, r, rewardResult.inBand);
    updateReadouts(actionIdx, r);

    if (state.step >= cfg.episodeLen) {
      state.episode += 1;
      state.step = 0;
      state.temp = cfg.initialTemp;
      state.config.epsilon = Math.max(0.01, state.config.epsilon * state.config.epsilonDecay);
    }

    render();
  }

  function pushHistory(temp, actionIdx, r, inBand) {
    const maxPoints = 240;
    state.history.push(temp);
    state.actionHistory.push(actionIdx);
    state.rewardHistory.push(r);
    state.bandHistory.push(inBand);

    if (state.history.length > maxPoints) {
      state.history.shift();
      state.actionHistory.shift();
      state.rewardHistory.shift();
      state.bandHistory.shift();
    }
  }

  function updateReadouts(actionIdx, r) {
    ui.episodeOut.textContent = state.episode;
    ui.stepOut.textContent = state.step;
    ui.tempOut.textContent = state.temp.toFixed(1) + '°F';
    ui.actionOut.textContent = ACTIONS[actionIdx];
    ui.rewardOut.textContent = r.toFixed(2);
    ui.epsilonOut.textContent = state.config.epsilon.toFixed(2);
  }

  function render() {
    drawThermostatDial(ui.thermostatDial, state.config, state.temp, state.actionHistory[state.actionHistory.length - 1] || 0, state.bandHistory[state.bandHistory.length - 1] || false);
    drawQTableHeatmap(ui.qTableHeatmap, state.config, state.qTable);
    drawChart(ui.tempChart, state.config, state.history);
  }

  function syncCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // If rect is 0 (unrendered or collapsed), fallback to attributes or defaults
    let w = rect.width || canvas.clientWidth || parseInt(canvas.getAttribute('width')) || 300;
    let h = rect.height || canvas.clientHeight || parseInt(canvas.getAttribute('height')) || 150;

    const width = Math.floor(w * dpr);
    const height = Math.floor(h * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width, height };
  }

  function drawChart(canvas, cfg, temps) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = syncCanvasSize(canvas);

    ctx.clearRect(0, 0, width, height);
    const styles = getComputedStyle(document.documentElement);
    ctx.fillStyle = styles.getPropertyValue('--card').trim();
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, width, height, styles.getPropertyValue('--grid-line').trim());

    const pad = 40;
    const minT = cfg.minTemp;
    const maxT = cfg.maxTemp;

    const yFor = (t) => {
      const ratio = (t - minT) / (maxT - minT);
      return height - pad - ratio * (height - pad * 2);
    };

    const targetY = yFor(cfg.targetTemp);
    ctx.strokeStyle = styles.getPropertyValue('--accent').trim();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, targetY);
    ctx.lineTo(width - pad, targetY);
    ctx.stroke();

    const bandTop = yFor(cfg.targetTemp + cfg.rewardBand);
    const bandBottom = yFor(cfg.targetTemp - cfg.rewardBand);
    ctx.fillStyle = styles.getPropertyValue('--accent-soft').trim();
    ctx.fillRect(pad, bandTop, width - pad * 2, bandBottom - bandTop);

    if (temps.length < 2) return;

    const stepX = (width - pad * 2) / (temps.length - 1);
    ctx.strokeStyle = styles.getPropertyValue('--chart-line').trim();
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    temps.forEach((t, i) => {
      const x = pad + stepX * i;
      const y = yFor(t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = styles.getPropertyValue('--text').trim();
    ctx.font = '12px Work Sans, sans-serif';
    ctx.fillText(minT.toFixed(0) + '°F', 8, height - pad + 12);
    ctx.fillText(maxT.toFixed(0) + '°F', 8, pad - 6);
  }

  function drawThermostatDial(canvas, cfg, temp, actionIdx, inBand) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = syncCanvasSize(canvas);
    ctx.clearRect(0, 0, width, height);

    const minT = cfg.minTemp;
    const maxT = cfg.maxTemp;
    const range = maxT - minT;
    const angleForTemp = (t) => {
      let pct = (t - minT) / range;
      pct = clamp01(pct);
      // Maps 0-1 to angles from 135deg to 45deg (wrapping bottom)
      const startAngle = 0.75 * Math.PI; // 135deg
      const totalSweep = 1.5 * Math.PI; // 270deg sweep
      return startAngle + pct * totalSweep;
    };

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(10, Math.min(cx, cy) - 20);

    const styles = getComputedStyle(document.documentElement);
    const bgCol = styles.getPropertyValue('--bg').trim();
    const borderCol = styles.getPropertyValue('--border').trim();
    const accentCol = styles.getPropertyValue('--accent').trim();
    const actionOnCol = styles.getPropertyValue('--action-on').trim();
    const textCol = styles.getPropertyValue('--text').trim();
    const mutedCol = styles.getPropertyValue('--muted').trim();
    const rewardGoodCol = styles.getPropertyValue('--reward-good').trim();

    // Current State Calculations
    const currentAngle = angleForTemp(temp);
    const trackRadius = Math.max(1, radius - 16);

    // Outer Ring Glow
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = bgCol;
    ctx.fill();
    ctx.lineWidth = 12;
    // Determine the glow color
    let ringColor = borderCol;
    if (actionIdx === 1) ringColor = actionOnCol;
    else if (inBand) ringColor = rewardGoodCol;

    ctx.strokeStyle = ringColor;
    ctx.globalAlpha = 0.3; // Glow
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.globalAlpha = 1.0;

    // Draw inner track
    ctx.beginPath();
    ctx.arc(cx, cy, trackRadius, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Target Range band
    const tStartAngle = angleForTemp(cfg.targetTemp - cfg.rewardBand);
    const tEndAngle = angleForTemp(cfg.targetTemp + cfg.rewardBand);
    ctx.beginPath();
    ctx.arc(cx, cy, trackRadius, tStartAngle, tEndAngle);
    ctx.strokeStyle = accentCol;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Track highlighter
    ctx.beginPath();
    ctx.arc(cx, cy, trackRadius, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.strokeStyle = actionIdx === 1 ? actionOnCol : textCol;
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.2;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Current Temp Needle
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const mX = cx + Math.cos(currentAngle) * (trackRadius - 4);
    const mY = cy + Math.sin(currentAngle) * (trackRadius - 4);
    ctx.lineTo(mX, mY);
    ctx.strokeStyle = actionIdx === 1 ? actionOnCol : textCol;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Pivot dot
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = textCol;
    ctx.fill();

    // Center Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textCol;
    ctx.font = '700 36px Work Sans, sans-serif';
    ctx.fillText(temp.toFixed(1) + '°', cx, cy - 10);

    ctx.fillStyle = actionIdx === 1 ? actionOnCol : mutedCol;
    ctx.font = '600 14px Work Sans, sans-serif';
    ctx.fillText(actionIdx === 1 ? 'HEATING' : 'IDLE', cx, cy + 24);
  }

  function drawQTableHeatmap(canvas, cfg, qTable) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = syncCanvasSize(canvas);
    ctx.clearRect(0, 0, width, height);

    if (!qTable || qTable.length === 0) return;

    const styles = getComputedStyle(document.documentElement);
    const textCol = styles.getPropertyValue('--text').trim();
    const mutedCol = styles.getPropertyValue('--muted').trim();

    const pad = 30;
    const topPad = 20;
    const botPad = 25;

    const bins = qTable.length;
    const cellW = (width - pad * 2) / bins;
    const cellH = (height - topPad - botPad) / 2;

    // Determine max/min Q values for color scaling
    let minQ = 0, maxQ = 0;
    qTable.forEach(([qOff, qOn]) => {
      minQ = Math.min(minQ, qOff, qOn);
      maxQ = Math.max(maxQ, qOff, qOn);
    });
    // Add small buffer to prevent divide by zero
    if (Math.abs(maxQ - minQ) < 0.001) maxQ += 0.001;

    const getColor = (val) => {
      // Scale val between 0 and 1
      const pct = (val - minQ) / (maxQ - minQ);
      // Low (0) = Blue, High (1) = Red. RGB interpolation.
      // Dark mode / light mode neutral coloring. Let's use HSL.
      // 240 is Blue, 0 is Red.
      const hue = 240 - (240 * pct);
      return `hsl(${hue}, 80%, 60%)`;
    };

    ctx.font = '11px Work Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textCol;
    ctx.fillText('Off', pad - 5, topPad + cellH / 2);
    ctx.fillText('On', pad - 5, topPad + cellH * 1.5);

    for (let i = 0; i < bins; i++) {
      const [qOff, qOn] = qTable[i];
      const x = pad + i * cellW;

      // Draw Action Off rect
      ctx.fillStyle = getColor(qOff);
      ctx.fillRect(x, topPad, cellW, cellH);

      // Draw Action On rect
      ctx.fillStyle = getColor(qOn);
      ctx.fillRect(x, topPad + cellH, cellW, cellH);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.strokeRect(x, topPad, cellW, cellH);
      ctx.strokeRect(x, topPad + cellH, cellW, cellH);
    }

    // X Axis markings
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = mutedCol;
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const tx = pad + ((width - pad * 2) * (i / ticks));
      const tTemp = cfg.minTemp + (cfg.maxTemp - cfg.minTemp) * (i / ticks);
      ctx.fillText(tTemp.toFixed(0) + '°', tx, height - botPad + 5);

      // Tick mark
      ctx.beginPath();
      ctx.moveTo(tx, height - botPad);
      ctx.lineTo(tx, height - botPad + 3);
      ctx.strokeStyle = mutedCol;
      ctx.stroke();
    }
  }


  function drawGrid(ctx, width, height, color) {
    ctx.strokeStyle = color || 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    const dpr = window.devicePixelRatio || 1;
    const step = 40 * dpr;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function resetSimulation() {
    state.config = readConfig();
    state.qTable = initQTable(state.config);
    state.episode = 1;
    state.step = 0;
    state.temp = state.config.initialTemp;
    state.history = [];
    state.actionHistory = [];
    state.rewardHistory = [];
    state.bandHistory = [];
    ui.speedVal.textContent = state.config.speed;
    ui.episodeOut.textContent = state.episode;
    ui.stepOut.textContent = state.step;
    ui.tempOut.textContent = state.temp.toFixed(1) + '°F';
    ui.actionOut.textContent = '--';
    ui.rewardOut.textContent = '--';
    ui.epsilonOut.textContent = state.config.epsilon.toFixed(2);
    render();
  }

  function startRun() {
    if (running) return;
    state.config = readConfig();
    ui.epsilonOut.textContent = state.config.epsilon.toFixed(2);
    running = true;
    ui.startBtn.textContent = 'Pause';
    const speed = Math.max(1, state.config.speed);
    intervalId = setInterval(stepOnce, 1000 / speed);
  }

  function pauseRun() {
    running = false;
    ui.startBtn.textContent = 'Start';
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function toggleRun() {
    if (running) pauseRun();
    else startRun();
  }

  ui.startBtn.addEventListener('click', toggleRun);
  ui.stepBtn.addEventListener('click', function () {
    if (!running) stepOnce();
  });
  ui.resetBtn.addEventListener('click', function () {
    pauseRun();
    resetSimulation();
  });
  ui.speed.addEventListener('input', function () {
    state.config.speed = Math.max(1, parseInt(ui.speed.value, 10) || DEFAULTS.speed);
    ui.speedVal.textContent = state.config.speed;
    if (running) {
      pauseRun();
      startRun();
    }
  });

  const configInputs = [
    ui.targetTemp, ui.initialTemp, ui.noise, ui.alpha, ui.gamma,
    ui.epsilon, ui.epsilonDecay, ui.episodeLen, ui.heatRate,
    ui.coolRate, ui.rewardBand, ui.actionCost, ui.minTemp,
    ui.maxTemp, ui.binSize
  ];

  configInputs.forEach(function (input) {
    if (input) {
      input.addEventListener('change', function () {
        const wasRunning = running;
        if (wasRunning) pauseRun();
        state.config = readConfig();
        ui.epsilonOut.textContent = state.config.epsilon.toFixed(2);
        ui.tempOut.textContent = state.config.initialTemp.toFixed(1) + '°F';
        state.temp = state.config.initialTemp;
        state.episode = 1;
        state.step = 0;
        state.history = [];
        state.actionHistory = [];
        state.rewardHistory = [];
        state.bandHistory = [];
        state.qTable = initQTable(state.config);
        ui.episodeOut.textContent = state.episode;
        ui.stepOut.textContent = state.step;
        ui.actionOut.textContent = '--';
        ui.rewardOut.textContent = '--';
        render();
      });
    }
  });

  window.addEventListener('resize', function () {
    render();
  });

  window.addEventListener('beforeunload', function () {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });

  resetSimulation();
})();
