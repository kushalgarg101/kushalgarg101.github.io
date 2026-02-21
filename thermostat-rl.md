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

<section class="demo-grid">
  <div class="demo-panel">
    <h2>Controls</h2>
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
      <summary>Advanced</summary>
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

  <div class="demo-visuals">
    <div class="readouts">
      <div><span class="label">Episode</span> <span id="episodeOut">1</span></div>
      <div><span class="label">Step</span> <span id="stepOut">0</span></div>
      <div><span class="label">Temp</span> <span id="tempOut">65.0°F</span></div>
      <div><span class="label">Action</span> <span id="actionOut">--</span></div>
      <div><span class="label">Reward</span> <span id="rewardOut">--</span></div>
      <div><span class="label">Epsilon</span> <span id="epsilonOut">0.20</span></div>
    </div>

    <div class="chart-card">
      <canvas id="tempChart" width="820" height="320" aria-label="Temperature chart"></canvas>
      <div class="chart-legend">
        <span class="legend-item"><span class="legend-swatch temp"></span>Temperature</span>
        <span class="legend-item"><span class="legend-swatch target"></span>Target</span>
        <span class="legend-item"><span class="legend-swatch reward"></span>Reward band</span>
      </div>
    </div>

    <div class="timeline-card">
      <h3>Action + Reward Timeline</h3>
      <canvas id="timeline" width="820" height="110" aria-label="Action timeline"></canvas>
      <div class="timeline-legend">
        <span class="legend-item"><span class="legend-swatch on"></span>Heater on</span>
        <span class="legend-item"><span class="legend-swatch off"></span>Heater off</span>
        <span class="legend-item"><span class="legend-swatch good"></span>In reward band</span>
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
