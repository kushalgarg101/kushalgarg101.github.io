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
    timeline: qs('timeline')
  };

  if (!ui.tempChart || !ui.timeline) return;

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
    drawChart(ui.tempChart, state.config, state.history);
    drawTimeline(ui.timeline, state.config, state.actionHistory, state.bandHistory);
  }

  function syncCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
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

  function drawTimeline(canvas, cfg, actions, inBandFlags) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = syncCanvasSize(canvas);
    ctx.clearRect(0, 0, width, height);
    const styles = getComputedStyle(document.documentElement);
    ctx.fillStyle = styles.getPropertyValue('--card').trim();
    ctx.fillRect(0, 0, width, height);

    const pad = 24;
    const rowY = height / 2;

    ctx.strokeStyle = styles.getPropertyValue('--grid-line').trim();
    ctx.beginPath();
    ctx.moveTo(pad, rowY);
    ctx.lineTo(width - pad, rowY);
    ctx.stroke();

    if (!actions.length) return;

    const stepX = (width - pad * 2) / Math.max(1, actions.length - 1);
    actions.forEach((actionIdx, i) => {
      const x = pad + stepX * i;
      const inBand = inBandFlags[i];
      ctx.fillStyle = actionIdx === 1
        ? styles.getPropertyValue('--action-on').trim()
        : styles.getPropertyValue('--action-off').trim();
      ctx.beginPath();
      ctx.arc(x, rowY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      if (inBand) {
        ctx.fillStyle = styles.getPropertyValue('--reward-good').trim();
        ctx.beginPath();
        ctx.arc(x, rowY - 16, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
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

  configInputs.forEach(function(input) {
    if (input) {
      input.addEventListener('change', function() {
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
