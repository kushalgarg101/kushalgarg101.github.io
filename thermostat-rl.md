---
layout: default
title: Thermostat RL Demo
permalink: /thermostat-rl/
---
<section class="demo-hero">
  <h1>Thermostat RL: Learning to Hold a Target Temperature</h1>
  <p class="subtitle">A hands-on reinforcement learning sandbox for building intuition about state, action, reward, and policy.</p>
  <p class="lead">Tune the environment and the learner. Then watch the agent discover a sensible heater policy through trial and error.</p>
</section>

<link rel="stylesheet" href="{{ '/assets/css/thermostat-rl-premium.css' | relative_url }}">

<section class="thermostat-dashboard">
  <div class="dashboard-top">
    
    <!-- LEFT: Controls -->
    <div class="premium-card">
      <h3>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        Environment Controls
      </h3>
      <div class="control-group">
        <label for="targetTemp">Target temperature (°F)</label>
        <input id="targetTemp" type="number" value="70" step="1" />
      </div>
      <div class="control-group">
        <label for="initialTemp">Initial temperature (°F)</label>
        <input id="initialTemp" type="number" value="65" step="1" />
      </div>
      <div class="control-group">
        <label for="noise">Noise (°F)</label>
        <input id="noise" type="number" value="0.4" step="0.1" />
      </div>
      <div class="control-group">
        <label for="alpha">Learning rate (alpha)</label>
        <input id="alpha" type="number" value="0.15" step="0.01" min="0" max="1" />
      </div>
      <div class="control-group">
        <label for="gamma">Discount (gamma)</label>
        <input id="gamma" type="number" value="0.95" step="0.01" min="0" max="1" />
      </div>
        <div class="control-group">
          <label for="epsilon">Exploration (epsilon)</label>
          <input id="epsilon" type="number" value="0.2" step="0.01" min="0" max="1" />
        </div>
        <div class="control-group">
          <label for="epsilonDecay">Epsilon decay</label>
          <input id="epsilonDecay" type="number" value="0.98" step="0.01" min="0.9" max="1" />
        </div>
        <div class="control-group">
          <label for="episodeLen">Episode length (steps)</label>
        <input id="episodeLen" type="number" value="160" step="10" min="10" />
      </div>

      <details class="control-advanced">
        <summary>Advanced Defaults</summary>
        <div class="control-group">
          <label for="heatRate">Heat rate (°F per step)</label>
          <input id="heatRate" type="number" value="1.0" step="0.1" />
        </div>
        <div class="control-group">
          <label for="coolRate">Cool rate (°F per step)</label>
          <input id="coolRate" type="number" value="0.6" step="0.1" />
        </div>
        <div class="control-group">
          <label for="rewardBand">Reward band (±°F)</label>
          <input id="rewardBand" type="number" value="2" step="0.5" min="0" />
        </div>
        <div class="control-group">
          <label for="actionCost">Heater action cost</label>
          <input id="actionCost" type="number" value="0" step="0.01" min="0" />
        </div>
        <div class="control-group">
          <label for="minTemp">Min temperature clamp (°F)</label>
          <input id="minTemp" type="number" value="50" step="1" />
        </div>
        <div class="control-group">
          <label for="maxTemp">Max temperature clamp (°F)</label>
          <input id="maxTemp" type="number" value="85" step="1" />
        </div>
        <div class="control-group">
          <label for="binSize">State bin size (°F)</label>
          <input id="binSize" type="number" value="1" step="0.5" min="0.5" />
        </div>
      </details>

      <div class="control-actions">
        <button id="startBtn" type="button">Start</button>
        <button id="stepBtn" type="button">Step</button>
        <button id="resetBtn" type="button">Reset</button>
      </div>

      <div class="control-group">
        <label for="speed">Speed (steps/sec)</label>
        <input id="speed" type="range" min="1" max="30" value="10" />
        <div class="speed-readout"><span id="speedVal">10</span> steps/sec</div>
      </div>
    </div>

    <!-- RIGHT: Visualizations -->
    <div class="viz-panel">
      
      <!-- Thermostat Dial Widget -->
      <div class="premium-card">
        <h3>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>
          Current State & Action
        </h3>
        <div class="thermostat-container">
          <canvas id="thermostatDial" width="300" height="300" aria-label="Thermostat Dial"></canvas>
        </div>
        <div class="readouts">
          <div class="readout-item">
            <span class="label">Step</span>
            <span class="value" id="stepOut">0</span>
          </div>
          <div class="readout-item">
            <span class="label">Action</span>
            <span class="value" id="actionOut">--</span>
          </div>
          <div class="readout-item">
            <span class="label">Reward</span>
            <span class="value accent" id="rewardOut">--</span>
          </div>
          <div class="readout-item">
            <span class="label">Temp</span>
            <span class="value" id="tempOut">65.0°F</span>
          </div>
          <div class="readout-item">
            <span class="label">Episode</span>
            <span class="value" id="episodeOut">1</span>
          </div>
          <div class="readout-item">
            <span class="label">Epsilon</span>
            <span class="value" id="epsilonOut">0.20</span>
          </div>
        </div>
      </div>

      <!-- Q-Table Heatmap -->
      <div class="premium-card">
        <h3>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="3" width="3" height="18"></rect><rect x="14" y="3" width="3" height="18"></rect><rect x="3" y="9" width="18" height="3"></rect><rect x="3" y="15" width="18" height="3"></rect></svg>
          Learned Q-Values Heatmap
        </h3>
        <p class="subtitle" style="font-size: 13px; margin-bottom: 12px; margin-top: -12px;">Colors represent expected future reward (Blue=Low, Red=High). State space is binned temperature.</p>
        <div class="heatmap-container">
          <canvas id="qTableHeatmap" width="820" height="120" aria-label="Q-Table Heatmap"></canvas>
        </div>
      </div>

      <!-- Historical Timeline -->
      <div class="premium-card">
        <h3>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          History
        </h3>
        <canvas id="tempChart" width="820" height="240" aria-label="Temperature chart"></canvas>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-swatch temp"></span>Temperature</span>
          <span class="legend-item"><span class="legend-swatch target"></span>Target</span>
        </div>
      </div>
      
    </div>
  </div>
</section>

<section class="demo-notes">
  <h2>How to read this demo</h2>
  <ul class="note-list">
    <li>The agent observes the current temperature (state), chooses heater on/off (action), and receives a reward if it stays near the target.</li>
    <li>Exploration (epsilon) forces random actions early on; as learning progresses, the policy stabilizes.</li>
    <li>Advanced controls let you alter environment dynamics and reward shaping.</li>
  </ul>
</section>

<script src="{{ '/assets/js/thermostat-rl.js' | relative_url }}"></script>
