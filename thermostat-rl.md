---
layout: default
title: Thermostat RL Demo
permalink: /thermostat-rl/
---
<link rel="stylesheet" href="{{ '/assets/css/thermostat-rl-premium.css' | relative_url }}">

<section class="rl-page">

  <!-- Hero -->
  <div class="rl-hero">
    <h1>🌡️ Learning Thermostat</h1>
    <p>Watch a Q-learning agent discover how to hold a target temperature by toggling a heater on and off.</p>
  </div>

  <!-- Main Layout -->
  <div class="rl-layout">

    <!-- Left: Controls -->
    <aside class="rl-controls">
      <h2>Environment Controls</h2>

      <div class="control-row">
        <label>Target °F
          <input id="targetTemp" type="number" value="72" step="1" min="40" max="100">
        </label>
        <label>Start °F
          <input id="initialTemp" type="number" value="60" step="1" min="40" max="100">
        </label>
      </div>

      <div class="control-row">
        <label>Learning Rate (α)
          <input id="alpha" type="number" value="0.15" step="0.01" min="0" max="1">
        </label>
        <label>Discount (γ)
          <input id="gamma" type="number" value="0.95" step="0.01" min="0" max="1">
        </label>
      </div>

      <div class="control-row">
        <label>Exploration (ε)
          <input id="epsilon" type="number" value="0.20" step="0.01" min="0" max="1">
        </label>
        <label>Episode Length
          <input id="episodeLen" type="number" value="200" step="10" min="10">
        </label>
      </div>

      <div class="rl-btn-row">
        <button id="startBtn" class="primary">▶ Start Training</button>
        <button id="stepBtn" class="secondary">Step</button>
        <button id="resetBtn" class="secondary">Reset</button>
      </div>

      <label class="speed-label">Simulation Speed
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
          <input id="speed" type="range" min="1" max="60" value="10">
          <span id="speedVal">10</span>/s
        </div>
      </label>
    </aside>

    <!-- Right: Visuals -->
    <main class="rl-main">

      <!-- Thermostat Gauge -->
      <div class="rl-card rl-gauge-card">
        <h3>Current State</h3>
        <div class="canvas-wrap square">
          <canvas id="thermostatDial" width="600" height="600"></canvas>
        </div>
        <div class="rl-stats">
          <div><span class="stat-label">Episode</span><span class="stat-val" id="episodeOut">1</span></div>
          <div><span class="stat-label">Step</span><span class="stat-val" id="stepOut">0</span></div>
          <div><span class="stat-label">Action</span><span class="stat-val" id="actionOut">—</span></div>
          <div><span class="stat-label">Reward</span><span class="stat-val" id="rewardOut">—</span></div>
          <div><span class="stat-label">Current ε</span><span class="stat-val" id="epsilonOut">0.20</span></div>
        </div>
      </div>

      <!-- Q-Table Heatmap -->
      <div class="rl-card">
        <h3>Learned Policy <span class="card-sub">(Q-Table)</span></h3>
        <p class="card-sub">Blue = Avoid, Red = Prefer. The agent learns the value of taking action OFF vs ON at different temperatures.</p>
        <div class="canvas-wrap heatmap">
          <canvas id="qTableHeatmap" width="820" height="160"></canvas>
        </div>
      </div>

      <!-- Temperature History -->
      <div class="rl-card">
        <h3>Temperature History</h3>
        <div class="canvas-wrap wide">
          <canvas id="tempChart" width="820" height="240"></canvas>
        </div>
      </div>

    </main>
  </div>
</section>

<!-- Hidden advanced configuration params for clean UI -->
<input id="noise"      type="hidden" value="0.4">
<input id="epsilonDecay" type="hidden" value="0.985">
<input id="heatRate"   type="hidden" value="1.0">
<input id="coolRate"   type="hidden" value="0.6">
<input id="rewardBand" type="hidden" value="2">
<input id="actionCost" type="hidden" value="0">
<input id="minTemp"    type="hidden" value="40">
<input id="maxTemp"    type="hidden" value="100">
<input id="binSize"    type="hidden" value="1">

<script src="{{ '/assets/js/thermostat-rl.js' | relative_url }}"></script>
