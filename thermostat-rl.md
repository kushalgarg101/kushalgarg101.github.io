---
layout: default
title: Thermostat RL Demo
permalink: /thermostat-rl/
---
<link rel="stylesheet" href="{{ '/assets/css/thermostat-rl-premium.css' | relative_url }}">

<section class="rl-page">

  <!-- Hero -->
  <div class="rl-hero">
    <h1>🌡️ Thermostat RL</h1>
    <p>Watch a Q-learning agent learn to hold a target temperature by toggling a heater on and off.</p>
  </div>

  <!-- Main Layout -->
  <div class="rl-layout">

    <!-- Left: Controls -->
    <aside class="rl-controls">
      <h2>Controls</h2>

      <label>Target °F
        <input id="targetTemp" type="number" value="72" step="1">
      </label>
      <label>Start °F
        <input id="initialTemp" type="number" value="60" step="1">
      </label>
      <label>Learning rate (α)
        <input id="alpha" type="number" value="0.15" step="0.01" min="0" max="1">
      </label>
      <label>Discount (γ)
        <input id="gamma" type="number" value="0.95" step="0.01" min="0" max="1">
      </label>
      <label>Exploration (ε)
        <input id="epsilon" type="number" value="0.20" step="0.01" min="0" max="1">
      </label>
      <label>Episode length
        <input id="episodeLen" type="number" value="200" step="10" min="10">
      </label>

      <div class="rl-btn-row">
        <button id="startBtn">▶ Start</button>
        <button id="stepBtn" class="secondary">Step</button>
        <button id="resetBtn" class="secondary">Reset</button>
      </div>

      <label class="speed-label">Speed
        <input id="speed" type="range" min="1" max="60" value="10">
        <span id="speedVal">10</span> steps/s
      </label>
    </aside>

    <!-- Right: Visuals -->
    <main class="rl-main">

      <!-- Thermostat Gauge -->
      <div class="rl-card rl-gauge-card">
        <canvas id="thermostatDial" width="320" height="320"></canvas>
        <div class="rl-stats">
          <div><span class="stat-label">Episode</span><span class="stat-val" id="episodeOut">1</span></div>
          <div><span class="stat-label">Step</span><span class="stat-val" id="stepOut">0</span></div>
          <div><span class="stat-label">Action</span><span class="stat-val" id="actionOut">—</span></div>
          <div><span class="stat-label">Reward</span><span class="stat-val" id="rewardOut">—</span></div>
          <div><span class="stat-label">ε</span><span class="stat-val" id="epsilonOut">0.20</span></div>
        </div>
      </div>

      <!-- Q-Table Heatmap -->
      <div class="rl-card">
        <h3>Q-Table Heatmap</h3>
        <p class="card-sub">Blue = low Q, Red = high Q. Rows: Off / On. Columns: temperature bins.</p>
        <canvas id="qTableHeatmap" width="820" height="130"></canvas>
      </div>

      <!-- Temperature History -->
      <div class="rl-card">
        <h3>Temperature History</h3>
        <canvas id="tempChart" width="820" height="220"></canvas>
      </div>

    </main>
  </div>
</section>

<!-- Hidden params the JS still reads (sensible defaults) -->
<input id="noise"      type="hidden" value="0.4">
<input id="epsilonDecay" type="hidden" value="0.985">
<input id="heatRate"   type="hidden" value="1.0">
<input id="coolRate"   type="hidden" value="0.6">
<input id="rewardBand" type="hidden" value="2">
<input id="actionCost" type="hidden" value="0">
<input id="minTemp"    type="hidden" value="50">
<input id="maxTemp"    type="hidden" value="90">
<input id="binSize"    type="hidden" value="1">

<script src="{{ '/assets/js/thermostat-rl.js' | relative_url }}"></script>
